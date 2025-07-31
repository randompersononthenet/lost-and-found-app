-- Fix the message notification function to work with the correct table structure
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