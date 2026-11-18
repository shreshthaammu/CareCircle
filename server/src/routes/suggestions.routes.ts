import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { suggestionRepo } from '../repositories/suggestion.repo.js';
import { medicationRepo } from '../repositories/medication.repo.js';
import { circleRepo } from '../repositories/circle.repo.js';
import { doseRepo } from '../repositories/dose.repo.js';
import { auditRepo } from '../repositories/audit.repo.js';
import { authenticate, requireRole, requireVisibility } from '../middleware/auth.middleware.js';
import { validateRequest } from '../middleware/validation.js';
import { getZonedDateParts } from '../utils/timezone.js';

const router = Router();

/**
 * GET /api/suggestions
 */
router.get('/', authenticate, requireVisibility('suggestions'), async (req: Request, res: Response) => {
  const suggestions = await suggestionRepo.findByCircleId(req.user!.circleId);
  suggestions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json({ suggestions });
});

/**
 * POST /api/suggestions/:id/approve
 * Elder approves proposed medication change
 */
router.post(
  '/:id/approve',
  authenticate,
  requireRole(['ELDER']),
  validateRequest({
    body: z.object({
      reviewNotes: z.string().optional(),
    }),
  }),
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { reviewNotes } = req.body;
    const circleId = req.user!.circleId;

    const suggestion = await suggestionRepo.getById(id);
    if (!suggestion || suggestion.circleId !== circleId) {
      res.status(404).json({ error: 'Suggestion not found' });
      return;
    }

    if (suggestion.status !== 'pending') {
      res.status(400).json({ error: `Suggestion has already been ${suggestion.status}` });
      return;
    }

    // Apply the change based on type
    if (suggestion.type === 'medication_add') {
      const medId = `med_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const now = new Date().toISOString();
      await medicationRepo.create({
        id: medId,
        circleId,
        ...suggestion.payload,
        status: 'active',
        createdAt: now,
        updatedAt: now,
      });

      // Generate doses for today if applicable in circle timezone
      const circle = await circleRepo.getById(circleId);
      const { date: todayStr, weekday: dayOfWeek } = getZonedDateParts(circle?.timezone || 'UTC', new Date());
      if (
        suggestion.payload.schedule?.startDate <= todayStr &&
        (!suggestion.payload.schedule?.endDate || suggestion.payload.schedule.endDate >= todayStr) &&
        suggestion.payload.schedule?.daysOfWeek?.includes(dayOfWeek)
      ) {
        for (const time of suggestion.payload.schedule.times) {
          await doseRepo.create({
            id: `dose_${medId}_${todayStr}_${time.replace(':', '')}`,
            circleId,
            medicationId: medId,
            medicationName: suggestion.payload.name,
            dosage: suggestion.payload.dosage,
            form: suggestion.payload.form || 'Tablet',
            instructions: suggestion.payload.instructions || 'Take with water',
            scheduledDate: todayStr,
            scheduledTime: time,
            status: 'scheduled',
            createdAt: now,
          });
        }
      }
    } else if (suggestion.type === 'medication_update') {
      const { medicationId, updates } = suggestion.payload;
      await medicationRepo.update(medicationId, {
        ...updates,
        updatedAt: new Date().toISOString(),
      });
    } else if (suggestion.type === 'medication_delete') {
      const { medicationId } = suggestion.payload;
      await medicationRepo.update(medicationId, {
        status: 'archived',
        updatedAt: new Date().toISOString(),
      });
    }

    // Update suggestion status
    const updated = await suggestionRepo.update(id, {
      status: 'approved',
      reviewNotes: reviewNotes || 'Approved by Elder',
      reviewedAt: new Date().toISOString(),
    });

    await auditRepo.record(
      circleId,
      'ELDER',
      req.user!.elderName,
      'SUGGESTION_APPROVED',
      `Approved change proposed by ${suggestion.proposedByName} (${suggestion.type})`
    );

    res.json({ success: true, suggestion: updated });
  }
);

/**
 * POST /api/suggestions/:id/decline
 * Elder declines proposed medication change
 */
router.post(
  '/:id/decline',
  authenticate,
  requireRole(['ELDER']),
  validateRequest({
    body: z.object({
      reviewNotes: z.string().optional(),
    }),
  }),
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const { reviewNotes } = req.body;
    const circleId = req.user!.circleId;

    const suggestion = await suggestionRepo.getById(id);
    if (!suggestion || suggestion.circleId !== circleId) {
      res.status(404).json({ error: 'Suggestion not found' });
      return;
    }

    if (suggestion.status !== 'pending') {
      res.status(400).json({ error: `Suggestion has already been ${suggestion.status}` });
      return;
    }

    const updated = await suggestionRepo.update(id, {
      status: 'declined',
      reviewNotes: reviewNotes || 'Declined by Elder',
      reviewedAt: new Date().toISOString(),
    });

    await auditRepo.record(
      circleId,
      'ELDER',
      req.user!.elderName,
      'SUGGESTION_DECLINED',
      `Declined change proposed by ${suggestion.proposedByName}: ${reviewNotes || 'No reason provided'}`
    );

    res.json({ success: true, suggestion: updated });
  }
);

export default router;
