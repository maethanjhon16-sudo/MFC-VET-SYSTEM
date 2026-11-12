import 'dotenv/config';
import express from 'express';
import { rateLimit } from 'express-rate-limit';
import helmet from 'helmet';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { databaseTargetFingerprint, ensureSchema, pool } from './database.js';
import { hashPassword, verifyPassword } from './passwords.js';
import { appointmentServices, isValidAppointmentTime } from './appointmentRules.js';

const app = express();
const isProduction = process.env.NODE_ENV === 'production';
const cookieName = isProduction ? '__Host-mfc_session' : 'mfc_session';
const sessionLifetime = {
  regular: 12 * 60 * 60 * 1000,
  remembered: 30 * 24 * 60 * 60 * 1000,
};
const frontendDirectory = fileURLToPath(new URL('../dist/', import.meta.url));

app.disable('x-powered-by');
app.set('trust proxy', 1);
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      objectSrc: ["'none'"],
      baseUri: ["'self'"],
      frameAncestors: ["'none'"],
    },
  },
}));
app.use(express.json({ limit: '16kb' }));

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many sign-in attempts. Please wait and try again.' },
});
const registrationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many registration attempts. Please try again later.' },
});
const appointmentLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { error: 'Too many appointment requests. Please try again later.' },
});
function asyncRoute(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

function cookieOptions() {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    path: '/',
  };
}

function readCookie(req, name) {
  const cookies = req.headers.cookie?.split(';') ?? [];
  for (const cookie of cookies) {
    const separator = cookie.indexOf('=');
    if (separator < 0 || cookie.slice(0, separator).trim() !== name) continue;
    const value = cookie.slice(separator + 1).trim();
    return /^[A-Za-z0-9_-]{43}$/.test(value) ? value : null;
  }
  return null;
}

function hashToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

function safeUser(row) {
  return { id: row.id, fullName: row.full_name, email: row.email, role: row.role };
}

function normalizeEmail(email) {
  return typeof email === 'string' ? email.trim().toLowerCase() : '';
}

