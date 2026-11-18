import { Router, Request, Response } from 'express';
import { env } from '../config/env.js';
import { reminderService } from '../services/reminder.service.js';
import { logger } from '../utils/logger.js';

const router = Router();

/**
 * POST /api/internal/run-reminders
 * Secured endpoint called by Google Cloud Scheduler every minute
 */
router.post('/run-reminders', async (req: Request, res: Response) => {
  const secretHeader = req.headers['x-scheduler-secret'];
  const authHeader = req.headers.authorization;

  const providedSecret = secretHeader || (authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null);

  if (!providedSecret || providedSecret !== env.INTERNAL_SCHEDULER_SECRET) {
    logger.warn('Unauthorized scheduler trigger attempt');
    res.status(401).json({ error: 'Unauthorized scheduler invocation' });
    return;
  }

  try {
    const result = await reminderService.runAllReminders();
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      result,
    });
  } catch (error: any) {
    logger.error('Error executing scheduled reminder run', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
