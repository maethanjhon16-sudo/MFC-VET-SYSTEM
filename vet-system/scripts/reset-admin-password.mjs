import 'dotenv/config';
import { pool, ensureSchema } from '../server/database.js';
import { hashPassword } from '../server/passwords.js';

const email = process.argv[2]?.trim().toLowerCase();
const password = process.env.ADMIN_BOOTSTRAP_PASSWORD;
let exitCode = 0;

if (!pool) {
  console.error('Set DATABASE_URL before resetting the administrator password.');
  exitCode = 1;
} else if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error('Usage: npm run db:reset-admin-password -- admin@example.com');
  exitCode = 1;
} else if (
  typeof password !== 'string'
  || password.length < 12
  || Buffer.byteLength(password, 'utf8') > 128
) {
  console.error('Set ADMIN_BOOTSTRAP_PASSWORD to a unique password between 12 and 128 bytes.');
  exitCode = 1;
}

if (exitCode === 0) {
  let client;
  try {
    await ensureSchema();
    // HUUUUYYY HASH MENTIONED!?!?!? >///<
    const passwordHash = await hashPassword(password);
    client = await pool.connect();
    await client.query('BEGIN');

    const result = await client.query(
      `UPDATE users
       SET password_hash = $1
       WHERE email = $2 AND role = 'admin'
       RETURNING id`,
      [passwordHash, email],
    );
    if (!result.rowCount) {
      await client.query('ROLLBACK');
      console.error('No administrator account was found for that email. No changes were made.');
      exitCode = 1;
    } else {
      await client.query('DELETE FROM auth_sessions WHERE user_id = $1', [result.rows[0].id]);
      await client.query('COMMIT');
      console.log(`Administrator password updated for ${email}. Existing sessions were signed out.`);
    }
  } catch {
    if (client) await client.query('ROLLBACK');
    console.error('Could not reset the administrator password. Check the database connection and try again.');
    exitCode = 1;
  } finally {
    client?.release();
  }
}

if (pool) await pool.end();
process.exitCode = exitCode;
