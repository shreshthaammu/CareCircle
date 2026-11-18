import { BaseRepository } from './firestore.js';
import { AuditLog, Role } from '../types/index.js';

class AuditRepository extends BaseRepository<AuditLog> {
  constructor() {
    super('audit_logs');
  }

  async record(circleId: string, actorRole: Role | 'SYSTEM', actorName: string, action: string, details: string): Promise<AuditLog> {
    const log: AuditLog = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      circleId,
      actorRole,
      actorName,
      action,
      details,
      timestamp: new Date().toISOString(),
    };
    return this.create(log);
  }

  async findByCircleId(circleId: string, limit = 50): Promise<AuditLog[]> {
    const logs = await this.getAll(l => l.circleId === circleId);
    return logs
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }
}

export const auditRepo = new AuditRepository();
