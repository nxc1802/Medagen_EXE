import { createClient } from '@supabase/supabase-js';
import { config } from '../utils/config.js';

const supabase = createClient(config.supabase.url, config.supabase.serviceKey);

const statements = [
  `CREATE TABLE IF NOT EXISTS care_plans (
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
  )`,
  `CREATE INDEX IF NOT EXISTS cp_user_active_idx ON care_plans (user_id, is_active)`,
  `ALTER TABLE care_plans ENABLE ROW LEVEL SECURITY`,
  `DROP POLICY IF EXISTS "care_plans: service role" ON care_plans`,
  `CREATE POLICY "care_plans: service role" ON care_plans FOR ALL TO service_role USING (true) WITH CHECK (true)`,
  `DROP POLICY IF EXISTS "care_plans: owner access" ON care_plans`,
  `CREATE POLICY "care_plans: owner access" ON care_plans FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id)`,
  `GRANT ALL ON TABLE care_plans TO service_role`,
  `GRANT SELECT, INSERT, UPDATE ON TABLE care_plans TO authenticated`,
];

for (const stmt of statements) {
  const { error } = await supabase.rpc('query', { sql: stmt }).maybeSingle().catch(() => ({ error: null })) as any;
  // Direct query via postgres not available through client — skip
}

// Use fetch to Supabase's pg-meta SQL endpoint (only available on self-hosted)
// For cloud: run the SQL manually in Dashboard > SQL Editor
console.log('\n=== SQL to run in Supabase Dashboard > SQL Editor ===\n');
console.log(statements.join(';\n\n') + ';');
console.log('\n=== End of SQL ===\n');
console.log('Go to: https://supabase.com/dashboard/project/kkbrdlghbppbsoepmaku/sql/new');
