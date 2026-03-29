-- ==========================================
-- BUAT TABEL DEVICES + DISABLE RLS
-- Jalankan di Supabase SQL Editor
-- ==========================================

-- Buat tabel devices jika belum ada
CREATE TABLE IF NOT EXISTS devices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL,
  name TEXT NOT NULL,
  unique_code TEXT UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  selected_frame_id UUID,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Disable RLS (tidak perlu policy apapun)
ALTER TABLE devices DISABLE ROW LEVEL SECURITY;
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE frames DISABLE ROW LEVEL SECURITY;
ALTER TABLE captures DISABLE ROW LEVEL SECURITY;
ALTER TABLE shared_captures DISABLE ROW LEVEL SECURITY;
