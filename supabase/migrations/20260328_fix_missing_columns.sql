-- Fix ALL missing columns on devices table
ALTER TABLE public.devices ADD COLUMN IF NOT EXISTS last_login          TIMESTAMPTZ;
ALTER TABLE public.devices ADD COLUMN IF NOT EXISTS payment_enabled     BOOLEAN    DEFAULT false;
ALTER TABLE public.devices ADD COLUMN IF NOT EXISTS available_frames    UUID[]     DEFAULT '{}';
ALTER TABLE public.devices ADD COLUMN IF NOT EXISTS enable_photobooth   BOOLEAN    DEFAULT true;
ALTER TABLE public.devices ADD COLUMN IF NOT EXISTS enable_self_photo   BOOLEAN    DEFAULT false;
ALTER TABLE public.devices ADD COLUMN IF NOT EXISTS self_photo_durations FLOAT[]   DEFAULT '{5, 10, 15}';

-- Drop and recreate RPC to avoid return-type conflict
DROP FUNCTION IF EXISTS validate_device_code(TEXT);

CREATE OR REPLACE FUNCTION validate_device_code(p_code TEXT)
RETURNS TABLE (
  device_id            UUID,
  creator_id           UUID,
  device_name          TEXT,
  payment_enabled      BOOLEAN,
  available_frames     UUID[],
  enable_photobooth    BOOLEAN,
  enable_self_photo    BOOLEAN,
  self_photo_durations FLOAT[]
) AS $$
BEGIN
  RETURN QUERY
  UPDATE public.devices
  SET last_login = now()
  WHERE unique_code = p_code AND is_active = true
  RETURNING
    id,
    devices.creator_id,
    name,
    devices.payment_enabled,
    devices.available_frames,
    devices.enable_photobooth,
    devices.enable_self_photo,
    devices.self_photo_durations;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
