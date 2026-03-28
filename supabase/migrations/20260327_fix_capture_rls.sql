DROP POLICY IF EXISTS "Users can insert own captures" ON captures;
DROP POLICY IF EXISTS "Allow public insert into captures" ON captures;

CREATE POLICY "Allow public insert into captures" 
  ON captures FOR INSERT 
  WITH CHECK (true);

-- Keep Select restricted to the owner (creator)
DROP POLICY IF EXISTS "Users can view own captures" ON captures;
CREATE POLICY "Users can view own captures" ON captures 
  FOR SELECT USING (auth.uid() = user_id);
