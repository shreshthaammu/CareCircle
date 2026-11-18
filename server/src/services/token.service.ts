import { env } from '../config/env.js';
import { generateSecureToken } from '../utils/passcode.js';
import { actionTokenRepo } from '../repositories/actionToken.repo.js';

export class TokenService {
  /**
   * Create an action token link for dose confirmation (valid for 24 hours)
   */
  async createActionLink(circleId: string, doseId: string, action: 'taken' | 'snooze'): Promise<string> {
    const rawToken = generateSecureToken();
    const expiresInMs = 24 * 60 * 60 * 1000; // 24 hours

    await actionTokenRepo.saveToken(rawToken, circleId, doseId, action, expiresInMs);

    return `${env.APP_URL}/api/action-token/execute?token=${encodeURIComponent(rawToken)}`;
  }

  /**
   * Verify and consume a single-use action token
   */
  async consumeToken(rawToken: string): Promise<{ circleId: string; doseId: string; action: 'taken' | 'snooze' } | null> {
    const record = await actionTokenRepo.findAndConsume(rawToken);
    if (!record) return null;
    return {
      circleId: record.circleId,
      doseId: record.doseId,
      action: record.action,
    };
  }
}

export const tokenService = new TokenService();
