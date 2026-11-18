import { initFirestore } from '../repositories/firestore.js';
import { circleRepo } from '../repositories/circle.repo.js';
import { medicationRepo } from '../repositories/medication.repo.js';
import { doseRepo } from '../repositories/dose.repo.js';
import { appointmentRepo } from '../repositories/appointment.repo.js';
import { suggestionRepo } from '../repositories/suggestion.repo.js';
import { auditRepo } from '../repositories/audit.repo.js';
import { hashPasscode } from '../utils/passcode.js';
import { Circle, Medication, Dose, Appointment, Suggestion } from '../types/index.js';
import { logger } from '../utils/logger.js';

export async function runSeed(): Promise<void> {
  initFirestore();
  logger.info('🌱 Seeding realistic demo data for CareCircle...');

  const circleId = 'circle_demo_01';
  const circleCode = 'CC-DEMO';
  const elderPasscode = 'ELDER-99';
  const caretakerPasscode = 'CARE-88';
  const familyPasscode = 'FAM-77';

  const [elderHash, caretakerHash, familyHash] = await Promise.all([
    hashPasscode(elderPasscode),
    hashPasscode(caretakerPasscode),
    hashPasscode(familyPasscode),
  ]);

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  const demoCircle: Circle = {
    id: circleId,
    code: circleCode,
    elderName: 'Eleanor Vance',
    elderEmail: 'eleanor.vance@example.com',
    timezone: 'America/New_York',
    language: 'en',
    emergencyContacts: [
      { name: 'Dr. Sarah Jenkins', relation: 'Cardiologist', phone: '(555) 234-5678' },
      { name: 'Marcus Vance', relation: 'Son', phone: '(555) 876-5432' },
      { name: 'Elena Ramos', relation: 'Care Coordinator', phone: '(555) 345-6789' },
    ],
    sharingPaused: false,
    autoApproveCaretaker: false,
    roleVisibility: {
      caretaker: ['medications', 'appointments', 'adherence', 'suggestions'],
      family: ['medications', 'appointments', 'adherence', 'suggestions'],
    },
    passcodes: {
      elderHash,
      caretakerHash,
      familyHash,
    },
    failedLoginAttempts: { count: 0, lockedUntil: null },
    createdAt: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await circleRepo.create(demoCircle);

  // 2. Seed Medications
  const meds: Medication[] = [
    {
      id: 'med_metformin',
      circleId,
      name: 'Metformin Hydrochloride',
      dosage: '500mg',
      form: 'Tablet',
      instructions: 'Take 1 tablet with breakfast and dinner with a full glass of water',
      schedule: {
        times: ['08:00', '20:00'],
        daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
        startDate: '2026-01-01',
      },
      stockCount: 45,
      refillThreshold: 10,
      notes: 'Blood sugar regulation. Do not take on an empty stomach.',
      status: 'active',
      createdAt: new Date(Date.now() - 25 * 24 * 3600 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'med_lisinopril',
      circleId,
      name: 'Lisinopril',
      dosage: '10mg',
      form: 'Tablet',
      instructions: 'Take 1 tablet every morning at breakfast',
      schedule: {
        times: ['08:00'],
        daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
        startDate: '2026-01-01',
      },
      stockCount: 22,
      refillThreshold: 7,
      notes: 'Blood pressure support. Monitor for lightheadedness.',
      status: 'active',
      createdAt: new Date(Date.now() - 25 * 24 * 3600 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'med_atorvastatin',
      circleId,
      name: 'Atorvastatin Calcium',
      dosage: '20mg',
      form: 'Tablet',
      instructions: 'Take 1 tablet daily at bedtime',
      schedule: {
        times: ['21:00'],
        daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
        startDate: '2026-01-01',
      },
      stockCount: 5, // Low stock on purpose to trigger refill alert
      refillThreshold: 7,
      notes: 'Cholesterol management. Refill due soon!',
      status: 'active',
      createdAt: new Date(Date.now() - 25 * 24 * 3600 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: 'med_vitamind',
      circleId,
      name: 'Vitamin D3',
      dosage: '1000 IU',
      form: 'Softgel Capsule',
      instructions: 'Take 1 softgel with lunch',
      schedule: {
        times: ['13:00'],
        daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
        startDate: '2026-01-01',
      },
      stockCount: 50,
      refillThreshold: 10,
      notes: 'Bone strength and immune support.',
      status: 'active',
      createdAt: new Date(Date.now() - 25 * 24 * 3600 * 1000).toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  for (const m of meds) {
    await medicationRepo.create(m);
  }

  // 3. Seed historical doses for past 14 days + today
  for (let i = 14; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const isToday = i === 0;

    for (const med of meds) {
      for (const time of med.schedule.times) {
        const isPastDose = !isToday || time === '08:00';
        const doseStatus = isPastDose ? 'taken' : 'scheduled';

        const dose: Dose = {
          id: `dose_${med.id}_${dateStr}_${time.replace(':', '')}`,
          circleId,
          medicationId: med.id,
          medicationName: med.name,
          dosage: med.dosage,
          form: med.form,
          instructions: med.instructions,
          scheduledDate: dateStr,
          scheduledTime: time,
          status: doseStatus,
          takenAt: doseStatus === 'taken' ? `${dateStr}T${time}:15.000Z` : undefined,
          takenByRole: doseStatus === 'taken' ? 'ELDER' : undefined,
          takenByName: doseStatus === 'taken' ? 'Eleanor Vance' : undefined,
          createdAt: new Date(d.getTime() - 2 * 3600 * 1000).toISOString(),
        };
        await doseRepo.create(dose);
      }
    }
  }

  // 4. Seed Appointments
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(10, 0, 0, 0);

  const nextWeek = new Date(now);
  nextWeek.setDate(nextWeek.getDate() + 7);
  nextWeek.setHours(14, 30, 0, 0);

  const lastMonth = new Date(now);
  lastMonth.setDate(lastMonth.getDate() - 20);
  lastMonth.setHours(11, 0, 0, 0);

  const appointments: Appointment[] = [
    {
      id: 'app_cardiology_01',
      circleId,
      doctor: 'Dr. Sarah Jenkins',
      specialty: 'Cardiology',
      location: 'Mercy Heart Center, Suite 402, 1200 Healthcare Blvd',
      dateTime: tomorrow.toISOString(),
      purpose: 'Quarterly blood pressure check and ECG review',
      notes: 'Bring current medication list and recent blood pressure log',
      transportNeeded: true,
      status: 'upcoming',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'app_ophthalmology_02',
      circleId,
      doctor: 'Dr. Alan Grant',
      specialty: 'Ophthalmology',
      location: 'Vision Health Institute, 350 Sunrise Ave',
      dateTime: nextWeek.toISOString(),
      purpose: 'Annual dilated eye exam and glaucoma screening',
      notes: 'Eyes will be dilated; sunglasses needed for ride home',
      transportNeeded: false,
      status: 'upcoming',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'app_wellness_03',
      circleId,
      doctor: 'Dr. Robert Miller',
      specialty: 'Family Medicine',
      location: 'Downtown Community Health, 88 Pine St',
      dateTime: lastMonth.toISOString(),
      purpose: 'Annual Medicare wellness visit',
      notes: 'All standard vitals normal.',
      transportNeeded: false,
      status: 'completed',
      createdAt: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(),
    },
  ];

  for (const app of appointments) {
    await appointmentRepo.create(app);
  }

  // 5. Seed Suggestion awaiting Elder approval
  const pendingSuggestion: Suggestion = {
    id: 'sug_coq10_01',
    circleId,
    proposedByRole: 'CARETAKER',
    proposedByName: 'Elena Ramos (Care Coordinator)',
    type: 'medication_add',
    payload: {
      name: 'Coenzyme Q10 (CoQ10)',
      dosage: '100mg',
      form: 'Softgel Capsule',
      instructions: 'Take 1 capsule with breakfast to support heart vitality',
      schedule: {
        times: ['08:00'],
        daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
        startDate: todayStr,
      },
      stockCount: 60,
      refillThreshold: 10,
      notes: 'Recommended during cardiology nurse consultation to complement statin therapy.',
    },
    status: 'pending',
    createdAt: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
  };

  await suggestionRepo.create(pendingSuggestion);

  // 6. Seed Audit Logs
  await auditRepo.record(circleId, 'SYSTEM', 'System', 'CIRCLE_CREATED', 'Demo circle created with realistic clinical data');
  await auditRepo.record(circleId, 'CARETAKER', 'Elena Ramos', 'SUGGESTION_CREATED', 'Proposed adding CoQ10 100mg');
  await auditRepo.record(circleId, 'ELDER', 'Eleanor Vance', 'DOSE_STATUS_CHANGED', 'Marked morning Metformin 500mg as TAKEN');

  logger.info('CareCircle demo circle seeded for local development.');
}

// Allow direct execution via tsx
if (process.argv[1]?.endsWith('seed.ts')) {
  runSeed()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Seed error:', err);
      process.exit(1);
    });
}
