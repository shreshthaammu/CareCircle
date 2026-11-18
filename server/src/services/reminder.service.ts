import { circleRepo } from '../repositories/circle.repo.js';
import { medicationRepo } from '../repositories/medication.repo.js';
import { doseRepo } from '../repositories/dose.repo.js';
import { appointmentRepo } from '../repositories/appointment.repo.js';
import { notificationRepo } from '../repositories/notification.repo.js';
import { emailService } from './email.service.js';
import { tokenService } from './token.service.js';
import { logger } from '../utils/logger.js';
import { NotificationLog, Role } from '../types/index.js';

export class ReminderService {
  /**
   * Run the full reminder engine suite across all active circles
   */
  async runAllReminders(): Promise<{
    dosesChecked: number;
    remindersSent: number;
    escalationsSent: number;
    appointmentsChecked: number;
    refillsChecked: number;
  }> {
    logger.info('Starting reminder engine cycle...');
    const circles = await circleRepo.getAll();
    let remindersSent = 0;
    let escalationsSent = 0;
    let dosesChecked = 0;
    let appointmentsChecked = 0;
    let refillsChecked = 0;

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    for (const circle of circles) {
      if (circle.sharingPaused) {
        logger.debug(`Skipping reminders for paused circle: ${circle.id}`);
        continue;
      }

      // 1. Process today's doses
      const doses = await doseRepo.findByCircleAndDate(circle.id, todayStr);
      dosesChecked += doses.length;

      for (const dose of doses) {
        const [hour, minute] = dose.scheduledTime.split(':').map(Number);
        const scheduledMinutes = hour * 60 + minute;
        const diffMinutes = currentMinutes - scheduledMinutes;

        // A. Upcoming dose reminder (between -30 and 0 minutes before scheduled dose)
        if (diffMinutes >= -30 && diffMinutes <= 0 && dose.status === 'scheduled') {
          const idempotencyKey = `dose_upcoming_${dose.id}_${todayStr}`;
          const existing = await notificationRepo.findByIdempotencyKey(idempotencyKey);

          if (!existing) {
            const takeUrl = await tokenService.createActionLink(circle.id, dose.id, 'taken');
            const snoozeUrl = await tokenService.createActionLink(circle.id, dose.id, 'snooze');

            const emailPayload = emailService.generateDoseReminderEmail({
              recipientName: circle.elderName,
              elderName: circle.elderName,
              medicationName: dose.medicationName,
              dosage: dose.dosage,
              form: dose.form,
              instructions: dose.instructions,
              scheduledTime: dose.scheduledTime,
              takeUrl,
              snoozeUrl,
              lang: circle.language,
            });
            emailPayload.to = circle.elderEmail;

            const sendRes = await emailService.sendEmail(emailPayload);
            await this.logNotification({
              circleId: circle.id,
              type: 'dose_upcoming',
              recipientEmail: circle.elderEmail,
              recipientRole: 'ELDER',
              subject: emailPayload.subject,
              status: sendRes.success ? 'sent' : 'failed',
              escalationLevel: 1,
              idempotencyKey,
              payload: { doseId: dose.id, scheduledTime: dose.scheduledTime },
              error: sendRes.error,
            });
            if (sendRes.success) remindersSent++;
          }
        }

        // B. Missed dose Escalation Chain (if dose is still scheduled or snoozed past time)
        if (dose.status === 'scheduled' || (dose.status === 'snoozed' && dose.snoozeUntil && new Date(dose.snoozeUntil) <= now)) {
          // Escalation Level 1: 15-29 mins late -> Elder notification
          if (diffMinutes >= 15 && diffMinutes < 30) {
            await this.handleMissedEscalation({
              circle,
              dose,
              todayStr,
              level: 1,
              role: 'ELDER',
              recipientEmail: circle.elderEmail,
              recipientName: circle.elderName,
              onSuccess: () => escalationsSent++,
            });
          }
          // Escalation Level 2: 30-59 mins late -> Caretaker notification
          else if (diffMinutes >= 30 && diffMinutes < 60) {
            const caretakerContact = circle.emergencyContacts.find(c => c.relation.toLowerCase().includes('care')) || circle.emergencyContacts[0];
            await this.handleMissedEscalation({
              circle,
              dose,
              todayStr,
              level: 2,
              role: 'CARETAKER',
              recipientEmail: caretakerContact?.email,
              recipientName: caretakerContact?.name || 'Caretaker',
              onSuccess: () => escalationsSent++,
            });
          }
          // Escalation Level 3: 60+ mins late -> Family circle escalation
          else if (diffMinutes >= 60) {
            const familyContact = circle.emergencyContacts[1] || circle.emergencyContacts[0];
            await this.handleMissedEscalation({
              circle,
              dose,
              todayStr,
              level: 3,
              role: 'FAMILY',
              recipientEmail: familyContact?.email,
              recipientName: familyContact?.name || 'Family Member',
              onSuccess: () => escalationsSent++,
            });
          }
        }
      }

      // 2. Process appointments for circle
      const appointments = await appointmentRepo.findUpcoming(circle.id);
      appointmentsChecked += appointments.length;

      for (const app of appointments) {
        const appTime = new Date(app.dateTime).getTime();
        const diffHours = (appTime - now.getTime()) / (1000 * 60 * 60);

        // 24 hour reminder (23h to 24h window)
        if (diffHours > 23 && diffHours <= 24) {
          const idempotencyKey = `app_24h_${app.id}`;
          const existing = await notificationRepo.findByIdempotencyKey(idempotencyKey);
          if (!existing) {
            const emailPayload = emailService.generateAppointmentReminderEmail({
              recipientName: circle.elderName,
              elderName: circle.elderName,
              doctor: app.doctor,
              specialty: app.specialty,
              location: app.location,
              dateTime: new Date(app.dateTime).toLocaleString(),
              transportNeeded: app.transportNeeded,
              hoursNotice: 24,
              lang: circle.language,
            });
            emailPayload.to = circle.elderEmail;
            const res = await emailService.sendEmail(emailPayload);
            await this.logNotification({
              circleId: circle.id,
              type: 'appointment_reminder',
              recipientEmail: circle.elderEmail,
              recipientRole: 'ELDER',
              subject: emailPayload.subject,
              status: res.success ? 'sent' : 'failed',
              escalationLevel: 1,
              idempotencyKey,
              payload: { appointmentId: app.id },
            });
          }
        }

        // 2 hour reminder (1.5h to 2h window)
        if (diffHours > 1.5 && diffHours <= 2) {
          const idempotencyKey = `app_2h_${app.id}`;
          const existing = await notificationRepo.findByIdempotencyKey(idempotencyKey);
          if (!existing) {
            const emailPayload = emailService.generateAppointmentReminderEmail({
              recipientName: circle.elderName,
              elderName: circle.elderName,
              doctor: app.doctor,
              specialty: app.specialty,
              location: app.location,
              dateTime: new Date(app.dateTime).toLocaleString(),
              transportNeeded: app.transportNeeded,
              hoursNotice: 2,
              lang: circle.language,
            });
            emailPayload.to = circle.elderEmail;
            const res = await emailService.sendEmail(emailPayload);
            await this.logNotification({
              circleId: circle.id,
              type: 'appointment_reminder',
              recipientEmail: circle.elderEmail,
              recipientRole: 'ELDER',
              subject: emailPayload.subject,
              status: res.success ? 'sent' : 'failed',
              escalationLevel: 1,
              idempotencyKey,
              payload: { appointmentId: app.id },
            });
          }
        }
      }

      // 3. Check medication stock thresholds
      const medications = await medicationRepo.findByCircleId(circle.id);
      refillsChecked += medications.length;

      for (const med of medications) {
        if (med.stockCount <= med.refillThreshold) {
          const idempotencyKey = `refill_${med.id}_stock${med.stockCount}`;
          const existing = await notificationRepo.findByIdempotencyKey(idempotencyKey);
          if (!existing) {
            const emailPayload = emailService.generateRefillAlertEmail({
              recipientName: circle.elderName,
              elderName: circle.elderName,
              medicationName: med.name,
              stockRemaining: med.stockCount,
              threshold: med.refillThreshold,
              lang: circle.language,
            });
            emailPayload.to = circle.elderEmail;
            const res = await emailService.sendEmail(emailPayload);
            await this.logNotification({
              circleId: circle.id,
              type: 'refill_alert',
              recipientEmail: circle.elderEmail,
              recipientRole: 'ELDER',
              subject: emailPayload.subject,
              status: res.success ? 'sent' : 'failed',
              escalationLevel: 1,
              idempotencyKey,
              payload: { medicationId: med.id, stock: med.stockCount },
            });
          }
        }
      }
    }

    logger.info('Reminder engine cycle completed', {
      dosesChecked,
      remindersSent,
      escalationsSent,
      appointmentsChecked,
      refillsChecked,
    });

    return {
      dosesChecked,
      remindersSent,
      escalationsSent,
      appointmentsChecked,
      refillsChecked,
    };
  }

