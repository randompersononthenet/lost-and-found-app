import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
import { View, Text } from 'react-native';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { MessagingProvider } from '@/contexts/MessagingContext';
import { NotificationProvider } from '@/contexts/NotificationContext';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';
import ResponsiveContainer from '@/components/ResponsiveContainer';
import Toast from 'react-native-toast-message';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import * as SplashScreen from 'expo-splash-screen';

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useFrameworkReady();

  const [fontsLoaded, fontError] = useFonts({
    'Inter-Regular': Inter_400Regular,
    'Inter-Medium': Inter_500Medium,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  function MaintenanceBanner() {
    const { colors } = useTheme();
    const [text, setText] = React.useState<string>('');
    const [enabled, setEnabled] = React.useState<boolean>(false);

    React.useEffect(() => {
      let mounted = true;
      (async () => {
        const { data } = await supabase
          .from('app_settings')
          .select('maintenance_banner_text, maintenance_mode')
          .eq('id', 1)
          .single();
        if (mounted && data) {
          setText(data.maintenance_banner_text || '');
          setEnabled(!!data.maintenance_mode);
        }
      })();
      return () => { mounted = false; };
    }, []);

    if (!enabled || !text.trim()) return null;

    return (
      <View style={{ borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surface }}>
        <ResponsiveContainer>
          <View style={{ paddingHorizontal: 16, paddingVertical: 10 }}>
            <Text style={{ color: colors.warning || colors.primary, fontFamily: 'Inter-SemiBold', marginBottom: 2 }}>Maintenance Notice</Text>
            <Text style={{ color: colors.text, fontFamily: 'Inter-Regular' }}>{text}</Text>
          </View>
        </ResponsiveContainer>
      </View>
    );
  }

  return (
    <ThemeProvider>
      <AuthProvider>
        <MessagingProvider>
          <NotificationProvider>
            <MaintenanceBanner />
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="auth" />
              <Stack.Screen name="+not-found" />
            </Stack>
            <StatusBar style="auto" />
            <Toast />
          </NotificationProvider>
        </MessagingProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}