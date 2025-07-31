import React, { useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { Bell, MessageCircle, Heart, Trash2, Check, CheckCheck } from 'lucide-react-native';
import { router } from 'expo-router';
import Toast from 'react-native-toast-message';

interface NotificationItem {
  id: string;
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

export default function NotificationsScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { 
    notifications, 
    unreadCount, 
    loading, 
    loadNotifications, 
    markAsRead, 
    markAllAsRead, 
    deleteNotification, 
    clearAllNotifications 
  } = useNotifications();

  useEffect(() => {
    if (!user) {
      router.replace('/auth');
      return;
    }
    loadNotifications();
  }, [user]);

  const onRefresh = async () => {
    await loadNotifications();
  };

  const handleMarkAsRead = async (notificationId: string) => {
    await markAsRead(notificationId);
  };

  const handleDeleteNotification = async (notificationId: string) => {
    Alert.alert(
      'Delete Notification',
      'Are you sure you want to delete this notification?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            await deleteNotification(notificationId);
            Toast.show({
              type: 'success',
              text1: 'Notification Deleted',
              text2: 'The notification has been removed.',
            });
          }
        },
      ]
    );
  };

  const handleMarkAllAsRead = async () => {
    Alert.alert(
      'Mark All as Read',
      'Are you sure you want to mark all notifications as read?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Mark All Read', 
          onPress: async () => {
            await markAllAsRead();
            Toast.show({
              type: 'success',
              text1: 'All Notifications Read',
              text2: 'All notifications have been marked as read.',
            });
          }
        },
      ]
    );
  };

  const handleClearAll = async () => {
    Alert.alert(
      'Clear All Notifications',
      'Are you sure you want to delete all notifications? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear All', 
          style: 'destructive',
          onPress: async () => {
            await clearAllNotifications();
            Toast.show({
              type: 'success',
              text1: 'All Notifications Cleared',
              text2: 'All notifications have been removed.',
            });
          }
        },
      ]
    );
  };

  const handleNotificationPress = async (notification: NotificationItem) => {
    // Mark as read if not already read
    if (!notification.read) {
      await markAsRead(notification.id);
    }

    // Navigate based on notification type
    if (notification.type === 'comment' && notification.post_id) {
      router.push(`/comments?postId=${notification.post_id}`);
    } else if (notification.type === 'message' && notification.conversation_id) {
      router.push(`/chat?conversationId=${notification.conversation_id}`);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'comment':
        return <MessageCircle size={20} color={colors.primary} />;
      case 'message':
        return <Bell size={20} color={colors.secondary} />;
      case 'system':
        return <Heart size={20} color={colors.accent} />;
      default:
        return <Bell size={20} color={colors.textSecondary} />;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else if (diffInHours < 168) {
      return `${Math.floor(diffInHours / 24)}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const renderNotification = ({ item }: { item: NotificationItem }) => (
    <TouchableOpacity
      style={[
        styles.notificationItem,
        { 
          backgroundColor: item.read ? colors.surface : colors.card,
          borderColor: colors.border 
        }
      ]}
      onPress={() => handleNotificationPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.notificationHeader}>
        <View style={styles.iconContainer}>
          {getNotificationIcon(item.type)}
        </View>
        <View style={styles.notificationContent}>
          <Text style={[styles.notificationTitle, { color: colors.text }]}>
            {item.title}
          </Text>
          <Text style={[styles.notificationBody, { color: colors.textSecondary }]}>
            {item.body}
          </Text>
          <Text style={[styles.notificationTime, { color: colors.textSecondary }]}>
            {formatDate(item.created_at)}
          </Text>
        </View>
        <View style={styles.notificationActions}>
          {!item.read && (
            <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />
          )}
          <TouchableOpacity
            onPress={() => handleDeleteNotification(item.id)}
            style={styles.deleteButton}
          >
            <Trash2 size={16} color={colors.error} />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Bell size={64} color={colors.textSecondary} />
      <Text style={[styles.emptyStateTitle, { color: colors.text }]}>
        No Notifications
      </Text>
      <Text style={[styles.emptyStateBody, { color: colors.textSecondary }]}>
        You'll see notifications here when someone comments on your posts or sends you a message.
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Notifications
        </Text>
        {notifications.length > 0 && (
          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={handleMarkAllAsRead}
              style={[styles.headerButton, { backgroundColor: colors.surface }]}
            >
              <CheckCheck size={16} color={colors.primary} />
              <Text style={[styles.headerButtonText, { color: colors.primary }]}>
                Mark All Read
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleClearAll}
              style={[styles.headerButton, { backgroundColor: colors.surface }]}
            >
              <Trash2 size={16} color={colors.error} />
              <Text style={[styles.headerButtonText, { color: colors.error }]}>
                Clear All
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <FlatList
        data={notifications}
        renderItem={renderNotification}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={loading}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  headerButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  listContainer: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  notificationItem: {
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  notificationHeader: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'flex-start',
  },
  iconContainer: {
    marginRight: 12,
    marginTop: 2,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  notificationBody: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  notificationTime: {
    fontSize: 12,
  },
  notificationActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  deleteButton: {
    padding: 4,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateBody: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
}); 