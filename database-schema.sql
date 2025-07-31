-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB,
  type TEXT NOT NULL CHECK (type IN ('comment', 'message', 'system')),
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);

-- Row Level Security (RLS) policies for notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users can view own notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own notifications
CREATE POLICY "Users can delete own notifications" ON notifications
  FOR DELETE USING (auth.uid() = user_id);

-- System can insert notifications for users
CREATE POLICY "System can insert notifications" ON notifications
  FOR INSERT WITH CHECK (true);

-- Function to create notification when someone comments
CREATE OR REPLACE FUNCTION create_comment_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- Get the post author
  DECLARE
    post_author_id UUID;
    commenter_name TEXT;
  BEGIN
    -- Get post author
    SELECT user_id INTO post_author_id 
    FROM posts 
    WHERE id = NEW.post_id;
    
    -- Get commenter name
    SELECT full_name INTO commenter_name 
    FROM profiles 
    WHERE id = NEW.user_id;
    
    -- Don't notify if commenting on own post
    IF post_author_id != NEW.user_id THEN
      INSERT INTO notifications (
        user_id,
        title,
        body,
        type,
        sender_id,
        post_id,
        data
      ) VALUES (
        post_author_id,
        'New Comment',
        commenter_name || ' commented on your post',
        'comment',
        NEW.user_id,
        NEW.post_id,
        jsonb_build_object('comment_id', NEW.id, 'post_id', NEW.post_id)
      );
    END IF;
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for comment notifications
CREATE TRIGGER trigger_comment_notification
  AFTER INSERT ON comments
  FOR EACH ROW
  EXECUTE FUNCTION create_comment_notification();

-- Function to create notification when someone sends a message
CREATE OR REPLACE FUNCTION create_message_notification()
RETURNS TRIGGER AS $$
BEGIN
  -- Get the conversation participants
  DECLARE
    recipient_id UUID;
    sender_name TEXT;
  BEGIN
    -- Get recipient (the other person in the conversation)
    SELECT 
      cp.user_id INTO recipient_id
    FROM conversation_participants cp
    WHERE cp.conversation_id = NEW.conversation_id
      AND cp.user_id != NEW.sender_id
    LIMIT 1;
    
    -- Get sender name
    SELECT full_name INTO sender_name 
    FROM profiles 
    WHERE id = NEW.sender_id;
    
    -- Create notification if recipient found
    IF recipient_id IS NOT NULL THEN
      INSERT INTO notifications (
        user_id,
        title,
        body,
        type,
        sender_id,
        conversation_id,
        data
      ) VALUES (
        recipient_id,
        'New Message',
        sender_name || ' sent you a message',
        'message',
        NEW.sender_id,
        NEW.conversation_id,
        jsonb_build_object('message_id', NEW.id, 'conversation_id', NEW.conversation_id)
      );
    END IF;
  END;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for message notifications
CREATE TRIGGER trigger_message_notification
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION create_message_notification(); 