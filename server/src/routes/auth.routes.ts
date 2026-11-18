import { Router, Request, Response } from 'express';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { circleRepo } from '../repositories/circle.repo.js';
import { auditRepo } from '../repositories/audit.repo.js';
import { generateCircleCode, generateReadablePasscode, hashPasscode, verifyPasscode } from '../utils/passcode.js';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';
import { authLimiter } from '../middleware/rateLimiters.js';
import { validateRequest } from '../middleware/validation.js';
import { Circle, Role } from '../types/index.js';

const router = Router();

const createCircleSchema = z.object({
  elderName: z.string().min(2),
  elderEmail: z.string().email(),
  timezone: z.string().default('UTC'),
  language: z.enum(['en', 'hi', 'te']).default('en'),
  emergencyContacts: z.array(
    z.object({
      name: z.string(),
      relation: z.string(),
      phone: z.string(),
      email: z.string().email().optional(),
    })
  ).default([]),
});

const joinCircleSchema = z.object({
  circleCode: z.string().min(3),
  passcode: z.string().min(4),
});

/**
 * POST /api/auth/circles
 * Anyone can create a Care Circle for an elder.
 * Generates and returns role-based passcodes once.
 */
router.post('/circles', authLimiter, validateRequest({ body: createCircleSchema }), async (req: Request, res: Response) => {
  const { elderName, elderEmail, timezone, language, emergencyContacts } = req.body;

  const circleCode = generateCircleCode();
  const elderPasscode = generateReadablePasscode();
  const caretakerPasscode = generateReadablePasscode();
  const familyPasscode = generateReadablePasscode();

  const [elderHash, caretakerHash, familyHash] = await Promise.all([
    hashPasscode(elderPasscode),
    hashPasscode(caretakerPasscode),
    hashPasscode(familyPasscode),
  ]);

  const id = `circle_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  const newCircle: Circle = {
    id,
    code: circleCode,
    elderName,
    elderEmail,
    timezone,
    language,
    emergencyContacts,
    sharingPaused: false,
    autoApproveCaretaker: false,
    roleVisibility: {
      caretaker: ['medications', 'appointments', 'adherence', 'suggestions'],
      family: ['medications', 'appointments', 'adherence', 'suggestions'],
    },
    passcodes: {
      elderHash,
      caretakerHash,
      familyHash,
    },
    failedLoginAttempts: {
      count: 0,
      lockedUntil: null,
    },
    sessionVersions: { ELDER: 0, CARETAKER: 0, FAMILY: 0 },
    createdAt: now,
    updatedAt: now,
  };

  await circleRepo.create(newCircle);
  await auditRepo.record(id, 'SYSTEM', elderName, 'CIRCLE_CREATED', `Circle created for ${elderName} (${circleCode})`);

  // Return circle info + passcodes (shown once)
  res.status(201).json({
    circle: {
      id: newCircle.id,
      code: newCircle.code,
      elderName: newCircle.elderName,
      elderEmail: newCircle.elderEmail,
      timezone: newCircle.timezone,
      language: newCircle.language,
    },
    passcodes: {
      elder: elderPasscode,
      caretaker: caretakerPasscode,
      family: familyPasscode,
    },
  });
});

/**
 * POST /api/auth/join
 * Join circle with circle code and role passcode.
 * Rate limited and locked out after repeated failures.
 */
router.post('/join', authLimiter, validateRequest({ body: joinCircleSchema }), async (req: Request, res: Response) => {
  const { circleCode, passcode } = req.body;

  const circle = await circleRepo.findByCode(circleCode);
  if (!circle) {
    res.status(401).json({ error: 'Invalid circle code or passcode.' });
    return;
  }

  // Check lockout
  if (circle.failedLoginAttempts?.lockedUntil && circle.failedLoginAttempts.lockedUntil > Date.now()) {
    const remainingMins = Math.ceil((circle.failedLoginAttempts.lockedUntil - Date.now()) / 60000);
    res.status(429).json({
      error: `Too many failed passcode attempts. Circle is temporarily locked for security. Please try again in ${remainingMins} minute(s).`,
    });
    return;
  }

  // Check passcode against all 3 role hashes
  let matchedRole: Role | null = null;
  const isElder = await verifyPasscode(passcode, circle.passcodes.elderHash);
  if (isElder) {
    matchedRole = 'ELDER';
  } else {
    const isCaretaker = await verifyPasscode(passcode, circle.passcodes.caretakerHash);
    if (isCaretaker) {
      matchedRole = 'CARETAKER';
    } else {
      const isFamily = await verifyPasscode(passcode, circle.passcodes.familyHash);
      if (isFamily) {
        matchedRole = 'FAMILY';
      }
    }
  }

  if (!matchedRole) {
    const attemptResult = await circleRepo.incrementFailedAttempt(circle.id);
    const remaining = 5 - attemptResult.count;
    res.status(401).json({
      error: attemptResult.lockedUntil
        ? 'Passcode incorrect. Maximum attempts exceeded. Circle is locked for 15 minutes.'
        : `Passcode incorrect. ${remaining} attempt(s) remaining before temporary lockout.`,
    });
    return;
  }

  // Reset failed attempts on success
  await circleRepo.resetFailedAttempts(circle.id);

  // Sign JWT session
  const sessionPayload = {
    circleId: circle.id,
    circleCode: circle.code,
    role: matchedRole,
    elderName: circle.elderName,
    language: circle.language,
    sessionVersion: circle.sessionVersions?.[matchedRole] ?? 0,
  };

  const token = jwt.sign(sessionPayload, env.JWT_SECRET, { expiresIn: '1h' });

  // Set httpOnly secure cookie
  res.cookie('carecircle_token', token, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 60 * 60 * 1000,
  });

  await auditRepo.record(circle.id, matchedRole, matchedRole, 'USER_JOINED', `Joined circle with role ${matchedRole}`);

  res.json({
    success: true,
    session: sessionPayload,
    token,
  });
});

/**
 * GET /api/auth/me
 * Get current session and circle profile
 */
router.get('/me', authenticate, async (req: Request, res: Response) => {
  const circle = await circleRepo.getById(req.user!.circleId);
  if (!circle) {
    res.status(404).json({ error: 'Circle not found' });
    return;
  }

  // Strip sensitive hashes
  const { passcodes, ...safeCircle } = circle;

  res.json({
    session: req.user,
    circle: safeCircle,
  });
});

/**
 * POST /api/auth/logout
 */
router.post('/logout', (req: Request, res: Response) => {
  res.clearCookie('carecircle_token');
  res.json({ success: true, message: 'Logged out successfully' });
});

/**
 * POST /api/auth/regenerate-passcode (Elder only)
 */
router.post(
  '/regenerate-passcode',
  authenticate,
  requireRole(['ELDER']),
  validateRequest({
    body: z.object({
      targetRole: z.enum(['CARETAKER', 'FAMILY', 'ELDER']),
    }),
  }),
  async (req: Request, res: Response) => {
    const targetRole: Role = req.body.targetRole;
    const circle = await circleRepo.getById(req.user!.circleId);
    if (!circle) {
      res.status(404).json({ error: 'Circle not found' });
      return;
    }

    const newPasscode = generateReadablePasscode();
    const newHash = await hashPasscode(newPasscode);

    const updatedPasscodes = { ...circle.passcodes };
    if (targetRole === 'ELDER') updatedPasscodes.elderHash = newHash;
    if (targetRole === 'CARETAKER') updatedPasscodes.caretakerHash = newHash;
    if (targetRole === 'FAMILY') updatedPasscodes.familyHash = newHash;

    await circleRepo.update(circle.id, {
      passcodes: updatedPasscodes,
      sessionVersions: {
        ...circle.sessionVersions,
        [targetRole]: (circle.sessionVersions?.[targetRole] ?? 0) + 1,
      },
      updatedAt: new Date().toISOString(),
    });

    await auditRepo.record(
      circle.id,
      'ELDER',
      circle.elderName,
      'PASSCODE_REGENERATED',
      `Regenerated passcode for role ${targetRole}`
    );

    res.json({
      success: true,
      role: targetRole,
      newPasscode,
      message: 'New passcode generated. Share this with your authorized member.',
    });
  }
);

/**
 * POST /api/auth/revoke-passcode (Elder only)
 */
router.post(
  '/revoke-passcode',
  authenticate,
  requireRole(['ELDER']),
  validateRequest({
    body: z.object({
      targetRole: z.enum(['CARETAKER', 'FAMILY']),
    }),
  }),
  async (req: Request, res: Response) => {
    const targetRole: Role = req.body.targetRole;
    const circle = await circleRepo.getById(req.user!.circleId);
    if (!circle) {
      res.status(404).json({ error: 'Circle not found' });
      return;
    }

    // Replace hash with impossible hash to immediately revoke access
    const disabledHash = await hashPasscode(`${generateReadablePasscode()}-REVOKED`);
    const updatedPasscodes = { ...circle.passcodes };
    if (targetRole === 'CARETAKER') updatedPasscodes.caretakerHash = disabledHash;
    if (targetRole === 'FAMILY') updatedPasscodes.familyHash = disabledHash;

    await circleRepo.update(circle.id, {
      passcodes: updatedPasscodes,
      sessionVersions: {
        ...circle.sessionVersions,
        [targetRole]: (circle.sessionVersions?.[targetRole] ?? 0) + 1,
      },
      updatedAt: new Date().toISOString(),
    });

    await auditRepo.record(
      circle.id,
      'ELDER',
      circle.elderName,
      'PASSCODE_REVOKED',
      `Revoked access passcode for role ${targetRole}`
    );

    res.json({
      success: true,
      message: `Passcode for ${targetRole} has been revoked. They can no longer join until regenerated.`,
    });
  }
);

export default router;
