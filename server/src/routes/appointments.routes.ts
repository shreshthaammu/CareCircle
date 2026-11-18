import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { appointmentRepo } from '../repositories/appointment.repo.js';
import { auditRepo } from '../repositories/audit.repo.js';
import { authenticate, requireRole, requireVisibility } from '../middleware/auth.middleware.js';
import { validateRequest } from '../middleware/validation.js';
import { Appointment } from '../types/index.js';

const router = Router();

const appointmentSchema = z.object({
  doctor: z.string().min(1),
  specialty: z.string().default('General Practice'),
  location: z.string().min(1),
  dateTime: z.string().datetime(),
  purpose: z.string().min(1),
  notes: z.string().optional(),
  transportNeeded: z.boolean().default(false),
  status: z.enum(['upcoming', 'completed', 'cancelled']).default('upcoming'),
});

/**
 * Helper to generate .ics file content
 */
function generateIcs(app: Appointment): string {
  const dtStart = new Date(app.dateTime).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  const endDate = new Date(new Date(app.dateTime).getTime() + 60 * 60 * 1000); // 1 hour
  const dtEnd = endDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//CareCircle//Medical Appointment//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:carecircle-app-${app.id}@carecircle.health`,
    `DTSTAMP:${dtStart}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:Doctor Appointment: ${app.doctor} (${app.specialty})`,
    `DESCRIPTION:${app.purpose}\\nNotes: ${app.notes || 'None'}\\nTransport Needed: ${app.transportNeeded ? 'Yes' : 'No'}`,
    `LOCATION:${app.location}`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

/**
 * GET /api/appointments
 */
router.get('/', authenticate, requireVisibility('appointments'), async (req: Request, res: Response) => {
  const appointments = await appointmentRepo.findByCircleId(req.user!.circleId);
  const now = new Date().toISOString();

  const upcoming = appointments.filter(a => a.dateTime >= now && a.status === 'upcoming');
  const past = appointments.filter(a => a.dateTime < now || a.status !== 'upcoming');

  res.json({ upcoming, past, all: appointments });
});

/**
 * POST /api/appointments
 */
router.post(
  '/',
  authenticate,
  requireRole(['ELDER', 'CARETAKER']),
  validateRequest({ body: appointmentSchema }),
  async (req: Request, res: Response) => {
    const circleId = req.user!.circleId;
    const id = `app_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const newApp: Appointment = {
      id,
      circleId,
      ...req.body,
      createdAt: new Date().toISOString(),
    };

    await appointmentRepo.create(newApp);
    await auditRepo.record(
      circleId,
      req.user!.role,
      req.user!.role,
      'APPOINTMENT_CREATED',
      `Scheduled appointment with ${newApp.doctor} on ${new Date(newApp.dateTime).toLocaleDateString()}`
    );

    res.status(201).json({ appointment: newApp });
  }
);

/**
 * PUT /api/appointments/:id
 */
router.put(
  '/:id',
  authenticate,
  requireRole(['ELDER', 'CARETAKER']),
  validateRequest({ body: appointmentSchema.partial() }),
  async (req: Request, res: Response) => {
    const { id } = req.params;
    const circleId = req.user!.circleId;
    const app = await appointmentRepo.getById(id);

    if (!app || app.circleId !== circleId) {
      res.status(404).json({ error: 'Appointment not found' });
      return;
    }

    const updated = await appointmentRepo.update(id, {
      ...req.body,
      updatedAt: new Date().toISOString(),
    });

    await auditRepo.record(circleId, req.user!.role, req.user!.role, 'APPOINTMENT_UPDATED', `Updated appointment with ${app.doctor}`);

    res.json({ appointment: updated });
  }
);

/**
 * DELETE /api/appointments/:id
 */
router.delete('/:id', authenticate, requireRole(['ELDER', 'CARETAKER']), async (req: Request, res: Response) => {
  const { id } = req.params;
  const circleId = req.user!.circleId;
  const app = await appointmentRepo.getById(id);

  if (!app || app.circleId !== circleId) {
    res.status(404).json({ error: 'Appointment not found' });
    return;
  }

  await appointmentRepo.delete(id);
  await auditRepo.record(circleId, req.user!.role, req.user!.role, 'APPOINTMENT_DELETED', `Cancelled appointment with ${app.doctor}`);

  res.json({ success: true, message: 'Appointment removed' });
});

/**
 * GET /api/appointments/:id/ics
 * Download .ics iCalendar file
 */
router.get('/:id/ics', authenticate, async (req: Request, res: Response) => {
  const { id } = req.params;
  const app = await appointmentRepo.getById(id);

  if (!app || app.circleId !== req.user!.circleId) {
    res.status(404).json({ error: 'Appointment not found' });
    return;
  }

  const icsContent = generateIcs(app);
  res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="appointment-${app.id}.ics"`);
  res.send(icsContent);
});

export default router;
