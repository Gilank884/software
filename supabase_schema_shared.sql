-- Create shared_captures table
CREATE TABLE IF NOT EXISTS shared_captures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  email TEXT NOT NULL,
  photo_url TEXT NOT NULL,
  frame_id UUID REFERENCES frames(id),
  filter TEXT,
  session_id UUID -- Optional: identify unique photobooth sessions
);

-- Enable RLS
ALTER TABLE shared_captures ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts (adjust as needed for production)
CREATE POLICY "Allow anonymous insert" ON shared_captures
  FOR INSERT WITH CHECK (true);

-- Allow public read (to view the shared photo)
CREATE POLICY "Allow public select" ON shared_captures
  FOR SELECT USING (true);
