export type Role = 'ELDER' | 'CARETAKER' | 'FAMILY';

export type Language = 'en' | 'hi' | 'te';

export interface EmergencyContact {
  name: string;
  relation: string;
  phone: string;
  email?: string;
}

export interface CirclePasscodes {
  elderHash: string;
  caretakerHash: string;
  familyHash: string;
}

export interface FailedLoginAttempts {
  count: number;
  lockedUntil: number | null;
}

export interface RoleVisibility {
  caretaker: string[];
  family: string[];
}

export interface Circle {
  id: string;
  code: string;
  elderName: string;
  elderEmail: string;
  timezone: string;
  language: Language;
  emergencyContacts: EmergencyContact[];
  sharingPaused: boolean;
  autoApproveCaretaker: boolean;
  roleVisibility: RoleVisibility;
  passcodes: CirclePasscodes;
  failedLoginAttempts: FailedLoginAttempts;
  sessionVersions?: Partial<Record<Role, number>>;
  createdAt: string;
  updatedAt: string;
}

export interface MedicationSchedule {
  times: string[]; // e.g. ["08:00", "20:00"]
  daysOfWeek: number[]; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  startDate: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD
}

export interface Medication {
  id: string;
  circleId: string;
  name: string;
  category?: string;
  dosage: string; // e.g. "500mg"
  dosageUnit?: string;
  form: string; // "Tablet", "Capsule", "Drops", etc.
  instructions: string; // "With breakfast", "Before bed", etc.
  prescribingDoctor?: string;
  prescriptionAttachment?: string;
  schedule: MedicationSchedule;
  initialStockCount?: number;
  stockCount: number;
  refillThreshold: number;
  quantityPerDose?: number;
  notes?: string;
  photoUrl?: string;
  status: 'active' | 'archived';
  createdAt: string;
  updatedAt: string;
}

export type DoseStatus = 'scheduled' | 'taken' | 'missed' | 'skipped' | 'snoozed';

export interface Dose {
  id: string;
  circleId: string;
  medicationId: string;
  medicationName: string;
  dosage: string;
  form: string;
  instructions: string;
  scheduledDate: string; // YYYY-MM-DD
  scheduledTime: string; // HH:mm
  status: DoseStatus;
  takenAt?: string; // ISO 8601
  takenByRole?: Role;
  takenByName?: string;
  snoozeUntil?: string | null; // ISO 8601
  stockDeducted?: boolean;
  notes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Appointment {
  id: string;
  circleId: string;
  doctor: string;
  specialty: string;
  location: string;
  dateTime: string; // ISO 8601
  purpose: string;
  notes?: string;
  transportNeeded: boolean;
  status: 'upcoming' | 'completed' | 'cancelled';
  createdAt: string;
  updatedAt?: string;
}

export type SuggestionType =
  | 'medication_add'
  | 'medication_update'
  | 'medication_delete'
  | 'schedule_update';

export type SuggestionStatus = 'pending' | 'approved' | 'declined';

export interface Suggestion {
  id: string;
  circleId: string;
  proposedByRole: 'CARETAKER' | 'FAMILY';
  proposedByName: string;
  type: SuggestionType;
  payload: any;
  status: SuggestionStatus;
  reviewNotes?: string;
  reviewedAt?: string;
  createdAt: string;
}

export type NotificationType =
  | 'dose_upcoming'
  | 'dose_missed'
  | 'appointment_reminder'
  | 'refill_alert'
  | 'weekly_digest';

export type NotificationStatus = 'sent' | 'failed' | 'skipped';

export interface NotificationLog {
  id: string;
  circleId: string;
  type: NotificationType;
  recipientEmail?: string;
  recipientRole: Role;
  subject: string;
  status: NotificationStatus;
  escalationLevel: number; // 1: Elder, 2: Caretaker, 3: Family
  retryCount: number;
  idempotencyKey: string;
  payload?: any;
  sentAt?: string;
  error?: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  circleId: string;
  actorRole: Role | 'SYSTEM';
  actorName: string;
  action: string;
  details: string;
  timestamp: string;
}

export interface ActionToken {
  id: string;
  tokenHash: string;
  circleId: string;
  doseId: string;
  action: 'taken' | 'snooze';
  expiresAt: number;
  used: boolean;
  createdAt: string;
}

export interface AuthSession {
  sessionVersion?: number;
  circleId: string;
  circleCode: string;
  role: Role;
  elderName: string;
  language: Language;
}
