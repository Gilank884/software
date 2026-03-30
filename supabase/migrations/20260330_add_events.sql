-- ==========================================
-- Add Events Table and Link to Devices
-- ==========================================

-- 1. Create the events table
CREATE TABLE IF NOT EXISTS events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Add event_id to devices
ALTER TABLE devices ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES events(id) ON DELETE SET NULL;

-- 3. Enable RLS
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- 4. Events Policies
DROP POLICY IF EXISTS "Creators can manage own events" ON events;
CREATE POLICY "Creators can manage own events" ON events FOR ALL USING (auth.uid() = creator_id);

DROP POLICY IF EXISTS "Anyone can read events" ON events;
CREATE POLICY "Anyone can read events" ON events FOR SELECT USING (true);
