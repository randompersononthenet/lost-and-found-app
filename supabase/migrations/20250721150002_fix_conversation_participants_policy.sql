-- Drop all existing policies for conversation_participants
DROP POLICY IF EXISTS "Users can view conversation participants" ON conversation_participants;
DROP POLICY IF EXISTS "Users can insert conversation participants" ON conversation_participants;
DROP POLICY IF EXISTS "Users can update their own participation" ON conversation_participants;

-- Create simple, permissive policies
CREATE POLICY "Users can view conversation participants" ON conversation_participants
  FOR SELECT USING (true);

CREATE POLICY "Users can insert conversation participants" ON conversation_participants
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update conversation participants" ON conversation_participants
  FOR UPDATE USING (user_id = auth.uid());

-- Also simplify messages policies
DROP POLICY IF EXISTS "Users can view messages in conversations they participate in" ON messages;
DROP POLICY IF EXISTS "Users can insert messages" ON messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON messages;
DROP POLICY IF EXISTS "Users can delete their own messages" ON messages;

CREATE POLICY "Users can view messages" ON messages
  FOR SELECT USING (true);

CREATE POLICY "Users can insert messages" ON messages
  FOR INSERT WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Users can update messages" ON messages
  FOR UPDATE USING (sender_id = auth.uid());

CREATE POLICY "Users can delete messages" ON messages
  FOR DELETE USING (sender_id = auth.uid()); 