function validEmail(email) {
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validText(value, maxLength = 160) {
  return typeof value === 'string' && value.trim().length > 0 && value.trim().length <= maxLength;
}

function validateSignup(body) {
  const errors = [];
  if (!validText(body.fullName, 120)) errors.push('Enter your full name.');
  if (!validEmail(normalizeEmail(body.email))) errors.push('Enter a valid email address.');
  if (!validText(body.phone, 32)) errors.push('Enter a valid contact number.');
  if (typeof body.password !== 'string' || body.password.length < 8 || Buffer.byteLength(body.password, 'utf8') > 128) {
    errors.push('Password must be at least 8 characters and no more than 128 bytes.');
  }
  if (body.acceptedTerms !== true) errors.push('Accept the Terms of Service and Privacy Policy to continue.');

  if (body.role === 'owner') {
    for (const key of ['province', 'city', 'barangay']) {
      if (!validText(body[key], 120)) errors.push('Complete your address details.');
    }
  } else if (body.role === 'doctor') {
    if (!validText(body.prcLicense, 40)) errors.push('Enter your PRC license number.');
    if (!validText(body.specialization, 120)) errors.push('Choose your specialization.');
  } else {
    errors.push('This account type cannot be registered here.');
  }
  return errors;
}

function allowedOrigins(req) {
  const origins = new Set([
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:3001',
    'http://127.0.0.1:3001',
  ]);
  if (process.env.RENDER_EXTERNAL_URL) {
    try {
      origins.add(new URL(process.env.RENDER_EXTERNAL_URL).origin);
    } catch {
      throw new Error('RENDER_EXTERNAL_URL is not a valid URL.');
    }
  }
  if (isProduction && req.get('host')) {
    const protocol = req.get('x-forwarded-proto')?.split(',')[0].trim();
    if (protocol === 'https') origins.add(`https://${req.get('host')}`);
  }
  if (process.env.NODE_ENV !== 'production' && req.get('host')) {
    origins.add(`http://${req.get('host')}`);
  }
  return origins;
}

function requireSameOrigin(req, res, next) {
  const origin = req.get('origin');
  if (!origin || !allowedOrigins(req).has(origin)) {
    return res.status(403).json({ error: 'Request origin was not allowed.' });
  }
  return next();
}

function requireRoles(...roles) {
  return (req, res, next) => asyncRoute(async (request, response) => {
    await ensureSchema();
    const user = await findSessionUser(request);
    if (!user) return response.status(401).json({ error: 'Sign in to continue.' });
    if (!roles.includes(user.role)) return response.status(403).json({ error: 'You do not have access to this resource.' });
    request.user = user;
    return next();
  })(req, res, next);
}

const requireAdministrator = requireRoles('admin');
const requireOwner = requireRoles('owner');
const requireClinicalStaff = requireRoles('doctor', 'admin');

function appointmentDto(row) {
  const service = appointmentServices.get(row.service_id);
  return {
    id: row.id,
    petName: row.pet_name,
    serviceId: row.service_id,
    serviceName: service?.name ?? row.service_id,
    doctorId: row.doctor_id,
    doctorName: row.doctor_name ?? null,
    ownerName: row.owner_name ?? null,
    ownerEmail: row.owner_email ?? null,
    ownerPhone: row.owner_phone ?? null,
    scheduledAt: row.scheduled_at,
    notes: row.notes,
    status: row.status,
    createdAt: row.created_at,
  };
}

async function createSession(client, userId, remember) {
  const token = randomBytes(32).toString('base64url');
  const lifetime = remember ? sessionLifetime.remembered : sessionLifetime.regular;
  const expiresAt = new Date(Date.now() + lifetime);
  await client.query(
    'INSERT INTO auth_sessions (token_hash, user_id, expires_at) VALUES ($1, $2, $3)',
    [hashToken(token), userId, expiresAt],
  );
  return { token, expiresAt, remember };
}

function setSessionCookie(res, session) {
  res.cookie(cookieName, session.token, {
    ...cookieOptions(),
    ...(session.remember ? { expires: session.expiresAt } : {}),
  });
}

async function findSessionUser(req) {
  const token = readCookie(req, cookieName);
  if (!token) return null;
  const result = await pool.query(
    `SELECT u.id, u.full_name, u.email, u.role, u.status
     FROM auth_sessions s
     JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = $1 AND s.expires_at > now()`,
    [hashToken(token)],
  );
  const row = result.rows[0];
  if (!row || row.status !== 'active') return null;
  return row;
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, databaseConfigured: Boolean(pool) });
});

app.get('/api/auth/me', asyncRoute(async (req, res) => {
  await ensureSchema();
  const row = await findSessionUser(req);
  res.json({ user: row ? safeUser(row) : null });
}));

app.post('/api/auth/register', requireSameOrigin, registrationLimiter, asyncRoute(async (req, res) => {
  await ensureSchema();
  const errors = validateSignup(req.body ?? {});
  if (errors.length) return res.status(400).json({ error: errors[0] });

  const { role, password } = req.body;
  const email = normalizeEmail(req.body.email);
  const passwordHash = await hashPassword(password);
  const user = {
    id: randomUUID(),
    fullName: req.body.fullName.trim(),
    email,
    phone: req.body.phone.trim(),
    role,
    status: role === 'doctor' ? 'pending' : 'active',
    passwordHash,
    province: role === 'owner' ? req.body.province.trim() : null,
    city: role === 'owner' ? req.body.city.trim() : null,
    barangay: role === 'owner' ? req.body.barangay.trim() : null,
    prcLicense: role === 'doctor' ? req.body.prcLicense.trim() : null,
    specialization: role === 'doctor' ? req.body.specialization.trim() : null,
  };

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `INSERT INTO users (
        id, full_name, email, phone, role, status, password_hash,
        province, city, barangay, prc_license, specialization, accepted_terms_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, now())`,
      [
        user.id, user.fullName, user.email, user.phone, user.role, user.status, user.passwordHash,
        user.province, user.city, user.barangay, user.prcLicense, user.specialization,
      ],
    );
    if (role === 'owner') {
      const session = await createSession(client, user.id, false);
      await client.query('COMMIT');
      setSessionCookie(res, session);
      return res.status(201).json({ user: safeUser({ ...user, full_name: user.fullName }) });
    }
    await client.query('COMMIT');
    return res.status(201).json({ pendingApproval: true });
  } catch (error) {
    await client.query('ROLLBACK');
    if (error.code === '23505') {
      return res.status(409).json({ error: 'An account with these details already exists.' });
    }
    throw error;
  } finally {
    client.release();
  }
}));

