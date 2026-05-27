-- ============================================================
-- MEDAGEN - SUPABASE DATABASE SCHEMA
-- ============================================================
-- Chạy file này trong: Supabase Dashboard → SQL Editor
-- Yêu cầu: pgvector extension (có sẵn trên Supabase)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;


-- ============================================================
-- 1. PROFILES
-- Mở rộng auth.users với thông tin cá nhân của bệnh nhân.
-- Tự động tạo khi user đăng ký qua trigger.
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

-- Tự động tạo profile khi user đăng ký (Google OAuth / email)
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

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();


-- ============================================================
-- 2. USER MEDICAL HISTORY
-- Tiền sử bệnh do user tự khai báo (dị ứng, bệnh mãn tính...).
-- Dùng để cá nhân hóa Care Plan.
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


-- ============================================================
-- 3. SESSIONS
-- Mỗi lần user gửi ảnh + mô tả triệu chứng để AI phân tích.
-- triage_result lưu toàn bộ JSON TriageResult trả về từ agent.
-- ============================================================
CREATE TABLE IF NOT EXISTS sessions (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  input_text     TEXT,
  image_url      TEXT,
  triage_level   TEXT        CHECK (triage_level IN ('emergency', 'urgent', 'routine', 'self-care')),
  triage_result  JSONB,                               -- Full TriageResult object từ agent
  location       JSONB,                               -- { lat: number, lng: number }
  status         TEXT        NOT NULL DEFAULT 'completed'
                               CHECK (status IN ('pending', 'completed', 'failed')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS sessions_user_id_idx      ON sessions (user_id);
CREATE INDEX IF NOT EXISTS sessions_created_at_idx   ON sessions (created_at DESC);
CREATE INDEX IF NOT EXISTS sessions_triage_level_idx ON sessions (triage_level);


-- ============================================================
-- 4. SESSION CONDITIONS
-- Danh sách bệnh/tình trạng được trích xuất từ mỗi session.
-- Denormalized để query nhanh không cần parse JSONB.
-- VD: "Tìm tất cả session eczema của user này"
-- ============================================================
CREATE TABLE IF NOT EXISTS session_conditions (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      UUID        NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  user_id         UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  condition_name  TEXT        NOT NULL,
  confidence      TEXT        CHECK (confidence IN ('low', 'medium', 'high')),
  source          TEXT        CHECK (source IN ('cv_model', 'guideline', 'user_report', 'reasoning')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS sc_user_id_idx        ON session_conditions (user_id);
CREATE INDEX IF NOT EXISTS sc_condition_name_idx ON session_conditions (condition_name);


-- ============================================================
-- 5. CONVERSATION SESSIONS
-- Nhóm các tin nhắn chat thành 1 luồng hội thoại.
-- Một user có thể có nhiều conversation sessions.
-- ============================================================
CREATE TABLE IF NOT EXISTS conversation_sessions (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title      TEXT,       -- Tự sinh từ tin nhắn đầu tiên
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS conv_sessions_user_id_idx ON conversation_sessions (user_id);


-- ============================================================
-- 6. CONVERSATION HISTORY
-- Từng tin nhắn trong một conversation session.
-- role = 'user' | 'assistant'
-- ============================================================
CREATE TABLE IF NOT EXISTS conversation_history (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id     UUID        NOT NULL REFERENCES conversation_sessions(id) ON DELETE CASCADE,
  user_id        UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role           TEXT        NOT NULL CHECK (role IN ('user', 'assistant')),
  content        TEXT        NOT NULL,  -- Markdown text
  image_url      TEXT,
  triage_result  JSONB,                 -- Chỉ có ở assistant messages có kết quả chẩn đoán
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS ch_session_id_idx  ON conversation_history (session_id);
CREATE INDEX IF NOT EXISTS ch_created_at_idx  ON conversation_history (created_at DESC);


-- ============================================================
-- 7. CARE PLANS
-- Care plan cá nhân hóa được AI tạo dựa trên lịch sử bệnh án.
-- Mỗi user chỉ có 1 active care plan tại một thời điểm.
-- ============================================================
CREATE TABLE IF NOT EXISTS care_plans (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_session_ids  UUID[]      NOT NULL DEFAULT '{}', -- Sessions dùng để generate plan
  conditions          TEXT[]      NOT NULL DEFAULT '{}', -- VD: ['Eczema', 'Acne']
  lifestyle           JSONB,  -- { sleep: [...], sun_protection: [...] }
  nutrition           JSONB,  -- { include: [...], avoid: [...] }
  exercise            JSONB,  -- { recommended: [...], avoid: [...] }
  otc_suggestions     JSONB,  -- Gợi ý thuốc OTC
  next_checkup_date   DATE,
  is_active           BOOLEAN     NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS cp_user_active_idx ON care_plans (user_id, is_active);

-- Ràng buộc: mỗi user chỉ có 1 active care plan
CREATE UNIQUE INDEX IF NOT EXISTS cp_one_active_per_user
  ON care_plans (user_id)
  WHERE is_active = TRUE;


-- ============================================================
-- 8. SPECIALTIES
-- Danh mục chuyên khoa y tế (Da liễu, Mắt, Nhi khoa...)
-- ============================================================
CREATE TABLE IF NOT EXISTS specialties (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        UNIQUE NOT NULL,  -- Tiếng Việt, VD: 'Da liễu'
  name_en     TEXT,                         -- Tiếng Anh, VD: 'Dermatology'
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================
-- 9. DISEASES
-- Danh mục bệnh liên kết với chuyên khoa.
-- synonyms: tên khác / bí danh của bệnh để tìm kiếm fuzzy.
-- ============================================================
CREATE TABLE IF NOT EXISTS diseases (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  specialty_id UUID        REFERENCES specialties(id) ON DELETE SET NULL,
  name         TEXT        NOT NULL,
  synonyms     TEXT[]      DEFAULT '{}',  -- Tên gọi khác
  icd10_code   TEXT,                      -- Mã ICD-10 nếu có
  description  TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS diseases_specialty_id_idx ON diseases (specialty_id);
CREATE INDEX IF NOT EXISTS diseases_name_fts_idx     ON diseases USING gin (to_tsvector('simple', name));


-- ============================================================
-- 10. INFO DOMAINS
-- Loại thông tin y tế (NGUYÊN NHÂN, ĐIỀU TRỊ, PHÒNG BỆNH...)
-- order_index: thứ tự hiển thị
-- ============================================================
CREATE TABLE IF NOT EXISTS info_domains (
  id          UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT    UNIQUE NOT NULL,  -- VD: 'ĐIỀU TRỊ'
  name_en     TEXT,                     -- VD: 'Treatment'
  order_index INTEGER NOT NULL DEFAULT 0,
  description TEXT
);


-- ============================================================
-- 11. MEDICAL KNOWLEDGE CHUNKS
-- RAG store có cấu trúc: text chunks + vector embedding.
-- Dùng bởi KnowledgeBaseService + RPC match_medical_knowledge.
-- embedding: Gemini text-embedding-004 (768 chiều)
-- ============================================================
CREATE TABLE IF NOT EXISTS medical_knowledge_chunks (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  specialty_id    UUID        REFERENCES specialties(id)  ON DELETE SET NULL,
  disease_id      UUID        REFERENCES diseases(id)     ON DELETE SET NULL,
  info_domain_id  UUID        REFERENCES info_domains(id) ON DELETE SET NULL,
  -- Denormalized để filter nhanh không cần JOIN
  specialty       TEXT,
  disease         TEXT,
  section_title   TEXT,
  content         TEXT        NOT NULL,
  embedding       VECTOR(768),            -- Gemini text-embedding-004
  source_file     TEXT,                   -- Đường dẫn file .txt gốc
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS mkc_specialty_idx  ON medical_knowledge_chunks (specialty);
CREATE INDEX IF NOT EXISTS mkc_disease_idx    ON medical_knowledge_chunks (disease);
CREATE INDEX IF NOT EXISTS mkc_embedding_idx  ON medical_knowledge_chunks
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);


-- ============================================================
-- 12. GUIDELINE CHUNKS
-- Clinical guidelines từ Bộ Y Tế cho RAG search.
-- Dùng bởi RAGService + RPC match_guideline_chunks.
-- ============================================================
CREATE TABLE IF NOT EXISTS guideline_chunks (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  content    TEXT        NOT NULL,
  embedding  VECTOR(768),
  source     TEXT,    -- VD: 'Bộ Y Tế 2023'
  metadata   JSONB,   -- { disease, specialty, section, ... }
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS gc_embedding_idx ON guideline_chunks
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);


-- ============================================================
-- 13. HOSPITALS
-- Cache kết quả từ Google Maps API để giảm API calls.
-- place_id là unique key từ Google Maps.
-- ============================================================
CREATE TABLE IF NOT EXISTS hospitals (
  id          UUID             PRIMARY KEY DEFAULT gen_random_uuid(),
  place_id    TEXT             UNIQUE,  -- Google Maps place_id
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


-- ============================================================
-- 14. NOTIFICATIONS
-- Thông báo trong app: phân tích xong, nhắc tái khám, v.v.
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


-- ============================================================
-- RPC FUNCTIONS (Vector Search)
-- ============================================================

-- Tìm kiếm vector trong medical_knowledge_chunks
-- Gọi bởi: KnowledgeBaseService.queryStructuredKnowledge()
CREATE OR REPLACE FUNCTION match_medical_knowledge(
  query_embedding       VECTOR(768),
  match_threshold       FLOAT,
  match_count           INT,
  filter_specialty      TEXT DEFAULT NULL,
  filter_disease        TEXT DEFAULT NULL,
  filter_specialty_id   UUID DEFAULT NULL,
  filter_disease_id     UUID DEFAULT NULL,
  filter_info_domain_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id            UUID,
  content       TEXT,
  specialty     TEXT,
  disease       TEXT,
  section_title TEXT,
  similarity    FLOAT
)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT
    mkc.id,
    mkc.content,
    mkc.specialty,
    mkc.disease,
    mkc.section_title,
    (1 - (mkc.embedding <=> query_embedding))::FLOAT AS similarity
  FROM medical_knowledge_chunks mkc
  WHERE mkc.embedding IS NOT NULL
    AND (filter_specialty      IS NULL OR mkc.specialty      ILIKE '%' || filter_specialty      || '%')
    AND (filter_disease        IS NULL OR mkc.disease        ILIKE '%' || filter_disease        || '%')
    AND (filter_specialty_id   IS NULL OR mkc.specialty_id   = filter_specialty_id)
    AND (filter_disease_id     IS NULL OR mkc.disease_id     = filter_disease_id)
    AND (filter_info_domain_id IS NULL OR mkc.info_domain_id = filter_info_domain_id)
    AND (1 - (mkc.embedding <=> query_embedding)) > match_threshold
  ORDER BY mkc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Tìm kiếm vector trong guideline_chunks
-- Gọi bởi: RAGService.searchGuidelines()
CREATE OR REPLACE FUNCTION match_guideline_chunks(
  query_embedding VECTOR(768),
  match_threshold FLOAT,
  match_count     INT
)
RETURNS TABLE (
  id         UUID,
  content    TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT
    gc.id,
    gc.content,
    (1 - (gc.embedding <=> query_embedding))::FLOAT AS similarity
  FROM guideline_chunks gc
  WHERE gc.embedding IS NOT NULL
    AND (1 - (gc.embedding <=> query_embedding)) > match_threshold
  ORDER BY gc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;


-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

-- profiles: chỉ xem/sửa của chính mình
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles: owner access"
  ON profiles USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- user_medical_history: private per user
ALTER TABLE user_medical_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "umh: owner access"
  ON user_medical_history USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- sessions: private per user
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sessions: owner access"
  ON sessions USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- session_conditions: private per user
ALTER TABLE session_conditions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "session_conditions: owner access"
  ON session_conditions USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- conversation_sessions: private per user
ALTER TABLE conversation_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "conv_sessions: owner access"
  ON conversation_sessions USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- conversation_history: private per user
ALTER TABLE conversation_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "conv_history: owner access"
  ON conversation_history USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- care_plans: private per user
ALTER TABLE care_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "care_plans: owner access"
  ON care_plans USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- notifications: private per user
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notifications: owner access"
  ON notifications USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Knowledge tables: public read, chỉ service_role mới write
ALTER TABLE specialties              ENABLE ROW LEVEL SECURITY;
ALTER TABLE diseases                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE info_domains             ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_knowledge_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE guideline_chunks         ENABLE ROW LEVEL SECURITY;
ALTER TABLE hospitals                ENABLE ROW LEVEL SECURITY;

CREATE POLICY "specialties: public read"              ON specialties              FOR SELECT USING (TRUE);
CREATE POLICY "diseases: public read"                 ON diseases                 FOR SELECT USING (TRUE);
CREATE POLICY "info_domains: public read"             ON info_domains             FOR SELECT USING (TRUE);
CREATE POLICY "medical_knowledge_chunks: public read" ON medical_knowledge_chunks FOR SELECT USING (TRUE);
CREATE POLICY "guideline_chunks: public read"         ON guideline_chunks         FOR SELECT USING (TRUE);
CREATE POLICY "hospitals: public read"                ON hospitals                FOR SELECT USING (TRUE);


-- ============================================================
-- STORAGE BUCKET (chạy riêng trong Supabase Dashboard > Storage)
-- ============================================================
-- Bucket: medical-images (public)
--
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('medical-images', 'medical-images', true)
-- ON CONFLICT DO NOTHING;
--
-- CREATE POLICY "Authenticated users upload"
--   ON storage.objects FOR INSERT
--   WITH CHECK (bucket_id = 'medical-images' AND auth.role() = 'authenticated');
--
-- CREATE POLICY "Public read"
--   ON storage.objects FOR SELECT
--   USING (bucket_id = 'medical-images');