  private async handleMissedEscalation(params: {
    circle: any;
    dose: any;
    todayStr: string;
    level: number;
    role: Role;
    recipientEmail?: string;
    recipientName: string;
    onSuccess: () => void;
  }): Promise<void> {
    const idempotencyKey = `missed_level${params.level}_${params.dose.id}_${params.todayStr}`;
    const existing = await notificationRepo.findByIdempotencyKey(idempotencyKey);
    if (existing) return;

    const takeUrl = await tokenService.createActionLink(params.circle.id, params.dose.id, 'taken');

    const emailPayload = emailService.generateMissedDoseEscalationEmail({
      recipientName: params.recipientName,
      elderName: params.circle.elderName,
      medicationName: params.dose.medicationName,
      dosage: params.dose.dosage,
      scheduledTime: params.dose.scheduledTime,
      escalationLevel: params.level,
      takeUrl,
      lang: params.circle.language,
    });
    const sendRes = params.recipientEmail
      ? await emailService.sendEmail({ ...emailPayload, to: params.recipientEmail })
      : { success: false, error: 'Recipient email is not configured; no email was sent.' };
    if (!params.recipientEmail) {
      logger.warn('Missed-dose escalation not delivered because the recipient has no email address', {
        circleId: params.circle.id,
        role: params.role,
        doseId: params.dose.id,
      });
    }
    await this.logNotification({
      circleId: params.circle.id,
      type: 'dose_missed',
      recipientEmail: params.recipientEmail,
      recipientRole: params.role,
      subject: emailPayload.subject,
      status: sendRes.success ? 'sent' : 'failed',
      escalationLevel: params.level,
      idempotencyKey,
      payload: { doseId: params.dose.id, scheduledTime: params.dose.scheduledTime },
      error: sendRes.error,
    });

    if (sendRes.success) {
      params.onSuccess();
    }
  }

  private async logNotification(data: Omit<NotificationLog, 'id' | 'createdAt' | 'retryCount'>): Promise<NotificationLog> {
    const id = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const log: NotificationLog = {
      ...data,
      id,
      retryCount: 0,
      createdAt: new Date().toISOString(),
      sentAt: data.status === 'sent' ? new Date().toISOString() : undefined,
    };
    return notificationRepo.create(log);
  }
}

export const reminderService = new ReminderService();
