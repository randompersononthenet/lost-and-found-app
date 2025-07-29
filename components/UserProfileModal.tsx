import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useMessaging } from '@/contexts/MessagingContext';
import { User, MapPin, Calendar, BookOpen, GraduationCap, X, MessageCircle } from 'lucide-react-native';
import { router } from 'expo-router';
import Toast from 'react-native-toast-message';

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  avatar_url?: string;
  birthday?: string;
  gender?: string;
  year_level?: string;
  section?: string;
  course?: string;
  created_at: string;
}

interface UserProfileModalProps {
  visible: boolean;
  onClose: () => void;
  userProfile: UserProfile | null;
  onMessagePress?: () => void;
}

export default function UserProfileModal({ 
  visible, 
  onClose, 
  userProfile, 
  onMessagePress 
}: UserProfileModalProps) {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { createConversation } = useMessaging();

  if (!userProfile) return null;

  const handleMessageUser = async () => {
    if (!user || userProfile.id === user.id) return;

    try {
      const conversationId = await createConversation([userProfile.id]);
      
      // Close the modal
      onClose();
      
      // Navigate to the chat
      router.push({
        pathname: '/chat',
        params: { conversationId }
      });
    } catch (error) {
      console.error('Error starting conversation:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to start conversation',
      });
    }
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      return dateString;
    }
  };

  const formatGender = (gender: string) => {
    switch (gender) {
      case 'male': return 'Male';
      case 'female': return 'Female';
      case 'other': return 'Other';
      case 'prefer_not_to_say': return 'Prefer not to say';
      default: return gender;
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <X size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Profile</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Profile Header */}
          <View style={[styles.profileHeader, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
              <User size={40} color={colors.card} />
            </View>
            <Text style={[styles.userName, { color: colors.text }]}>
              {userProfile.full_name}
            </Text>
            <Text style={[styles.userEmail, { color: colors.textSecondary }]}>
              {userProfile.email}
            </Text>
            <Text style={[styles.memberSince, { color: colors.textSecondary }]}>
              Member since {formatDate(userProfile.created_at)}
            </Text>
          </View>

          {/* Personal Information */}
          <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Personal Information</Text>
            
            {userProfile.birthday && (
              <View style={styles.infoRow}>
                <Calendar size={16} color={colors.textSecondary} />
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Birthday</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  {formatDate(userProfile.birthday)}
                </Text>
              </View>
            )}

            {userProfile.gender && (
              <View style={styles.infoRow}>
                <User size={16} color={colors.textSecondary} />
                <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Gender</Text>
                <Text style={[styles.infoValue, { color: colors.text }]}>
                  {formatGender(userProfile.gender)}
                </Text>
              </View>
            )}
          </View>

          {/* Academic Information */}
          {(userProfile.year_level || userProfile.section || userProfile.course) && (
            <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Academic Information</Text>
              
              {userProfile.year_level && (
                <View style={styles.infoRow}>
                  <GraduationCap size={16} color={colors.textSecondary} />
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Year Level</Text>
                  <Text style={[styles.infoValue, { color: colors.text }]}>
                    {userProfile.year_level}
                  </Text>
                </View>
              )}

              {userProfile.section && (
                <View style={styles.infoRow}>
                  <BookOpen size={16} color={colors.textSecondary} />
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Section</Text>
                  <Text style={[styles.infoValue, { color: colors.text }]}>
                    {userProfile.section}
                  </Text>
                </View>
              )}

              {userProfile.course && (
                <View style={styles.infoRow}>
                  <BookOpen size={16} color={colors.textSecondary} />
                  <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>Course</Text>
                  <Text style={[styles.infoValue, { color: colors.text }]}>
                    {userProfile.course}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Action Buttons */}
          {user && userProfile.id !== user.id && (
            <View style={[styles.actionsContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <TouchableOpacity
                style={[styles.messageButton, { backgroundColor: colors.primary }]}
                onPress={handleMessageUser}
              >
                <MessageCircle size={20} color={colors.card} />
                <Text style={[styles.messageButtonText, { color: colors.card }]}>
                  Send Message
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
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
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  profileHeader: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  userName: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    marginBottom: 4,
    textAlign: 'center',
  },
  userEmail: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    marginBottom: 8,
    textAlign: 'center',
  },
  memberSince: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
  },
  section: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    marginLeft: 8,
    marginRight: 12,
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    flex: 2,
  },
  actionsContainer: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  messageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  messageButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    marginLeft: 8,
  },
}); 