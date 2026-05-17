-- MEDAGEN Consolidated Database Migration SQL
-- Copy and paste this entire SQL into Supabase SQL Editor
-- This will create all necessary tables, indexes, functions, permissions, and policies.

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- ===================== CREATE TABLES =====================

-- 1. Create guidelines table
CREATE TABLE IF NOT EXISTS guidelines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  condition text NOT NULL,
  source text NOT NULL,
  updated_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now()
);

-- 2. Create guideline_chunks table with vector embeddings
CREATE TABLE IF NOT EXISTS guideline_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guideline_id uuid REFERENCES guidelines(id) ON DELETE CASCADE,
  content text NOT NULL, -- LangChain requires 'content' column name
  embedding vector(768), -- Gemini embedding-004 dimension
  metadata jsonb,
  created_at timestamp with time zone DEFAULT now()
);

-- 3. Create specialties table (Chuyên khoa)
CREATE TABLE IF NOT EXISTS specialties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE, -- "Da liễu", "Thần kinh", "Mắt"
  name_en text, -- "Dermatology", "Neurology", "Ophthalmology"
  description text,
  created_at timestamp with time zone DEFAULT now()
);

-- 4. Create diseases table (Bệnh cụ thể)
CREATE TABLE IF NOT EXISTS diseases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  specialty_id uuid REFERENCES specialties(id) ON DELETE CASCADE,
  name text NOT NULL, -- "Trứng cá", "Viêm kết mạc"
  synonyms text[], -- ["mụn trứng cá", "acne", "mụn"]
  icd10_code text, -- "L70.0"
  description text,
  created_at timestamp with time zone DEFAULT now()
);

-- 5. Create info_domains table (Miền thông tin)
CREATE TABLE IF NOT EXISTS info_domains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE, -- "Định nghĩa", "Nguyên nhân", "Triệu chứng", "Điều trị", "Biến chứng", "Phòng bệnh"
  name_en text, -- "Definition", "Causes", "Symptoms", "Treatment", "Complications", "Prevention"
  order_index int NOT NULL DEFAULT 0, -- For ordering display
  description text,
  created_at timestamp with time zone DEFAULT now()
);

-- 6. Create medical_knowledge_chunks table for structured medical data
CREATE TABLE IF NOT EXISTS medical_knowledge_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  specialty_id uuid REFERENCES specialties(id) ON DELETE SET NULL,
  disease_id uuid REFERENCES diseases(id) ON DELETE SET NULL,
  info_domain_id uuid REFERENCES info_domains(id) ON DELETE SET NULL,
  specialty text, -- e.g., "Da liễu"
  chapter text, -- e.g., "CHƯƠNG 1. BỆNH DA NHIỄM KHUẨN"
  disease text, -- e.g., "Trứng cá"
  section_title text, -- e.g., "ĐẠI CƯƠNG", "NGUYÊN NHÂN"
  content text NOT NULL,
  path text, -- relative path to source file
  embedding vector(768), -- Gemini embedding-004 dimension
  created_at timestamp with time zone DEFAULT now()
);

-- 7. Create sessions table for storing triage history
CREATE TABLE IF NOT EXISTS sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  input_text text NOT NULL,
  image_url text,
  triage_level text NOT NULL,
  triage_result jsonb NOT NULL,
  location jsonb,
  created_at timestamp with time zone DEFAULT now()
);

-- 8. Create conversation_sessions table for tracking multi-turn conversations
CREATE TABLE IF NOT EXISTS conversation_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- 9. Create conversation_history table for storing conversation messages
CREATE TABLE IF NOT EXISTS conversation_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES conversation_sessions(id) ON DELETE CASCADE,
  user_id text NOT NULL,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  image_url text,
  triage_result jsonb,
  created_at timestamp with time zone DEFAULT now()
);

