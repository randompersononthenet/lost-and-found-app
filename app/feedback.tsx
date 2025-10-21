import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, Mail, Send, Star } from 'lucide-react-native';
import { router } from 'expo-router';
import * as Linking from 'expo-linking';
import Toast from 'react-native-toast-message';
import * as MailComposer from 'expo-mail-composer';
import * as Clipboard from 'expo-clipboard';
import ResponsiveContainer from '@/components/ResponsiveContainer';

export default function FeedbackScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [feedback, setFeedback] = useState('');
  const [rating, setRating] = useState(0);
  const [loading, setLoading] = useState(false);

  const handleSendFeedback = async () => {
    if (!feedback.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Feedback Required',
        text2: 'Please enter your feedback before sending.',
      });
      return;
    }

    setLoading(true);

    try {
      const subject = `RECLAIM App Feedback - ${rating > 0 ? `${rating}/5 Stars` : 'No Rating'}`;

      // Build body as explicit lines to avoid any unintended characters or spacing
      const bodyLines = [
        'Hello RECLAIM App Team,',
        '',
        'I would like to provide feedback about the app:',
        '',
        `${feedback}`,
        '',
        rating > 0 ? `Rating: ${rating}/5 stars` : '',
        '',
        'User Information:',
        `- User ID: ${user?.id || 'Not logged in'}`,
        `- Email: ${user?.email || 'Not provided'}`,
        '',
        'Thank you for your time!',
        '',
        'Best regards,',
        `${user?.user_metadata?.full_name || 'App User'}`,
      ].filter(Boolean);

      // LF for native composer, CRLF for mailto to maximize compatibility
      const bodyLF = bodyLines.join('\n');
      const bodyCRLF = bodyLines.join('\r\n');

      // Prefer native mail composer if available
      const isMailComposerAvailable = await MailComposer.isAvailableAsync();
      if (isMailComposerAvailable) {
        const result = await MailComposer.composeAsync({
          recipients: ['sagapaedrian@gmail.com'],
          subject,
          body: bodyLF,
          isHtml: false,
        });
        if (result.status === 'sent') {
          Toast.show({ type: 'success', text1: 'Thanks!', text2: 'Your feedback was sent.' });
          setFeedback('');
          setRating(0);
          setLoading(false);
          return;
        }
        // If user canceled, just stop loading gracefully
        setLoading(false);
        return;
      }

      // Fallback to mailto: URL when composer is not available
      const mailtoUrl = `mailto:sagapaedrian@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyCRLF)}`;

      const canOpen = await Linking.canOpenURL(mailtoUrl);
      
      if (canOpen) {
        await Linking.openURL(mailtoUrl);
        Toast.show({
          type: 'success',
          text1: 'Email Client Opened',
          text2: 'Your feedback has been prepared in your email client.',
        });
        // Clear the form
        setFeedback('');
        setRating(0);
      } else {
        // Final fallback: copy feedback to clipboard
        await Clipboard.setStringAsync(`Subject: ${subject}\n\n${bodyLF}`);
        Alert.alert(
          'No Email Client Found',
          'We copied your feedback to the clipboard. Please paste it into your preferred email app and send it to sagapaedrian@gmail.com.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error opening email client:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Could not open email client. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  const renderStars = () => {
    return (
      <View style={styles.starsContainer}>
        <Text style={[styles.starsLabel, { color: colors.text }]}>Rate your experience:</Text>
        <View style={styles.starsRow}>
          {[1, 2, 3, 4, 5].map((star) => (
            <TouchableOpacity
              key={star}
              onPress={() => setRating(star)}
              style={styles.starButton}
            >
              <Star
                size={24}
                color={star <= rating ? colors.warning : colors.textSecondary}
                fill={star <= rating ? colors.warning : 'transparent'}
              />
            </TouchableOpacity>
          ))}
        </View>
        {rating > 0 && (
          <Text style={[styles.ratingText, { color: colors.textSecondary }]}>
            {rating}/5 stars
          </Text>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}> 
      <ResponsiveContainer>
        <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}> 
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Feedback</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.feedbackContainer}>
            <View style={[styles.iconContainer, { backgroundColor: colors.primary }]}>
              <Mail size={32} color={colors.card} />
            </View>
            
            <Text style={[styles.title, { color: colors.text }]}>
              We'd Love to Hear From You!
          </Text>
          
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Your feedback helps us improve the RECLAIM app. Share your thoughts, suggestions, or report any issues you've encountered.
          </Text>

          {renderStars()}

          <View style={styles.inputContainer}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>
              Your Feedback
            </Text>
            <TextInput
              style={[
                styles.feedbackInput,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  color: colors.text,
                }
              ]}
              placeholder="Tell us what you think about the app, any bugs you found, or features you'd like to see..."
              placeholderTextColor={colors.textSecondary}
              value={feedback}
              onChangeText={setFeedback}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
            />
          </View>

          <TouchableOpacity
            style={[
              styles.sendButton,
              {
                backgroundColor: loading ? colors.textSecondary : colors.primary,
              }
            ]}
            onPress={handleSendFeedback}
            disabled={loading}
          >
            <Send size={20} color={colors.card} />
            <Text style={[styles.sendButtonText, { color: colors.card }]}>
              {loading ? 'Preparing...' : 'Send Feedback'}
            </Text>
          </TouchableOpacity>

          <View style={styles.infoContainer}>
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              💡 Tip: Your feedback will open in your email client. You can edit it before sending.
            </Text>
          </View>
          </View>
        </ScrollView>
      </ResponsiveContainer>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    flex: 1,
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  feedbackContainer: {
    padding: 20,
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  starsContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  starsLabel: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 12,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  starButton: {
    padding: 4,
  },
  ratingText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    marginTop: 8,
  },
  inputContainer: {
    width: '100%',
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 8,
  },
  feedbackInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    minHeight: 120,
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    gap: 8,
    width: '100%',
  },
  sendButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  infoContainer: {
    marginTop: 20,
    paddingHorizontal: 20,
  },
  infoText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    lineHeight: 20,
  },
}); 