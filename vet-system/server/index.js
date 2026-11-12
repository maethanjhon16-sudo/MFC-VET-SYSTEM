import 'dotenv/config';
import express from 'express';
import { rateLimit } from 'express-rate-limit';
import helmet from 'helmet';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { databaseTargetFingerprint, ensureSchema, pool } from './database.js';
import { hashPassword, verifyPassword } from './passwords.js';
import {
  appointmentServices,
  availableAppointmentTimes,
  isValidAppointmentTime,
  isWithinDoctorAvailability,
} from './appointmentRules.js';
import { canTransitionOrderStatus } from './orderRules.js';
import { productCatalog } from './productCatalog.js';

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

function manilaToday() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
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

async function staffPetAccess(req, petId) {
  const result = await pool.query(
    `SELECT p.id, p.owner_id
     FROM pets p
     WHERE p.id = $1
       AND ($2 = 'admin' OR EXISTS (
         SELECT 1 FROM appointments a
         WHERE a.pet_id = p.id AND a.doctor_id = $3
           AND a.status IN ('pending', 'confirmed')
       ) OR EXISTS (
         SELECT 1 FROM doctor_conversations c
         WHERE c.pet_id = p.id AND c.owner_id = p.owner_id AND c.doctor_id = $3
       ))`,
    [petId, req.user.role, req.user.id],
  );
  return result.rows[0] ?? null;
}

function validDateOnly(value) {
  return typeof value === 'string'
    && /^\d{4}-\d{2}-\d{2}$/.test(value)
    && Number.isFinite(Date.parse(`${value}T00:00:00Z`))
    && new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value;
}

async function doctorIsAvailable(doctorId, scheduledAt, durationMinutes) {
  const date = new Date(scheduledAt);
  const weekdayName = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Manila',
    weekday: 'short',
  }).format(date);
  const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(weekdayName);
  const result = await pool.query(
    `SELECT weekday, is_available, starts_at, ends_at
     FROM doctor_availability WHERE doctor_id = $1 AND weekday = $2`,
    [doctorId, weekday],
  );
  const availability = result.rows[0] ?? {
    weekday,
    is_available: weekday >= 1 && weekday <= 6,
    starts_at: '08:00',
    ends_at: '18:00',
  };
  return isWithinDoctorAvailability(date.toISOString(), durationMinutes, availability);
}

async function findBookableDoctor(client, scheduledAt, durationMinutes, preferredDoctorId) {
  const date = new Date(scheduledAt);
  const weekdayName = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Manila',
    weekday: 'short',
  }).format(date);
  const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(weekdayName);
  const result = await client.query(
    `SELECT u.id, COALESCE(a.weekday, $1)::smallint AS weekday,
            COALESCE(a.is_available, $1 BETWEEN 1 AND 6) AS is_available,
            COALESCE(a.starts_at, '08:00'::time) AS starts_at,
            COALESCE(a.ends_at, '18:00'::time) AS ends_at
     FROM users u
     LEFT JOIN doctor_availability a ON a.doctor_id = u.id AND a.weekday = $1
     WHERE u.role = 'doctor' AND u.status = 'active'
       AND ($2::text IS NULL OR u.id = $2)
     ORDER BY u.full_name, u.id`,
    [weekday, preferredDoctorId],
  );

  for (const candidate of result.rows) {
    if (!isWithinDoctorAvailability(date.toISOString(), durationMinutes, candidate)) continue;

    await client.query('SELECT pg_advisory_xact_lock(hashtext($1)::bigint)', [candidate.id]);
    const conflict = await client.query(
      `SELECT id FROM appointments
       WHERE doctor_id = $1 AND status IN ('pending', 'confirmed')
         AND scheduled_at < $2::timestamptz + ($3::integer * interval '1 minute')
         AND scheduled_at + (duration_minutes * interval '1 minute') > $2::timestamptz
       LIMIT 1`,
      [candidate.id, date.toISOString(), durationMinutes],
    );
    if (!conflict.rowCount) return candidate.id;
  }

  return null;
}

function appointmentDto(row) {
  const service = appointmentServices.get(row.service_id);
  return {
    id: row.id,
    petId: row.pet_id ?? null,
    petName: row.pet_name,
    petSpecies: row.pet_species ?? null,
    petBreed: row.pet_breed ?? null,
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
    `SELECT d.id, d.full_name, d.specialization,
            json_agg(json_build_object(
              'weekday', w.weekday,
              'isAvailable', COALESCE(a.is_available, w.weekday BETWEEN 1 AND 6),
              'startsAt', COALESCE(to_char(a.starts_at, 'HH24:MI'), '08:00'),
              'endsAt', COALESCE(to_char(a.ends_at, 'HH24:MI'), '18:00')
            ) ORDER BY w.weekday) AS availability
     FROM users d
     CROSS JOIN generate_series(0, 6) AS w(weekday)
     LEFT JOIN doctor_availability a ON a.doctor_id = d.id AND a.weekday = w.weekday
     WHERE d.role = 'doctor' AND d.status = 'active'
     GROUP BY d.id
     ORDER BY d.full_name ASC`,
  );
  res.json({
    doctors: result.rows.map((row) => ({
      id: row.id,
      fullName: row.full_name,
      specialization: row.specialization,
      availability: row.availability,
    })),
  });
}));

app.get('/api/owner/services', requireOwner, asyncRoute(async (_req, res) => {
  const result = await pool.query(
    `SELECT service_id AS "serviceId", is_enabled AS "isEnabled", updated_at AS "updatedAt"
     FROM clinic_services`,
  );
  res.json({ services: result.rows });
}));