app.post('/api/auth/login', requireSameOrigin, loginLimiter, asyncRoute(async (req, res) => {
  await ensureSchema();
  const email = normalizeEmail(req.body?.email);
  const password = req.body?.password;
  const role = req.body?.role;
  if (
    !validEmail(email)
    || typeof password !== 'string'
    || password.length === 0
    || Buffer.byteLength(password, 'utf8') > 128
    || !['owner', 'doctor', 'admin'].includes(role)
  ) {
    return res.status(400).json({ error: 'Enter your email and password.' });
  }
  const result = await pool.query(
    'SELECT id, full_name, email, role, status, password_hash FROM users WHERE email = $1',
    [email],
  );
  const user = result.rows[0];
  const passwordMatches = user
    ? await verifyPassword(password, user.password_hash)
    : await verifyPassword(password, 'AAAAAAAAAAAAAAAAAAAAAA:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA');
  if (!user || !passwordMatches || user.role !== role) {
    const reason = !user
      ? 'account_not_found'
      : user.role !== role
        ? 'role_mismatch'
        : 'password_mismatch';
    console.warn('Login rejected.', { reason, requestedRole: role, databaseTarget: databaseTargetFingerprint });
    return res.status(401).json({ error: 'Email or password is incorrect.' });
  }
  if (user.status === 'pending') {
    return res.status(403).json({ error: 'Your doctor application is awaiting clinic approval.' });
  }
  if (user.status !== 'active') {
    return res.status(403).json({ error: 'This account is currently unavailable. Contact the clinic administrator.' });
  }

  const token = readCookie(req, cookieName);
  if (token) await pool.query('DELETE FROM auth_sessions WHERE token_hash = $1', [hashToken(token)]);
  const session = await createSession(pool, user.id, req.body.remember === true);
  setSessionCookie(res, session);
  return res.json({ user: safeUser(user) });
}));

app.post('/api/auth/logout', requireSameOrigin, asyncRoute(async (req, res) => {
  const token = readCookie(req, cookieName);
  if (pool && token) {
    await ensureSchema();
    await pool.query('DELETE FROM auth_sessions WHERE token_hash = $1', [hashToken(token)]);
  }
  res.clearCookie(cookieName, cookieOptions());
  res.status(204).end();
}));

app.post('/api/auth/password-reset', requireSameOrigin, asyncRoute(async (_req, res) => {
  await ensureSchema();
  return res.status(501).json({ error: 'Password reset email is not configured yet. Contact the clinic administrator.' });
}));

app.get('/api/owner/doctors', requireOwner, asyncRoute(async (_req, res) => {
  const result = await pool.query(
    `SELECT id, full_name, specialization
     FROM users
     WHERE role = 'doctor' AND status = 'active'
     ORDER BY full_name ASC`,
  );
  res.json({
    doctors: result.rows.map((row) => ({
      id: row.id,
      fullName: row.full_name,
      specialization: row.specialization,
    })),
  });
}));

