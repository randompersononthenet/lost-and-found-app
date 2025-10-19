import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { User, Eye, EyeOff } from 'lucide-react-native';
import { router } from 'expo-router';
import Toast from 'react-native-toast-message';

export default function AuthScreen() {
  const { colors } = useTheme();
  const { signIn, signUp, forgotPassword, user, isPasswordResetFlow, completePasswordReset } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [forgotModalVisible, setForgotModalVisible] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSuccess, setForgotSuccess] = useState('');
  const [forgotError, setForgotError] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');

  // Redirect if already logged in
  React.useEffect(() => {
    if (user) {
      router.replace('/(tabs)');
    }
  }, [user]);

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Missing Information',
        text2: 'Please fill in all fields',
      });
      return;
    }

    if (!isLogin) {
      if (!fullName.trim()) {
        Toast.show({
          type: 'error',
          text1: 'Missing Information',
          text2: 'Please enter your full name',
        });
        return;
      }
      if (password !== confirmPassword) {
        Toast.show({
          type: 'error',
          text1: 'Password Mismatch',
          text2: 'Passwords do not match',
        });
        return;
      }
    }

    setLoading(true);

    try {
      if (isLogin) {
        await signIn(email, password);
        router.replace('/(tabs)');
      } else {
        await signUp(email, password, fullName);
        Toast.show({
          type: 'success',
          text1: 'Account Created',
          text2: 'Please check your email to verify your account',
        });
      }
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Authentication Error',
        text2: error.message || 'Something went wrong',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteReset = async () => {
    setResetError('');
    setResetSuccess('');
    if (!resetPassword.trim() || resetPassword !== resetConfirmPassword) {
      setResetError('Passwords do not match.');
      return;
    }
    setResetLoading(true);
    try {
      await completePasswordReset(resetPassword);
      setResetSuccess('Password updated successfully. You can now sign in.');
      setResetPassword('');
      setResetConfirmPassword('');
    } catch (e: any) {
      setResetError(e?.message || 'Failed to update password.');
    } finally {
      setResetLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setForgotLoading(true);
    setForgotSuccess('');
    setForgotError('');
    try {
      await forgotPassword(forgotEmail);
      setForgotSuccess('Password reset email sent! Please check your inbox.');
    } catch (error: any) {
      setForgotError(error.message || 'Failed to send reset email.');
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Image 
                source={require('../../assets/images/icon.png')} 
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
            <Text style={[styles.title, { color: colors.text }]}>RECLAIM</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Lost & Found for your school community
            </Text>
          </View>

          {/* Form */}
          <View style={[styles.form, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.formTitle, { color: colors.text }]}>
              {isLogin ? 'Welcome Back' : 'Create Account'}
            </Text>
            <Text style={[styles.formSubtitle, { color: colors.textSecondary }]}>
              {isLogin ? 'Sign in to your account' : 'Join your school community'}
            </Text>

            {/* Full Name (Sign Up only) */}
            {!isLogin && (
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Full Name</Text>
                <View style={[styles.inputContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <User size={20} color={colors.textSecondary} />
                  <TextInput
                    style={[styles.textInput, { color: colors.text }]}
                    placeholder="Enter your full name"
                    placeholderTextColor={colors.textSecondary}
                    value={fullName}
                    onChangeText={setFullName}
                    autoCapitalize="words"
                  />
                </View>
              </View>
            )}

            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Educational Email</Text>
              <View style={[styles.inputContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.emailPrefix, { color: colors.textSecondary }]}>@</Text>
                <TextInput
                  style={[styles.textInput, { color: colors.text }]}
                  placeholder="student@university.edu"
                  placeholderTextColor={colors.textSecondary}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
              <Text style={[styles.helpText, { color: colors.textSecondary }]}>
                Only educational (.edu) emails are allowed
              </Text>
            </View>

            {/* Password */}
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Password</Text>
              <View style={[styles.inputContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <TextInput
                  style={[styles.textInputFull, { color: colors.text }]}
                  placeholder="Enter your password"
                  placeholderTextColor={colors.textSecondary}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                  {showPassword ? (
                    <EyeOff size={20} color={colors.textSecondary} />
                  ) : (
                    <Eye size={20} color={colors.textSecondary} />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Confirm Password (Sign Up only) */}
            {!isLogin && (
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Confirm Password</Text>
                <View style={[styles.inputContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                  <TextInput
                    style={[styles.textInputFull, { color: colors.text }]}
                    placeholder="Confirm your password"
                    placeholderTextColor={colors.textSecondary}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showPassword}
                  />
                </View>
              </View>
            )}

            {/* Forgot Password Link (Login only) */}
            {isLogin && (
              <TouchableOpacity
                style={{ alignSelf: 'flex-end', marginBottom: 12 }}
                onPress={() => {
                  setForgotModalVisible(true);
                  setForgotEmail(email);
                  setForgotSuccess('');
                  setForgotError('');
                }}
              >
                <Text style={{ color: colors.primary, fontFamily: 'Inter-SemiBold' }}>Forgot Password?</Text>
              </TouchableOpacity>
            )}

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitButton, { backgroundColor: colors.primary }]}
              onPress={handleSubmit}
              disabled={loading}
            >
              <Text style={[styles.submitButtonText, { color: colors.card }]}>
                {loading ? 'Please wait...' : (isLogin ? 'Sign In' : 'Sign Up')}
              </Text>
            </TouchableOpacity>

            {/* Switch Mode */}
            <TouchableOpacity
              style={styles.switchButton}
              onPress={() => setIsLogin(!isLogin)}
            >
              <Text style={[styles.switchText, { color: colors.textSecondary }]}>
                {isLogin ? "Don't have an account? " : "Already have an account? "}
                <Text style={{ color: colors.primary }}>
                  {isLogin ? 'Sign Up' : 'Sign In'}
                </Text>
              </Text>
            </TouchableOpacity>
          </View>

          {/* Reset Password Modal (Deep link flow) */}
          {isPasswordResetFlow && (
            <View style={styles.modalOverlay}>
              <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border }]}> 
                <Text style={[styles.modalTitle, { color: colors.text }]}>Set New Password</Text>
                <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>Enter and confirm your new password to complete the reset.</Text>
                <View style={[styles.inputContainer, { backgroundColor: colors.surface, borderColor: colors.border, marginTop: 16 }]}> 
                  <TextInput
                    style={[styles.textInputFull, { color: colors.text }]}
                    placeholder="New password"
                    placeholderTextColor={colors.textSecondary}
                    secureTextEntry
                    value={resetPassword}
                    onChangeText={setResetPassword}
                  />
                </View>
                <View style={[styles.inputContainer, { backgroundColor: colors.surface, borderColor: colors.border, marginTop: 8 }]}> 
                  <TextInput
                    style={[styles.textInputFull, { color: colors.text }]}
                    placeholder="Confirm new password"
                    placeholderTextColor={colors.textSecondary}
                    secureTextEntry
                    value={resetConfirmPassword}
                    onChangeText={setResetConfirmPassword}
                  />
                </View>
                {resetError ? (
                  <Text style={{ color: colors.error, marginTop: 8 }}>{resetError}</Text>
                ) : null}
                {resetSuccess ? (
                  <Text style={{ color: colors.success, marginTop: 8 }}>{resetSuccess}</Text>
                ) : null}
                <TouchableOpacity
                  style={[styles.submitButton, { backgroundColor: colors.primary, marginTop: 16 }]} 
                  onPress={handleCompleteReset}
                  disabled={resetLoading}
                >
                  <Text style={[styles.submitButtonText, { color: colors.card }]}> 
                    {resetLoading ? 'Updating...' : 'Update Password'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Forgot Password Modal */}
          {forgotModalVisible && (
            <View style={styles.modalOverlay}>
              <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border }]}> 
                <Text style={[styles.modalTitle, { color: colors.text }]}>Reset Password</Text>
                <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>Enter your educational email to receive a password reset link.</Text>
                <View style={[styles.inputContainer, { backgroundColor: colors.surface, borderColor: colors.border, marginTop: 16 }]}> 
                  <Text style={[styles.emailPrefix, { color: colors.textSecondary }]}>@</Text>
                  <TextInput
                    style={[styles.textInput, { color: colors.text }]}
                    placeholder="student@university.edu"
                    placeholderTextColor={colors.textSecondary}
                    value={forgotEmail}
                    onChangeText={setForgotEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </View>
                {forgotError ? (
                  <Text style={{ color: colors.error, marginTop: 8 }}>{forgotError}</Text>
                ) : null}
                {forgotSuccess ? (
                  <Text style={{ color: colors.success, marginTop: 8 }}>{forgotSuccess}</Text>
                ) : null}
                <TouchableOpacity
                  style={[styles.submitButton, { backgroundColor: colors.primary, marginTop: 16 }]} 
                  onPress={handleForgotPassword}
                  disabled={forgotLoading}
                >
                  <Text style={[styles.submitButtonText, { color: colors.card }]}> 
                    {forgotLoading ? 'Sending...' : 'Send Reset Link'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ alignSelf: 'center', marginTop: 12 }}
                  onPress={() => setForgotModalVisible(false)}
                >
                  <Text style={{ color: colors.primary, fontFamily: 'Inter-SemiBold' }}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    padding: 8,
  },
  logo: {
    width: 60,
    height: 60,
  },
  title: {
    fontSize: 28,
    fontFamily: 'Inter-Bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
  },
  form: {
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
  },
  formTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  formSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    marginBottom: 32,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  emailPrefix: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    marginRight: 4,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    marginLeft: 8,
  },
  textInputFull: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
  },
  helpText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    marginTop: 4,
  },
  submitButton: {
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 20,
  },
  submitButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  switchButton: {
    alignItems: 'center',
  },
  switchText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    width: '80%',
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    marginBottom: 20,
  },
});