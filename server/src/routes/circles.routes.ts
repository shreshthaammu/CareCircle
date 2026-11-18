import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { circleRepo } from '../repositories/circle.repo.js';
import { auditRepo } from '../repositories/audit.repo.js';
import { authenticate, requireRole } from '../middleware/auth.middleware.js';
import { validateRequest } from '../middleware/validation.js';

const router = Router();

const updateSettingsSchema = z.object({
  sharingPaused: z.boolean().optional(),
  autoApproveCaretaker: z.boolean().optional(),
  language: z.enum(['en', 'hi', 'te']).optional(),
  emergencyContacts: z.array(
    z.object({
      name: z.string(),
      relation: z.string(),
      phone: z.string(),
    })
  ).optional(),
  roleVisibility: z.object({
    caretaker: z.array(z.string()),
    family: z.array(z.string()),
  }).optional(),
});

/**
 * GET /api/circles/settings
 */
router.get('/settings', authenticate, async (req: Request, res: Response) => {
  const circle = await circleRepo.getById(req.user!.circleId);
  if (!circle) {
    res.status(404).json({ error: 'Circle not found' });
    return;
  }

  const { passcodes, failedLoginAttempts, ...safeSettings } = circle;
  res.json({ settings: safeSettings });
});

/**
 * PUT /api/circles/settings
 * Update circle configuration (Elder only)
 */
router.put(
  '/settings',
  authenticate,
  requireRole(['ELDER']),
  validateRequest({ body: updateSettingsSchema }),
  async (req: Request, res: Response) => {
    const circleId = req.user!.circleId;
    const circle = await circleRepo.getById(circleId);
    if (!circle) {
      res.status(404).json({ error: 'Circle not found' });
      return;
    }

    const updated = await circleRepo.update(circleId, {
      ...req.body,
      updatedAt: new Date().toISOString(),
    });

    await auditRepo.record(
      circleId,
      'ELDER',
      circle.elderName,
      'SETTINGS_UPDATED',
      'Updated circle sharing preferences and controls'
    );

    const { passcodes, failedLoginAttempts, ...safeSettings } = updated!;
    res.json({ settings: safeSettings });
  }
);

/**
 * GET /api/circles/audit
 * View audit trail
 */
router.get('/audit', authenticate, async (req: Request, res: Response) => {
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 50;
  const logs = await auditRepo.findByCircleId(req.user!.circleId, limit);
  res.json({ logs });
});

export default router;
