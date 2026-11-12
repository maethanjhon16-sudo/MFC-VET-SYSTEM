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

CREATE TABLE IF NOT EXISTS pets (
  id text PRIMARY KEY,
  owner_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  species text NOT NULL CHECK (species IN ('Dog', 'Cat', 'Bird', 'Rabbit', 'Other')),
  breed text NOT NULL DEFAULT '',
  date_of_birth date,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS pets_owner_created_idx
  ON pets (owner_id, created_at);

CREATE TABLE IF NOT EXISTS appointments (
  id text PRIMARY KEY,
  owner_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pet_id text REFERENCES pets(id) ON DELETE SET NULL,
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

ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS pet_id text REFERENCES pets(id) ON DELETE SET NULL;

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

CREATE INDEX IF NOT EXISTS appointments_pet_doctor_idx
  ON appointments (pet_id, doctor_id, scheduled_at DESC)
  WHERE pet_id IS NOT NULL AND status IN ('pending', 'confirmed');

CREATE TABLE IF NOT EXISTS clinical_records (
  id text PRIMARY KEY,
  pet_id text NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  doctor_id text NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  appointment_id text REFERENCES appointments(id) ON DELETE SET NULL,
  record_type text NOT NULL,
  summary text NOT NULL,
  diagnosis text NOT NULL DEFAULT '',
  treatment text NOT NULL DEFAULT '',
  follow_up_at date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS clinical_records_pet_created_idx
  ON clinical_records (pet_id, created_at DESC);

CREATE INDEX IF NOT EXISTS clinical_records_doctor_created_idx
  ON clinical_records (doctor_id, created_at DESC);

CREATE TABLE IF NOT EXISTS lab_results (
  id text PRIMARY KEY,
  pet_id text NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  doctor_id text NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  appointment_id text REFERENCES appointments(id) ON DELETE SET NULL,
  test_name text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_lab', 'ready', 'reviewed')),
  result_text text NOT NULL DEFAULT '',
  requested_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz
);

CREATE INDEX IF NOT EXISTS lab_results_doctor_requested_idx
  ON lab_results (doctor_id, requested_at DESC);

CREATE TABLE IF NOT EXISTS doctor_conversations (
  id text PRIMARY KEY,
  owner_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  doctor_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pet_id text NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_id, doctor_id, pet_id)
);

CREATE TABLE IF NOT EXISTS doctor_messages (
  id text PRIMARY KEY,
  conversation_id text NOT NULL REFERENCES doctor_conversations(id) ON DELETE CASCADE,
  sender_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz
);

CREATE INDEX IF NOT EXISTS doctor_messages_conversation_created_idx
  ON doctor_messages (conversation_id, created_at);

CREATE TABLE IF NOT EXISTS clinic_services (
  service_id text PRIMARY KEY,
  is_enabled boolean NOT NULL DEFAULT true,
  updated_by text REFERENCES users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO clinic_services (service_id) VALUES
  ('consultation'), ('vaccination'), ('deworming'), ('confinement'),
  ('surgery'), ('lab-test'), ('home-service'), ('grooming')
ON CONFLICT (service_id) DO NOTHING;

CREATE TABLE IF NOT EXISTS inventory_stock (
  product_id text PRIMARY KEY,
  quantity integer NOT NULL CHECK (quantity >= 0),
  updated_by text REFERENCES users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS doctor_availability (
  doctor_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  weekday smallint NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  is_available boolean NOT NULL DEFAULT false,
  starts_at time NOT NULL DEFAULT '08:00',
  ends_at time NOT NULL DEFAULT '18:00',
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (doctor_id, weekday),
  CHECK (ends_at > starts_at)
);

CREATE TABLE IF NOT EXISTS doctor_preferences (
  doctor_id text PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  notification_settings jsonb NOT NULL DEFAULT '{"appointmentRequests":true,"followUpReminders":true,"labResults":true,"inventoryAlerts":false}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS orders (
  id text PRIMARY KEY,
  owner_id text NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  status text NOT NULL CHECK (status IN ('new', 'preparing', 'out_for_delivery', 'delivered', 'cancelled')),
  payment_method text NOT NULL,
  total_amount numeric(10, 2) NOT NULL CHECK (total_amount >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS order_items (
  id text PRIMARY KEY,
  order_id text NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id text NOT NULL,
  product_name text NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price numeric(10, 2) NOT NULL CHECK (unit_price >= 0)
);

CREATE INDEX IF NOT EXISTS orders_created_idx ON orders (created_at DESC);
