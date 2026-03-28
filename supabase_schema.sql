-- ==========================================
-- Latarcerita Photobooth - Database Schema
-- Run this in Supabase SQL Editor
-- ==========================================

-- 1. Create the frames table
CREATE TABLE frames (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  image_url TEXT NOT NULL,
  frame_x INTEGER DEFAULT 0,
  frame_y INTEGER DEFAULT 0,
  frame_width INTEGER DEFAULT 600,
  frame_height INTEGER DEFAULT 900,
  slots JSONB NOT NULL DEFAULT '[]',
  slot_count INTEGER GENERATED ALWAYS AS (jsonb_array_length(slots)) STORED,
  photo_count INTEGER DEFAULT 0,  -- Unique photo numbers (actual session shots needed)
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Enable Row Level Security
ALTER TABLE frames ENABLE ROW LEVEL SECURITY;

-- 3. Public access policies (for kiosk use)
CREATE POLICY "Public read" ON frames FOR SELECT USING (true);
CREATE POLICY "Public insert" ON frames FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update" ON frames FOR UPDATE USING (true);
CREATE POLICY "Public delete" ON frames FOR DELETE USING (true);

-- 4. Create a storage bucket for frame images
-- Do this manually in Supabase Dashboard: Storage → New Bucket → Name: "frames", Public: ON
