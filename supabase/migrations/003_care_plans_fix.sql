-- Run this in Supabase Dashboard > SQL Editor
-- https://supabase.com/dashboard/project/kkbrdlghbppbsoepmaku/sql/new

CREATE TABLE IF NOT EXISTS care_plans (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_session_ids  UUID[]      NOT NULL DEFAULT '{}',
  conditions          TEXT[]      NOT NULL DEFAULT '{}',
  lifestyle           JSONB,
  nutrition           JSONB,
  exercise            JSONB,
  otc_suggestions     JSONB,
  summary             TEXT,
  next_checkup_date   DATE,
  is_active           BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS cp_user_active_idx ON care_plans (user_id, is_active);

CREATE UNIQUE INDEX IF NOT EXISTS cp_one_active_per_user
  ON care_plans (user_id)
  WHERE is_active = TRUE;

ALTER TABLE care_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "care_plans: service role" ON care_plans;
CREATE POLICY "care_plans: service role"
  ON care_plans FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "care_plans: owner access" ON care_plans;
CREATE POLICY "care_plans: owner access"
  ON care_plans FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

GRANT ALL ON TABLE care_plans TO service_role;
GRANT SELECT, INSERT, UPDATE ON TABLE care_plans TO authenticated;
