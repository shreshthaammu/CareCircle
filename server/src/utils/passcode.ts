import bcrypt from 'bcryptjs';
import crypto from 'crypto';

const READABLE_WORDS = [
  'PINE', 'ROSE', 'GOLD', 'CALM', 'STAR', 'BLUE', 'HOPE', 'SAFE',
  'WARM', 'LEAF', 'BIRD', 'PEAK', 'MOON', 'LAKE', 'TREE', 'DAWN',
  'SUNNY', 'RIVER', 'OCEAN', 'HEART', 'LIGHT', 'PEACE', 'CLOUD'
];

/**
 * Generate a readable 6-8 character passcode designed to be easy to read aloud.
 * e.g., "CALM-492" or "ROSE-816"
 */
export function generateReadablePasscode(): string {
  const word = READABLE_WORDS[crypto.randomInt(READABLE_WORDS.length)];
  const num = crypto.randomInt(100, 1000);
  return `${word}-${num}`;
}

/**
 * Generate a unique 7-character circle code, e.g. "CC-7489"
 */
export function generateCircleCode(): string {
  const num = crypto.randomInt(1000, 10000);
  return `CC-${num}`;
}

/**
 * Hash a passcode using bcrypt
 */
export async function hashPasscode(passcode: string): Promise<string> {
  const saltRounds = 10;
  return bcrypt.hash(passcode.trim().toUpperCase(), saltRounds);
}

/**
 * Verify a passcode against its bcrypt hash
 */
export async function verifyPasscode(passcode: string, hash: string): Promise<boolean> {
  return bcrypt.compare(passcode.trim().toUpperCase(), hash);
}

/**
 * Generate a secure random token for action links
 */
export function generateSecureToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Hash a token with SHA-256 for fast lookup
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}
