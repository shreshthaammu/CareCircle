import { BaseRepository } from './firestore.js';
import { NotificationLog } from '../types/index.js';

class NotificationRepository extends BaseRepository<NotificationLog> {
  constructor() {
    super('notifications');
  }

  async findByIdempotencyKey(key: string): Promise<NotificationLog | null> {
    const list = await this.getAll(n => n.idempotencyKey === key);
    return list.length > 0 ? list[0] : null;
  }

  async findByCircleId(circleId: string): Promise<NotificationLog[]> {
    const list = await this.getAll(n => n.circleId === circleId);
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
}

export const notificationRepo = new NotificationRepository();
