import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { Settings, CreditCard as Edit3, Moon, Sun, LogOut, User } from 'lucide-react-native';
import Toast from 'react-native-toast-message';

export default function ProfileScreen() {
  const { colors, isDark, toggleTheme } = useTheme();
  const { profile, signOut, updateProfile } = useAuth();
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editForm, setEditForm] = useState({
    full_name: profile?.full_name || '',
    birthday: profile?.birthday || '',
    gender: profile?.gender || '',
    year_level: profile?.year_level || '',
    section: profile?.section || '',
    course: profile?.course || '',
  });

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to sign out',
      });
    }
  };

  const handleUpdateProfile = async () => {
    try {
      await updateProfile(editForm);
      setEditModalVisible(false);
      Toast.show({
        type: 'success',
        text1: 'Profile Updated',
        text2: 'Your profile has been successfully updated',
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to update profile',
      });
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Profile</Text>
        <TouchableOpacity onPress={() => setEditModalVisible(true)}>
          <Edit3 size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Profile Info */}
        <View style={[styles.profileCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <User size={32} color={colors.card} />
          </View>
          <Text style={[styles.profileName, { color: colors.text }]}>
            {profile?.full_name || 'User'}
          </Text>
          <Text style={[styles.profileEmail, { color: colors.textSecondary }]}>
            {profile?.email}
          </Text>
        </View>

        {/* Profile Details */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Personal Information</Text>
          
          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Birthday</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>
              {profile?.birthday || 'Not set'}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Gender</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>
              {profile?.gender || 'Not set'}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Year Level</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>
              {profile?.year_level || 'Not set'}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Section</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>
              {profile?.section || 'Not set'}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Course</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>
              {profile?.course || 'Not set'}
            </Text>
          </View>
        </View>

        {/* Settings */}
        <View style={[styles.section, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Settings</Text>
          
          <TouchableOpacity style={styles.settingRow} onPress={toggleTheme}>
            <View style={styles.settingLeft}>
              {isDark ? (
                <Moon size={20} color={colors.text} />
              ) : (
                <Sun size={20} color={colors.text} />
              )}
              <Text style={[styles.settingText, { color: colors.text }]}>
                {isDark ? 'Dark Mode' : 'Light Mode'}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingRow} onPress={handleSignOut}>
            <View style={styles.settingLeft}>
              <LogOut size={20} color={colors.error} />
              <Text style={[styles.settingText, { color: colors.error }]}>
                Sign Out
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal visible={editModalVisible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setEditModalVisible(false)}>
              <Text style={[styles.modalCancel, { color: colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Edit Profile</Text>
            <TouchableOpacity onPress={handleUpdateProfile}>
              <Text style={[styles.modalSave, { color: colors.primary }]}>Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Full Name</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                value={editForm.full_name}
                onChangeText={(text) => setEditForm(prev => ({ ...prev, full_name: text }))}
                placeholder="Enter your full name"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Birthday</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                value={editForm.birthday}
                onChangeText={(text) => setEditForm(prev => ({ ...prev, birthday: text }))}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Gender</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                value={editForm.gender}
                onChangeText={(text) => setEditForm(prev => ({ ...prev, gender: text }))}
                placeholder="Gender"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Year Level</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                value={editForm.year_level}
                onChangeText={(text) => setEditForm(prev => ({ ...prev, year_level: text }))}
                placeholder="e.g., 1st Year, 2nd Year"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Section</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                value={editForm.section}
                onChangeText={(text) => setEditForm(prev => ({ ...prev, section: text }))}
                placeholder="e.g., A, B, C"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Course</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                value={editForm.course}
                onChangeText={(text) => setEditForm(prev => ({ ...prev, course: text }))}
                placeholder="e.g., Computer Science"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
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
  headerTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  profileCard: {
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
  profileName: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
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
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
  detailValue: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    marginLeft: 12,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalCancel: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
  },
  modalSave: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    marginBottom: 8,
  },
  textInput: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
  },
});