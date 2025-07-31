import { supabase } from './supabase';

interface PushNotificationData {
  title: string;
  body: string;
  data?: any;
  sound?: 'default' | null;
  badge?: number;
}

interface NotificationPayload {
  to: string | string[];
  title: string;
  body: string;
  data?: any;
  sound?: 'default' | null;
  badge?: number;
}

// Function to send push notification to a single user
export const sendPushNotification = async (
  userId: string,
  notification: PushNotificationData
): Promise<boolean> => {
  try {
    // Get user's push token
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('push_token')
      .eq('id', userId)
      .single();

    if (error || !profile?.push_token) {
      console.log('No push token found for user:', userId);
      return false;
    }

    // Send notification via Expo's push service
    const message: NotificationPayload = {
      to: profile.push_token,
      title: notification.title,
      body: notification.body,
      data: notification.data,
      sound: notification.sound || 'default',
      badge: notification.badge,
    };

    const response = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    const result = await response.json();
    
    if (response.ok && result.data) {
      console.log('Push notification sent successfully to user:', userId);
      return true;
    } else {
      console.error('Failed to send push notification:', result);
      return false;
    }
  } catch (error) {
    console.error('Error sending push notification:', error);
    return false;
  }
};

// Function to send push notification to multiple users
export const sendPushNotificationToMultiple = async (
  userIds: string[],
  notification: PushNotificationData
): Promise<{ success: string[], failed: string[] }> => {
  const results = await Promise.allSettled(
    userIds.map(userId => sendPushNotification(userId, notification))
  );

  const success: string[] = [];
  const failed: string[] = [];

  results.forEach((result, index) => {
    if (result.status === 'fulfilled' && result.value) {
      success.push(userIds[index]);
    } else {
      failed.push(userIds[index]);
    }
  });

  return { success, failed };
};

// Function to send notification for new comment
export const sendCommentNotification = async (
  postAuthorId: string,
  commenterName: string,
  postTitle: string,
  postId: string,
  commentId: string
): Promise<boolean> => {
  return await sendPushNotification(postAuthorId, {
    title: 'New Comment',
    body: `${commenterName} commented on your post "${postTitle}"`,
    data: {
      type: 'comment',
      post_id: postId,
      comment_id: commentId,
    },
    sound: 'default',
  });
};

// Function to send notification for new message
export const sendMessageNotification = async (
  recipientId: string,
  senderName: string,
  messagePreview: string,
  conversationId: string,
  messageId: string
): Promise<boolean> => {
  return await sendPushNotification(recipientId, {
    title: `Message from ${senderName}`,
    body: messagePreview,
    data: {
      type: 'message',
      conversation_id: conversationId,
      message_id: messageId,
    },
    sound: 'default',
  });
};

// Function to send system notification
export const sendSystemNotification = async (
  userId: string,
  title: string,
  body: string,
  data?: any
): Promise<boolean> => {
  return await sendPushNotification(userId, {
    title,
    body,
    data: {
      type: 'system',
      ...data,
    },
    sound: 'default',
  });
}; 