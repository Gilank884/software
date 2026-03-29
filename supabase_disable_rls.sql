-- ==========================================
-- DISABLE RLS SEMUA TABEL (sementara untuk development)
-- Jalankan ini di Supabase SQL Editor
-- ==========================================

ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE frames DISABLE ROW LEVEL SECURITY;
ALTER TABLE captures DISABLE ROW LEVEL SECURITY;
ALTER TABLE shared_captures DISABLE ROW LEVEL SECURITY;
ALTER TABLE devices DISABLE ROW LEVEL SECURITY;
