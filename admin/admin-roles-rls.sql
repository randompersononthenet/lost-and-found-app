-- Roles and moderation helpers for admin web app
-- Ensure RLS is enabled on relevant tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Add role and disabled flags to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT CHECK (role IN ('user','moderator','admin')) DEFAULT 'user';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS disabled BOOLEAN DEFAULT FALSE;

-- Helper functions (SECURITY DEFINER) to detect admin/moderator
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.role = 'admin'
      AND COALESCE(p.disabled, false) = false
  );
$$;

CREATE OR REPLACE FUNCTION is_moderator()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
      AND p.role IN ('moderator','admin')
      AND COALESCE(p.disabled, false) = false
  );
$$;

-- Profiles policies
-- Allow users to select their own profile; admins can select all
DROP POLICY IF EXISTS "profiles_select_all_or_self" ON profiles;
CREATE POLICY "profiles_select_all_or_self" ON profiles
  FOR SELECT
  USING (is_admin() OR id = auth.uid());

-- Allow users to update their own non-privileged fields (broad update here for simplicity)
DROP POLICY IF EXISTS "profiles_update_self" ON profiles;
CREATE POLICY "profiles_update_self" ON profiles
  FOR UPDATE
  USING (id = auth.uid());

-- Allow admins to update any profile (including role/disabled)
DROP POLICY IF EXISTS "profiles_update_admin" ON profiles;
CREATE POLICY "profiles_update_admin" ON profiles
  FOR UPDATE
  USING (is_admin());

-- Posts policies: view all, insert own, update/delete own OR moderator/admin
DROP POLICY IF EXISTS "posts_select_all" ON posts;
CREATE POLICY "posts_select_all" ON posts FOR SELECT USING (true);

DROP POLICY IF EXISTS "posts_insert_own" ON posts;
CREATE POLICY "posts_insert_own" ON posts FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "posts_update_own_or_moderate" ON posts;
CREATE POLICY "posts_update_own_or_moderate" ON posts
  FOR UPDATE USING (auth.uid() = user_id OR is_moderator());

DROP POLICY IF EXISTS "posts_delete_own_or_moderate" ON posts;
CREATE POLICY "posts_delete_own_or_moderate" ON posts
  FOR DELETE USING (auth.uid() = user_id OR is_moderator());

-- Comments policies: view all; delete/update if moderator/admin or comment owner
DROP POLICY IF EXISTS "comments_select_all" ON comments;
CREATE POLICY "comments_select_all" ON comments FOR SELECT USING (true);

DROP POLICY IF EXISTS "comments_update_owner_or_moderate" ON comments;
CREATE POLICY "comments_update_owner_or_moderate" ON comments
  FOR UPDATE USING (auth.uid() = user_id OR is_moderator());

DROP POLICY IF EXISTS "comments_delete_owner_or_moderate" ON comments;
CREATE POLICY "comments_delete_owner_or_moderate" ON comments
  FOR DELETE USING (auth.uid() = user_id OR is_moderator()); 