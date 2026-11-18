import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { medicationRepo } from '../repositories/medication.repo.js';
import { doseRepo } from '../repositories/dose.repo.js';
import { circleRepo } from '../repositories/circle.repo.js';
import { suggestionRepo } from '../repositories/suggestion.repo.js';
import { auditRepo } from '../repositories/audit.repo.js';
import { adherenceService } from '../services/adherence.service.js';
import { authenticate, requireRole, requireVisibility } from '../middleware/auth.middleware.js';
import { validateRequest } from '../middleware/validation.js';
import { getZonedDateParts } from '../utils/timezone.js';
import { Medication, Dose, DoseStatus } from '../types/index.js';

const router = Router();

// Zod schemas
const medicationSchema = z.object({
  name: z.string().min(1),
  category: z.string().max(80).optional(),
  dosage: z.string().min(1),
  dosageUnit: z.string().max(32).optional(),
  form: z.string().default('Tablet'),
  instructions: z.string().default('Take with water'),
  prescribingDoctor: z.string().max(160).optional(),
  prescriptionAttachment: z.string().max(2048).optional(),
  schedule: z.object({
    times: z.array(z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/)).min(1)
      .refine(times => new Set(times).size === times.length, 'Schedule times must be unique'),
    daysOfWeek: z.array(z.number().int().min(0).max(6)).default([0, 1, 2, 3, 4, 5, 6])
      .refine(days => new Set(days).size === days.length, 'Schedule days must be unique'),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  }).refine(schedule => !schedule.endDate || schedule.endDate >= schedule.startDate, {
    message: 'End date must be on or after start date',
    path: ['endDate'],
  }),
  initialStockCount: z.number().int().min(0).optional(),
  stockCount: z.number().min(0).default(30),
  refillThreshold: z.number().min(0).default(5),
  quantityPerDose: z.number().positive().default(1),
  notes: z.string().optional(),
  photoUrl: z.string().optional(),
});

const markDoseSchema = z.object({
  status: z.enum(['taken', 'skipped', 'snoozed']),
  snoozeMinutes: z.number().optional().default(15),
  notes: z.string().optional(),
});

/**
 * Helper to generate scheduled doses for a medication for today
 */
async function ensureTodayDosesForMedication(med: Medication, todayStr: string, dayOfWeek: number) {
  if (med.status !== 'active') return;
  if (med.schedule.startDate > todayStr) return;
  if (med.schedule.endDate && med.schedule.endDate < todayStr) return;
  if (!med.schedule.daysOfWeek.includes(dayOfWeek)) return;

  const existingDoses = await doseRepo.findByCircleAndDate(med.circleId, todayStr);
  const existingMedDoses = existingDoses.filter(d => d.medicationId === med.id);

  for (const time of med.schedule.times) {
    const alreadyExists = existingMedDoses.some(d => d.scheduledTime === time);
    if (!alreadyExists) {
      const dose: Dose = {
        id: `dose_${med.id}_${todayStr}_${time.replace(':', '')}`,
        circleId: med.circleId,
        medicationId: med.id,
        medicationName: med.name,
        dosage: med.dosage,
        form: med.form,
        instructions: med.instructions,
        scheduledDate: todayStr,
        scheduledTime: time,
        status: 'scheduled',
        createdAt: new Date().toISOString(),
      };
      await doseRepo.create(dose);
    }
  }
}

/**
 * GET /api/medications
 */
router.get('/', authenticate, requireVisibility('medications'), async (req: Request, res: Response) => {
  const medications = await medicationRepo.findByCircleId(req.user!.circleId);
  res.json({ medications });
});

/**
 * GET /api/medications/today
 * Fetch all scheduled doses for today
 */
router.get('/today', authenticate, requireVisibility('medications'), async (req: Request, res: Response) => {
  const circleId = req.user!.circleId;
  const now = new Date();
  const circle = await circleRepo.getById(circleId);
  if (!circle) {
    res.status(404).json({ error: 'Care Circle not found' });
    return;
  }
  const { date: todayStr, weekday: dayOfWeek } = getZonedDateParts(circle.timezone, now);

  // Ensure doses exist for all active medications
  const medications = await medicationRepo.findByCircleId(circleId);
  for (const med of medications) {
    await ensureTodayDosesForMedication(med, todayStr, dayOfWeek);
  }

  const doses = await doseRepo.findByCircleAndDate(circleId, todayStr);
  // Sort chronologically by time
  doses.sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));

  res.json({
    date: todayStr,
    doses,
  });
});

/**
 * POST /api/medications
 * Add a medication.
 * If Family or Caretaker (without auto-approve), creates a Suggestion instead!
 */
