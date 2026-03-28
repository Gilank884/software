-- Update validate_device_code to return configuration columns
CREATE OR REPLACE FUNCTION validate_device_code(p_code TEXT)
RETURNS TABLE (
  device_id UUID,
  creator_id UUID,
  device_name TEXT,
  payment_enabled BOOLEAN,
  available_frames UUID[]
) AS $$
BEGIN
  RETURN QUERY
  UPDATE public.devices
  SET last_login = now()
  WHERE unique_code = p_code AND is_active = true
  RETURNING id, devices.creator_id, name, devices.payment_enabled, devices.available_frames;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