-- 10. Create tool_executions table to store all tool calls and results
CREATE TABLE IF NOT EXISTS tool_executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES conversation_sessions(id) ON DELETE CASCADE,
  message_id uuid REFERENCES conversation_history(id) ON DELETE CASCADE,
  tool_name text NOT NULL, -- 'derm_cv', 'rag_query', 'triage_rules', 'knowledge_base', 'maps'
  tool_display_name text, -- Human-readable name
  execution_order int NOT NULL, -- Order of execution in the workflow
  input_data jsonb, -- Input parameters passed to tool
  output_data jsonb, -- Full output from tool
  execution_time_ms int, -- Duration in milliseconds
  status text NOT NULL CHECK (status IN ('success', 'error', 'skipped')),
  error_message text,
  created_at timestamp with time zone DEFAULT now()
);

-- 11. Create comprehensive_reports table for generated reports
CREATE TABLE IF NOT EXISTS comprehensive_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES conversation_sessions(id) ON DELETE CASCADE,
  user_id text NOT NULL,
  report_type text NOT NULL DEFAULT 'full', -- 'full', 'summary', 'tools_only'
  report_content jsonb NOT NULL, -- Full report structure
  report_markdown text, -- Human-readable markdown version
  generated_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now()
);

-- ===================== CREATE INDEXES =====================

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON sessions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_triage_level ON sessions(triage_level);

