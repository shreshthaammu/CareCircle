import { BaseRepository } from './firestore.js';
import { Circle } from '../types/index.js';

class CircleRepository extends BaseRepository<Circle> {
  constructor() {
    super('circles');
  }

  async findByCode(code: string): Promise<Circle | null> {
    const circles = await this.getAll(c => c.code.toUpperCase() === code.trim().toUpperCase());
    return circles.length > 0 ? circles[0] : null;
  }

  async incrementFailedAttempt(id: string): Promise<{ count: number; lockedUntil: number | null }> {
    const circle = await this.getById(id);
    if (!circle) return { count: 0, lockedUntil: null };

    const currentCount = circle.failedLoginAttempts?.count || 0;
    const newCount = currentCount + 1;
    let lockedUntil: number | null = null;

    // Lock out for 15 minutes after 5 failed attempts
    if (newCount >= 5) {
      lockedUntil = Date.now() + 15 * 60 * 1000;
    }

    await this.update(id, {
      failedLoginAttempts: {
        count: newCount,
        lockedUntil,
      },
    });

    return { count: newCount, lockedUntil };
  }

  async resetFailedAttempts(id: string): Promise<void> {
    await this.update(id, {
      failedLoginAttempts: {
        count: 0,
        lockedUntil: null,
      },
    });
  }
}

export const circleRepo = new CircleRepository();
