CREATE TABLE IF NOT EXISTS users (
  id text PRIMARY KEY,
  full_name text NOT NULL,
  email text NOT NULL UNIQUE,
  phone text NOT NULL,
  role text NOT NULL CHECK (role IN ('owner', 'doctor', 'admin')),
  status text NOT NULL CHECK (status IN ('active', 'pending', 'disabled')),
  password_hash text NOT NULL,
  province text,
  city text,
  barangay text,
  prc_license text,
  specialization text,
  accepted_terms_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS users_prc_license_unique
  ON users (prc_license)
  WHERE prc_license IS NOT NULL;

CREATE TABLE IF NOT EXISTS auth_sessions (
  token_hash text PRIMARY KEY,
  user_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS auth_sessions_expires_at_idx
  ON auth_sessions (expires_at);

CREATE TABLE IF NOT EXISTS appointments (
  id text PRIMARY KEY,
  owner_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pet_name text NOT NULL,
  service_id text NOT NULL,
  doctor_id text REFERENCES users(id) ON DELETE SET NULL,
  scheduled_at timestamptz NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 30 CHECK (duration_minutes > 0),
  notes text NOT NULL DEFAULT '',
  status text NOT NULL CHECK (status IN ('pending', 'confirmed', 'declined', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS duration_minutes integer NOT NULL DEFAULT 30;

CREATE INDEX IF NOT EXISTS appointments_owner_schedule_idx
  ON appointments (owner_id, scheduled_at DESC);

CREATE INDEX IF NOT EXISTS appointments_doctor_schedule_idx
  ON appointments (doctor_id, scheduled_at)
  WHERE doctor_id IS NOT NULL AND status IN ('pending', 'confirmed');

CREATE INDEX IF NOT EXISTS appointments_pending_schedule_idx
  ON appointments (scheduled_at)
  WHERE status = 'pending';

CREATE UNIQUE INDEX IF NOT EXISTS appointments_confirmed_doctor_slot_unique
  ON appointments (doctor_id, scheduled_at)
  WHERE doctor_id IS NOT NULL AND status = 'confirmed';
