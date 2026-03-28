-- Add device tracking to captures
ALTER TABLE captures ADD COLUMN IF NOT EXISTS device_id UUID REFERENCES devices(id) ON DELETE SET NULL;
ALTER TABLE captures ADD COLUMN IF NOT EXISTS device_name TEXT;

-- Update RLS for analytics
-- Creators can already see their own captures via user_id
