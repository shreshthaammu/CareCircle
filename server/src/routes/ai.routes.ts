import { Router, Request, Response } from 'express';
import multer from 'multer';
import { z } from 'zod';
import { geminiService } from '../services/gemini.service.js';
import { adherenceService } from '../services/adherence.service.js';
import { appointmentRepo } from '../repositories/appointment.repo.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { validateRequest } from '../middleware/validation.js';

const router = Router();

// Configure safe memory storage for file uploads
const upload = multer({
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and WebP images are permitted.'));
    }
  },
});

/**
 * POST /api/ai/scan-prescription
 * Scan uploaded image of prescription or medicine strip
 */
router.post(
  '/scan-prescription',
  authenticate,
  upload.single('image'),
  async (req: Request, res: Response) => {
    let base64Image = '';
    let mimeType = 'image/jpeg';

    if (req.file) {
      base64Image = req.file.buffer.toString('base64');
      mimeType = req.file.mimetype;
    } else if (req.body.imageBase64) {
      base64Image = req.body.imageBase64;
      mimeType = req.body.mimeType || 'image/jpeg';
    } else {
      res.status(400).json({ error: 'Please upload an image file or provide a base64 encoded image string.' });
      return;
    }

    const result = await geminiService.scanPrescription(base64Image, mimeType);
    res.json(result);
  }
);

/**
 * POST /api/ai/parse-schedule
 * Parse natural language schedule draft
 */
router.post(
  '/parse-schedule',
  authenticate,
  validateRequest({
    body: z.object({
      text: z.string().min(3),
    }),
  }),
  async (req: Request, res: Response) => {
    const result = await geminiService.parseScheduleNaturalLanguage(req.body.text);
    res.json(result);
  }
);

/**
 * POST /api/ai/explain-medicine
 * Plain language explanation for elder
 */
router.post(
  '/explain-medicine',
  authenticate,
  validateRequest({
    body: z.object({
      medicationName: z.string().min(1),
      dosage: z.string().default(''),
      language: z.enum(['en', 'hi', 'te']).optional(),
    }),
  }),
  async (req: Request, res: Response) => {
    const lang = req.body.language || req.user?.language || 'en';
    const result = await geminiService.explainMedicine(req.body.medicationName, req.body.dosage, lang);
    res.json(result);
  }
);

/**
 * GET /api/ai/weekly-summary
 * Plain language weekly family health story
 */
router.get('/weekly-summary', authenticate, async (req: Request, res: Response) => {
  const circleId = req.user!.circleId;
  const metrics = await adherenceService.calculateMetrics(circleId);
  const appointments = await appointmentRepo.findUpcoming(circleId);

  const upcomingStrs = appointments.slice(0, 3).map(a => `${a.doctor} (${new Date(a.dateTime).toLocaleDateString()})`);
  const missedStrs = metrics.missedDoses.slice(0, 3).map(m => m.medicationName);

  const result = await geminiService.generateWeeklyFamilySummary({
    elderName: req.user!.elderName,
    adherenceRate: metrics.weeklyRate,
    dosesTaken: metrics.totalTaken,
    dosesScheduled: metrics.totalScheduled,
    missedDoses: missedStrs,
    upcomingAppointments: upcomingStrs,
    lang: req.user?.language,
  });

  res.json(result);
});

export default router;