router.post(
  '/',
  authenticate,
  requireRole(['ELDER', 'CARETAKER', 'FAMILY']),
  validateRequest({ body: medicationSchema }),
  async (req: Request, res: Response) => {
    const circleId = req.user!.circleId;
    const circle = await circleRepo.getById(circleId);
    if (!circle) {
      res.status(404).json({ error: 'Circle not found' });
      return;
    }

    const isElder = req.user!.role === 'ELDER';
    const autoApproved = isElder || (req.user!.role === 'CARETAKER' && circle.autoApproveCaretaker);

    if (!autoApproved) {
      // Create suggestion for Elder approval
      const suggestion = await suggestionRepo.create({
        id: `sug_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        circleId,
        proposedByRole: req.user!.role as 'CARETAKER' | 'FAMILY',
        proposedByName: req.user!.role === 'CARETAKER' ? 'Caretaker' : 'Family Member',
        type: 'medication_add',
        payload: req.body,
        status: 'pending',
        createdAt: new Date().toISOString(),
      });

      await auditRepo.record(
        circleId,
        req.user!.role,
        req.user!.role,
        'SUGGESTION_CREATED',
        `Proposed adding new medication: ${req.body.name}`
      );

      res.status(202).json({
        message: 'Medication change submitted as a suggestion awaiting Elder approval.',
        isSuggestion: true,
        suggestion,
      });
      return;
    }

    // Direct addition
    const id = `med_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const newMed: Medication = {
      id,
      circleId,
      ...req.body,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    };

    await medicationRepo.create(newMed);
    await auditRepo.record(
      circleId,
      req.user!.role,
      req.user!.role,
      'MEDICATION_CREATED',
      `Added medication: ${newMed.name} (${newMed.dosage})`
    );

    // Create doses for today if applicable in circle's timezone
    const { date: todayStr, weekday: dayOfWeek } = getZonedDateParts(circle.timezone, new Date());
    await ensureTodayDosesForMedication(newMed, todayStr, dayOfWeek);

    res.status(201).json({ medication: newMed });
  }
);

/**
 * PUT /api/medications/:id
 * Update medication (or create suggestion)
 */
router.put(
  '/:id',
  authenticate,
  requireRole(['ELDER', 'CARETAKER', 'FAMILY']),
  validateRequest({ body: medicationSchema.partial() }),
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const circleId = req.user!.circleId;
    const med = await medicationRepo.getById(id);

    if (!med || med.circleId !== circleId) {
      res.status(404).json({ error: 'Medication not found' });
      return;
    }

    const circle = await circleRepo.getById(circleId);
    const isElder = req.user!.role === 'ELDER';
    const autoApproved = isElder || (req.user!.role === 'CARETAKER' && circle?.autoApproveCaretaker);

    if (!autoApproved) {
      const suggestion = await suggestionRepo.create({
        id: `sug_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        circleId,
        proposedByRole: req.user!.role as 'CARETAKER' | 'FAMILY',
        proposedByName: req.user!.role === 'CARETAKER' ? 'Caretaker' : 'Family Member',
        type: 'medication_update',
        payload: { medicationId: id, updates: req.body, current: med },
        status: 'pending',
        createdAt: new Date().toISOString(),
      });

      res.status(202).json({
        message: 'Update proposed to Elder for consent.',
        isSuggestion: true,
        suggestion,
      });
      return;
    }

    const updated = await medicationRepo.update(id, {
      ...req.body,
      updatedAt: new Date().toISOString(),
    });

    await auditRepo.record(
      circleId,
      req.user!.role,
      req.user!.role,
      'MEDICATION_UPDATED',
      `Updated medication: ${med.name}`
    );

    res.json({ medication: updated });
  }
);

/**
 * DELETE /api/medications/:id
 * Archive medication
 */
router.delete(
  '/:id',
  authenticate,
  requireRole(['ELDER', 'CARETAKER']),
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const circleId = req.user!.circleId;
    const med = await medicationRepo.getById(id);

    if (!med || med.circleId !== circleId) {
      res.status(404).json({ error: 'Medication not found' });
      return;
    }

    await medicationRepo.update(id, { status: 'archived', updatedAt: new Date().toISOString() });
    await auditRepo.record(circleId, req.user!.role, req.user!.role, 'MEDICATION_ARCHIVED', `Archived medication: ${med.name}`);

    res.json({ success: true, message: 'Medication archived' });
  }
);

/**
 * POST /api/medications/doses/:id/status
 * Mark a dose as Taken, Skipped, or Snoozed
 */
router.post(
  '/doses/:id/status',
  authenticate,
  validateRequest({ body: markDoseSchema }),
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status, snoozeMinutes, notes } = req.body;
    const circleId = req.user!.circleId;

    const dose = await doseRepo.getById(id);
    if (!dose || dose.circleId !== circleId) {
      res.status(404).json({ error: 'Dose record not found' });
      return;
    }

    let snoozeUntil: string | undefined;
    if (status === 'snoozed') {
      const snoozeTime = new Date(Date.now() + (snoozeMinutes || 15) * 60 * 1000);
      snoozeUntil = snoozeTime.toISOString();
    }

    const updatedDose = await doseRepo.markDoseStatus(
      id,
      status as DoseStatus,
      req.user!.role,
      req.user!.role === 'ELDER' ? req.user!.elderName : req.user!.role,
      snoozeUntil,
      notes
    );

    if (!updatedDose) {
      res.status(409).json({ error: 'This dose has already been confirmed and cannot be changed.' });
      return;
    }

    await auditRepo.record(
      circleId,
      req.user!.role,
      req.user!.role,
      'DOSE_STATUS_CHANGED',
      `Marked ${dose.medicationName} (${dose.scheduledTime}) as ${status.toUpperCase()}`
    );

    res.json({ dose: updatedDose });
  }
);

/**
 * GET /api/medications/adherence
 * Adherence statistics, streaks, calendar heatmap
 */
router.get('/adherence', authenticate, requireVisibility('adherence'), async (req: Request, res: Response) => {
  const metrics = await adherenceService.calculateMetrics(req.user!.circleId);
  res.json({ metrics });
});

export default router;
