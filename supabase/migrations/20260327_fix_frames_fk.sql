-- Fix foreign key constraint for frames table
-- Link directly to auth.users instead of profiles for better reliability

ALTER TABLE frames DROP CONSTRAINT IF EXISTS frames_user_id_fkey;
ALTER TABLE frames ADD CONSTRAINT frames_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Also fix captures and shared_captures for consistency if they exist
ALTER TABLE captures DROP CONSTRAINT IF EXISTS captures_user_id_fkey;
ALTER TABLE captures ADD CONSTRAINT captures_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE shared_captures DROP CONSTRAINT IF EXISTS shared_captures_user_id_fkey;
ALTER TABLE shared_captures ADD CONSTRAINT shared_captures_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