app.get('/api/owner/appointments/availability', requireOwner, asyncRoute(async (req, res) => {
  const { date, serviceId } = req.query;
  const preferredDoctorId = req.query.doctorId || null;
  const service = appointmentServices.get(serviceId);
  if (!validDateOnly(date)) return res.status(400).json({ error: 'Choose a valid appointment date.' });
  if (!service) return res.status(400).json({ error: 'Choose a valid clinic service.' });
  if (preferredDoctorId !== null && (typeof preferredDoctorId !== 'string' || !/^[0-9a-f-]{36}$/i.test(preferredDoctorId))) {
    return res.status(400).json({ error: 'Choose a valid veterinarian or any available veterinarian.' });
  }
  const serviceSetting = await pool.query(
    'SELECT is_enabled FROM clinic_services WHERE service_id = $1',
    [serviceId],
  );
  if (!serviceSetting.rows[0]?.is_enabled) {
    return res.status(400).json({ error: 'This clinic service is currently unavailable for booking.' });
  }

  const dayStart = new Date(`${date}T00:00:00+08:00`);
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
  const weekdayName = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Manila',
    weekday: 'short',
  }).format(dayStart);
  const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(weekdayName);
  const doctorsResult = await pool.query(
    `SELECT u.id, COALESCE(a.weekday, $1)::smallint AS weekday,
            COALESCE(a.is_available, $1 BETWEEN 1 AND 6) AS is_available,
            COALESCE(a.starts_at, '08:00'::time) AS starts_at,
            COALESCE(a.ends_at, '18:00'::time) AS ends_at
     FROM users u
     LEFT JOIN doctor_availability a ON a.doctor_id = u.id AND a.weekday = $1
     WHERE u.role = 'doctor' AND u.status = 'active'
       AND ($2::text IS NULL OR u.id = $2)
     ORDER BY u.full_name, u.id`,
    [weekday, preferredDoctorId],
  );
  if (doctorsResult.rows.length === 0) return res.json({ times: [] });

  const doctorIds = doctorsResult.rows.map((doctor) => doctor.id);
  const appointmentsResult = await pool.query(
    `SELECT doctor_id, scheduled_at, duration_minutes
     FROM appointments
     WHERE doctor_id = ANY($1::text[])
       AND status IN ('pending', 'confirmed')
       AND scheduled_at < $3::timestamptz
       AND scheduled_at + (duration_minutes * interval '1 minute') > $2::timestamptz`,
    [doctorIds, dayStart, dayEnd],
  );

  res.json({
    times: availableAppointmentTimes(
      date,
      service.durationMinutes,
      doctorsResult.rows,
      appointmentsResult.rows,
      preferredDoctorId,
    ),
  });
}));

app.get('/api/owner/profile', requireOwner, asyncRoute(async (req, res) => {
  const result = await pool.query(
    `SELECT id, full_name AS "fullName", email, phone, province, city, barangay
     FROM users WHERE id = $1 AND role = 'owner'`,
    [req.user.id],
  );
  res.json({ profile: result.rows[0] ?? null });
}));

app.patch('/api/owner/profile', requireSameOrigin, requireOwner, asyncRoute(async (req, res) => {
  const body = req.body ?? {};
  const fullName = typeof body.fullName === 'string' ? body.fullName.trim() : '';
  const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
  const province = typeof body.province === 'string' ? body.province.trim() : '';
  const city = typeof body.city === 'string' ? body.city.trim() : '';
  const barangay = typeof body.barangay === 'string' ? body.barangay.trim() : '';
  if (!validText(fullName, 120) || phone.length > 32 || province.length > 120 || city.length > 120 || barangay.length > 120) {
    return res.status(400).json({ error: 'Enter a name and valid contact or address details.' });
  }
  const result = await pool.query(
    `UPDATE users
     SET full_name = $2, phone = $3, province = $4, city = $5, barangay = $6
     WHERE id = $1 AND role = 'owner'
     RETURNING id, full_name AS "fullName", email, phone, province, city, barangay`,
    [req.user.id, fullName, phone, province || null, city || null, barangay || null],
  );
  if (!result.rowCount) return res.status(404).json({ error: 'Your owner profile could not be found.' });
  return res.json({ profile: result.rows[0] });
}));

app.get('/api/owner/pets', requireOwner, asyncRoute(async (req, res) => {
  const result = await pool.query(
    `SELECT id, name, species, breed, date_of_birth, created_at
     FROM pets
     WHERE owner_id = $1
     ORDER BY created_at ASC`,
    [req.user.id],
  );
  res.json({
    pets: result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      species: row.species,
      breed: row.breed,
      dateOfBirth: row.date_of_birth,
      createdAt: row.created_at,
    })),
  });
}));

app.patch('/api/owner/pets/:id', requireSameOrigin, requireOwner, asyncRoute(async (req, res) => {
  const body = req.body ?? {};
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const species = body.species;
  const breed = typeof body.breed === 'string' ? body.breed.trim() : '';
  const dateOfBirth = body.dateOfBirth === '' ? null : body.dateOfBirth ?? null;
  if (!validText(name, 80)) return res.status(400).json({ error: 'Enter a pet name (up to 80 characters).' });
  if (!['Dog', 'Cat', 'Bird', 'Rabbit', 'Other'].includes(species)) {
    return res.status(400).json({ error: 'Choose a valid pet species.' });
  }
  if (typeof body.breed !== 'string' || breed.length > 80) {
    return res.status(400).json({ error: 'Breed must be 80 characters or fewer.' });
  }
  if (dateOfBirth !== null && (!validDateOnly(dateOfBirth) || dateOfBirth > manilaToday())) {
    return res.status(400).json({ error: 'Enter a valid date of birth that is not in the future.' });
  }
  const result = await pool.query(
    `UPDATE pets
     SET name = $3, species = $4, breed = $5, date_of_birth = $6
     WHERE id = $1 AND owner_id = $2
     RETURNING id, name, species, breed, date_of_birth, created_at`,
    [req.params.id, req.user.id, name, species, breed, dateOfBirth],
  );
  if (!result.rowCount) return res.status(404).json({ error: 'That pet profile could not be found.' });
  const row = result.rows[0];
  return res.json({
    pet: {
      id: row.id,
      name: row.name,
      species: row.species,
      breed: row.breed,
      dateOfBirth: row.date_of_birth,
      createdAt: row.created_at,
    },
  });
}));

app.get('/api/owner/medical-records', requireOwner, asyncRoute(async (req, res) => {
  const [records, labResults] = await Promise.all([
    pool.query(
      `SELECT r.id, r.pet_id AS "petId", r.appointment_id AS "appointmentId",
              r.record_type AS "recordType", r.summary, r.diagnosis, r.treatment,
              r.follow_up_at AS "followUpAt", r.created_at AS "createdAt",
              p.name AS "petName", p.species, d.full_name AS "doctorName"
       FROM clinical_records r
       JOIN pets p ON p.id = r.pet_id
       JOIN users d ON d.id = r.doctor_id
       WHERE p.owner_id = $1
       ORDER BY r.created_at DESC
       LIMIT 300`,
      [req.user.id],
    ),
    pool.query(
      `SELECT l.id, l.pet_id AS "petId", l.appointment_id AS "appointmentId",
              l.test_name AS "testName", l.status, l.result_text AS "resultText",
              l.requested_at AS "requestedAt", l.reviewed_at AS "reviewedAt",
              p.name AS "petName", p.species, d.full_name AS "doctorName"
       FROM lab_results l
       JOIN pets p ON p.id = l.pet_id
       JOIN users d ON d.id = l.doctor_id
       WHERE p.owner_id = $1
       ORDER BY l.requested_at DESC
       LIMIT 300`,
      [req.user.id],
    ),
  ]);
  res.json({ records: records.rows, labResults: labResults.rows });
}));

