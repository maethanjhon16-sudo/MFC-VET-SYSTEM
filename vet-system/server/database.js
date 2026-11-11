import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL;

export const pool = connectionString
  ? new Pool({
      connectionString,
      ssl: { rejectUnauthorized: true },
      max: 3,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    })
  : null;

let schemaPromise;

export async function ensureSchema() {
  if (!pool) {
    throw new Error('Database is not configured. Add DATABASE_URL to the backend environment.');
  }

  if (!schemaPromise) {
    schemaPromise = readFile(new URL('./schema.sql', import.meta.url), 'utf8')
      .then((schema) => pool.query(schema))
      .catch((error) => {
        schemaPromise = undefined;
        throw error;
      });
  }

  await schemaPromise;
}

if (pool) {
  pool.on('error', () => {
    console.error('Unexpected error from the Neon database connection pool.');
  });
}
