-- Fix RLS policy for updating post status
-- Drop the existing policy if it exists
DROP POLICY IF EXISTS "Users can update own post status" ON posts;

-- Create a more comprehensive policy that allows users to update their own posts
CREATE POLICY "Users can update own posts" ON posts
  FOR UPDATE USING (auth.uid() = user_id);

-- Also ensure we have a policy for inserting posts
CREATE POLICY "Users can insert own posts" ON posts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- And a policy for deleting own posts
CREATE POLICY "Users can delete own posts" ON posts
  FOR DELETE USING (auth.uid() = user_id);

-- Ensure the basic select policy exists
CREATE POLICY "Users can view all posts" ON posts
  FOR SELECT USING (true); 