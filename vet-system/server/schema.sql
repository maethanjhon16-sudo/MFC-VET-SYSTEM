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

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS updated_by text REFERENCES users(id) ON DELETE SET NULL;

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

ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS request_source text NOT NULL DEFAULT 'owner'
  CHECK (request_source IN ('owner', 'doctor_follow_up'));

ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS updated_by text REFERENCES users(id) ON DELETE SET NULL;

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
  follow_up_completed_at timestamptz,
  updated_by text REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE clinical_records
  ADD COLUMN IF NOT EXISTS follow_up_completed_at timestamptz;

ALTER TABLE clinical_records
  ADD COLUMN IF NOT EXISTS follow_up_type text
  CHECK (follow_up_type IN ('medicine', 'revisit'));

ALTER TABLE clinical_records
  ADD COLUMN IF NOT EXISTS follow_up_medicine_name text NOT NULL DEFAULT '';

ALTER TABLE clinical_records
  ADD COLUMN IF NOT EXISTS follow_up_medicine_dose text NOT NULL DEFAULT '';

ALTER TABLE clinical_records
  ADD COLUMN IF NOT EXISTS follow_up_medicine_instructions text NOT NULL DEFAULT '';

ALTER TABLE clinical_records
  ADD COLUMN IF NOT EXISTS updated_by text REFERENCES users(id) ON DELETE SET NULL;

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
  reviewed_at timestamptz,
  updated_by text REFERENCES users(id) ON DELETE SET NULL
);

ALTER TABLE lab_results
  ADD COLUMN IF NOT EXISTS updated_by text REFERENCES users(id) ON DELETE SET NULL;

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

ALTER TABLE clinic_services
  ADD COLUMN IF NOT EXISTS updated_by text REFERENCES users(id) ON DELETE SET NULL;

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

ALTER TABLE inventory_stock
  ADD COLUMN IF NOT EXISTS updated_by text REFERENCES users(id) ON DELETE SET NULL;

INSERT INTO inventory_stock (product_id, quantity) VALUES
  ('dog-food', 16),
  ('cat-kibble', 14),
  ('wet-food', 18),
  ('multivitamin', 14),
  ('omega', 12),
  ('joint-care', 10),
  ('shampoo', 14),
  ('slicker', 10),
  ('ear-cleaner', 12),
  ('harness', 8),
  ('collar', 12),
  ('dental-toy', 16)
ON CONFLICT (product_id) DO NOTHING;

CREATE TABLE IF NOT EXISTS doctor_availability (
  doctor_id text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  weekday smallint NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  is_available boolean NOT NULL DEFAULT false,
  starts_at time NOT NULL DEFAULT '08:00',
  ends_at time NOT NULL DEFAULT '18:00',
  updated_by text REFERENCES users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (doctor_id, weekday),
  CHECK (ends_at > starts_at)
);

