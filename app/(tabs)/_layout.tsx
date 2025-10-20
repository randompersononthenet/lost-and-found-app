import { Tabs } from 'expo-router';
import { Chrome as Home, Plus, MessageCircle, User, Bell, Search as SearchIcon } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { Platform, useWindowDimensions, View, Text } from 'react-native';
import { TouchableOpacity } from 'react-native';
import { router } from 'expo-router';

export default function TabLayout() {
  const { colors } = useTheme();
  const { unreadCount } = useNotifications();
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const hideTabs = isWeb && width >= 1024; // hide on wide web

  return (
    <Tabs
      screenOptions={{
        headerShown: hideTabs,
        header: hideTabs
          ? () => (
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 20,
                paddingVertical: 12,
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
                backgroundColor: colors.surface,
              }}>
                <Text style={{ color: colors.text, fontFamily: 'Inter-Bold', fontSize: 18 }}>RECLAIM</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <TouchableOpacity onPress={() => router.push('/(tabs)')} style={{ padding: 8, marginRight: 4 }}>
                    <Home size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => router.push('/search')} style={{ padding: 8, marginRight: 4 }}>
                    <SearchIcon size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => router.push('/(tabs)/create')} style={{ padding: 8, marginRight: 4 }}>
                    <Plus size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => router.push('/(tabs)/messages')} style={{ padding: 8, marginRight: 4 }}>
                    <MessageCircle size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => router.push('/(tabs)/profile')} style={{ padding: 8 }}>
                    <User size={20} color={colors.textSecondary} />
                  </TouchableOpacity>
                </View>
              </View>
            )
          : undefined,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarShowLabel: false,
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
        tabBarLabelStyle: undefined,
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