-- ==========================================
-- Multi-Tenant Migration Script (v3)
-- ==========================================

-- >>> JALANKAN BAGIAN 1 DULU, LALU BAGIAN 2 <<<

-- ==========================================
-- BAGIAN 1: SKEMA TABEL & KOLOM
-- ==========================================

-- 1. Profiles
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT,
  username TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Ensure frames table exists and has user_id
CREATE TABLE IF NOT EXISTS frames (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  image_url TEXT NOT NULL,
  frame_x INTEGER DEFAULT 0,
  frame_y INTEGER DEFAULT 0,
  frame_width INTEGER DEFAULT 600,
  frame_height INTEGER DEFAULT 900,
  slots JSONB NOT NULL DEFAULT '[]',
  slot_count INTEGER,
  photo_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE frames ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES profiles(id) ON DELETE CASCADE;

-- 3. User-Specific Captures
CREATE TABLE IF NOT EXISTS captures (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  frame_id UUID REFERENCES frames(id) ON DELETE SET NULL,
  image_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Shared Captures
CREATE TABLE IF NOT EXISTS shared_captures (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  photo_url TEXT NOT NULL,
  frame_id UUID REFERENCES frames(id) ON DELETE SET NULL,
  filter TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ==========================================
-- BAGIAN 2: POLICIES & TRIGGERS
-- ==========================================

-- 5. Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE frames ENABLE ROW LEVEL SECURITY;
ALTER TABLE captures ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_captures ENABLE ROW LEVEL SECURITY;

-- 6. Profiles Policies
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- 7. Frames Policies
DROP POLICY IF EXISTS "Users can view own or public frames" ON frames;
CREATE POLICY "Users can view own or public frames" ON frames FOR SELECT 
  USING (auth.uid() = user_id OR user_id IS NULL);
DROP POLICY IF EXISTS "Users can manage own frames" ON frames;
CREATE POLICY "Users can manage own frames" ON frames FOR ALL 
  USING (auth.uid() = user_id);

-- 8. Captures Policies
DROP POLICY IF EXISTS "Users can view own captures" ON captures;
CREATE POLICY "Users can view own captures" ON captures FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert own captures" ON captures;
CREATE POLICY "Users can insert own captures" ON captures FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 9. Shared Captures Policies
DROP POLICY IF EXISTS "Users can view own shared captures" ON shared_captures;
CREATE POLICY "Users can view own shared captures" ON shared_captures FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert shared captures" ON shared_captures;
CREATE POLICY "Users can insert shared captures" ON shared_captures FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- 10. Signup Trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