ALTER TABLE doctor_availability
  ADD COLUMN IF NOT EXISTS updated_by text REFERENCES users(id) ON DELETE SET NULL;

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
  fulfillment_method text NOT NULL DEFAULT 'clinic_pickup',
  delivery_address text NOT NULL DEFAULT '',
  contact_phone text NOT NULL DEFAULT '',
  total_amount numeric(10, 2) NOT NULL CHECK (total_amount >= 0),
  stock_reserved boolean NOT NULL DEFAULT false,
  updated_by text REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS stock_reserved boolean NOT NULL DEFAULT false;

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS fulfillment_method text NOT NULL DEFAULT 'clinic_pickup';

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS delivery_address text NOT NULL DEFAULT '';

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS contact_phone text NOT NULL DEFAULT '';

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS updated_by text REFERENCES users(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS order_items (
  id text PRIMARY KEY,
  order_id text NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id text NOT NULL,
  product_name text NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price numeric(10, 2) NOT NULL CHECK (unit_price >= 0)
);

CREATE INDEX IF NOT EXISTS orders_created_idx ON orders (created_at DESC);

CREATE TABLE IF NOT EXISTS activity_events (
  id text PRIMARY KEY,
  actor_id text REFERENCES users(id) ON DELETE SET NULL,
  actor_name text NOT NULL,
  actor_role text NOT NULL CHECK (actor_role IN ('owner', 'doctor', 'admin', 'system')),
  recipient_owner_id text REFERENCES users(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  title text NOT NULL,
  detail text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  owner_read_at timestamptz,
  admin_read_at timestamptz
);

CREATE INDEX IF NOT EXISTS activity_events_owner_created_idx
  ON activity_events (recipient_owner_id, created_at DESC)
  WHERE recipient_owner_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS activity_events_admin_created_idx
  ON activity_events (created_at DESC);

CREATE OR REPLACE FUNCTION capture_activity_event() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  new_row jsonb := to_jsonb(NEW);
  old_row jsonb;
  actor_id_value text;
  actor_name_value text;
  actor_role_value text;
  owner_id_value text;
  event_type_value text;
  title_value text;
  detail_value text;
  entity_type_value text := TG_TABLE_NAME;
  entity_id_value text;
  pet_name_value text;
  conversation_owner_id text;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    old_row := to_jsonb(OLD);
  END IF;

  entity_id_value := new_row ->> 'id';
  IF TG_TABLE_NAME = 'users' THEN
    IF new_row ->> 'role' NOT IN ('owner', 'doctor')
       OR (old_row ->> 'full_name') IS NOT DISTINCT FROM (new_row ->> 'full_name')
          AND (old_row ->> 'phone') IS NOT DISTINCT FROM (new_row ->> 'phone')
          AND (old_row ->> 'province') IS NOT DISTINCT FROM (new_row ->> 'province')
          AND (old_row ->> 'city') IS NOT DISTINCT FROM (new_row ->> 'city')
          AND (old_row ->> 'barangay') IS NOT DISTINCT FROM (new_row ->> 'barangay')
          AND (old_row ->> 'status') IS NOT DISTINCT FROM (new_row ->> 'status') THEN
      RETURN NEW;
    END IF;
    actor_id_value := COALESCE(new_row ->> 'updated_by', new_row ->> 'id');
    IF TG_OP = 'UPDATE' AND (old_row ->> 'status') IS DISTINCT FROM (new_row ->> 'status') THEN
      event_type_value := CASE
        WHEN new_row ->> 'role' = 'doctor' AND new_row ->> 'status' = 'active' THEN 'doctor_account_approved'
        ELSE 'account_status_updated'
      END;
      title_value := CASE event_type_value
        WHEN 'doctor_account_approved' THEN 'Veterinarian account approved'
        ELSE 'Account status updated'
      END;
      detail_value := new_row ->> 'full_name' || ' · ' || new_row ->> 'status';
      entity_type_value := 'account';
    ELSE
      event_type_value := (new_row ->> 'role') || '_profile_updated';
      title_value := CASE WHEN new_row ->> 'role' = 'doctor' THEN 'Veterinarian profile updated' ELSE 'Pet owner profile updated' END;
      detail_value := new_row ->> 'full_name' || ' updated their profile.';
      entity_type_value := 'profile';
    END IF;
  ELSIF TG_TABLE_NAME = 'pets' THEN
    IF TG_OP = 'UPDATE'
       AND (old_row ->> 'name') IS NOT DISTINCT FROM (new_row ->> 'name')
       AND (old_row ->> 'species') IS NOT DISTINCT FROM (new_row ->> 'species')
       AND (old_row ->> 'breed') IS NOT DISTINCT FROM (new_row ->> 'breed')
       AND (old_row ->> 'date_of_birth') IS NOT DISTINCT FROM (new_row ->> 'date_of_birth') THEN
      RETURN NEW;
    END IF;
    actor_id_value := new_row ->> 'owner_id';
    event_type_value := CASE WHEN TG_OP = 'INSERT' THEN 'pet_profile_created' ELSE 'pet_profile_updated' END;
    title_value := CASE WHEN TG_OP = 'INSERT' THEN 'Pet profile added' ELSE 'Pet profile updated' END;
    detail_value := new_row ->> 'name' || CASE WHEN TG_OP = 'INSERT' THEN ' was added.' ELSE '’s profile was updated.' END;
  ELSIF TG_TABLE_NAME = 'appointments' THEN
    IF TG_OP = 'UPDATE'
       AND (old_row ->> 'status') IS NOT DISTINCT FROM (new_row ->> 'status')
       AND (old_row ->> 'scheduled_at') IS NOT DISTINCT FROM (new_row ->> 'scheduled_at')
       AND (old_row ->> 'doctor_id') IS NOT DISTINCT FROM (new_row ->> 'doctor_id')
       AND (old_row ->> 'service_id') IS NOT DISTINCT FROM (new_row ->> 'service_id')
       AND (old_row ->> 'notes') IS NOT DISTINCT FROM (new_row ->> 'notes') THEN
      RETURN NEW;
    END IF;
    actor_id_value := COALESCE(
      new_row ->> 'updated_by',
      CASE WHEN new_row ->> 'request_source' = 'doctor_follow_up'
        THEN new_row ->> 'doctor_id' ELSE new_row ->> 'owner_id' END
    );
    event_type_value := CASE
      WHEN TG_OP = 'INSERT' AND new_row ->> 'request_source' = 'doctor_follow_up' THEN 'revisit_suggested'
      WHEN TG_OP = 'INSERT' THEN 'appointment_requested'
      WHEN (old_row ->> 'status') IS NOT DISTINCT FROM (new_row ->> 'status') THEN 'appointment_updated'
      WHEN new_row ->> 'status' = 'confirmed' THEN 'appointment_confirmed'
      WHEN new_row ->> 'status' = 'declined' THEN 'appointment_declined'
      ELSE 'appointment_cancelled'
    END;
    title_value := CASE event_type_value
      WHEN 'revisit_suggested' THEN 'Veterinarian suggested a revisit'
      WHEN 'appointment_requested' THEN 'Appointment request scheduled'
      WHEN 'appointment_updated' THEN 'Appointment details updated'
      WHEN 'appointment_confirmed' THEN 'Appointment confirmed'
      WHEN 'appointment_declined' THEN 'Appointment request declined'
      ELSE 'Appointment request cancelled'
    END;
    detail_value := new_row ->> 'pet_name' || ' · ' || new_row ->> 'service_id';
    IF (TG_OP = 'INSERT' AND new_row ->> 'request_source' = 'doctor_follow_up')
       OR (TG_OP = 'UPDATE' AND new_row ->> 'request_source' = 'owner') THEN
      owner_id_value := new_row ->> 'owner_id';
    END IF;
  ELSIF TG_TABLE_NAME = 'clinical_records' THEN
    IF TG_OP = 'UPDATE'
       AND (old_row ->> 'summary') IS NOT DISTINCT FROM (new_row ->> 'summary')
       AND (old_row ->> 'diagnosis') IS NOT DISTINCT FROM (new_row ->> 'diagnosis')
       AND (old_row ->> 'treatment') IS NOT DISTINCT FROM (new_row ->> 'treatment')
       AND (old_row ->> 'follow_up_at') IS NOT DISTINCT FROM (new_row ->> 'follow_up_at')
       AND (old_row ->> 'follow_up_type') IS NOT DISTINCT FROM (new_row ->> 'follow_up_type')
       AND (old_row ->> 'follow_up_medicine_name') IS NOT DISTINCT FROM (new_row ->> 'follow_up_medicine_name')
       AND (old_row ->> 'follow_up_medicine_dose') IS NOT DISTINCT FROM (new_row ->> 'follow_up_medicine_dose')
       AND (old_row ->> 'follow_up_medicine_instructions') IS NOT DISTINCT FROM (new_row ->> 'follow_up_medicine_instructions')
       AND (old_row ->> 'follow_up_completed_at') IS NOT DISTINCT FROM (new_row ->> 'follow_up_completed_at') THEN
      RETURN NEW;
    END IF;
    IF new_row ->> 'follow_up_type' = 'revisit' AND new_row ->> 'appointment_id' IS NOT NULL THEN
      RETURN NEW;
    END IF;
    actor_id_value := COALESCE(new_row ->> 'updated_by', new_row ->> 'doctor_id');
    SELECT owner_id, name INTO owner_id_value, pet_name_value FROM pets WHERE id = new_row ->> 'pet_id';
    event_type_value := CASE
      WHEN new_row ->> 'follow_up_completed_at' IS DISTINCT FROM old_row ->> 'follow_up_completed_at' THEN 'follow_up_completed'
      WHEN new_row ->> 'follow_up_type' = 'medicine' THEN 'medicine_recommended'
      ELSE 'medical_record_updated'
    END;
    title_value := CASE event_type_value
      WHEN 'follow_up_completed' THEN 'Follow-up completed'
      WHEN 'medicine_recommended' THEN 'Medicine recommendation'
      ELSE 'Medical record updated'
    END;
    detail_value := COALESCE(pet_name_value, 'Pet') || CASE
      WHEN event_type_value = 'medicine_recommended' THEN ' · ' || new_row ->> 'follow_up_medicine_name' || ' · ' || new_row ->> 'follow_up_medicine_dose'
      ELSE ' · ' || new_row ->> 'record_type'
    END;
    owner_id_value := owner_id_value;
  ELSIF TG_TABLE_NAME = 'lab_results' THEN
    IF TG_OP = 'UPDATE'
       AND (old_row ->> 'status') IS NOT DISTINCT FROM (new_row ->> 'status')
       AND (old_row ->> 'result_text') IS NOT DISTINCT FROM (new_row ->> 'result_text') THEN
      RETURN NEW;
    END IF;
    actor_id_value := COALESCE(new_row ->> 'updated_by', new_row ->> 'doctor_id');
    SELECT owner_id, name INTO owner_id_value, pet_name_value FROM pets WHERE id = new_row ->> 'pet_id';
    event_type_value := CASE WHEN new_row ->> 'status' IN ('ready', 'reviewed') THEN 'lab_result_ready' ELSE 'lab_result_updated' END;
    title_value := CASE WHEN new_row ->> 'status' IN ('ready', 'reviewed') THEN 'Lab result available' ELSE 'Lab test updated' END;
    detail_value := COALESCE(pet_name_value, 'Pet') || ' · ' || new_row ->> 'test_name';
  ELSIF TG_TABLE_NAME = 'doctor_messages' THEN
    actor_id_value := new_row ->> 'sender_id';
    SELECT owner_id, pet_id INTO conversation_owner_id, pet_name_value
    FROM doctor_conversations WHERE id = new_row ->> 'conversation_id';
    SELECT name INTO pet_name_value FROM pets WHERE id = pet_name_value;
    event_type_value := 'care_team_message';
    title_value := 'New care-team message';
    detail_value := 'Message about ' || COALESCE(pet_name_value, 'your pet');
  ELSIF TG_TABLE_NAME = 'orders' THEN
    IF TG_OP = 'UPDATE' AND (old_row ->> 'status') IS NOT DISTINCT FROM (new_row ->> 'status') THEN
      RETURN NEW;
    END IF;
    actor_id_value := COALESCE(new_row ->> 'updated_by', new_row ->> 'owner_id');
    event_type_value := CASE WHEN TG_OP = 'INSERT' THEN 'order_placed' ELSE 'order_updated' END;
    title_value := CASE WHEN TG_OP = 'INSERT' THEN 'Shop order placed' ELSE 'Shop order updated' END;
    detail_value := CASE WHEN TG_OP = 'INSERT' THEN 'A pet owner submitted a product order.' ELSE 'Order status changed to ' || new_row ->> 'status' || '.' END;
    owner_id_value := new_row ->> 'owner_id';
  ELSIF TG_TABLE_NAME = 'inventory_stock' THEN
    IF new_row ->> 'updated_by' IS NULL THEN
      RETURN NEW;
    END IF;
    IF TG_OP = 'UPDATE' AND (old_row ->> 'quantity') IS NOT DISTINCT FROM (new_row ->> 'quantity') THEN
      RETURN NEW;
    END IF;
    actor_id_value := new_row ->> 'updated_by';
    event_type_value := 'inventory_updated';
    title_value := 'Product inventory updated';
    detail_value := new_row ->> 'product_id' || ' stock: ' || new_row ->> 'quantity';
  ELSIF TG_TABLE_NAME = 'clinic_services' THEN
    IF TG_OP = 'UPDATE' AND (old_row ->> 'is_enabled') IS NOT DISTINCT FROM (new_row ->> 'is_enabled') THEN
      RETURN NEW;
    END IF;
    actor_id_value := new_row ->> 'updated_by';
    event_type_value := 'service_updated';
    title_value := 'Clinic service updated';
    detail_value := new_row ->> 'service_id' || CASE WHEN (new_row ->> 'is_enabled')::boolean THEN ' enabled.' ELSE ' disabled.' END;
  ELSIF TG_TABLE_NAME = 'doctor_availability' THEN
    IF TG_OP = 'UPDATE'
       AND (old_row ->> 'is_available') IS NOT DISTINCT FROM (new_row ->> 'is_available')
       AND (old_row ->> 'starts_at') IS NOT DISTINCT FROM (new_row ->> 'starts_at')
       AND (old_row ->> 'ends_at') IS NOT DISTINCT FROM (new_row ->> 'ends_at') THEN
      RETURN NEW;
    END IF;
    actor_id_value := COALESCE(new_row ->> 'updated_by', new_row ->> 'doctor_id');
    event_type_value := 'doctor_availability_updated';
    title_value := 'Veterinarian availability updated';
    detail_value := 'Weekly clinic schedule changed.';
  END IF;

  IF event_type_value IS NULL THEN
    RETURN NEW;
  END IF;
  SELECT full_name, role INTO actor_name_value, actor_role_value
  FROM users WHERE id = actor_id_value;
  actor_name_value := COALESCE(actor_name_value, 'Clinic system');
  actor_role_value := COALESCE(actor_role_value, 'system');
  IF TG_TABLE_NAME = 'doctor_messages' AND actor_role_value = 'doctor' THEN
    owner_id_value := conversation_owner_id;
  END IF;
  IF owner_id_value IS NOT NULL AND actor_role_value = 'owner' THEN
    owner_id_value := NULL;
  END IF;
  INSERT INTO activity_events (
    id, actor_id, actor_name, actor_role, recipient_owner_id,
    event_type, title, detail, entity_type, entity_id
  ) VALUES (
    md5(random()::text || clock_timestamp()::text), actor_id_value, actor_name_value,
    actor_role_value, owner_id_value, event_type_value, title_value, detail_value,
    entity_type_value, entity_id_value
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS activity_users_updated ON users;
CREATE TRIGGER activity_users_updated AFTER UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION capture_activity_event();
DROP TRIGGER IF EXISTS activity_pets_changed ON pets;
CREATE TRIGGER activity_pets_changed AFTER INSERT OR UPDATE ON pets
FOR EACH ROW EXECUTE FUNCTION capture_activity_event();
DROP TRIGGER IF EXISTS activity_appointments_changed ON appointments;
CREATE TRIGGER activity_appointments_changed AFTER INSERT OR UPDATE ON appointments
FOR EACH ROW EXECUTE FUNCTION capture_activity_event();
DROP TRIGGER IF EXISTS activity_clinical_records_changed ON clinical_records;
CREATE TRIGGER activity_clinical_records_changed AFTER INSERT OR UPDATE ON clinical_records
FOR EACH ROW EXECUTE FUNCTION capture_activity_event();
DROP TRIGGER IF EXISTS activity_lab_results_changed ON lab_results;
CREATE TRIGGER activity_lab_results_changed AFTER INSERT OR UPDATE ON lab_results
FOR EACH ROW EXECUTE FUNCTION capture_activity_event();
DROP TRIGGER IF EXISTS activity_doctor_messages_added ON doctor_messages;
CREATE TRIGGER activity_doctor_messages_added AFTER INSERT ON doctor_messages
FOR EACH ROW EXECUTE FUNCTION capture_activity_event();
DROP TRIGGER IF EXISTS activity_orders_changed ON orders;
CREATE TRIGGER activity_orders_changed AFTER INSERT OR UPDATE ON orders
FOR EACH ROW EXECUTE FUNCTION capture_activity_event();
DROP TRIGGER IF EXISTS activity_inventory_changed ON inventory_stock;
CREATE TRIGGER activity_inventory_changed AFTER INSERT OR UPDATE ON inventory_stock
FOR EACH ROW EXECUTE FUNCTION capture_activity_event();
DROP TRIGGER IF EXISTS activity_clinic_services_changed ON clinic_services;
CREATE TRIGGER activity_clinic_services_changed AFTER INSERT OR UPDATE ON clinic_services
FOR EACH ROW EXECUTE FUNCTION capture_activity_event();
DROP TRIGGER IF EXISTS activity_doctor_availability_changed ON doctor_availability;
CREATE TRIGGER activity_doctor_availability_changed AFTER INSERT OR UPDATE ON doctor_availability
FOR EACH ROW EXECUTE FUNCTION capture_activity_event();
