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

  // App-level maintenance gate data (must be before any early return)
  const [maintText, setMaintText] = React.useState<string>('');
  const [maintMode, setMaintMode] = React.useState<boolean>(false);
  const [maintLevel, setMaintLevel] = React.useState<string | null>(null);

  React.useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('app_settings')
        .select('maintenance_banner_text, maintenance_mode, maintenance_level')
        .eq('id', 1)
        .single();
      if (data) {
        setMaintText(data.maintenance_banner_text || '');
        setMaintMode(!!data.maintenance_mode);
        setMaintLevel((data as any).maintenance_level || null);
      }
    })();
  }, []);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  // Full-screen maintenance lockout component
  function FullScreenMaintenance({ text }: { text: string }) {
    const { colors } = useTheme();
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <ResponsiveContainer>
          <View style={{ padding: 24, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card }}>
            <Text style={{ color: colors.warning || colors.primary, fontFamily: 'Inter-Bold', fontSize: 20, marginBottom: 8 }}>Maintenance Mode</Text>
            <Text style={{ color: colors.text, fontFamily: 'Inter-Regular', fontSize: 16 }}>{text}</Text>
          </View>
        </ResponsiveContainer>
      </View>
    );
  }

  function MaintenanceBanner() {
    const { colors } = useTheme();
    const [text, setText] = React.useState<string>('');
    const [enabled, setEnabled] = React.useState<boolean>(false);
    const [level, setLevel] = React.useState<string | null>(null);

    React.useEffect(() => {
      let mounted = true;
      (async () => {
        const { data } = await supabase
          .from('app_settings')
          .select('maintenance_banner_text, maintenance_mode, maintenance_level')
          .eq('id', 1)
          .single();
        if (mounted && data) {
          setText(data.maintenance_banner_text || '');
          setEnabled(!!data.maintenance_mode);
          setLevel((data as any).maintenance_level || null);
        }
      })();
      return () => { mounted = false; };
    }, []);

    // If full lockout, banner component should not render; gate handles it
    if (!enabled || !text.trim() || level === 'full_lockout') return null;

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
            {(maintMode && maintLevel === 'full_lockout' && maintText.trim()) ? (
              <>
                <FullScreenMaintenance text={maintText} />
                <StatusBar style="auto" />
                <Toast />
              </>
            ) : (
              <>
                <MaintenanceBanner />
                <Stack screenOptions={{ headerShown: false }}>
                  <Stack.Screen name="(tabs)" />
                  <Stack.Screen name="auth" />
                  <Stack.Screen name="auth/reset" />
                  <Stack.Screen name="+not-found" />
                </Stack>
                <StatusBar style="auto" />
                <Toast />
              </>
            )}
          </NotificationProvider>
        </MessagingProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}