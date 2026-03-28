-- Add configuration columns to devices table
ALTER TABLE devices ADD COLUMN IF NOT EXISTS payment_enabled BOOLEAN DEFAULT false;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS available_frames UUID[] DEFAULT '{}';
