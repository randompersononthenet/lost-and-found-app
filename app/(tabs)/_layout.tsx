import { Tabs } from 'expo-router';
import { Chrome as Home, Plus, MessageCircle, User, Bell, Search as SearchIcon } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useNotifications } from '@/contexts/NotificationContext';
import { Platform, useWindowDimensions, View, Text, Image, Modal } from 'react-native';
import { TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import ResponsiveContainer from '@/components/ResponsiveContainer';
import React from 'react';
import { supabase } from '@/lib/supabase';
import * as Linking from 'expo-linking';

export default function TabLayout() {
  const { colors } = useTheme();
  const { unreadCount } = useNotifications();
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const hideTabs = isWeb && width >= 1024; // hide on wide web

  const [downloadUrl, setDownloadUrl] = React.useState<string | null>(null);
  const [qrVisible, setQrVisible] = React.useState(false);
  const [downloadDismissed, setDownloadDismissed] = React.useState(false);

  React.useEffect(() => {
    // Load app_settings single row and pull download_url if present
    const loadSettings = async () => {
      try {
        const { data, error } = await supabase
          .from('app_settings')
          .select('*')
          .eq('id', 1)
          .single();
        if (!error && data && (data as any).download_url) {
          setDownloadUrl((data as any).download_url as string);
        }
      } catch {}
    };
    if (isWeb) loadSettings();
  }, [isWeb]);

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const hidden = window.sessionStorage.getItem('hide_download_widget') === '1';
      setDownloadDismissed(hidden);
    }
  }, []);

  const dismissDownloadWidget = () => {
    setDownloadDismissed(true);
    if (typeof window !== 'undefined') {
      try { window.sessionStorage.setItem('hide_download_widget', '1'); } catch {}
    }
  };

  return (
    <>
    <Tabs
      screenOptions={{
        headerShown: hideTabs,
        header: hideTabs
          ? () => (
              <View style={{
                paddingHorizontal: 20,
                paddingVertical: 12,
                borderBottomWidth: 1,
                borderBottomColor: colors.border,
                backgroundColor: colors.surface,
              }}>
                <ResponsiveContainer>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <TouchableOpacity onPress={() => router.push('/(tabs)')} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Image source={require('../../logo.png')} style={{ width: 24, height: 24, resizeMode: 'contain' }} />
                      <Text style={{ color: colors.text, fontFamily: 'Inter-Bold', fontSize: 18 }}>RECLAIM</Text>
                    </TouchableOpacity>
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
                </ResponsiveContainer>
                {/* Floating controls are rendered globally below */}
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
    {isWeb && downloadUrl && !downloadDismissed && (
      <View style={{ position: 'fixed' as any, right: 24, bottom: 24, zIndex: 1000 }}>
        <View style={{ position: 'absolute', top: -10, right: -10 }}>
          <TouchableOpacity onPress={dismissDownloadWidget} style={{ backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4 }}>
            <Text style={{ color: colors.textSecondary, fontSize: 14, lineHeight: 16 }}>×</Text>
          </TouchableOpacity>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <TouchableOpacity
            onPress={() => Linking.openURL(downloadUrl)}
            style={{ paddingVertical: 10, paddingHorizontal: 14, borderRadius: 9999, backgroundColor: colors.primary, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 6 }}
          >
            <Text style={{ color: colors.card, fontFamily: 'Inter-SemiBold', fontSize: 13 }}>Download App</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setQrVisible(true)}
            style={{ padding: 10, borderRadius: 9999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface }}
            accessibilityLabel="Show QR code to download app"
          >
            <Image source={{ uri: `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(downloadUrl)}` }} style={{ width: 24, height: 24 }} />
          </TouchableOpacity>
        </View>
      </View>
    )}
    <Modal visible={qrVisible} transparent animationType="fade" onRequestClose={() => setQrVisible(false)}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center' }}>
        <View style={{ backgroundColor: colors.surface, padding: 16, borderRadius: 12, borderWidth: 1, borderColor: colors.border, alignItems: 'center' }}>
          <Text style={{ color: colors.text, fontFamily: 'Inter-SemiBold', fontSize: 16, marginBottom: 8 }}>Scan to download</Text>
          <Image source={{ uri: `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(downloadUrl || '')}` }} style={{ width: 220, height: 220 }} />
          <TouchableOpacity onPress={() => setQrVisible(false)} style={{ marginTop: 12, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8, backgroundColor: colors.primary }}>
            <Text style={{ color: colors.card, fontFamily: 'Inter-SemiBold' }}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
    </>
  );
}