import 'dotenv/config';
import { pool, ensureSchema } from '../server/database.js';
import { verifyPassword } from '../server/passwords.js';

const email = process.argv[2]?.trim().toLowerCase();
const password = process.env.ADMIN_BOOTSTRAP_PASSWORD;
let exitCode = 0;

if (!pool) {
  console.error('Set DATABASE_URL before checking the administrator account.');
  exitCode = 1;
} else if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error('Usage: npm run db:check-admin -- admin@example.com');
  exitCode = 1;
} else if (typeof password !== 'string' || password.length === 0) {
  console.error('Set ADMIN_BOOTSTRAP_PASSWORD to the password you intend to use for sign-in.');
  exitCode = 1;
}

if (exitCode === 0) {
  try {
    await ensureSchema();
    const result = await pool.query(
      'SELECT role, status, password_hash FROM users WHERE email = $1',
      [email],
    );
    const user = result.rows[0];

    if (!user) {
      console.error('No account was found for that email in the database from DATABASE_URL.');
      exitCode = 1;
    } else {
      const passwordMatches = await verifyPassword(password, user.password_hash);
      console.log(`Account found: yes`);
      console.log(`Role: ${user.role}`);
      console.log(`Status: ${user.status}`);
      console.log(`Password matches: ${passwordMatches ? 'yes' : 'no'}`);
      if (user.role !== 'admin' || user.status !== 'active' || !passwordMatches) {
        exitCode = 1;
      }
    }
  } catch (error) {
    console.error('Could not check the account. Verify DATABASE_URL and Neon connectivity.', {
      code: error.code ?? 'UNKNOWN_ERROR',
    });
    exitCode = 1;
  } finally {
    await pool.end();
  }
}

process.exitCode = exitCode;
