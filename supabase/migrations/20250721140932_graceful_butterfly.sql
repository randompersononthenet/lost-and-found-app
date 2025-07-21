/*
  # Lost & Found App Schema

  1. New Tables
    - `profiles`
      - `id` (uuid, references auth.users)
      - `email` (text, unique)
      - `full_name` (text)
      - `avatar_url` (text, optional)
      - `birthday` (date, optional)
      - `gender` (text, optional)
      - `year_level` (text, optional)
      - `section` (text, optional)
      - `course` (text, optional)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

    - `posts`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references profiles)
      - `title` (text)
      - `description` (text)
      - `category` (text: 'lost' or 'found')
      - `location` (text, optional)
      - `date_lost_found` (date, optional)
      - `images` (text array, optional)
      - `status` (text: 'active', 'resolved', 'archived')
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

    - `comments`
      - `id` (uuid, primary key)
      - `post_id` (uuid, references posts)
      - `user_id` (uuid, references profiles)
      - `content` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

    - `likes`
      - `id` (uuid, primary key)
      - `post_id` (uuid, references posts)
      - `user_id` (uuid, references profiles)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
    - Add policies for reading public data
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  avatar_url text,
  birthday date,
  gender text CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say')),
  year_level text,
  section text,
  course text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create posts table
CREATE TABLE IF NOT EXISTS posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  category text CHECK (category IN ('lost', 'found')) NOT NULL,
  location text,
  date_lost_found date,
  images text[] DEFAULT '{}',
  status text CHECK (status IN ('active', 'resolved', 'archived')) DEFAULT 'active',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create comments table
CREATE TABLE IF NOT EXISTS comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create likes table
CREATE TABLE IF NOT EXISTS likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES posts(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(post_id, user_id)
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Posts policies
CREATE POLICY "Anyone can view active posts"
  ON posts FOR SELECT
  TO authenticated
  USING (status = 'active');

CREATE POLICY "Users can create posts"
  ON posts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own posts"
  ON posts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own posts"
  ON posts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Comments policies
CREATE POLICY "Anyone can view comments"
  ON comments FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create comments"
  ON comments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own comments"
  ON comments FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments"
  ON comments FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Likes policies
CREATE POLICY "Anyone can view likes"
  ON likes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can create likes"
  ON likes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own likes"
  ON likes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS posts_user_id_idx ON posts(user_id);
CREATE INDEX IF NOT EXISTS posts_created_at_idx ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS posts_category_idx ON posts(category);
CREATE INDEX IF NOT EXISTS comments_post_id_idx ON comments(post_id);
CREATE INDEX IF NOT EXISTS likes_post_id_idx ON likes(post_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at 
  BEFORE UPDATE ON profiles 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_posts_updated_at 
  BEFORE UPDATE ON posts 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comments_updated_at 
  BEFORE UPDATE ON comments 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();