import { randomBytes } from 'node:crypto';

/** How long an administrator-issued reset link stays valid. */
export const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

/** Roles an administrator may issue reset links for. Admin passwords use the CLI script. */
export const RESETTABLE_ROLES = ['owner', 'doctor'];

export function createResetToken(now = Date.now()) {
  return {
    token: randomBytes(32).toString('base64url'),
    expiresAt: new Date(now + RESET_TOKEN_TTL_MS),
  };
}

/** 32 random bytes encode to exactly 43 base64url characters. */
export function isWellFormedResetToken(value) {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{43}$/.test(value);
}

/** Same rule as sign-up: 8+ characters, at most 128 bytes (scrypt/DoS guard). */
export function passwordProblem(password) {
  if (typeof password !== 'string' || password.length < 8 || Buffer.byteLength(password, 'utf8') > 128) {
    return 'Password must be at least 8 characters and no more than 128 bytes.';
  }
  return null;
}
