import 'dotenv/config';
import { randomUUID } from 'node:crypto';
import { pool, ensureSchema } from '../server/database.js';
import { hashPassword } from '../server/passwords.js';

const email = process.argv[2]?.trim().toLowerCase();
const password = process.env.ADMIN_BOOTSTRAP_PASSWORD;
const fullName = process.env.ADMIN_BOOTSTRAP_NAME?.trim() || 'Clinic Administrator';

if (!pool) {
  console.error('Set DATABASE_URL before creating the administrator.');
  process.exitCode = 1;
} else if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error('Usage: npm run db:create-admin -- admin@example.com');
  process.exitCode = 1;
} else if (typeof password !== 'string' || password.length < 12 || Buffer.byteLength(password, 'utf8') > 128) {
  console.error('Set ADMIN_BOOTSTRAP_PASSWORD to a unique password between 12 and 128 bytes.');
  process.exitCode = 1;
} else {
  try {
    await ensureSchema();
    const passwordHash = await hashPassword(password);
    await pool.query(
      `INSERT INTO users (id, full_name, email, phone, role, status, password_hash, accepted_terms_at)
       VALUES ($1, $2, $3, $4, 'admin', 'active', $5, now())`,
      [randomUUID(), fullName, email, 'Clinic administrator', passwordHash],
    );
    console.log(`Administrator account created for ${email}.`);
  } catch (error) {
    console.error(error.code === '23505'
      ? 'An account with that email already exists.'
      : 'Could not create the administrator. Check the database connection and schema.');
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}
