import { BaseRepository, runStoreTransaction } from './firestore.js';
import { Dose, DoseStatus, Medication, Role } from '../types/index.js';

class DoseRepository extends BaseRepository<Dose> {
  constructor() {
    super('doses');
  }

  async findByCircleAndDate(circleId: string, dateStr: string): Promise<Dose[]> {
    return this.getAll(d => d.circleId === circleId && d.scheduledDate === dateStr);
  }

  async findByCircleId(circleId: string): Promise<Dose[]> {
    return this.getAll(d => d.circleId === circleId);
  }

  async createIfAbsent(dose: Dose): Promise<boolean> {
    return runStoreTransaction(transaction =>
      transaction.create('doses', dose.id, dose)
    );
  }

  async markDoseStatus(
    id: string,
    status: DoseStatus,
    takenByRole?: Role,
    takenByName?: string,
    snoozeUntil?: string,
    notes?: string
  ): Promise<Dose | null> {
    return runStoreTransaction(async (transaction) => {
      const dose = await transaction.get<Dose>('doses', id);
      if (!dose) return null;

      const medication = await transaction.get<Medication>('medications', dose.medicationId);
      if (!medication || medication.circleId !== dose.circleId) return null;

      if (dose.status === status) return dose;
      if (dose.status === 'taken') return null;

      const now = new Date().toISOString();
      const quantity = medication.quantityPerDose ?? 1;
      const shouldDeductStock = status === 'taken' && !dose.stockDeducted;
      const updates: Partial<Dose> = {
        status,
        updatedAt: now,
        ...(status === 'taken'
          ? {
              takenAt: now,
              takenByRole,
              takenByName,
              stockDeducted: true,
              snoozeUntil: null,
            }
          : {
              snoozeUntil,
              ...(notes === undefined ? {} : { notes }),
            }),
        ...(status === 'taken' && notes !== undefined ? { notes } : {}),
      };

      await transaction.update<Dose>('doses', id, updates);
      if (shouldDeductStock) {
        await transaction.update<Medication>('medications', medication.id, {
          stockCount: Math.max(0, medication.stockCount - quantity),
          updatedAt: now,
        });
      }

      return { ...dose, ...updates };
    });
  }
}

export const doseRepo = new DoseRepository();
