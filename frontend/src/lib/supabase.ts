import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('[MedaGen] VITE_SUPABASE_URL hoặc VITE_SUPABASE_ANON_KEY chưa được cấu hình trong .env')
}

// Dùng placeholder để tránh crash khi chưa có .env — auth sẽ báo lỗi runtime, không crash lúc load
export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key',
)
