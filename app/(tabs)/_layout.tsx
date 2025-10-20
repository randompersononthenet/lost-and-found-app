import { Tabs } from 'expo-router';
import { Chrome as Home, Plus, MessageCircle, User, Bell } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { Platform, useWindowDimensions } from 'react-native';

export default function TabLayout() {
  const { colors } = useTheme();
  const { unreadCount } = useNotifications();
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const hideTabs = isWeb && width >= 1024; // hide on wide web

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: hideTabs
          ? { display: 'none' }
          : {
              backgroundColor: colors.surface,
              borderTopColor: colors.border,
              height: isWeb ? 56 : 70,
              paddingBottom: isWeb ? 6 : 12,
              paddingTop: isWeb ? 6 : 8,
              borderTopWidth: 1,
              shadowColor: '#000',
              shadowOpacity: isWeb ? 0.03 : 0.06,
              shadowRadius: isWeb ? 4 : 8,
              shadowOffset: { width: 0, height: -2 },
              elevation: isWeb ? 2 : 6,
            },
        tabBarLabelStyle: {
          fontSize: isWeb ? 11 : 12,
          fontWeight: '600',
          marginTop: 2,
        },
        tabBarItemStyle: {
          alignItems: 'center',
          justifyContent: 'center',
          paddingVertical: isWeb ? 4 : 6,
        },
        tabBarBadgeStyle: {
          backgroundColor: colors.accent,
          color: '#fff',
          minWidth: 18,
          height: 18,
          lineHeight: 18,
          fontSize: 11,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Feed',
          tabBarIcon: ({ color }) => (
            <Home size={22} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="create"
        options={{
          title: 'Post',
          tabBarIcon: ({ color }) => (
            <Plus size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarIcon: ({ color }) => (
            <MessageCircle size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Notifications',
          tabBarIcon: ({ color }) => (
            <Bell size={22} color={color} />
          ),
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => (
            <User size={22} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}