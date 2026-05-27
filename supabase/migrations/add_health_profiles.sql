-- Add health_profiles table
-- Run this in Supabase SQL Editor if you already ran the base migration.sql

CREATE TABLE IF NOT EXISTS health_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL UNIQUE,
  full_name text,
  date_of_birth date,
  gender text CHECK (gender IN ('male', 'female', 'other')),
  height_cm numeric(5,1),
  weight_kg numeric(5,1),
  blood_type text CHECK (blood_type IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'unknown')),
  chronic_diseases text[],
  past_surgeries text[],
  drug_allergies text[],
  food_allergies text[],
  current_medications jsonb,
  emergency_contact jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_health_profiles_user_id ON health_profiles(user_id);

GRANT ALL ON TABLE health_profiles TO service_role;
GRANT SELECT, INSERT, UPDATE ON TABLE health_profiles TO anon;

ALTER TABLE health_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can access all health profiles" ON health_profiles;
CREATE POLICY "Service role can access all health profiles" ON health_profiles FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Users can manage own health profile" ON health_profiles;
CREATE POLICY "Users can manage own health profile" ON health_profiles FOR ALL TO authenticated USING (auth.uid()::text = user_id) WITH CHECK (auth.uid()::text = user_id);

DROP POLICY IF EXISTS "Allow anonymous access to health profiles" ON health_profiles;
CREATE POLICY "Allow anonymous access to health profiles" ON health_profiles FOR ALL TO anon USING (true) WITH CHECK (true);
