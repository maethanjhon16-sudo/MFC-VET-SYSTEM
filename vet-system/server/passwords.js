import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt);
const KEY_LENGTH = 64;

export async function hashPassword(password) {
  const salt = randomBytes(16);
  const key = await scryptAsync(password, salt, KEY_LENGTH, {
    N: 32_768,
    r: 8,
    p: 1,
    maxmem: 64 * 1024 * 1024,
  });
  return `${salt.toString('base64url')}:${Buffer.from(key).toString('base64url')}`;
}

export async function verifyPassword(password, encoded) {
  const [saltText, keyText, extra] = encoded.split(':');
  if (!saltText || !keyText || extra !== undefined) return false;

  let salt;
  let expected;
  try {
    salt = Buffer.from(saltText, 'base64url');
    expected = Buffer.from(keyText, 'base64url');
  } catch {
    return false;
  }
  if (salt.length !== 16 || expected.length !== KEY_LENGTH) return false;

  const actual = Buffer.from(await scryptAsync(password, salt, KEY_LENGTH, {
    N: 32_768,
    r: 8,
    p: 1,
    maxmem: 64 * 1024 * 1024,
  }));
  return timingSafeEqual(actual, expected);
}
