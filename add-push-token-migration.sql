-- Add push_token column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS push_token TEXT;

-- Create index for better performance when querying by push token
CREATE INDEX IF NOT EXISTS idx_profiles_push_token ON profiles(push_token) WHERE push_token IS NOT NULL;
 
-- Update RLS policy to allow users to update their own push token
CREATE POLICY "Users can update own push token" ON profiles
  FOR UPDATE USING (auth.uid() = id); 