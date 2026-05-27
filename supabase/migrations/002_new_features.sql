-- ============================================================
-- MEDAGEN — Migration 002: New Feature Tables
-- Chạy file này SAU migration.sql gốc đã được chạy
-- Supabase Dashboard → SQL Editor → paste → Run
-- ============================================================

-- ============================================================
-- 1. PROFILES
-- Tự động tạo khi user đăng ký (Google / Email)
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id            UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name     TEXT,
  date_of_birth DATE,
  gender        TEXT        CHECK (gender IN ('male', 'female', 'other')),
  avatar_url    TEXT,
  phone         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger: tự tạo profile khi user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO profiles (id, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "profiles: owner access" ON profiles;
CREATE POLICY "profiles: owner access"
  ON profiles USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

GRANT ALL ON TABLE profiles TO service_role;
GRANT SELECT, UPDATE ON TABLE profiles TO authenticated;


-- ============================================================
-- 2. USER MEDICAL HISTORY
-- Tiền sử bệnh user tự khai → cá nhân hóa Care Plan
-- ============================================================
CREATE TABLE IF NOT EXISTS user_medical_history (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  condition_name  TEXT        NOT NULL,
  diagnosed_date  DATE,
  severity        TEXT        CHECK (severity IN ('mild', 'moderate', 'severe')),
  is_chronic      BOOLEAN     NOT NULL DEFAULT FALSE,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS umh_user_id_idx ON user_medical_history (user_id);

ALTER TABLE user_medical_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "umh: owner access" ON user_medical_history;
CREATE POLICY "umh: owner access"
  ON user_medical_history USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

GRANT ALL ON TABLE user_medical_history TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE user_medical_history TO authenticated;


-- ============================================================
-- 3. SESSION CONDITIONS
-- Bệnh trích xuất từ mỗi session (denormalized để query nhanh).
-- VD: "Tìm tất cả eczema sessions của user X"
-- user_id TEXT vì sessions.user_id hiện là TEXT
-- ============================================================
CREATE TABLE IF NOT EXISTS session_conditions (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID        NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  user_id         TEXT        NOT NULL,
  condition_name  TEXT        NOT NULL,
  confidence      TEXT        CHECK (confidence IN ('low', 'medium', 'high')),
  source          TEXT        CHECK (source IN ('cv_model', 'guideline', 'user_report', 'reasoning')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS sc_user_id_idx        ON session_conditions (user_id);
CREATE INDEX IF NOT EXISTS sc_condition_name_idx ON session_conditions (condition_name);
CREATE INDEX IF NOT EXISTS sc_session_id_idx     ON session_conditions (session_id);

ALTER TABLE session_conditions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sc: service role" ON session_conditions;
CREATE POLICY "sc: service role"
  ON session_conditions FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "sc: owner read" ON session_conditions;
CREATE POLICY "sc: owner read"
  ON session_conditions FOR SELECT TO authenticated USING (auth.uid()::text = user_id);

GRANT ALL ON TABLE session_conditions TO service_role;
GRANT SELECT ON TABLE session_conditions TO authenticated;


-- ============================================================
-- 4. CARE PLANS
-- Care plan AI sinh ra, lưu theo user.
-- Mỗi user chỉ có 1 plan is_active=true tại 1 thời điểm.
-- ============================================================
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

-- Chỉ 1 active plan per user
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


-- ============================================================
-- 5. HOSPITALS (cache Google Maps)
-- Tránh gọi Maps API lặp lại cho cùng 1 vị trí
-- ============================================================
CREATE TABLE IF NOT EXISTS hospitals (
  id          UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id    TEXT             UNIQUE,
  name        TEXT             NOT NULL,
  address     TEXT,
  lat         DOUBLE PRECISION,
  lng         DOUBLE PRECISION,
  rating      REAL,
  specialties TEXT[]           DEFAULT '{}',
  phone       TEXT,
  website     TEXT,
  cached_at   TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS hospitals_lat_lng_idx ON hospitals (lat, lng);

ALTER TABLE hospitals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "hospitals: public read" ON hospitals;
CREATE POLICY "hospitals: public read" ON hospitals FOR SELECT USING (true);
DROP POLICY IF EXISTS "hospitals: service write" ON hospitals;
CREATE POLICY "hospitals: service write" ON hospitals FOR ALL TO service_role USING (true) WITH CHECK (true);

GRANT ALL ON TABLE hospitals TO service_role;
GRANT SELECT ON TABLE hospitals TO authenticated, anon;


-- ============================================================
-- 6. NOTIFICATIONS
-- Thông báo in-app: phân tích xong, nhắc tái khám...
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type               TEXT        NOT NULL
                                   CHECK (type IN (
                                     'analysis_complete',
                                     'care_plan_ready',
                                     'checkup_due',
                                     'emergency_alert'
                                   )),
  title              TEXT        NOT NULL,
  message            TEXT,
  is_read            BOOLEAN     NOT NULL DEFAULT FALSE,
  related_session_id UUID        REFERENCES sessions(id) ON DELETE SET NULL,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS notif_user_unread_idx
  ON notifications (user_id, is_read)
  WHERE is_read = FALSE;

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "notifications: owner access" ON notifications;
CREATE POLICY "notifications: owner access"
  ON notifications FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "notifications: service role" ON notifications;
CREATE POLICY "notifications: service role"
  ON notifications FOR ALL TO service_role USING (true) WITH CHECK (true);

GRANT ALL ON TABLE notifications TO service_role;
GRANT SELECT, UPDATE ON TABLE notifications TO authenticated;


-- ============================================================
-- STORAGE BUCKET: medical-images
-- Chạy lệnh này riêng nếu bucket chưa tồn tại
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('medical-images', 'medical-images', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "medical-images: auth upload" ON storage.objects;
CREATE POLICY "medical-images: auth upload"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'medical-images');

DROP POLICY IF EXISTS "medical-images: public read" ON storage.objects;
CREATE POLICY "medical-images: public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'medical-images');

DROP POLICY IF EXISTS "medical-images: owner delete" ON storage.objects;
CREATE POLICY "medical-images: owner delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'medical-images' AND owner = auth.uid());
