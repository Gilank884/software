-- ==========================================
-- Creator & Device Management Migration
-- ==========================================

-- 1. Create the devices table
CREATE TABLE IF NOT EXISTS public.devices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  unique_code TEXT UNIQUE NOT NULL, -- e.g., '567BYK'
  is_active BOOLEAN DEFAULT true,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Index for fast lookup by code
CREATE INDEX IF NOT EXISTS idx_devices_unique_code ON public.devices(unique_code);

-- 3. Enable Row Level Security
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;

-- 4. Policies
-- Creators can manage their own devices
DROP POLICY IF EXISTS "Creators can manage own devices" ON public.devices;
CREATE POLICY "Creators can manage own devices" ON public.devices
  FOR ALL USING (auth.uid() = creator_id);

-- Anyone can check a device code (for login)
DROP POLICY IF EXISTS "Public check device code" ON public.devices;
CREATE POLICY "Public check device code" ON public.devices
  FOR SELECT USING (true); -- We'll limit columns in the UI or use RPC

-- 5. RPC Function for Secure Device Login
-- This function checks if a code exists and returns the creator_id without exposing other data directly.
CREATE OR REPLACE FUNCTION validate_device_code(p_code TEXT)
RETURNS TABLE (
  device_id UUID,
  creator_id UUID,
  device_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  UPDATE public.devices
  SET last_login = now()
  WHERE unique_code = p_code AND is_active = true
  RETURNING id, devices.creator_id, name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
