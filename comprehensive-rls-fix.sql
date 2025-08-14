-- Comprehensive RLS fix for posts table
-- First, let's check and enable RLS if not already enabled
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Users can update own post status" ON posts;
DROP POLICY IF EXISTS "Users can update own posts" ON posts;
DROP POLICY IF EXISTS "Users can insert own posts" ON posts;
DROP POLICY IF EXISTS "Users can delete own posts" ON posts;
DROP POLICY IF EXISTS "Users can view all posts" ON posts;
DROP POLICY IF EXISTS "Enable read access for all users" ON posts;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON posts;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON posts;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON posts;

-- Create comprehensive policies
-- 1. Allow all users to view all posts
CREATE POLICY "Enable read access for all users" ON posts
  FOR SELECT USING (true);

-- 2. Allow authenticated users to insert their own posts
CREATE POLICY "Enable insert for authenticated users only" ON posts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 3. Allow users to update their own posts (including status)
CREATE POLICY "Enable update for users based on user_id" ON posts
  FOR UPDATE USING (auth.uid() = user_id);

-- 4. Allow users to delete their own posts
CREATE POLICY "Enable delete for users based on user_id" ON posts
  FOR DELETE USING (auth.uid() = user_id);

-- Verify the policies are working
-- You can test this by running:
-- SELECT * FROM posts WHERE user_id = auth.uid(); -- Should work
-- UPDATE posts SET status = 'resolved' WHERE id = 'some-post-id' AND user_id = auth.uid(); -- Should work 