app.get('/api/owner/appointments', requireOwner, asyncRoute(async (req, res) => {
  const result = await pool.query(
    `SELECT a.id, a.pet_name, a.service_id, a.doctor_id, a.scheduled_at,
            a.notes, a.status, a.created_at, d.full_name AS doctor_name
     FROM appointments a
     LEFT JOIN users d ON d.id = a.doctor_id
     WHERE a.owner_id = $1
     ORDER BY a.scheduled_at DESC
     LIMIT 100`,
    [req.user.id],
  );
  res.json({ appointments: result.rows.map(appointmentDto) });
}));

app.post('/api/owner/appointments', requireSameOrigin, requireOwner, appointmentLimiter, asyncRoute(async (req, res) => {
  const body = req.body ?? {};
  const petName = typeof body.petName === 'string' ? body.petName.trim() : '';
  const serviceId = body.serviceId;
  const service = appointmentServices.get(serviceId);
  const doctorId = body.doctorId === '' ? null : body.doctorId ?? null;
  const notes = body.notes === undefined ? '' : body.notes;

  if (!validText(petName, 80)) return res.status(400).json({ error: 'Enter your pet’s name (up to 80 characters).' });
  if (!service) return res.status(400).json({ error: 'Choose a valid clinic service.' });
  if (doctorId !== null && (typeof doctorId !== 'string' || !/^[0-9a-f-]{36}$/i.test(doctorId))) {
    return res.status(400).json({ error: 'Choose a valid veterinarian or select any available veterinarian.' });
  }
  if (!isValidAppointmentTime(body.scheduledAt, service.durationMinutes)) {
    return res.status(400).json({ error: 'Choose a future 30-minute slot during clinic hours (Monday–Saturday, 8:00 AM–6:00 PM) within the next 90 days.' });
  }
  if (typeof notes !== 'string' || notes.trim().length > 500) {
    return res.status(400).json({ error: 'Visit notes must be 500 characters or fewer.' });
  }

  if (doctorId) {
    const doctor = await pool.query(
      `SELECT id FROM users
       WHERE id = $1 AND role = 'doctor' AND status = 'active'`,
      [doctorId],
    );
    if (!doctor.rowCount) return res.status(400).json({ error: 'That veterinarian is not available for booking.' });
  }

  const result = await pool.query(
    `INSERT INTO appointments (
       id, owner_id, pet_name, service_id, doctor_id, scheduled_at,
       duration_minutes, notes, status
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')
     RETURNING id, pet_name, service_id, doctor_id, scheduled_at, notes, status, created_at`,
    [
      randomUUID(), req.user.id, petName, serviceId, doctorId, body.scheduledAt,
      service.durationMinutes, notes.trim(),
    ],
  );
  return res.status(201).json({ appointment: appointmentDto(result.rows[0]) });
}));

app.post('/api/owner/appointments/:id/cancel', requireSameOrigin, requireOwner, asyncRoute(async (req, res) => {
  const result = await pool.query(
    `UPDATE appointments
     SET status = 'cancelled', updated_at = now()
     WHERE id = $1 AND owner_id = $2 AND status = 'pending'
     RETURNING id`,
    [req.params.id, req.user.id],
  );
  if (!result.rowCount) return res.status(404).json({ error: 'Only your pending appointment requests can be cancelled.' });
  return res.json({ cancelled: true });
}));

app.get('/api/staff/appointments', requireClinicalStaff, asyncRoute(async (req, res) => {
  const result = req.user.role === 'doctor'
    ? await pool.query(
      `SELECT a.id, a.pet_name, a.service_id, a.doctor_id, a.scheduled_at,
              a.notes, a.status, a.created_at, o.full_name AS owner_name,
              o.email AS owner_email, o.phone AS owner_phone, d.full_name AS doctor_name
       FROM appointments a
       JOIN users o ON o.id = a.owner_id
       LEFT JOIN users d ON d.id = a.doctor_id
       WHERE a.status = 'pending' AND (a.doctor_id = $1 OR a.doctor_id IS NULL)
       ORDER BY a.scheduled_at ASC
       LIMIT 100`,
      [req.user.id],
    )
    : await pool.query(
      `SELECT a.id, a.pet_name, a.service_id, a.doctor_id, a.scheduled_at,
              a.notes, a.status, a.created_at, o.full_name AS owner_name,
              o.email AS owner_email, o.phone AS owner_phone, d.full_name AS doctor_name
       FROM appointments a
       JOIN users o ON o.id = a.owner_id
       LEFT JOIN users d ON d.id = a.doctor_id
       WHERE a.status = 'pending'
       ORDER BY a.scheduled_at ASC
       LIMIT 100`,
    );
  res.json({ appointments: result.rows.map(appointmentDto) });
}));

