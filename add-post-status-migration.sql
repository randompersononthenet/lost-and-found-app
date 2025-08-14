-- Add status field to posts table for tracking resolved items
ALTER TABLE posts 
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'claimed'));

-- Create index for better performance when filtering by status
CREATE INDEX IF NOT EXISTS idx_posts_status ON posts(status);

-- Update existing posts to have 'active' status if they don't have one
UPDATE posts SET status = 'active' WHERE status IS NULL;

-- Add RLS policy to allow users to update their own post status
CREATE POLICY "Users can update own post status" ON posts
  FOR UPDATE USING (auth.uid() = user_id); 