import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { Language } from '../types/index.js';

interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  text: string;
}

// Translations for email templates
const EMAIL_I18N: Record<Language, {
  reminderTitle: string;
  dosageLabel: string;
  instructionsLabel: string;
  tookItBtn: string;
  snoozeBtn: string;
  missedAlertTitle: string;
  escalationNotice: string;
  appointmentTitle: string;
  refillTitle: string;
  weeklyTitle: string;
  footer: string;
}> = {
  en: {
    reminderTitle: 'Time for your medication',
    dosageLabel: 'Dosage',
    instructionsLabel: 'Instructions',
    tookItBtn: '✓ I took it',
    snoozeBtn: '⏰ Snooze 15 min',
    missedAlertTitle: 'Attention: Missed Dose Alert',
    escalationNotice: 'This is an automated escalation from CareCircle.',
    appointmentTitle: 'Upcoming Medical Appointment',
    refillTitle: 'Medication Refill Needed',
    weeklyTitle: 'Weekly Family Health Digest',
    footer: 'CareCircle — Keeping families connected and elders independent.',
  },
  hi: {
    reminderTitle: 'आपकी दवा का समय हो गया है',
    dosageLabel: 'खुराक',
    instructionsLabel: 'निर्देश',
    tookItBtn: '✓ मैंने ले ली',
    snoozeBtn: '⏰ 15 मिनट बाद याद दिलाएं',
    missedAlertTitle: 'ध्यान दें: छूटी हुई दवा की सूचना',
    escalationNotice: 'यह केयरसर्कल से एक स्वचालित सूचना है।',
    appointmentTitle: 'आगामी डॉक्टर से मिलने का समय',
    refillTitle: 'दवा दोबारा मंगाने की आवश्यकता',
    weeklyTitle: 'साप्ताहिक पारिवारिक स्वास्थ्य रिपोर्ट',
    footer: 'केयरसर्कल — परिवारों को जोड़े रखना और बुजुर्गों को आत्मनिर्भर बनाना।',
  },
  te: {
    reminderTitle: 'మీ మందుల సమయం అయింది',
    dosageLabel: 'మోతాదు',
    instructionsLabel: 'సూచనలు',
    tookItBtn: '✓ నేను తీసుకున్నాను',
    snoozeBtn: '⏰ 15 నిమిషాలు స్నూజ్ చేయండి',
    missedAlertTitle: 'గమనిక: మిస్ అయిన మందుల హెచ్చరిక',
    escalationNotice: 'ఇది కేర్‌సర్కిల్ నుండి ఆటోమేటిక్ నోటిఫికేషన్.',
    appointmentTitle: 'రాబోయే డాక్టర్ అపాయింట్‌మెంట్',
    refillTitle: 'మందులను తిరిగి నింపాల్సిన సమయం',
    weeklyTitle: 'వారం వారీ కుటుంబ ఆరోగ్య సారాంశం',
    footer: 'కేర్‌సర్కిల్ — కుటుంబాలను అనుసంధానించడం, పెద్దల ఆరోగ్యాన్ని సంరక్షించడం.',
  },
};