CREATE INDEX IF NOT EXISTS idx_conversation_sessions_user_id ON conversation_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_sessions_updated_at ON conversation_sessions(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_conversation_history_session_id ON conversation_history(session_id);
CREATE INDEX IF NOT EXISTS idx_conversation_history_created_at ON conversation_history(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_guideline_chunks_embedding 
ON guideline_chunks USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_specialties_name ON specialties(name);
CREATE INDEX IF NOT EXISTS idx_diseases_specialty_id ON diseases(specialty_id);
CREATE INDEX IF NOT EXISTS idx_diseases_name ON diseases(name);
CREATE INDEX IF NOT EXISTS idx_info_domains_name ON info_domains(name);
CREATE INDEX IF NOT EXISTS idx_info_domains_order ON info_domains(order_index);

CREATE INDEX IF NOT EXISTS idx_medical_knowledge_specialty_id ON medical_knowledge_chunks(specialty_id);
CREATE INDEX IF NOT EXISTS idx_medical_knowledge_disease_id ON medical_knowledge_chunks(disease_id);
CREATE INDEX IF NOT EXISTS idx_medical_knowledge_info_domain_id ON medical_knowledge_chunks(info_domain_id);
CREATE INDEX IF NOT EXISTS idx_medical_knowledge_specialty ON medical_knowledge_chunks(specialty);
CREATE INDEX IF NOT EXISTS idx_medical_knowledge_chapter ON medical_knowledge_chunks(chapter);
CREATE INDEX IF NOT EXISTS idx_medical_knowledge_disease ON medical_knowledge_chunks(disease);
CREATE INDEX IF NOT EXISTS idx_medical_knowledge_embedding 
ON medical_knowledge_chunks USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

CREATE INDEX IF NOT EXISTS idx_tool_executions_session_id ON tool_executions(session_id);
CREATE INDEX IF NOT EXISTS idx_tool_executions_message_id ON tool_executions(message_id);
CREATE INDEX IF NOT EXISTS idx_tool_executions_tool_name ON tool_executions(tool_name);
CREATE INDEX IF NOT EXISTS idx_tool_executions_created_at ON tool_executions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_comprehensive_reports_session_id ON comprehensive_reports(session_id);
CREATE INDEX IF NOT EXISTS idx_comprehensive_reports_user_id ON comprehensive_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_comprehensive_reports_generated_at ON comprehensive_reports(generated_at DESC);

-- ===================== CREATE FUNCTIONS =====================

-- 1. Match guideline chunks (Vector similarity search)
DROP FUNCTION IF EXISTS match_guideline_chunks(vector, double precision, integer);

CREATE FUNCTION match_guideline_chunks(
  query_embedding vector(768),
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id uuid,
  guideline_id uuid,
  content text,
  metadata jsonb,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    guideline_chunks.id,
    guideline_chunks.guideline_id,
    guideline_chunks.content,
    guideline_chunks.metadata,
    1 - (guideline_chunks.embedding <=> query_embedding) as similarity
  FROM guideline_chunks
  WHERE 1 - (guideline_chunks.embedding <=> query_embedding) > match_threshold
  ORDER BY guideline_chunks.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- 2. Match medical knowledge with structured filtering
DROP FUNCTION IF EXISTS match_medical_knowledge(vector, double precision, integer, text, text);
DROP FUNCTION IF EXISTS match_medical_knowledge(vector, double precision, integer, text, text, uuid, uuid, uuid);

CREATE FUNCTION match_medical_knowledge(
  query_embedding vector(768),
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 5,
  filter_specialty text DEFAULT NULL,
  filter_disease text DEFAULT NULL,
  filter_specialty_id uuid DEFAULT NULL,
  filter_disease_id uuid DEFAULT NULL,
  filter_info_domain_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  specialty text,
  chapter text,
  disease text,
  section_title text,
  content text,
  path text,
  specialty_id uuid,
  disease_id uuid,
  info_domain_id uuid,
  similarity float
)
LANGUAGE sql STABLE
AS $$
  SELECT
    medical_knowledge_chunks.id,
    medical_knowledge_chunks.specialty,
    medical_knowledge_chunks.chapter,
    medical_knowledge_chunks.disease,
    medical_knowledge_chunks.section_title,
    medical_knowledge_chunks.content,
    medical_knowledge_chunks.path,
    medical_knowledge_chunks.specialty_id,
    medical_knowledge_chunks.disease_id,
    medical_knowledge_chunks.info_domain_id,
    1 - (medical_knowledge_chunks.embedding <=> query_embedding) as similarity
  FROM medical_knowledge_chunks
  WHERE 1 - (medical_knowledge_chunks.embedding <=> query_embedding) > match_threshold
    AND (filter_specialty IS NULL OR medical_knowledge_chunks.specialty ILIKE filter_specialty)
    AND (filter_disease IS NULL OR medical_knowledge_chunks.disease ILIKE filter_disease)
    AND (filter_specialty_id IS NULL OR medical_knowledge_chunks.specialty_id = filter_specialty_id)
    AND (filter_disease_id IS NULL OR medical_knowledge_chunks.disease_id = filter_disease_id)
    AND (filter_info_domain_id IS NULL OR medical_knowledge_chunks.info_domain_id = filter_info_domain_id)
  ORDER BY medical_knowledge_chunks.embedding <=> query_embedding
  LIMIT match_count;
$$;

-- ===================== GRANT PERMISSIONS =====================

-- Grant ALL permissions to service_role (bypasses RLS)
GRANT ALL ON TABLE guidelines TO service_role;
GRANT ALL ON TABLE guideline_chunks TO service_role;
GRANT ALL ON TABLE specialties TO service_role;
GRANT ALL ON TABLE diseases TO service_role;
GRANT ALL ON TABLE info_domains TO service_role;
GRANT ALL ON TABLE medical_knowledge_chunks TO service_role;
GRANT ALL ON TABLE sessions TO service_role;
GRANT ALL ON TABLE conversation_sessions TO service_role;
GRANT ALL ON TABLE conversation_history TO service_role;
GRANT ALL ON TABLE tool_executions TO service_role;
GRANT ALL ON TABLE comprehensive_reports TO service_role;

-- Grant permissions to anon role (for backend using anon key)
GRANT SELECT, INSERT, UPDATE ON TABLE conversation_sessions TO anon;
GRANT SELECT, INSERT, UPDATE ON TABLE conversation_history TO anon;
GRANT SELECT, INSERT ON TABLE sessions TO anon;
GRANT SELECT, INSERT ON TABLE tool_executions TO anon;
GRANT SELECT, INSERT ON TABLE comprehensive_reports TO anon;
GRANT SELECT ON TABLE guidelines TO anon;
GRANT SELECT ON TABLE guideline_chunks TO anon;
GRANT SELECT ON TABLE specialties TO anon;
GRANT SELECT ON TABLE diseases TO anon;
GRANT SELECT ON TABLE info_domains TO anon;
GRANT SELECT ON TABLE medical_knowledge_chunks TO anon;

-- Grant USAGE on sequences (for auto-increment IDs)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;

-- Grant EXECUTE on functions
GRANT EXECUTE ON FUNCTION match_guideline_chunks TO service_role, anon;
GRANT EXECUTE ON FUNCTION match_medical_knowledge TO service_role, anon;

-- ===================== ROW LEVEL SECURITY =====================

ALTER TABLE guidelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE guideline_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE specialties ENABLE ROW LEVEL SECURITY;
ALTER TABLE diseases ENABLE ROW LEVEL SECURITY;
ALTER TABLE info_domains ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_knowledge_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE tool_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE comprehensive_reports ENABLE ROW LEVEL SECURITY;

-- 1. Guidelines Policies
DROP POLICY IF EXISTS "Service role can access all guidelines" ON guidelines;
CREATE POLICY "Service role can access all guidelines" ON guidelines FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anonymous read guidelines" ON guidelines;
CREATE POLICY "Allow anonymous read guidelines" ON guidelines FOR SELECT TO anon USING (true);

-- 2. Guideline Chunks Policies
DROP POLICY IF EXISTS "Service role can access all guideline_chunks" ON guideline_chunks;
CREATE POLICY "Service role can access all guideline_chunks" ON guideline_chunks FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anonymous read guideline_chunks" ON guideline_chunks;
CREATE POLICY "Allow anonymous read guideline_chunks" ON guideline_chunks FOR SELECT TO anon USING (true);

-- 3. Sessions Policies
DROP POLICY IF EXISTS "Service role can access all sessions" ON sessions;
CREATE POLICY "Service role can access all sessions" ON sessions FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anonymous insert sessions" ON sessions;
CREATE POLICY "Allow anonymous insert sessions" ON sessions FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "Users can read their own sessions" ON sessions;
CREATE POLICY "Users can read their own sessions" ON sessions FOR SELECT TO authenticated USING (auth.uid()::text = user_id);

-- 4. Conversation Sessions Policies
DROP POLICY IF EXISTS "Service role can access all conversation sessions" ON conversation_sessions;
CREATE POLICY "Service role can access all conversation sessions" ON conversation_sessions FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anonymous insert for conversation sessions" ON conversation_sessions;
CREATE POLICY "Allow anonymous insert for conversation sessions" ON conversation_sessions FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anonymous select for conversation sessions" ON conversation_sessions;
CREATE POLICY "Allow anonymous select for conversation sessions" ON conversation_sessions FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "Allow anonymous update for conversation sessions" ON conversation_sessions;
CREATE POLICY "Allow anonymous update for conversation sessions" ON conversation_sessions FOR UPDATE TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Users can access own conversation sessions" ON conversation_sessions;
CREATE POLICY "Users can access own conversation sessions" ON conversation_sessions FOR ALL TO authenticated USING (auth.uid()::text = user_id);

-- 5. Conversation History Policies
DROP POLICY IF EXISTS "Service role can access all conversation history" ON conversation_history;
CREATE POLICY "Service role can access all conversation history" ON conversation_history FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anonymous access to conversation history" ON conversation_history;
CREATE POLICY "Allow anonymous access to conversation history" ON conversation_history FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Users can access own conversation history" ON conversation_history;
CREATE POLICY "Users can access own conversation history" ON conversation_history FOR ALL TO authenticated USING (auth.uid()::text = user_id);

-- 6. Specialties Policies (read-only for all)
DROP POLICY IF EXISTS "Service role can access all specialties" ON specialties;
CREATE POLICY "Service role can access all specialties" ON specialties FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public read access to specialties" ON specialties;
CREATE POLICY "Public read access to specialties" ON specialties FOR SELECT TO anon, authenticated USING (true);

-- 7. Diseases Policies (read-only for all)
DROP POLICY IF EXISTS "Service role can access all diseases" ON diseases;
CREATE POLICY "Service role can access all diseases" ON diseases FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public read access to diseases" ON diseases;
CREATE POLICY "Public read access to diseases" ON diseases FOR SELECT TO anon, authenticated USING (true);

-- 8. Info Domains Policies (read-only for all)
DROP POLICY IF EXISTS "Service role can access all info domains" ON info_domains;
CREATE POLICY "Service role can access all info domains" ON info_domains FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public read access to info domains" ON info_domains;
CREATE POLICY "Public read access to info domains" ON info_domains FOR SELECT TO anon, authenticated USING (true);

-- 9. Medical Knowledge Chunks Policies
DROP POLICY IF EXISTS "Service role can access all medical knowledge" ON medical_knowledge_chunks;
CREATE POLICY "Service role can access all medical knowledge" ON medical_knowledge_chunks FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Public can read medical knowledge" ON medical_knowledge_chunks;
CREATE POLICY "Public can read medical knowledge" ON medical_knowledge_chunks FOR SELECT TO anon, authenticated USING (true);

-- 10. Tool Executions Policies
DROP POLICY IF EXISTS "Service role can access all tool executions" ON tool_executions;
CREATE POLICY "Service role can access all tool executions" ON tool_executions FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anonymous access to tool executions" ON tool_executions;
CREATE POLICY "Allow anonymous access to tool executions" ON tool_executions FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Users can access own tool executions" ON tool_executions;
CREATE POLICY "Users can access own tool executions" ON tool_executions FOR ALL TO authenticated USING (
  EXISTS (
    SELECT 1 FROM conversation_sessions cs
    WHERE cs.id = tool_executions.session_id
    AND cs.user_id = auth.uid()::text
  )
);

-- 11. Reports Policies
DROP POLICY IF EXISTS "Service role can access all reports" ON comprehensive_reports;
CREATE POLICY "Service role can access all reports" ON comprehensive_reports FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anonymous access to reports" ON comprehensive_reports;
CREATE POLICY "Allow anonymous access to reports" ON comprehensive_reports FOR ALL TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Users can access own reports" ON comprehensive_reports;
CREATE POLICY "Users can access own reports" ON comprehensive_reports FOR ALL TO authenticated USING (auth.uid()::text = user_id);

-- ===================== SEED DATA =====================

-- Insert default specialties
INSERT INTO specialties (name, name_en, description) VALUES
  ('Da liễu', 'Dermatology', 'Chuyên khoa về da, tóc, móng và các bệnh lý liên quan'),
  ('Thần kinh', 'Neurology', 'Chuyên khoa về hệ thần kinh và các bệnh lý liên quan'),
  ('Mắt', 'Ophthalmology', 'Chuyên khoa về mắt và các bệnh lý về mắt'),
  ('Tai mũi họng', 'ENT', 'Chuyên khoa tai mũi họng'),
  ('Nội khoa', 'Internal Medicine', 'Chuyên khoa nội tổng quát')
ON CONFLICT (name) DO NOTHING;

-- Insert default info domains (ordered by typical flow)
INSERT INTO info_domains (name, name_en, order_index, description) VALUES
  ('Định nghĩa', 'Definition', 1, 'Định nghĩa và khái niệm cơ bản về bệnh'),
  ('Đại cương', 'Overview', 2, 'Tổng quan về bệnh'),
  ('Nguyên nhân', 'Causes', 3, 'Nguyên nhân gây bệnh và các yếu tố nguy cơ'),
  ('Triệu chứng', 'Symptoms', 4, 'Các triệu chứng và biểu hiện lâm sàng'),
  ('Chẩn đoán', 'Diagnosis', 5, 'Phương pháp chẩn đoán và xét nghiệm'),
  ('Điều trị', 'Treatment', 6, 'Phương pháp và nguyên tắc điều trị'),
  ('Biến chứng', 'Complications', 7, 'Các biến chứng có thể xảy ra'),
  ('Tiên lượng', 'Prognosis', 8, 'Tiên lượng và diễn biến bệnh'),
  ('Phòng bệnh', 'Prevention', 9, 'Biện pháp phòng ngừa và dự phòng')
ON CONFLICT (name) DO NOTHING;
