/*
  # Fix profiles table RLS policies

  1. Security Updates
    - Add INSERT policy for authenticated users to create their own profile
    - Ensure users can only insert profiles with their own user ID
    - Fix existing policies to work properly with authentication

  2. Changes
    - Add policy for users to insert their own profile data
    - Update existing policies for better security
*/

-- Drop existing policies to recreate them properly
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Allow users to view all profiles (for the social aspect of the app)
CREATE POLICY "Users can view all profiles"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (true);

-- Allow users to insert their own profile
CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Allow users to delete their own profile (optional, for account deletion)
CREATE POLICY "Users can delete own profile"
  ON profiles
  FOR DELETE
  TO authenticated
  USING (auth.uid() = id);