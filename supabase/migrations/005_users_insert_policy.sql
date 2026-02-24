-- Allow authenticated users to insert their own profile row.
-- Needed for edge case: existing users who logged in before the auth callback
-- started syncing profiles to the users table.
CREATE POLICY "Users can insert own profile"
  ON users FOR INSERT WITH CHECK (auth.uid() = id);