app.post('/api/owner/pets', requireSameOrigin, requireOwner, asyncRoute(async (req, res) => {
  const body = req.body ?? {};
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const species = body.species;
  const breed = typeof body.breed === 'string' ? body.breed.trim() : '';
  const dateOfBirth = body.dateOfBirth === '' ? null : body.dateOfBirth ?? null;
  if (!validText(name, 80)) return res.status(400).json({ error: 'Enter a pet name (up to 80 characters).' });
  if (!['Dog', 'Cat', 'Bird', 'Rabbit', 'Other'].includes(species)) {
    return res.status(400).json({ error: 'Choose a valid pet species.' });
  }
  if (typeof body.breed !== 'string' || body.breed.trim().length > 80) {
    return res.status(400).json({ error: 'Breed must be 80 characters or fewer.' });
  }
  if (
    dateOfBirth !== null
    && (
      typeof dateOfBirth !== 'string'
      || !/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)
      || !Number.isFinite(Date.parse(`${dateOfBirth}T00:00:00Z`))
      || new Date(`${dateOfBirth}T00:00:00Z`).toISOString().slice(0, 10) !== dateOfBirth
      || dateOfBirth > manilaToday()
    )
  ) {
    return res.status(400).json({ error: 'Enter a valid date of birth that is not in the future.' });
  }

  const result = await pool.query(
    `INSERT INTO pets (id, owner_id, name, species, breed, date_of_birth)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, name, species, breed, date_of_birth, created_at`,
    [randomUUID(), req.user.id, name, species, breed, dateOfBirth],
  );
  const row = result.rows[0];
  return res.status(201).json({
    pet: {
      id: row.id,
      name: row.name,
      species: row.species,
      breed: row.breed,
      dateOfBirth: row.date_of_birth,
      createdAt: row.created_at,
    },
  });
}));

