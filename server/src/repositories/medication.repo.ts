import { BaseRepository } from './firestore.js';
import { Medication } from '../types/index.js';

class MedicationRepository extends BaseRepository<Medication> {
  constructor() {
    super('medications');
  }

  async findByCircleId(circleId: string, includeArchived = false): Promise<Medication[]> {
    return this.getAll(med => {
      if (med.circleId !== circleId) return false;
      if (!includeArchived && med.status === 'archived') return false;
      return true;
    });
  }

  async decrementStock(id: string, amount = 1): Promise<Medication | null> {
    const med = await this.getById(id);
    if (!med) return null;
    const newStock = Math.max(0, med.stockCount - amount);
    return this.update(id, { stockCount: newStock, updatedAt: new Date().toISOString() });
  }
}

export const medicationRepo = new MedicationRepository();
