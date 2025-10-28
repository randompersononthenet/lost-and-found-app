import React from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';
import ResponsiveContainer from '@/components/ResponsiveContainer';

export default function PasswordResetScreen() {
  const { colors } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams();
  const [password, setPassword] = React.useState('');
  const [confirm, setConfirm] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  const code = (params?.code as string) || '';

  React.useEffect(() => {
    // If no code present, redirect to /auth
    if (!code) {
      router.replace('/auth');
    }
  }, [code]);

  React.useEffect(() => {
    let active = true;
    (async () => {
      if (!code) return;
      try {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error && active) setError(error.message);
      } catch (e: any) {
        if (active) setError(e?.message || 'Failed to start reset session');
      }
    })();
    return () => { active = false; };
  }, [code]);

  const handleUpdate = async () => {
    setError(null);
    setSuccess(null);
    if (!password || password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setSuccess('Password updated. You can now sign in.');
      setTimeout(() => router.replace('/auth'), 800);
    } catch (e: any) {
      setError(e?.message || 'Failed to update password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ResponsiveContainer>
        <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView contentContainerStyle={styles.content}>
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.title, { color: colors.text }]}>Set New Password</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Enter and confirm your new password to complete the reset.</Text>
              <View style={[styles.input, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                <TextInput
                  style={[styles.inputText, { color: colors.text }]}
                  placeholder="New password"
                  placeholderTextColor={colors.textSecondary}
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                />
              </View>
              <View style={[styles.input, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                <TextInput
                  style={[styles.inputText, { color: colors.text }]}
                  placeholder="Confirm new password"
                  placeholderTextColor={colors.textSecondary}
                  secureTextEntry
                  value={confirm}
                  onChangeText={setConfirm}
                />
              </View>
              {error ? <Text style={{ color: colors.error, marginTop: 8 }}>{error}</Text> : null}
              {success ? <Text style={{ color: colors.success, marginTop: 8 }}>{success}</Text> : null}
              <TouchableOpacity style={[styles.button, { backgroundColor: colors.primary }]} onPress={handleUpdate} disabled={loading}>
                <Text style={[styles.buttonText, { color: colors.card }]}>{loading ? 'Updating...' : 'Update Password'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ alignSelf: 'center', marginTop: 12 }} onPress={() => router.replace('/auth')}>
                <Text style={{ color: colors.primary, fontFamily: 'Inter-SemiBold' }}>Back to Sign In</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </ResponsiveContainer>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flexGrow: 1, padding: 20, justifyContent: 'center' },
  card: { padding: 24, borderRadius: 16, borderWidth: 1 },
  title: { fontSize: 24, fontFamily: 'Inter-Bold', marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 14, fontFamily: 'Inter-Regular', textAlign: 'center', marginBottom: 20 },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 12, marginTop: 12 },
  inputText: { fontSize: 16, fontFamily: 'Inter-Regular' },
  button: { paddingVertical: 14, borderRadius: 8, alignItems: 'center', marginTop: 16 },
  buttonText: { fontSize: 16, fontFamily: 'Inter-SemiBold' },
});
