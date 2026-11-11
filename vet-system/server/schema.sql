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