class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private isDryRun = true;

  constructor() {
    if (env.SMTP_HOST && env.SMTP_USER) {
      this.transporter = nodemailer.createTransport({
        host: env.SMTP_HOST,
        port: env.SMTP_PORT,
        secure: env.SMTP_SECURE,
        auth: {
          user: env.SMTP_USER,
          pass: env.SMTP_PASS,
        },
      });
      this.isDryRun = false;
      logger.info(`Email service initialized with SMTP host: ${env.SMTP_HOST}`);
    } else {
      this.isDryRun = true;
      logger.info('Email service initialized in DRY-RUN mode (emails will be logged to console and notification repository)');
    }
  }

  async sendEmail(payload: EmailPayload): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (this.isDryRun || !this.transporter) {
      logger.info('✉️ [EMAIL DRY-RUN DISPATCHED]', {
        to: payload.to,
        subject: payload.subject,
        textPreview: payload.text.substring(0, 150) + '...',
      });
      return { success: true, messageId: `dry_run_${Date.now()}` };
    }

    try {
      const result = await this.transporter.sendMail({
        from: env.SMTP_FROM,
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
      });
      logger.info(`Email successfully dispatched: ${result.messageId}`);
      return { success: true, messageId: result.messageId };
    } catch (err: any) {
      logger.error('Failed to send email via SMTP', err);
      return { success: false, error: err.message };
    }
  }

  generateDoseReminderEmail(params: {
    recipientName: string;
    elderName: string;
    medicationName: string;
    dosage: string;
    form: string;
    instructions: string;
    scheduledTime: string;
    takeUrl: string;
    snoozeUrl: string;
    lang?: Language;
  }): EmailPayload {
    const lang = params.lang || 'en';
    const t = EMAIL_I18N[lang] || EMAIL_I18N.en;

    const subject = `⏰ [CareCircle] ${t.reminderTitle}: ${params.medicationName} (${params.dosage})`;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #F7F3EA; margin: 0; padding: 24px; color: #292524; }
    .card { max-width: 560px; margin: 0 auto; background: #FFFFFF; border-radius: 16px; border: 1px solid #EDE4D4; padding: 32px; box-shadow: 0 4px 20px rgba(0,0,0,0.05); }
    .header { border-bottom: 2px solid #0D9488; padding-bottom: 16px; margin-bottom: 24px; }
    .title { color: #0D9488; font-size: 24px; font-weight: bold; margin: 0; }
    .med-box { background-color: #F0FDFA; border-left: 4px solid #0D9488; border-radius: 8px; padding: 16px 20px; margin: 20px 0; }
    .med-name { font-size: 22px; font-weight: bold; color: #115E59; margin: 0 0 8px 0; }
    .detail { font-size: 16px; color: #4B5563; margin: 4px 0; }
    .btn-container { margin: 28px 0; display: block; text-align: center; }
    .btn { display: inline-block; padding: 14px 28px; border-radius: 12px; font-size: 18px; font-weight: bold; text-decoration: none; margin: 8px; text-align: center; }
    .btn-take { background-color: #0D9488; color: #FFFFFF !important; }
    .btn-snooze { background-color: #F3F4F6; color: #374151 !important; border: 1px solid #D1D5DB; }
    .footer { margin-top: 32px; font-size: 13px; color: #78716C; text-align: center; border-top: 1px solid #EDE4D4; padding-top: 16px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <h1 class="title">CareCircle</h1>
    </div>
    <p style="font-size: 18px;">Hello <strong>${params.recipientName}</strong>,</p>
    <p style="font-size: 17px; line-height: 1.5;">${t.reminderTitle} for <strong>${params.elderName}</strong> scheduled at <strong>${params.scheduledTime}</strong>.</p>

    <div class="med-box">
      <div class="med-name">💊 ${params.medicationName} (${params.dosage})</div>
      <div class="detail"><strong>${t.dosageLabel}:</strong> ${params.dosage} (${params.form})</div>
      <div class="detail"><strong>${t.instructionsLabel}:</strong> ${params.instructions}</div>
    </div>

    <p style="font-size: 15px; color: #6B7280; text-align: center;">Click one of the buttons below to record your response immediately without logging in:</p>

    <div class="btn-container">
      <a href="${params.takeUrl}" class="btn btn-take">${t.tookItBtn}</a>
      <a href="${params.snoozeUrl}" class="btn btn-snooze">${t.snoozeBtn}</a>
    </div>

    <div class="footer">
      <p>${t.footer}</p>
      <p style="font-size: 11px; color: #9CA3AF;">This email was sent via CareCircle secure token links. Links expire in 24 hours.</p>
    </div>
  </div>
</body>
</html>`;

    const text = `CareCircle - ${t.reminderTitle}
Medication: ${params.medicationName} (${params.dosage})
Time: ${params.scheduledTime}
Instructions: ${params.instructions}

To mark as taken:
${params.takeUrl}

To snooze 15 minutes:
${params.snoozeUrl}
`;

    return { to: '', subject, html, text };
  }

  generateMissedDoseEscalationEmail(params: {
    recipientName: string;
    elderName: string;
    medicationName: string;
    dosage: string;
    scheduledTime: string;
    escalationLevel: number;
    takeUrl: string;
    lang?: Language;
  }): EmailPayload {
    const lang = params.lang || 'en';
    const t = EMAIL_I18N[lang] || EMAIL_I18N.en;

    const levelDescriptions: Record<number, string> = {
      1: `Elder notification`,
      2: `Caretaker escalation (dose still unrecorded 30 minutes past schedule)`,
      3: `Family circle urgent escalation (dose still unrecorded 60 minutes past schedule)`,
    };

    const subject = `⚠️ [Urgent CareCircle] ${t.missedAlertTitle}: ${params.elderName} - ${params.medicationName}`;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: sans-serif; background-color: #FEF2F2; margin: 0; padding: 24px; }
    .card { max-width: 560px; margin: 0 auto; background: #FFFFFF; border-radius: 16px; border: 2px solid #F87171; padding: 32px; }
    .alert-header { color: #DC2626; font-size: 24px; font-weight: bold; margin-bottom: 16px; }
    .escalation-badge { display: inline-block; background-color: #FEE2E2; color: #991B1B; font-weight: bold; padding: 6px 12px; border-radius: 8px; margin-bottom: 16px; }
    .btn { display: inline-block; padding: 14px 28px; border-radius: 12px; font-size: 18px; font-weight: bold; text-decoration: none; background-color: #0D9488; color: #FFFFFF !important; margin: 16px 0; }
  </style>
</head>
<body>
  <div class="card">
    <div class="alert-header">⚠️ ${t.missedAlertTitle}</div>
    <div class="escalation-badge">Escalation Tier ${params.escalationLevel}: ${levelDescriptions[params.escalationLevel] || 'Escalation Alert'}</div>
    <p>Hello <strong>${params.recipientName}</strong>,</p>
    <p>This is an automated safety alert regarding <strong>${params.elderName}</strong>.</p>
    <p>The scheduled dose of <strong>${params.medicationName} (${params.dosage})</strong> scheduled for <strong>${params.scheduledTime}</strong> has not yet been marked as taken.</p>
    <p>Please check in with ${params.elderName} or ensure the dose has been administered.</p>
    <div style="text-align: center;">
      <a href="${params.takeUrl}" class="btn">Mark Dose as Taken Now</a>
    </div>
  </div>
</body>
</html>`;

    const text = `⚠️ [URGENT] ${t.missedAlertTitle}
Elder: ${params.elderName}
Medication: ${params.medicationName} (${params.dosage})
Scheduled Time: ${params.scheduledTime}
Escalation Level: ${params.escalationLevel}

If taken, mark here:
${params.takeUrl}`;

    return { to: '', subject, html, text };
  }

  generateAppointmentReminderEmail(params: {
    recipientName: string;
    elderName: string;
    doctor: string;
    specialty: string;
    location: string;
    dateTime: string;
    transportNeeded: boolean;
    hoursNotice: number;
    lang?: Language;
  }): EmailPayload {
    const lang = params.lang || 'en';
    const t = EMAIL_I18N[lang] || EMAIL_I18N.en;

    const subject = `🗓️ [CareCircle] ${t.appointmentTitle} in ${params.hoursNotice} Hours: ${params.doctor} (${params.specialty})`;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: sans-serif; background-color: #F7F3EA; margin: 0; padding: 24px; color: #292524; }
    .card { max-width: 560px; margin: 0 auto; background: #FFFFFF; border-radius: 16px; border: 1px solid #EDE4D4; padding: 32px; }
    .title { color: #0D9488; font-size: 22px; font-weight: bold; }
    .info-box { background: #F0FDFA; padding: 16px; border-radius: 12px; margin: 16px 0; }
  </style>
</head>
<body>
  <div class="card">
    <h2 class="title">🗓️ ${t.appointmentTitle}</h2>
    <p>Hello <strong>${params.recipientName}</strong>,</p>
    <p>This is a reminder that <strong>${params.elderName}</strong> has an upcoming doctor appointment in <strong>${params.hoursNotice} hours</strong>.</p>
    <div class="info-box">
      <p><strong>Doctor:</strong> ${params.doctor} (${params.specialty})</p>
      <p><strong>Date & Time:</strong> ${params.dateTime}</p>
      <p><strong>Location:</strong> ${params.location}</p>
      <p><strong>Transport Needed:</strong> ${params.transportNeeded ? '🚗 Yes (Please coordinate ride)' : '✅ Handled'}</p>
    </div>
  </div>
</body>
</html>`;

    const text = `🗓️ ${t.appointmentTitle}
Doctor: ${params.doctor} (${params.specialty})
Date & Time: ${params.dateTime}
Location: ${params.location}
Transport Needed: ${params.transportNeeded ? 'Yes' : 'No'}`;

    return { to: '', subject, html, text };
  }

  generateRefillAlertEmail(params: {
    recipientName: string;
    elderName: string;
    medicationName: string;
    stockRemaining: number;
    threshold: number;
    lang?: Language;
  }): EmailPayload {
    const lang = params.lang || 'en';
    const t = EMAIL_I18N[lang] || EMAIL_I18N.en;

    const subject = `💊 [CareCircle] ${t.refillTitle}: ${params.medicationName} (Only ${params.stockRemaining} left)`;

    const html = `
<!DOCTYPE html>
<html>
<body style="font-family: sans-serif; background-color: #FFFBEB; padding: 24px;">
  <div style="max-width: 560px; margin: 0 auto; background: #FFF; border-radius: 16px; border: 2px solid #F59E0B; padding: 28px;">
    <h2 style="color: #D97706; margin-top: 0;">💊 ${t.refillTitle}</h2>
    <p>Hello <strong>${params.recipientName}</strong>,</p>
    <p>The medication supply for <strong>${params.elderName}</strong> is running low.</p>
    <div style="background: #FEF3C7; padding: 16px; border-radius: 8px;">
      <p style="margin: 0; font-size: 18px;"><strong>${params.medicationName}</strong>: <strong>${params.stockRemaining}</strong> doses remaining (Refill threshold: ${params.threshold}).</p>
    </div>
    <p>Please contact your pharmacy or doctor to arrange a refill.</p>
  </div>
</body>
</html>`;

    const text = `💊 ${t.refillTitle}
Medication: ${params.medicationName}
Stock remaining: ${params.stockRemaining} (Threshold: ${params.threshold})
Please refill soon.`;

    return { to: '', subject, html, text };
  }
}

export const emailService = new EmailService();
