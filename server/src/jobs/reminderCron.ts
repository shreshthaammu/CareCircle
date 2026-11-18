import cron from 'node-cron';
import { reminderService } from '../services/reminder.service.js';
import { logger } from '../utils/logger.js';
import { env } from '../config/env.js';

let task: cron.ScheduledTask | null = null;

export function startReminderCron(): void {
  if (!env.ENABLE_CRON) {
    logger.info('In-process reminder cron is disabled by config (ENABLE_CRON=false)');
    return;
  }

  logger.info('Starting local in-process reminder cron (runs every minute)...');
  // Runs at the beginning of every minute: '* * * * *'
  task = cron.schedule('* * * * *', async () => {
    try {
      await reminderService.runAllReminders();
    } catch (err) {
      logger.error('Error occurred during in-process reminder cron run', err);
    }
  });
}

export function stopReminderCron(): void {
  if (task) {
    task.stop();
    task = null;
    logger.info('In-process reminder cron stopped');
  }
}