app.get('/api/staff/doctors', requireClinicalStaff, asyncRoute(async (_req, res) => {
  const result = await pool.query(
    `SELECT id, full_name, specialization
     FROM users
     WHERE role = 'doctor' AND status = 'active'
     ORDER BY full_name ASC`,
  );
  res.json({
    doctors: result.rows.map((row) => ({
      id: row.id,
      fullName: row.full_name,
      specialization: row.specialization,
    })),
  });
}));

app.get('/api/staff/schedule', requireClinicalStaff, asyncRoute(async (req, res) => {
  const result = await pool.query(
    `SELECT a.id, a.pet_name, a.service_id, a.doctor_id, a.scheduled_at,
            a.notes, a.status, a.created_at, o.full_name AS owner_name,
            o.email AS owner_email, o.phone AS owner_phone, d.full_name AS doctor_name
     FROM appointments a
     JOIN users o ON o.id = a.owner_id
     LEFT JOIN users d ON d.id = a.doctor_id
     WHERE a.status IN ('pending', 'confirmed')
       AND ($1 = 'admin' OR a.doctor_id = $2)
     ORDER BY a.scheduled_at ASC
     LIMIT 500`,
    [req.user.role, req.user.id],
  );
  res.json({ appointments: result.rows.map(appointmentDto) });
}));

app.post('/api/staff/appointments/:id/decision', requireSameOrigin, requireClinicalStaff, asyncRoute(async (req, res) => {
  const decision = req.body?.decision;
  if (!['confirm', 'decline'].includes(decision)) {
    return res.status(400).json({ error: 'Choose confirm or decline for this appointment request.' });
  }
  const status = decision === 'confirm' ? 'confirmed' : 'declined';
  const doctorId = req.user.role === 'doctor' ? req.user.id : req.body?.doctorId ?? null;
  if (status === 'confirmed' && !doctorId) {
    return res.status(400).json({ error: 'Assign an active veterinarian before confirming this appointment.' });
  }
  if (status === 'confirmed') {
    const doctor = await pool.query(
      `SELECT id FROM users
       WHERE id = $1 AND role = 'doctor' AND status = 'active'`,
      [doctorId],
    );
    if (!doctor.rowCount) return res.status(400).json({ error: 'Choose an active veterinarian for this appointment.' });
  }
  const client = await pool.connect();
  let transactionOpen = false;
  try {
    await client.query('BEGIN');
    transactionOpen = true;
    const appointmentResult = await client.query(
      `SELECT id, doctor_id, scheduled_at, duration_minutes
       FROM appointments
       WHERE id = $1 AND status = 'pending'
         AND ($2 = 'admin' OR doctor_id IS NULL OR doctor_id = $3)
       FOR UPDATE`,
      [req.params.id, req.user.role, req.user.id],
    );
    const appointment = appointmentResult.rows[0];
    if (!appointment) {
      await client.query('ROLLBACK');
      transactionOpen = false;
      return res.status(404).json({ error: 'That pending appointment request was not found or is assigned to another doctor.' });
    }

    if (status === 'confirmed') {
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1)::bigint)', [doctorId]);
      const conflict = await client.query(
        `SELECT id FROM appointments
         WHERE doctor_id = $1 AND status = 'confirmed' AND id <> $2
           AND scheduled_at < $3::timestamptz + ($4::integer * interval '1 minute')
           AND scheduled_at + (duration_minutes * interval '1 minute') > $3::timestamptz
         LIMIT 1`,
        [doctorId, appointment.id, appointment.scheduled_at, appointment.duration_minutes],
      );
      if (conflict.rowCount) {
        await client.query('ROLLBACK');
        transactionOpen = false;
        return res.status(409).json({ error: 'That veterinarian has an overlapping confirmed visit. Choose another doctor or time.' });
      }
    }

    const result = await client.query(
      `UPDATE appointments
       SET status = $2,
           doctor_id = CASE WHEN $2 = 'confirmed' THEN $3 ELSE doctor_id END,
           updated_at = now()
       WHERE id = $1
       RETURNING id, status`,
      [appointment.id, status, doctorId],
    );
    await client.query('COMMIT');
    transactionOpen = false;
    return res.json({ appointment: { id: result.rows[0].id, status: result.rows[0].status } });
  } catch (error) {
    if (transactionOpen) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        console.error('Appointment decision rollback failed.', {
          code: rollbackError.code ?? 'ROLLBACK_FAILED',
        });
      }
    }
    if (error.code === '23505') {
      return res.status(409).json({ error: 'That time was just booked. Refresh the schedule and choose another slot.' });
    }
    throw error;
  } finally {
    client.release();
  }
}));

