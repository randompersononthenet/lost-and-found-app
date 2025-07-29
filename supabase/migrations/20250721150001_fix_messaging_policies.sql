-- Drop existing policies that cause infinite recursion
DROP POLICY IF EXISTS "Users can view conversation participants" ON conversation_participants;
DROP POLICY IF EXISTS "Users can insert conversation participants" ON conversation_participants;
DROP POLICY IF EXISTS "Users can update their own participation" ON conversation_participants;

-- Create simpler, non-recursive policies
CREATE POLICY "Users can view conversation participants" ON conversation_participants
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert conversation participants" ON conversation_participants
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own participation" ON conversation_participants
  FOR UPDATE USING (user_id = auth.uid());

-- Also fix the conversations policies to be simpler
DROP POLICY IF EXISTS "Users can view conversations they participate in" ON conversations;
DROP POLICY IF EXISTS "Users can insert conversations" ON conversations;
DROP POLICY IF EXISTS "Users can update conversations they participate in" ON conversations;

CREATE POLICY "Users can view conversations" ON conversations
  FOR SELECT USING (true);

CREATE POLICY "Users can insert conversations" ON conversations
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update conversations" ON conversations
  FOR UPDATE USING (true); 