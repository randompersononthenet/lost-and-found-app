import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';
import Toast from 'react-native-toast-message';

interface Notification {
  id: string;
  user_id: string;
  title: string;
  body: string;
  type: 'comment' | 'message' | 'system';
  read: boolean;
  created_at: string;
  sender_id?: string;
  post_id?: string;
  conversation_id?: string;
  data?: any;
}

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  registerForPushNotifications: () => Promise<string | null>;
  loadNotifications: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (notificationId: string) => Promise<void>;
  clearAllNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    // iOS specific fields for newer SDKs
    shouldShowBanner: true,
    shouldShowList: true,
  } as Notifications.NotificationBehavior),
});

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);

  // Register for push notifications
  const registerForPushNotifications = async (): Promise<string | null> => {
    let token: string | null = null;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    // Check if we're on a physical device
    const isDevice = Platform.OS !== 'web';
    
    if (isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        Toast.show({
          type: 'error',
          text1: 'Permission Required',
          text2: 'Push notifications are required for the best experience.',
        });
        return null;
      }
      
      try {
        token = (await Notifications.getExpoPushTokenAsync({
          projectId: process.env.EXPO_PUBLIC_PROJECT_ID,
        })).data;
      } catch (error) {
        console.error('Error getting push token:', error);
      }
    } else {
      Toast.show({
        type: 'info',
        text1: 'Physical Device Required',
        text2: 'Push notifications only work on physical devices.',
      });
    }

    setExpoPushToken(token);
    return token;
  };

  // Load notifications from database
  const loadNotifications = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setNotifications(data || []);
      setUnreadCount((data || []).filter(n => !n.read).length);
    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  // Mark notification as read
  const markAsRead = async (notificationId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId)
        .eq('user_id', user.id);

      if (error) throw error;

      // Update local state
      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId ? { ...n, read: true } : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error: any) {
      console.error('Error marking notification as read:', error);
      Toast.show({ type: 'error', text1: 'Error', text2: error?.message || 'Failed to mark as read' });
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false);

      if (error) throw error;

      // Update local state
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error: any) {
      console.error('Error marking all notifications as read:', error);
      Toast.show({ type: 'error', text1: 'Error', text2: error?.message || 'Failed to mark all as read' });
    }
  };

  // Delete a notification
  const deleteNotification = async (notificationId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)
        .eq('user_id', user.id);

      if (error) throw error;

      // Update local state & unread count based on previous state
      let wasUnread = false;
      setNotifications(prev => {
        const target = prev.find(n => n.id === notificationId);
        wasUnread = !!(target && !target.read);
        return prev.filter(n => n.id !== notificationId);
      });
      if (wasUnread) {
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error: any) {
      console.error('Error deleting notification:', error);
      Toast.show({ type: 'error', text1: 'Error', text2: error?.message || 'Failed to delete notification' });
    }
  };

  // Clear all notifications
  const clearAllNotifications = async () => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', user.id);

      if (error) throw error;

      // Update local state
      setNotifications([]);
      setUnreadCount(0);
    } catch (error: any) {
      console.error('Error clearing all notifications:', error);
      Toast.show({ type: 'error', text1: 'Error', text2: error?.message || 'Failed to clear notifications' });
    }
  };

  // Update user's push token in database
  const updatePushToken = async (token: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ push_token: token })
        .eq('id', user.id);

      if (error) {
        console.error('Error updating push token:', error);
      }
    } catch (error) {
      console.error('Error updating push token:', error);
    }
  };

  // Set up notification listeners
  useEffect(() => {
    if (!user) return;

    // Register for push notifications
    registerForPushNotifications().then(token => {
      if (token) {
        updatePushToken(token);
      }
    });

    // Listen for incoming notifications
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received:', notification);
      // Reload notifications when a new one is received
      loadNotifications();
    });

    // Listen for notification responses (when user taps notification)
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification response:', response);
      
      const data = response.notification.request.content.data;
      
      // Handle navigation based on notification type
      if (data?.type === 'comment' && data?.post_id) {
        // Navigate to comments screen
        // This will be handled by the navigation logic
      } else if (data?.type === 'message' && data?.conversation_id) {
        // Navigate to chat screen
        // This will be handled by the navigation logic
      }
    });

    // Load initial notifications
    loadNotifications();

    return () => {
      if (notificationListener.current) {
        Notifications.removeNotificationSubscription(notificationListener.current);
      }
      if (responseListener.current) {
        Notifications.removeNotificationSubscription(responseListener.current);
      }
    };
  }, [user]);

  // Set up real-time subscription for notifications
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('New notification received:', payload.new);
          // Add new notification to the list
          setNotifications(prev => [payload.new as Notification, ...prev]);
          setUnreadCount(prev => prev + 1);
          
          // Show toast notification
          Toast.show({
            type: 'info',
            text1: payload.new.title,
            text2: payload.new.body,
            visibilityTime: 4000,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return (
    <NotificationContext.Provider value={{
      notifications,
      unreadCount,
      loading,
      registerForPushNotifications,
      loadNotifications,
      markAsRead,
      markAllAsRead,
      deleteNotification,
      clearAllNotifications,
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
} 