app.get('/api/admin/doctor-applications', requireAdministrator, asyncRoute(async (_req, res) => {
  const result = await pool.query(
    `SELECT id, full_name, email, phone, prc_license, specialization, created_at
     FROM users
     WHERE role = 'doctor' AND status = 'pending'
     ORDER BY created_at ASC`,
  );
  res.json({
    applications: result.rows.map((row) => ({
      id: row.id,
      fullName: row.full_name,
      email: row.email,
      phone: row.phone,
      prcLicense: row.prc_license,
      specialization: row.specialization,
      submittedAt: row.created_at,
    })),
  });
}));

app.post('/api/admin/doctor-applications/:id/approve', requireSameOrigin, requireAdministrator, asyncRoute(async (req, res) => {
  const result = await pool.query(
    `UPDATE users
     SET status = 'active'
     WHERE id = $1 AND role = 'doctor' AND status = 'pending'
     RETURNING id`,
    [req.params.id],
  );
  if (!result.rowCount) return res.status(404).json({ error: 'That pending doctor application was not found.' });
  return res.json({ approved: true });
}));

const builtFrontend = path.join(frontendDirectory, 'index.html');
app.use(express.static(frontendDirectory, {
  index: false,
  maxAge: isProduction ? '1h' : 0,
  setHeaders(res, assetPath) {
    if (assetPath.endsWith('index.html')) res.setHeader('Cache-Control', 'no-cache');
  },
}));
app.use((req, res, next) => {
  if (req.method !== 'GET' || req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Not found.' });
  }
  return res.sendFile(builtFrontend, (error) => {
    if (error) next(error);
  });
});

app.use((error, req, res, _next) => {
  console.error('API request failed.', { path: req.path, code: error.code ?? 'INTERNAL_ERROR' });
  if (res.headersSent) return;
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Request body must contain valid JSON.' });
  }
  if (error.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Request body is too large.' });
  }
  if (!pool || error.message?.startsWith('Database is not configured')) {
    return res.status(503).json({ error: 'Authentication is unavailable. Configure DATABASE_URL for the backend.' });
  }
  if (typeof error.code === 'string' && (error.code.startsWith('08') || ['ECONNREFUSED', 'ETIMEDOUT', '57P01'].includes(error.code))) {
    return res.status(503).json({ error: 'The database is temporarily unavailable. Check the Neon connection and try again.' });
  }
  return res.status(500).json({ error: 'The request could not be completed. Please try again.' });
});

const port = Number(process.env.PORT ?? (isProduction ? 3000 : 3001));
app.listen(port, '0.0.0.0', () => {
  console.log(`MFC PET LIFE server listening on port ${port}. Database target fingerprint: ${databaseTargetFingerprint}.`);
});
