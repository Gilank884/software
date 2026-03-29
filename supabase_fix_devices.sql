-- ==========================================
-- RESET TOTAL: Drop & Recreate tabel devices
-- Jalankan di Supabase SQL Editor
-- ==========================================

-- Hapus tabel lama beserta dependensinya
DROP TABLE IF EXISTS devices CASCADE;

-- Buat ulang dengan skema yang benar
CREATE TABLE devices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL,
  name TEXT NOT NULL,
  unique_code TEXT UNIQUE NOT NULL,
  is_active BOOLEAN DEFAULT true,
  selected_frame_id UUID,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Disable RLS (tidak perlu policy)
ALTER TABLE devices DISABLE ROW LEVEL SECURITY;

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
