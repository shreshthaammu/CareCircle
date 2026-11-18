import { BaseRepository } from './firestore.js';
import { ActionToken } from '../types/index.js';
import { hashToken } from '../utils/passcode.js';

class ActionTokenRepository extends BaseRepository<ActionToken> {
  constructor() {
    super('action_tokens');
  }

  async saveToken(token: string, circleId: string, doseId: string, action: 'taken' | 'snooze', expiresInMs: number): Promise<ActionToken> {
    const tokenHash = hashToken(token);
    const item: ActionToken = {
      id: tokenHash,
      tokenHash,
      circleId,
      doseId,
      action,
      expiresAt: Date.now() + expiresInMs,
      used: false,
      createdAt: new Date().toISOString(),
    };
    return this.create(item);
  }

  async findAndConsume(token: string): Promise<ActionToken | null> {
    const tokenHash = hashToken(token);
    return runStoreTransaction(async (transaction) => {
      const record = await transaction.get<ActionToken>('action_tokens', tokenHash);
      if (!record || record.used || Date.now() > record.expiresAt) return null;
      await transaction.update<ActionToken>('action_tokens', tokenHash, { used: true });
      return { ...record, used: true };
    });
  }
}

export const actionTokenRepo = new ActionTokenRepository();
import { runStoreTransaction } from './firestore.js';