app.get('/api/owner/appointments', requireOwner, asyncRoute(async (req, res) => {
  const result = await pool.query(
    `SELECT a.id, a.pet_id, a.pet_name, p.species AS pet_species, p.breed AS pet_breed,
            a.service_id, a.doctor_id, a.scheduled_at, a.notes, a.status, a.created_at,
            d.full_name AS doctor_name
     FROM appointments a
     LEFT JOIN pets p ON p.id = a.pet_id
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
  const petId = body.petId;
  const serviceId = body.serviceId;
  const service = appointmentServices.get(serviceId);
  const doctorId = body.doctorId === '' ? null : body.doctorId ?? null;
  const notes = body.notes === undefined ? '' : body.notes;

  if (typeof petId !== 'string' || !/^[0-9a-f-]{36}$/i.test(petId)) {
    return res.status(400).json({ error: 'Choose one of your saved pet profiles.' });
  }
  if (!service) return res.status(400).json({ error: 'Choose a valid clinic service.' });
  const serviceAvailability = await pool.query(
    'SELECT is_enabled FROM clinic_services WHERE service_id = $1',
    [serviceId],
  );
  if (!serviceAvailability.rows[0]?.is_enabled) {
    return res.status(400).json({ error: 'This clinic service is currently unavailable for booking.' });
  }
  if (doctorId !== null && (typeof doctorId !== 'string' || !/^[0-9a-f-]{36}$/i.test(doctorId))) {
    return res.status(400).json({ error: 'Choose a valid veterinarian or select any available veterinarian.' });
  }
  if (!isValidAppointmentTime(body.scheduledAt, service.durationMinutes)) {
    return res.status(400).json({ error: 'Choose a future half-hour time within the next 90 days.' });
  }
  if (typeof notes !== 'string' || notes.trim().length > 500) {
    return res.status(400).json({ error: 'Visit notes must be 500 characters or fewer.' });
  }

  const petResult = await pool.query(
    'SELECT id, name FROM pets WHERE id = $1 AND owner_id = $2',
    [petId, req.user.id],
  );
  if (!petResult.rowCount) return res.status(404).json({ error: 'That pet profile could not be found in your account.' });

  const client = await pool.connect();
  let transactionOpen = false;
  try {
    await client.query('BEGIN');
    transactionOpen = true;
    const assignedDoctorId = await findBookableDoctor(
      client,
      body.scheduledAt,
      service.durationMinutes,
      doctorId,
    );
    if (!assignedDoctorId) {
      await client.query('ROLLBACK');
      transactionOpen = false;
      return res.status(409).json({
        error: doctorId
          ? 'That veterinarian is unavailable or already has an overlapping appointment at the selected time.'
          : 'No veterinarian is free at the selected time. Choose another time or veterinarian.',
      });
    }

    const appointmentId = randomUUID();
    await client.query(
      `INSERT INTO appointments (
         id, owner_id, pet_id, pet_name, service_id, doctor_id, scheduled_at,
         duration_minutes, notes, status
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending')`,
      [
        appointmentId, req.user.id, petId, petResult.rows[0].name, serviceId, assignedDoctorId,
        body.scheduledAt, service.durationMinutes, notes.trim(),
      ],
    );
    const result = await client.query(
      `SELECT a.id, a.pet_id, a.pet_name, p.species AS pet_species, p.breed AS pet_breed,
              a.service_id, a.doctor_id, d.full_name AS doctor_name, a.scheduled_at,
              a.notes, a.status, a.created_at
       FROM appointments a
       LEFT JOIN pets p ON p.id = a.pet_id
       LEFT JOIN users d ON d.id = a.doctor_id
       WHERE a.id = $1`,
      [appointmentId],
    );
    if (!result.rows[0]) throw new Error('The saved appointment could not be loaded.');

    await client.query('COMMIT');
    transactionOpen = false;
    return res.status(201).json({ appointment: appointmentDto(result.rows[0]) });
  } catch (error) {
    if (transactionOpen) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        console.error('Appointment booking rollback failed.', {
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

app.get('/api/owner/conversations', requireOwner, asyncRoute(async (req, res) => {
  const result = await pool.query(
    `SELECT c.id, c.pet_id AS "petId", c.doctor_id AS "doctorId",
            p.name AS "petName", d.full_name AS "doctorName",
            c.updated_at AS "updatedAt",
            latest.body AS "latestMessage", latest.created_at AS "latestMessageAt",
            COALESCE(unread.count, 0)::integer AS "unreadCount"
     FROM doctor_conversations c
     JOIN pets p ON p.id = c.pet_id
     JOIN users d ON d.id = c.doctor_id
     LEFT JOIN LATERAL (
       SELECT body, created_at FROM doctor_messages
       WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1
     ) latest ON true
     LEFT JOIN LATERAL (
       SELECT count(*) AS count FROM doctor_messages
       WHERE conversation_id = c.id AND sender_id <> $1 AND read_at IS NULL
     ) unread ON true
     WHERE c.owner_id = $1
     ORDER BY COALESCE(latest.created_at, c.updated_at) DESC
     LIMIT 200`,
    [req.user.id],
  );
  res.json({ conversations: result.rows });
}));

app.post('/api/owner/conversations', requireSameOrigin, requireOwner, asyncRoute(async (req, res) => {
  const { petId, doctorId, body } = req.body ?? {};
  if (
    typeof petId !== 'string' || !/^[0-9a-f-]{36}$/i.test(petId)
    || typeof doctorId !== 'string' || !/^[0-9a-f-]{36}$/i.test(doctorId)
    || !validText(body, 2000)
  ) {
    return res.status(400).json({ error: 'Choose your pet and a veterinarian, then enter a message.' });
  }
  const petResult = await pool.query(
    'SELECT id FROM pets WHERE id = $1 AND owner_id = $2',
    [petId, req.user.id],
  );
  if (!petResult.rowCount) return res.status(404).json({ error: 'That pet profile could not be found in your account.' });
  const doctorResult = await pool.query(
    "SELECT id FROM users WHERE id = $1 AND role = 'doctor' AND status = 'active'",
    [doctorId],
  );
  if (!doctorResult.rowCount) return res.status(404).json({ error: 'That veterinarian is not available.' });

  const client = await pool.connect();
  let transactionOpen = false;
  try {
    await client.query('BEGIN');
    transactionOpen = true;
    const conversation = await client.query(
      `INSERT INTO doctor_conversations (id, owner_id, doctor_id, pet_id)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (owner_id, doctor_id, pet_id)
       DO UPDATE SET updated_at = now()
       RETURNING id`,
      [randomUUID(), req.user.id, doctorId, petId],
    );
    const message = await client.query(
      `INSERT INTO doctor_messages (id, conversation_id, sender_id, body)
       VALUES ($1, $2, $3, $4)
       RETURNING id, sender_id AS "senderId", body, created_at AS "createdAt", read_at AS "readAt"`,
      [randomUUID(), conversation.rows[0].id, req.user.id, body.trim()],
    );
    await client.query('COMMIT');
    transactionOpen = false;
    return res.status(201).json({ conversationId: conversation.rows[0].id, message: message.rows[0] });
  } catch (error) {
    if (transactionOpen) await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}));

app.get('/api/owner/conversations/:id/messages', requireOwner, asyncRoute(async (req, res) => {
  const conversation = await pool.query(
    'SELECT id FROM doctor_conversations WHERE id = $1 AND owner_id = $2',
    [req.params.id, req.user.id],
  );
  if (!conversation.rowCount) return res.status(404).json({ error: 'That conversation was not found.' });
  await pool.query(
    `UPDATE doctor_messages SET read_at = now()
     WHERE conversation_id = $1 AND sender_id <> $2 AND read_at IS NULL`,
    [req.params.id, req.user.id],
  );
  const result = await pool.query(
    `SELECT id, sender_id AS "senderId", body, created_at AS "createdAt", read_at AS "readAt"
     FROM doctor_messages WHERE conversation_id = $1 ORDER BY created_at ASC`,
    [req.params.id],
  );
  res.json({ messages: result.rows });
}));

app.post('/api/owner/conversations/:id/messages', requireSameOrigin, requireOwner, asyncRoute(async (req, res) => {
  const body = req.body?.body;
  if (!validText(body, 2000)) return res.status(400).json({ error: 'Enter a message up to 2,000 characters.' });
  const client = await pool.connect();
  try {
    const conversation = await client.query(
      'SELECT id FROM doctor_conversations WHERE id = $1 AND owner_id = $2',
      [req.params.id, req.user.id],
    );
    if (!conversation.rowCount) return res.status(404).json({ error: 'That conversation was not found.' });
    const result = await client.query(
      `INSERT INTO doctor_messages (id, conversation_id, sender_id, body)
       VALUES ($1, $2, $3, $4)
       RETURNING id, sender_id AS "senderId", body, created_at AS "createdAt", read_at AS "readAt"`,
      [randomUUID(), req.params.id, req.user.id, body.trim()],
    );
    await client.query('UPDATE doctor_conversations SET updated_at = now() WHERE id = $1', [req.params.id]);
    return res.status(201).json({ message: result.rows[0] });
  } finally {
    client.release();
  }
}));

app.get('/api/owner/orders', requireOwner, asyncRoute(async (req, res) => {
  const result = await pool.query(
    `SELECT o.id, o.status, o.payment_method AS "paymentMethod",
            o.fulfillment_method AS "fulfillmentMethod",
            o.delivery_address AS "deliveryAddress", o.contact_phone AS "contactPhone",
            o.total_amount AS "totalAmount", o.created_at AS "createdAt",
            COALESCE(json_agg(json_build_object(
              'productId', i.product_id, 'productName', i.product_name,
              'quantity', i.quantity, 'unitPrice', i.unit_price
            ) ORDER BY i.product_name) FILTER (WHERE i.id IS NOT NULL), '[]'::json) AS items
     FROM orders o
     LEFT JOIN order_items i ON i.order_id = o.id
     WHERE o.owner_id = $1
     GROUP BY o.id
     ORDER BY o.created_at DESC
     LIMIT 100`,
    [req.user.id],
  );
  res.json({ orders: result.rows });
}));

app.post('/api/owner/orders', requireSameOrigin, requireOwner, appointmentLimiter, asyncRoute(async (req, res) => {
  const body = req.body ?? {};
  const items = body.items;
  const fulfillmentMethod = body.fulfillmentMethod;
  const deliveryAddress = typeof body.deliveryAddress === 'string' ? body.deliveryAddress.trim() : '';
  const contactPhone = typeof body.contactPhone === 'string' ? body.contactPhone.trim() : '';
  if (!Array.isArray(items) || items.length === 0 || items.length > 50) {
    return res.status(400).json({ error: 'Add between 1 and 50 products to your order.' });
  }
  if (!['clinic_pickup', 'delivery'].includes(fulfillmentMethod)) {
    return res.status(400).json({ error: 'Choose clinic pickup or delivery.' });
  }
  if (fulfillmentMethod === 'delivery' && !validText(deliveryAddress, 500)) {
    return res.status(400).json({ error: 'Enter a delivery address up to 500 characters.' });
  }
  if (!validText(contactPhone, 32)) return res.status(400).json({ error: 'Enter a contact phone number.' });

  const orderItems = new Map();
  for (const item of items) {
    if (
      typeof item?.productId !== 'string'
      || !Number.isInteger(item.sizeIndex)
      || !Number.isInteger(item.quantity)
      || item.quantity < 1
      || item.quantity > 20
    ) {
      return res.status(400).json({ error: 'One or more order items are invalid.' });
    }
    const product = productCatalog.get(item.productId);
    const size = product?.sizes[item.sizeIndex];
    if (!product || !size) return res.status(400).json({ error: 'One or more products are no longer available.' });
    const key = `${item.productId}:${item.sizeIndex}`;
    const existing = orderItems.get(key);
    const quantity = (existing?.quantity ?? 0) + item.quantity;
    if (quantity > 20) return res.status(400).json({ error: 'A product cannot exceed 20 units per order.' });
    orderItems.set(key, {
      productId: item.productId,
      productName: `${product.name}${size.label === 'Standard' ? '' : ` · ${size.label}`}`,
      quantity,
      unitPrice: size.price,
    });
  }
  const lines = [...orderItems.values()];
  const total = lines.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  if (total <= 0 || total > 10000000) return res.status(400).json({ error: 'The order total is outside the allowed range.' });

  const client = await pool.connect();
  let transactionOpen = false;
  try {
    await client.query('BEGIN');
    transactionOpen = true;
    const orderId = randomUUID();
    const paymentMethod = fulfillmentMethod === 'delivery' ? 'cash_on_delivery' : 'pay_at_clinic';
    await client.query(
      `INSERT INTO orders (
         id, owner_id, status, payment_method, fulfillment_method,
         delivery_address, contact_phone, total_amount
       ) VALUES ($1, $2, 'new', $3, $4, $5, $6, $7)`,
      [
        orderId, req.user.id, paymentMethod, fulfillmentMethod,
        fulfillmentMethod === 'delivery' ? deliveryAddress : '', contactPhone, total,
      ],
    );
    for (const item of lines) {
      await client.query(
        `INSERT INTO order_items (id, order_id, product_id, product_name, quantity, unit_price)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [randomUUID(), orderId, item.productId, item.productName, item.quantity, item.unitPrice],
      );
    }
    await client.query('COMMIT');
    transactionOpen = false;
    return res.status(201).json({ order: { id: orderId, status: 'new', totalAmount: total } });
  } catch (error) {
    if (transactionOpen) await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}));

app.get('/api/staff/appointments', requireClinicalStaff, asyncRoute(async (req, res) => {
  const result = req.user.role === 'doctor'
    ? await pool.query(
      `SELECT a.id, a.pet_name, a.service_id, a.doctor_id, a.scheduled_at,
              a.pet_id, p.species AS pet_species, p.breed AS pet_breed,
              a.notes, a.status, a.created_at, o.full_name AS owner_name,
              o.email AS owner_email, o.phone AS owner_phone, d.full_name AS doctor_name
       FROM appointments a
       JOIN users o ON o.id = a.owner_id
       LEFT JOIN pets p ON p.id = a.pet_id
       LEFT JOIN users d ON d.id = a.doctor_id
       WHERE a.status = 'pending' AND (a.doctor_id = $1 OR a.doctor_id IS NULL)
       ORDER BY a.scheduled_at ASC
       LIMIT 100`,
      [req.user.id],
    )
    : await pool.query(
      `SELECT a.id, a.pet_name, a.service_id, a.doctor_id, a.scheduled_at,
              a.pet_id, p.species AS pet_species, p.breed AS pet_breed,
              a.notes, a.status, a.created_at, o.full_name AS owner_name,
              o.email AS owner_email, o.phone AS owner_phone, d.full_name AS doctor_name
       FROM appointments a
       JOIN users o ON o.id = a.owner_id
       LEFT JOIN pets p ON p.id = a.pet_id
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

app.get('/api/staff/patients', requireClinicalStaff, asyncRoute(async (req, res) => {
  const result = await pool.query(
    `SELECT p.id, p.name, p.species, p.breed, p.date_of_birth, p.created_at,
            o.full_name AS owner_name, o.email AS owner_email, o.phone AS owner_phone,
            MAX(a.scheduled_at) FILTER (
              WHERE a.status = 'confirmed' AND a.scheduled_at <= now()
            ) AS last_visit
     FROM pets p
     JOIN users o ON o.id = p.owner_id
     JOIN appointments a ON a.pet_id = p.id AND a.status IN ('pending', 'confirmed')
     WHERE ($1 = 'admin' OR a.doctor_id = $2)
     GROUP BY p.id, o.id
     ORDER BY MAX(a.scheduled_at) FILTER (
       WHERE a.status = 'confirmed' AND a.scheduled_at <= now()
     ) DESC NULLS LAST, p.name ASC`,
    [req.user.role, req.user.id],
  );
  res.json({
    patients: result.rows.map((row) => ({
      id: row.id,
      name: row.name,
      species: row.species,
      breed: row.breed,
      dateOfBirth: row.date_of_birth,
      createdAt: row.created_at,
      ownerName: row.owner_name,
      ownerEmail: row.owner_email,
      ownerPhone: row.owner_phone,
      lastVisit: row.last_visit,
    })),
  });
}));

app.get('/api/staff/clinical-records', requireClinicalStaff, asyncRoute(async (req, res) => {
  const result = await pool.query(
        `SELECT r.id, r.pet_id AS "petId", r.appointment_id AS "appointmentId",
          r.record_type AS "recordType", r.summary, r.diagnosis, r.treatment,
          r.follow_up_at AS "followUpAt", r.created_at AS "createdAt",
          p.name AS "petName", p.species, o.full_name AS "ownerName",
          d.full_name AS "doctorName"
     FROM clinical_records r
     JOIN pets p ON p.id = r.pet_id
     JOIN users o ON o.id = p.owner_id
     JOIN users d ON d.id = r.doctor_id
     WHERE ($1 = 'admin' OR r.doctor_id = $2)
     ORDER BY r.created_at DESC
     LIMIT 500`,
    [req.user.role, req.user.id],
  );
  res.json({ records: result.rows });
}));

app.post('/api/staff/clinical-records', requireSameOrigin, requireClinicalStaff, asyncRoute(async (req, res) => {
  const body = req.body ?? {};
  const petId = body.petId;
  const recordType = typeof body.recordType === 'string' ? body.recordType.trim() : '';
  const summary = typeof body.summary === 'string' ? body.summary.trim() : '';
  const diagnosis = typeof body.diagnosis === 'string' ? body.diagnosis.trim() : '';
  const treatment = typeof body.treatment === 'string' ? body.treatment.trim() : '';
  const followUpAt = body.followUpAt || null;
  if (typeof petId !== 'string' || !/^[0-9a-f-]{36}$/i.test(petId)) {
    return res.status(400).json({ error: 'Choose a patient profile.' });
  }
  if (!validText(recordType, 60) || !validText(summary, 3000)) {
    return res.status(400).json({ error: 'Enter a record type and summary.' });
  }
  if (diagnosis.length > 2000 || treatment.length > 3000) {
    return res.status(400).json({ error: 'Diagnosis or treatment details are too long.' });
  }
  if (followUpAt !== null && !validDateOnly(followUpAt)) {
    return res.status(400).json({ error: 'Enter a valid follow-up date.' });
  }
  const pet = await staffPetAccess(req, petId);
  if (!pet) return res.status(404).json({ error: 'That patient is not linked to your clinic schedule.' });
  const doctorId = req.user.role === 'doctor' ? req.user.id : body.doctorId;
  if (typeof doctorId !== 'string' || !/^[0-9a-f-]{36}$/i.test(doctorId)) {
    return res.status(400).json({ error: 'Choose the veterinarian responsible for this record.' });
  }
  const doctor = await pool.query(
    "SELECT id FROM users WHERE id = $1 AND role = 'doctor' AND status = 'active'",
    [doctorId],
  );
  if (!doctor.rowCount) return res.status(400).json({ error: 'Choose an active veterinarian.' });
  const result = await pool.query(
    `INSERT INTO clinical_records (id, pet_id, doctor_id, record_type, summary, diagnosis, treatment, follow_up_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id, pet_id AS "petId", appointment_id AS "appointmentId",
       record_type AS "recordType", summary, diagnosis, treatment,
       follow_up_at AS "followUpAt", created_at AS "createdAt"`,
    [randomUUID(), petId, doctorId, recordType, summary, diagnosis, treatment, followUpAt],
  );
  return res.status(201).json({ record: result.rows[0] });
}));

app.get('/api/staff/lab-results', requireClinicalStaff, asyncRoute(async (req, res) => {
  const result = await pool.query(
        `SELECT l.id, l.pet_id AS "petId", l.appointment_id AS "appointmentId",
          l.test_name AS "testName", l.status, l.result_text AS "resultText",
          l.requested_at AS "requestedAt", l.reviewed_at AS "reviewedAt",
          p.name AS "petName", p.species, o.full_name AS "ownerName"
     FROM lab_results l
     JOIN pets p ON p.id = l.pet_id
     JOIN users o ON o.id = p.owner_id
     WHERE ($1 = 'admin' OR l.doctor_id = $2)
     ORDER BY l.requested_at DESC
     LIMIT 500`,
    [req.user.role, req.user.id],
  );
  res.json({ labResults: result.rows });
}));

app.post('/api/staff/lab-results', requireSameOrigin, requireClinicalStaff, asyncRoute(async (req, res) => {
  const body = req.body ?? {};
  const { petId, testName, appointmentId = null } = body;
  if (typeof petId !== 'string' || !/^[0-9a-f-]{36}$/i.test(petId) || !validText(testName, 120)) {
    return res.status(400).json({ error: 'Choose a patient and enter the requested test.' });
  }
  const pet = await staffPetAccess(req, petId);
  if (!pet) return res.status(404).json({ error: 'That patient is not linked to your clinic schedule.' });
  if (appointmentId !== null && (typeof appointmentId !== 'string' || !/^[0-9a-f-]{36}$/i.test(appointmentId))) {
    return res.status(400).json({ error: 'Choose a valid appointment.' });
  }
  const result = await pool.query(
    `INSERT INTO lab_results (id, pet_id, doctor_id, appointment_id, test_name)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, pet_id AS "petId", appointment_id AS "appointmentId",
       test_name AS "testName", status, result_text AS "resultText",
       requested_at AS "requestedAt", reviewed_at AS "reviewedAt"`,
    [randomUUID(), petId, req.user.id, appointmentId, testName.trim()],
  );
  return res.status(201).json({ labResult: result.rows[0] });
}));

app.post('/api/staff/lab-results/:id/review', requireSameOrigin, requireClinicalStaff, asyncRoute(async (req, res) => {
  const result = await pool.query(
    `UPDATE lab_results
     SET status = 'reviewed', reviewed_at = now()
     WHERE id = $1 AND status = 'ready' AND ($2 = 'admin' OR doctor_id = $3)
    RETURNING id, status, reviewed_at AS "reviewedAt"`,
    [req.params.id, req.user.role, req.user.id],
  );
  if (!result.rowCount) return res.status(404).json({ error: 'That ready lab result was not found.' });
  return res.json({ labResult: result.rows[0] });
}));

app.get('/api/staff/follow-ups', requireClinicalStaff, asyncRoute(async (req, res) => {
  const result = await pool.query(
        `SELECT r.id, r.pet_id AS "petId", r.record_type AS "recordType",
          r.summary, r.follow_up_at AS "followUpAt",
          p.name AS "petName", p.species, o.full_name AS "ownerName"
     FROM clinical_records r
     JOIN pets p ON p.id = r.pet_id
     JOIN users o ON o.id = p.owner_id
     WHERE r.follow_up_at IS NOT NULL AND ($1 = 'admin' OR r.doctor_id = $2)
     ORDER BY r.follow_up_at ASC
     LIMIT 500`,
    [req.user.role, req.user.id],
  );
  res.json({ followUps: result.rows });
}));

app.get('/api/staff/conversations', requireClinicalStaff, asyncRoute(async (req, res) => {
  const result = await pool.query(
        `SELECT c.id, c.pet_id AS "petId", c.owner_id AS "ownerId",
          c.doctor_id AS "doctorId", p.name AS "petName",
          u.full_name AS "ownerName", c.updated_at AS "updatedAt",
          latest.body AS "latestMessage", latest.created_at AS "latestMessageAt",
          COALESCE(unread.count, 0)::integer AS "unreadCount"
     FROM doctor_conversations c
     JOIN pets p ON p.id = c.pet_id
     JOIN users u ON u.id = c.owner_id
     LEFT JOIN LATERAL (
       SELECT body, created_at FROM doctor_messages
       WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1
     ) latest ON true
     LEFT JOIN LATERAL (
       SELECT count(*) AS count FROM doctor_messages
       WHERE conversation_id = c.id AND sender_id <> $2 AND read_at IS NULL
     ) unread ON true
     WHERE ($1 = 'admin' OR c.doctor_id = $2)
     ORDER BY COALESCE(latest.created_at, c.updated_at) DESC
     LIMIT 200`,
    [req.user.role, req.user.id],
  );
  res.json({ conversations: result.rows });
}));

app.post('/api/staff/conversations', requireSameOrigin, requireClinicalStaff, asyncRoute(async (req, res) => {
  const { petId, body } = req.body ?? {};
  if (typeof petId !== 'string' || !/^[0-9a-f-]{36}$/i.test(petId) || !validText(body, 2000)) {
    return res.status(400).json({ error: 'Choose a patient and enter a message.' });
  }
  const pet = await staffPetAccess(req, petId);
  if (!pet) return res.status(404).json({ error: 'That patient is not linked to your clinic schedule.' });
  if (req.user.role !== 'doctor') return res.status(400).json({ error: 'Choose a doctor account to start a conversation.' });
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const conversation = await client.query(
      `INSERT INTO doctor_conversations (id, owner_id, doctor_id, pet_id)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (owner_id, doctor_id, pet_id)
       DO UPDATE SET updated_at = now()
       RETURNING id`,
      [randomUUID(), pet.owner_id, req.user.id, petId],
    );
    const message = await client.query(
      `INSERT INTO doctor_messages (id, conversation_id, sender_id, body)
       VALUES ($1, $2, $3, $4)
      RETURNING id, sender_id AS "senderId", body, created_at AS "createdAt", read_at AS "readAt"`,
      [randomUUID(), conversation.rows[0].id, req.user.id, body.trim()],
    );
    await client.query('COMMIT');
    return res.status(201).json({ conversationId: conversation.rows[0].id, message: message.rows[0] });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}));

app.get('/api/staff/conversations/:id/messages', requireClinicalStaff, asyncRoute(async (req, res) => {
  const conversation = await pool.query(
    `SELECT id FROM doctor_conversations WHERE id = $1 AND ($2 = 'admin' OR doctor_id = $3)`,
    [req.params.id, req.user.role, req.user.id],
  );
  if (!conversation.rowCount) return res.status(404).json({ error: 'That conversation was not found.' });
  await pool.query(
    `UPDATE doctor_messages SET read_at = now()
     WHERE conversation_id = $1 AND sender_id <> $2 AND read_at IS NULL`,
    [req.params.id, req.user.id],
  );
  const result = await pool.query(
    `SELECT id, sender_id AS "senderId", body, created_at AS "createdAt", read_at AS "readAt"
     FROM doctor_messages WHERE conversation_id = $1 ORDER BY created_at ASC`,
    [req.params.id],
  );
  res.json({ messages: result.rows });
}));

app.post('/api/staff/conversations/:id/messages', requireSameOrigin, requireClinicalStaff, asyncRoute(async (req, res) => {
  const body = req.body?.body;
  if (!validText(body, 2000)) return res.status(400).json({ error: 'Enter a message up to 2,000 characters.' });
  const client = await pool.connect();
  try {
    const conversation = await client.query(
      `SELECT id FROM doctor_conversations WHERE id = $1 AND ($2 = 'admin' OR doctor_id = $3)`,
      [req.params.id, req.user.role, req.user.id],
    );
    if (!conversation.rowCount) return res.status(404).json({ error: 'That conversation was not found.' });
    const result = await client.query(
      `INSERT INTO doctor_messages (id, conversation_id, sender_id, body)
      VALUES ($1, $2, $3, $4)
      RETURNING id, sender_id AS "senderId", body, created_at AS "createdAt", read_at AS "readAt"`,
      [randomUUID(), req.params.id, req.user.id, body.trim()],
    );
    await client.query('UPDATE doctor_conversations SET updated_at = now() WHERE id = $1', [req.params.id]);
    return res.status(201).json({ message: result.rows[0] });
  } finally {
    client.release();
  }
}));

app.get('/api/staff/services', requireClinicalStaff, asyncRoute(async (_req, res) => {
  const result = await pool.query('SELECT service_id AS "serviceId", is_enabled AS "isEnabled", updated_at AS "updatedAt" FROM clinic_services ORDER BY service_id');
  res.json({ services: result.rows });
}));

app.patch('/api/staff/services/:id', requireSameOrigin, requireClinicalStaff, asyncRoute(async (req, res) => {
  if (!appointmentServices.has(req.params.id) || typeof req.body?.isEnabled !== 'boolean') {
    return res.status(400).json({ error: 'Choose a valid service and availability state.' });
  }
  const result = await pool.query(
    `UPDATE clinic_services SET is_enabled = $2, updated_by = $3, updated_at = now()
    WHERE service_id = $1
    RETURNING service_id AS "serviceId", is_enabled AS "isEnabled", updated_at AS "updatedAt"`,
    [req.params.id, req.body.isEnabled, req.user.id],
  );
  if (!result.rowCount) return res.status(404).json({ error: 'That service is not configured.' });
  res.json({ service: result.rows[0] });
}));

app.get('/api/staff/inventory', requireClinicalStaff, asyncRoute(async (_req, res) => {
  const result = await pool.query('SELECT product_id AS "productId", quantity, updated_by AS "updatedBy", updated_at AS "updatedAt" FROM inventory_stock ORDER BY product_id');
  res.json({ inventory: result.rows });
}));

app.put('/api/staff/inventory/:id', requireSameOrigin, requireClinicalStaff, asyncRoute(async (req, res) => {
  const quantity = req.body?.quantity;
  if (!validText(req.params.id, 100) || !Number.isInteger(quantity) || quantity < 0 || quantity > 1000000) {
    return res.status(400).json({ error: 'Enter a valid product and stock quantity.' });
  }
  const result = await pool.query(
    `INSERT INTO inventory_stock (product_id, quantity, updated_by)
     VALUES ($1, $2, $3)
     ON CONFLICT (product_id) DO UPDATE
       SET quantity = EXCLUDED.quantity, updated_by = EXCLUDED.updated_by, updated_at = now()
    RETURNING product_id AS "productId", quantity, updated_by AS "updatedBy", updated_at AS "updatedAt"`,
    [req.params.id, quantity, req.user.id],
  );
  res.json({ item: result.rows[0] });
}));

app.get('/api/staff/profile', requireClinicalStaff, asyncRoute(async (req, res) => {
  const result = await pool.query(
    `SELECT id, full_name AS "fullName", email, phone, specialization
     FROM users WHERE id = $1 AND role IN ('doctor', 'admin')`,
    [req.user.id],
  );
  res.json({ profile: result.rows[0] ?? null });
}));

app.patch('/api/staff/profile', requireSameOrigin, requireClinicalStaff, asyncRoute(async (req, res) => {
  const fullName = req.body?.fullName;
  const phone = req.body?.phone;
  if (!validText(fullName, 120) || typeof phone !== 'string' || phone.trim().length > 32) {
    return res.status(400).json({ error: 'Enter a name and a valid phone number.' });
  }
  const result = await pool.query(
    `UPDATE users SET full_name = $2, phone = $3
     WHERE id = $1 AND role IN ('doctor', 'admin')
    RETURNING id, full_name AS "fullName", email, phone, specialization`,
    [req.user.id, fullName.trim(), phone.trim()],
  );
  res.json({ profile: result.rows[0] });
}));

app.get('/api/staff/availability', requireClinicalStaff, asyncRoute(async (req, res) => {
  await pool.query(
    `INSERT INTO doctor_availability (doctor_id, weekday, is_available)
     SELECT $1, day, day BETWEEN 1 AND 6 FROM generate_series(0, 6) AS day
     ON CONFLICT (doctor_id, weekday) DO NOTHING`,
    [req.user.id],
  );
  const result = await pool.query(
        `SELECT weekday, is_available AS "isAvailable", starts_at AS "startsAt",
          ends_at AS "endsAt", updated_at AS "updatedAt"
     FROM doctor_availability WHERE doctor_id = $1 ORDER BY weekday`,
    [req.user.id],
  );
  res.json({ availability: result.rows });
}));

app.put('/api/staff/availability', requireSameOrigin, requireClinicalStaff, asyncRoute(async (req, res) => {
  const days = req.body?.days;
  if (!Array.isArray(days) || days.length !== 7) return res.status(400).json({ error: 'Provide availability for all seven weekdays.' });
  const validDays = days.every((day) => Number.isInteger(day.weekday) && day.weekday >= 0 && day.weekday <= 6
    && typeof day.isAvailable === 'boolean'
    && typeof day.startsAt === 'string' && /^\d{2}:\d{2}$/.test(day.startsAt)
    && typeof day.endsAt === 'string' && /^\d{2}:\d{2}$/.test(day.endsAt)
    && day.startsAt < day.endsAt);
  if (!validDays || new Set(days.map((day) => day.weekday)).size !== 7) {
    return res.status(400).json({ error: 'Enter valid, unique hours for each weekday.' });
  }
  const confirmedAppointments = await pool.query(
    `SELECT scheduled_at, duration_minutes
     FROM appointments
     WHERE doctor_id = $1 AND status = 'confirmed' AND scheduled_at > now()`,
    [req.user.id],
  );
  const conflicts = confirmedAppointments.rows.filter((appointment) => {
    const weekdayName = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Manila',
      weekday: 'short',
    }).format(appointment.scheduled_at);
    const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(weekdayName);
    const day = days.find((item) => item.weekday === weekday);
    return !day || !isWithinDoctorAvailability(
      appointment.scheduled_at.toISOString(),
      appointment.duration_minutes,
      {
        weekday: day.weekday,
        is_available: day.isAvailable,
        starts_at: day.startsAt,
        ends_at: day.endsAt,
      },
    );
  });
  if (conflicts.length > 0) {
    return res.status(409).json({
      error: 'These hours conflict with confirmed appointments. Resolve those appointments before saving the new availability.',
    });
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const day of days) {
      await client.query(
        `INSERT INTO doctor_availability (doctor_id, weekday, is_available, starts_at, ends_at)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (doctor_id, weekday) DO UPDATE
           SET is_available = EXCLUDED.is_available, starts_at = EXCLUDED.starts_at,
               ends_at = EXCLUDED.ends_at, updated_at = now()`,
        [req.user.id, day.weekday, day.isAvailable, day.startsAt, day.endsAt],
      );
    }
    await client.query('COMMIT');
    return res.json({ availability: days });
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}));

app.get('/api/staff/preferences', requireClinicalStaff, asyncRoute(async (req, res) => {
  const result = await pool.query(
    `INSERT INTO doctor_preferences (doctor_id) VALUES ($1)
     ON CONFLICT (doctor_id) DO UPDATE SET doctor_id = EXCLUDED.doctor_id
    RETURNING notification_settings AS "notificationSettings", updated_at AS "updatedAt"`,
    [req.user.id],
  );
  res.json({ preferences: result.rows[0] });
}));

app.put('/api/staff/preferences', requireSameOrigin, requireClinicalStaff, asyncRoute(async (req, res) => {
  const settings = req.body?.notificationSettings;
  const keys = ['appointmentRequests', 'followUpReminders', 'labResults', 'inventoryAlerts'];
  if (!settings || typeof settings !== 'object' || keys.some((key) => typeof settings[key] !== 'boolean')) {
    return res.status(400).json({ error: 'Provide all notification preferences.' });
  }
  const result = await pool.query(
    `INSERT INTO doctor_preferences (doctor_id, notification_settings)
     VALUES ($1, $2::jsonb)
     ON CONFLICT (doctor_id) DO UPDATE
       SET notification_settings = EXCLUDED.notification_settings, updated_at = now()
    RETURNING notification_settings AS "notificationSettings", updated_at AS "updatedAt"`,
    [req.user.id, JSON.stringify(Object.fromEntries(keys.map((key) => [key, settings[key]])))],
  );
  res.json({ preferences: result.rows[0] });
}));

app.get('/api/staff/orders', requireClinicalStaff, asyncRoute(async (_req, res) => {
  const result = await pool.query(
        `SELECT o.id, o.status, o.payment_method AS "paymentMethod",
          o.fulfillment_method AS "fulfillmentMethod",
          o.delivery_address AS "deliveryAddress", o.contact_phone AS "contactPhone",
          o.total_amount AS "totalAmount", o.created_at AS "createdAt",
          u.full_name AS "customerName",
            COALESCE(json_agg(json_build_object(
              'productId', i.product_id, 'productName', i.product_name,
              'quantity', i.quantity, 'unitPrice', i.unit_price
            )) FILTER (WHERE i.id IS NOT NULL), '[]'::json) AS items
     FROM orders o
     JOIN users u ON u.id = o.owner_id
     LEFT JOIN order_items i ON i.order_id = o.id
     GROUP BY o.id, u.id
     ORDER BY o.created_at DESC
     LIMIT 500`,
  );
  res.json({ orders: result.rows });
}));

app.patch('/api/staff/orders/:id/status', requireSameOrigin, requireClinicalStaff, asyncRoute(async (req, res) => {
  const nextStatus = req.body?.status;
  const allowedStatuses = ['new', 'preparing', 'out_for_delivery', 'delivered', 'cancelled'];
  if (!allowedStatuses.includes(nextStatus)) {
    return res.status(400).json({ error: 'Choose a valid order status.' });
  }

  const client = await pool.connect();
  let transactionOpen = false;
  try {
    await client.query('BEGIN');
    transactionOpen = true;
    const currentResult = await client.query(
      'SELECT id, status, fulfillment_method FROM orders WHERE id = $1 FOR UPDATE',
      [req.params.id],
    );
    const current = currentResult.rows[0];
    if (!current) {
      await client.query('ROLLBACK');
      transactionOpen = false;
      return res.status(404).json({ error: 'Order not found.' });
    }

    if (!canTransitionOrderStatus(current.status, nextStatus, current.fulfillment_method)) {
      await client.query('ROLLBACK');
      transactionOpen = false;
      return res.status(409).json({ error: 'This order can no longer be moved to that status.' });
    }

    const result = await client.query(
      `UPDATE orders SET status = $2, updated_at = NOW()
       WHERE id = $1
       RETURNING id, status`,
      [req.params.id, nextStatus],
    );
    await client.query('COMMIT');
    transactionOpen = false;
    res.json({ order: result.rows[0] });
  } catch (error) {
    if (transactionOpen) await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}));

app.get('/api/staff/schedule', requireClinicalStaff, asyncRoute(async (req, res) => {
  const result = await pool.query(
    `SELECT a.id, a.pet_id, a.pet_name, p.species AS pet_species, p.breed AS pet_breed,
            a.service_id, a.doctor_id, a.scheduled_at,
            a.notes, a.status, a.created_at, o.full_name AS owner_name,
            o.email AS owner_email, o.phone AS owner_phone, d.full_name AS doctor_name
     FROM appointments a
     JOIN users o ON o.id = a.owner_id
     LEFT JOIN pets p ON p.id = a.pet_id
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
      if (!await doctorIsAvailable(doctorId, appointment.scheduled_at, appointment.duration_minutes)) {
        await client.query('ROLLBACK');
        transactionOpen = false;
        return res.status(409).json({ error: 'The veterinarian is no longer available at that time. Choose another appointment time or veterinarian.' });
      }
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1)::bigint)', [doctorId]);
      const conflict = await client.query(
        `SELECT id FROM appointments
         WHERE doctor_id = $1 AND status IN ('pending', 'confirmed') AND id <> $2
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
