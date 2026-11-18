import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { runSeed } from '../src/scripts/seed.js';
import { env } from '../src/config/env.js';
import { tokenService } from '../src/services/token.service.js';
import { notificationRepo } from '../src/repositories/notification.repo.js';

describe('CareCircle Backend Integration Tests', () => {
  beforeAll(async () => {
    await runSeed();
  });

  describe('Health Check', () => {
    it('GET /healthz returns 200 with ok status', async () => {
      const res = await request(app).get('/healthz');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
      expect(res.body.service).toBe('CareCircle Platform');
    });

    it('GET /readyz returns readiness independently of /healthz', async () => {
      const res = await request(app).get('/readyz');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ready');
    });
  });

  describe('Authentication & Passcodes', () => {
    it('allows joining with correct circle code and ELDER passcode', async () => {
      const res = await request(app)
        .post('/api/auth/join')
        .send({ circleCode: 'CC-DEMO', passcode: 'ELDER-99' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.session.role).toBe('ELDER');
      expect(res.body.session.circleCode).toBe('CC-DEMO');
      expect(res.headers['set-cookie']).toBeDefined();
    });

    it('allows joining with CARETAKER passcode', async () => {
      const res = await request(app)
        .post('/api/auth/join')
        .send({ circleCode: 'CC-DEMO', passcode: 'CARE-88' });

      expect(res.status).toBe(200);
      expect(res.body.session.role).toBe('CARETAKER');
    });

    it('allows joining with FAMILY passcode', async () => {
      const res = await request(app)
        .post('/api/auth/join')
        .send({ circleCode: 'CC-DEMO', passcode: 'FAM-77' });

      expect(res.status).toBe(200);
      expect(res.body.session.role).toBe('FAMILY');
    });

    it('rejects incorrect passcode with remaining attempts notice', async () => {
      const res = await request(app)
        .post('/api/auth/join')
        .send({ circleCode: 'CC-DEMO', passcode: 'WRONG-PASS' });

      expect(res.status).toBe(401);
      expect(res.body.error).toContain('attempt(s) remaining');
    });

    it('creates a new circle and returns readable passcodes once', async () => {
      const res = await request(app)
        .post('/api/auth/circles')
        .send({
          elderName: 'Arthur Dent',
          elderEmail: 'arthur@example.com',
          language: 'en',
          timezone: 'Europe/London',
        });

      expect(res.status).toBe(201);
      expect(res.body.circle.code).toMatch(/^CC-\d{4}$/);
      expect(res.body.passcodes.elder).toBeDefined();
      expect(res.body.passcodes.caretaker).toBeDefined();
      expect(res.body.passcodes.family).toBeDefined();
    });
  });

  describe('Medications & Doses', () => {
    let elderToken: string;
    let familyToken: string;

    beforeAll(async () => {
      const elderRes = await request(app)
        .post('/api/auth/join')
        .send({ circleCode: 'CC-DEMO', passcode: 'ELDER-99' });
      elderToken = elderRes.body.token;

      const familyRes = await request(app)
        .post('/api/auth/join')
        .send({ circleCode: 'CC-DEMO', passcode: 'FAM-77' });
      familyToken = familyRes.body.token;
    });

    it('GET /api/medications returns list of active medications', async () => {
      const res = await request(app)
        .get('/api/medications')
        .set('Authorization', `Bearer ${elderToken}`);

      expect(res.status).toBe(200);
      expect(res.body.medications.length).toBeGreaterThanOrEqual(3);
    });

    it('GET /api/medications/today returns scheduled doses', async () => {
      const res = await request(app)
        .get('/api/medications/today')
        .set('Authorization', `Bearer ${elderToken}`);

      expect(res.status).toBe(200);
      expect(res.body.doses).toBeDefined();
      expect(Array.isArray(res.body.doses)).toBe(true);
    });

    it('marks a dose as TAKEN and decrements stock', async () => {
      const todayRes = await request(app)
        .get('/api/medications/today')
        .set('Authorization', `Bearer ${elderToken}`);

      const scheduledDose = todayRes.body.doses.find((d: any) => d.status === 'scheduled');
      if (scheduledDose) {
        const medsBefore = await request(app)
          .get('/api/medications')
          .set('Authorization', `Bearer ${elderToken}`);
        const stockBefore = medsBefore.body.medications.find((med: any) => med.id === scheduledDose.medicationId).stockCount;
        const markRes = await request(app)
          .post(`/api/medications/doses/${scheduledDose.id}/status`)
          .set('Authorization', `Bearer ${elderToken}`)
          .set('X-CareCircle-CSRF', '1')
          .send({ status: 'taken' });

        expect(markRes.status).toBe(200);
        expect(markRes.body.dose.status).toBe('taken');
        expect(markRes.body.dose.takenAt).toBeDefined();

        const repeatRes = await request(app)
          .post(`/api/medications/doses/${scheduledDose.id}/status`)
          .set('Authorization', `Bearer ${elderToken}`)
          .set('X-CareCircle-CSRF', '1')
          .send({ status: 'taken' });
        const medsAfter = await request(app)
          .get('/api/medications')
          .set('Authorization', `Bearer ${elderToken}`);
        const stockAfter = medsAfter.body.medications.find((med: any) => med.id === scheduledDose.medicationId).stockCount;
        expect(repeatRes.status).toBe(200);
        expect(stockAfter).toBe(stockBefore - 1);
      }
    });

    it('marks a dose as SNOOZED for 15 minutes', async () => {
      const todayRes = await request(app)
        .get('/api/medications/today')
        .set('Authorization', `Bearer ${elderToken}`);

      const dose = todayRes.body.doses.find((item: any) => item.status === 'scheduled');
      expect(dose).toBeDefined();
      const res = await request(app)
        .post(`/api/medications/doses/${dose.id}/status`)
        .set('Authorization', `Bearer ${elderToken}`)
        .set('X-CareCircle-CSRF', '1')
        .send({ status: 'snoozed', snoozeMinutes: 15 });

      expect(res.status).toBe(200);
      expect(res.body.dose.status).toBe('snoozed');
      expect(res.body.dose.snoozeUntil).toBeDefined();
    });

    it('calculates adherence metrics, streak and heatmap', async () => {
      const res = await request(app)
        .get('/api/medications/adherence')
        .set('Authorization', `Bearer ${elderToken}`);

      expect(res.status).toBe(200);
      expect(res.body.metrics.weeklyRate).toBeGreaterThanOrEqual(0);
      expect(res.body.metrics.heatmap.length).toBe(30);
      expect(res.body.metrics.bestStreakDays).toBeGreaterThanOrEqual(0);
    });

    it('routes FAMILY proposed medication to Suggestions awaiting Elder approval', async () => {
      const res = await request(app)
        .post('/api/medications')
        .set('Authorization', `Bearer ${familyToken}`)
        .set('X-CareCircle-CSRF', '1')
        .send({
          name: 'Omega-3 Fish Oil',
          dosage: '1000mg',
          form: 'Softgel',
          instructions: 'Take 1 with lunch',
          schedule: {
            times: ['13:00'],
            daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
            startDate: '2026-01-01',
          },
          stockCount: 60,
          refillThreshold: 10,
        });

      expect(res.status).toBe(202);
      expect(res.body.isSuggestion).toBe(true);
      expect(res.body.suggestion.type).toBe('medication_add');
      expect(res.body.suggestion.status).toBe('pending');
    });
  });

  describe('Suggestions & Consent Workflow', () => {
    let elderToken: string;

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/auth/join')
        .send({ circleCode: 'CC-DEMO', passcode: 'ELDER-99' });
      elderToken = res.body.token;
    });

    it('GET /api/suggestions lists pending suggestions', async () => {
      const res = await request(app)
        .get('/api/suggestions')
        .set('Authorization', `Bearer ${elderToken}`);

      expect(res.status).toBe(200);
      expect(res.body.suggestions.length).toBeGreaterThanOrEqual(1);
    });

    it('allows Elder to approve suggestion and creates the medication', async () => {
      const listRes = await request(app)
        .get('/api/suggestions')
        .set('Authorization', `Bearer ${elderToken}`);

      const pending = listRes.body.suggestions.find((s: any) => s.status === 'pending');
      expect(pending).toBeDefined();

      const approveRes = await request(app)
        .post(`/api/suggestions/${pending.id}/approve`)
        .set('Authorization', `Bearer ${elderToken}`)
        .set('X-CareCircle-CSRF', '1')
        .send({ reviewNotes: 'Approved for heart health' });

      expect(approveRes.status).toBe(200);
      expect(approveRes.body.suggestion.status).toBe('approved');

      // Verify newly created medication appears in medications list
      const medsRes = await request(app)
        .get('/api/medications')
        .set('Authorization', `Bearer ${elderToken}`);

      const found = medsRes.body.medications.some((m: any) => m.name === pending.payload.name);
      expect(found).toBe(true);
    });
  });

  describe('Appointments & .ics Generation', () => {
    let elderToken: string;

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/auth/join')
        .send({ circleCode: 'CC-DEMO', passcode: 'ELDER-99' });
      elderToken = res.body.token;
    });

    it('GET /api/appointments returns upcoming and past appointments', async () => {
      const res = await request(app)
        .get('/api/appointments')
        .set('Authorization', `Bearer ${elderToken}`);

      expect(res.status).toBe(200);
      expect(res.body.upcoming.length).toBeGreaterThanOrEqual(1);
      expect(res.body.past.length).toBeGreaterThanOrEqual(1);
    });

    it('generates valid .ics iCalendar file for appointment', async () => {
      const listRes = await request(app)
        .get('/api/appointments')
        .set('Authorization', `Bearer ${elderToken}`);

      const appItem = listRes.body.upcoming[0];
      const icsRes = await request(app)
        .get(`/api/appointments/${appItem.id}/ics`)
        .set('Authorization', `Bearer ${elderToken}`);

      expect(icsRes.status).toBe(200);
      expect(icsRes.headers['content-type']).toContain('text/calendar');
      expect(icsRes.text).toContain('BEGIN:VCALENDAR');
      expect(icsRes.text).toContain(appItem.doctor);
      expect(icsRes.text).toContain('END:VCALENDAR');
    });
  });

  describe('Internal Reminder Runner & Action Tokens', () => {
    it('rejects unauthenticated internal scheduler trigger', async () => {
      const res = await request(app).post('/api/internal/run-reminders');
      expect(res.status).toBe(401);
    });

    it('executes reminder engine when secret header is provided', async () => {
      const res = await request(app)
        .post('/api/internal/run-reminders')
        .set('X-Scheduler-Secret', env.INTERNAL_SCHEDULER_SECRET);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.result).toBeDefined();
      const missedDoseLogs = await notificationRepo.findByCircleId('circle_demo_01');
      expect(missedDoseLogs.filter(log => log.type === 'dose_missed').every(log => log.status === 'failed')).toBe(true);
      expect(missedDoseLogs.filter(log => log.type === 'dose_missed').every(log => !log.recipientEmail)).toBe(true);
    });

    it('does not execute an email action on GET and consumes confirmation tokens once', async () => {
      const login = await request(app)
        .post('/api/auth/join')
        .send({ circleCode: 'CC-DEMO', passcode: 'ELDER-99' });
      const today = await request(app)
        .get('/api/medications/today')
        .set('Authorization', `Bearer ${login.body.token}`);
      const dose = today.body.doses.find((item: any) => item.status === 'scheduled');
      expect(dose).toBeDefined();

      const actionLink = await tokenService.createActionLink('circle_demo_01', dose.id, 'taken');
      const rawToken = new URL(actionLink).searchParams.get('token');
      expect(rawToken).toBeTruthy();

      const preview = await request(app).get(`/api/action-token/execute?token=${rawToken}`);
      expect(preview.status).toBe(200);
      const beforeConfirmation = await request(app)
        .get('/api/medications/today')
        .set('Authorization', `Bearer ${login.body.token}`);
      expect(beforeConfirmation.body.doses.find((item: any) => item.id === dose.id).status).toBe('scheduled');

      const confirmation = await request(app)
        .post('/api/action-token/execute')
        .set('X-CareCircle-CSRF', '1')
        .send({ token: rawToken });
      const replay = await request(app)
        .post('/api/action-token/execute')
        .set('X-CareCircle-CSRF', '1')
        .send({ token: rawToken });
      expect(confirmation.status).toBe(200);
      expect(replay.status).toBe(400);
    });

    it('revokes existing caregiver sessions and enforces family visibility', async () => {
      const elder = await request(app)
        .post('/api/auth/join')
        .send({ circleCode: 'CC-DEMO', passcode: 'ELDER-99' });
      const caretaker = await request(app)
        .post('/api/auth/join')
        .send({ circleCode: 'CC-DEMO', passcode: 'CARE-88' });

      expect(elder.status, JSON.stringify(elder.body)).toBe(200);
      expect(caretaker.status, JSON.stringify(caretaker.body)).toBe(200);
      const revoked = await request(app)
        .post('/api/auth/revoke-passcode')
        .set('Authorization', `Bearer ${elder.body.token}`)
        .set('X-CareCircle-CSRF', '1')
        .send({ targetRole: 'CARETAKER' });
      expect(revoked.status, JSON.stringify(revoked.body)).toBe(200);
      const oldSession = await request(app)
        .get('/api/medications')
        .set('Authorization', `Bearer ${caretaker.body.token}`);
      expect(oldSession.status).toBe(401);

      const family = await request(app)
        .post('/api/auth/join')
        .send({ circleCode: 'CC-DEMO', passcode: 'FAM-77' });
      const settings = await request(app)
        .put('/api/circles/settings')
        .set('Authorization', `Bearer ${elder.body.token}`)
        .set('X-CareCircle-CSRF', '1')
        .send({
          roleVisibility: { caretaker: ['medications'], family: [] },
        });
      expect(settings.status).toBe(200);
      const restricted = await request(app)
        .get('/api/medications')
        .set('Authorization', `Bearer ${family.body.token}`);
      expect(restricted.status).toBe(403);
    });
  });

  describe('AI Endpoints (with graceful fallback)', () => {
    let elderToken: string;

    beforeAll(async () => {
      const res = await request(app)
        .post('/api/auth/join')
        .send({ circleCode: 'CC-DEMO', passcode: 'ELDER-99' });
      elderToken = res.body.token;
    });

    it('POST /api/ai/parse-schedule parses natural language into schedule draft', async () => {
      const res = await request(app)
        .post('/api/ai/parse-schedule')
        .set('Authorization', `Bearer ${elderToken}`)
        .set('X-CareCircle-CSRF', '1')
        .send({ text: 'Metformin 500mg twice daily with breakfast and dinner' });

      expect(res.status).toBe(200);
      expect(res.body.draft).toBeDefined();
      expect(res.body.disclaimer).toContain('AI-generated');
    });

    it('POST /api/ai/explain-medicine provides plain language explanation and tips', async () => {
      const res = await request(app)
        .post('/api/ai/explain-medicine')
        .set('Authorization', `Bearer ${elderToken}`)
        .set('X-CareCircle-CSRF', '1')
        .send({ medicationName: 'Lisinopril', dosage: '10mg', language: 'en' });

      expect(res.status).toBe(200);
      expect(res.body.explanation).toBeDefined();
      expect(Array.isArray(res.body.tips)).toBe(true);
      expect(res.body.disclaimer).toContain('doctor or pharmacist');
    });

    it('GET /api/ai/weekly-summary provides family summary', async () => {
      const res = await request(app)
        .get('/api/ai/weekly-summary')
        .set('Authorization', `Bearer ${elderToken}`);

      expect(res.status).toBe(200);
      expect(res.body.summary).toBeDefined();
      expect(res.body.highlight).toBeDefined();
    });

    it('does not fabricate prescription details when scanning is unavailable', async () => {
      const res = await request(app)
        .post('/api/ai/scan-prescription')
        .set('Authorization', `Bearer ${elderToken}`)
        .attach('image', Buffer.from('not-a-real-image'), {
          filename: 'prescription.jpg',
          contentType: 'image/jpeg',
        });

      expect(res.status).toBe(200);
      expect(res.body.isSimulated).toBe(true);
      expect(res.body.medications).toEqual([]);
      expect(res.body.disclaimer).toContain('No medication details were extracted');
    });
  });
});
