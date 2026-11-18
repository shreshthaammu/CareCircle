import { BaseRepository } from './firestore.js';
import { Appointment } from '../types/index.js';

class AppointmentRepository extends BaseRepository<Appointment> {
  constructor() {
    super('appointments');
  }

  async findByCircleId(circleId: string): Promise<Appointment[]> {
    const list = await this.getAll(app => app.circleId === circleId);
    return list.sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());
  }

  async findUpcoming(circleId: string): Promise<Appointment[]> {
    const now = new Date().toISOString();
    const list = await this.getAll(app => app.circleId === circleId && app.dateTime >= now && app.status === 'upcoming');
    return list.sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());
  }
}

export const appointmentRepo = new AppointmentRepository();
