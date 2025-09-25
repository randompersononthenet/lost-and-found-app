import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Modal, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { Settings, CreditCard as Edit3, Moon, Sun, LogOut, User, ChevronDown, Calendar, Lock, Shield, MessageSquare } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { router } from 'expo-router';

export default function ProfileScreen() {
  const { colors, isDark, toggleTheme } = useTheme();
  const { profile, signOut, updateProfile, changePassword, deactivateAccount } = useAuth();
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [genderPickerVisible, setGenderPickerVisible] = useState(false);
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [signOutConfirmVisible, setSignOutConfirmVisible] = useState(false);
  const [changePasswordModalVisible, setChangePasswordModalVisible] = useState(false);
  const [deactivateModalVisible, setDeactivateModalVisible] = useState(false);
  const [quickActionsVisible, setQuickActionsVisible] = useState(false);
  const [editForm, setEditForm] = useState({
    full_name: '',
    birthday: '',
    gender: '',
    year_level: '',
    section: '',
    course: '',
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [deactivatePassword, setDeactivatePassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Gender options that match the database constraint
  const genderOptions = [
    { label: 'Male', value: 'male' },
    { label: 'Female', value: 'female' },
    { label: 'Other', value: 'other' },
    { label: 'Prefer not to say', value: 'prefer_not_to_say' },
  ];

  // Helper function to format date for display
  const formatDateForDisplay = (dateString: string) => {
    if (!dateString) return '';
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

  // Helper function to format date for database (YYYY-MM-DD)
  const formatDateForDatabase = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Update form when profile changes
  React.useEffect(() => {
    if (profile) {
      setEditForm({
        full_name: profile.full_name || '',
        birthday: profile.birthday || '',
        gender: profile.gender || '',
        year_level: profile.year_level || '',
        section: profile.section || '',
        course: profile.course || '',
      });
    }
  }, [profile]);

  const handleSignOut = async () => {
    setSignOutConfirmVisible(false); // Hide modal
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
    // Validate required fields
    if (!editForm.full_name.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Full name is required',
      });
      return;
    }

    // Validate gender if provided
    if (editForm.gender && !genderOptions.find(option => option.value === editForm.gender)) {
      Toast.show({
        type: 'error',
        text1: 'Validation Error',
        text2: 'Please select a valid gender option',
      });
      return;
    }

    // Validate birthday if provided
    if (editForm.birthday) {
      const birthdayDate = new Date(editForm.birthday);
      const today = new Date();
      
      if (birthdayDate > today) {
        Toast.show({
          type: 'error',
          text1: 'Validation Error',
          text2: 'Birthday cannot be in the future',
        });
        return;
      }
    }

    // Prepare update data - only include non-empty values
    const updateData: any = {
      full_name: editForm.full_name.trim(),
    };

    if (editForm.birthday) updateData.birthday = editForm.birthday;
    if (editForm.gender) updateData.gender = editForm.gender;
    if (editForm.year_level) updateData.year_level = editForm.year_level;
    if (editForm.section) updateData.section = editForm.section;
    if (editForm.course) updateData.course = editForm.course;

    try {
      console.log('Updating profile with:', updateData);
      await updateProfile(updateData);
      setEditModalVisible(false);
      Toast.show({
        type: 'success',
        text1: 'Profile Updated',
        text2: 'Your profile has been successfully updated',
      });
    } catch (error) {
      console.error('Profile update error:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error instanceof Error ? error.message : 'Failed to update profile',
      });
    }
  };

  const handleChangePassword = async () => {
    if (!passwordForm.currentPassword.trim() || !passwordForm.newPassword.trim() || !passwordForm.confirmPassword.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Missing Information',
        text2: 'Please fill in all fields',
      });
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      Toast.show({
        type: 'error',
        text1: 'Password Mismatch',
        text2: 'New passwords do not match',
      });
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      Toast.show({
        type: 'error',
        text1: 'Password Too Short',
        text2: 'Password must be at least 6 characters',
      });
      return;
    }

    setLoading(true);
    try {
      await changePassword(passwordForm.currentPassword, passwordForm.newPassword);
      Toast.show({
        type: 'success',
        text1: 'Password Changed',
        text2: 'Your password has been updated successfully',
      });
      setChangePasswordModalVisible(false);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.message || 'Failed to change password',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivateAccount = async () => {
    if (!deactivatePassword.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Missing Password',
        text2: 'Please enter your password to confirm',
      });
      return;
    }

    Alert.alert(
      'Deactivate Account',
      'Are you sure you want to deactivate your account? This action cannot be undone and all your data will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deactivate', style: 'destructive', onPress: async () => {
            setLoading(true);
            try {
              await deactivateAccount(deactivatePassword);
              Toast.show({
                type: 'success',
                text1: 'Account Deactivated',
                text2: 'Your account has been deactivated',
              });
            } catch (error: any) {
              Toast.show({
                type: 'error',
                text1: 'Error',
                text2: error.message || 'Failed to deactivate account',
              });
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
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
              {profile?.birthday ? formatDateForDisplay(profile.birthday) : 'Not set'}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Gender</Text>
            <Text style={[styles.detailValue, { color: colors.text }]}>
              {profile?.gender ? genderOptions.find(option => option.value === profile.gender)?.label || profile.gender : 'Not set'}
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

          {/* Quick Actions (groups My Posts, Resolved Posts, Send Feedback, Change Password) */}
          <TouchableOpacity style={styles.settingRow} onPress={() => setQuickActionsVisible(true)}>
            <View style={styles.settingLeft}>
              <Settings size={20} color={colors.text} />
              <Text style={[styles.settingText, { color: colors.text }]}>Quick Actions</Text>
            </View>
            <ChevronDown size={18} color={colors.textSecondary} />
          </TouchableOpacity>

          {/* Theme toggle and sign out ... */}
          <TouchableOpacity style={styles.settingRow} onPress={toggleTheme}>
            <View style={styles.settingLeft}>
              {isDark ? (
                <Moon size={20} color={colors.text} />
              ) : (
                <Sun size={20} color={colors.text} />
              )}
              <Text style={[styles.settingText, { color: colors.text }]}> {isDark ? 'Dark Mode' : 'Light Mode'} </Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.settingRow} onPress={() => setSignOutConfirmVisible(true)}>
            <View style={styles.settingLeft}>
              <LogOut size={20} color={colors.error} />
              <Text style={[styles.settingText, { color: colors.error }]}>Sign Out</Text>
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
              <TouchableOpacity
                style={[styles.textInput, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => setDatePickerVisible(true)}
              >
                <View style={styles.pickerContainer}>
                  <Text style={[styles.pickerText, { color: editForm.birthday ? colors.text : colors.textSecondary }]}>
                    {editForm.birthday ? formatDateForDisplay(editForm.birthday) : 'Select birthday'}
                  </Text>
                  <Calendar size={20} color={colors.textSecondary} />
                </View>
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Gender</Text>
              <TouchableOpacity
                style={[styles.textInput, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => setGenderPickerVisible(true)}
              >
                <View style={styles.pickerContainer}>
                  <Text style={[styles.pickerText, { color: editForm.gender ? colors.text : colors.textSecondary }]}>
                    {editForm.gender ? genderOptions.find(option => option.value === editForm.gender)?.label || editForm.gender : 'Select gender'}
                  </Text>
                  <ChevronDown size={20} color={colors.textSecondary} />
                </View>
              </TouchableOpacity>
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

      {/* Gender Picker Modal */}
      <Modal visible={genderPickerVisible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setGenderPickerVisible(false)}>
              <Text style={[styles.modalCancel, { color: colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Select Gender</Text>
            <View style={{ width: 60 }} />
          </View>

          <ScrollView style={styles.modalContent}>
            {genderOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.genderOption,
                  { borderBottomColor: colors.border },
                  editForm.gender === option.value && { backgroundColor: colors.primary + '20' }
                ]}
                onPress={() => {
                  setEditForm(prev => ({ ...prev, gender: option.value }));
                  setGenderPickerVisible(false);
                }}
              >
                <Text style={[
                  styles.genderOptionText,
                  { color: colors.text },
                  editForm.gender === option.value && { color: colors.primary, fontFamily: 'Inter-SemiBold' }
                ]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Date Picker Modal */}
      <Modal visible={datePickerVisible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setDatePickerVisible(false)}>
              <Text style={[styles.modalCancel, { color: colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Select Birthday</Text>
            <TouchableOpacity onPress={() => {
              const today = new Date();
              const selectedDate = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate()); // Default to 18 years ago
              setEditForm(prev => ({ ...prev, birthday: formatDateForDatabase(selectedDate) }));
              setDatePickerVisible(false);
            }}>
              <Text style={[styles.modalSave, { color: colors.primary }]}>Set Default</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.datePickerContent}>
            <Text style={[styles.datePickerLabel, { color: colors.textSecondary }]}>
              Select your birthday
            </Text>
            
            {/* Simple date picker with year, month, day selection */}
            <View style={styles.datePickerRow}>
              <View style={styles.datePickerColumn}>
                <Text style={[styles.datePickerColumnLabel, { color: colors.text }]}>Year</Text>
                <ScrollView style={styles.datePickerScroll} showsVerticalScrollIndicator={false}>
                  {Array.from({ length: 50 }, (_, i) => new Date().getFullYear() - 50 + i).reverse().map((year) => (
                    <TouchableOpacity
                      key={year}
                      style={[
                        styles.datePickerOption,
                        { borderBottomColor: colors.border },
                        editForm.birthday && new Date(editForm.birthday).getFullYear() === year && { backgroundColor: colors.primary + '20' }
                      ]}
                      onPress={() => {
                        const currentDate = editForm.birthday ? new Date(editForm.birthday) : new Date();
                        const newDate = new Date(year, currentDate.getMonth(), currentDate.getDate());
                        setEditForm(prev => ({ ...prev, birthday: formatDateForDatabase(newDate) }));
                      }}
                    >
                      <Text style={[
                        styles.datePickerOptionText,
                        { color: colors.text },
                        editForm.birthday && new Date(editForm.birthday).getFullYear() === year && { color: colors.primary, fontFamily: 'Inter-SemiBold' }
                      ]}>
                        {year}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.datePickerColumn}>
                <Text style={[styles.datePickerColumnLabel, { color: colors.text }]}>Month</Text>
                <ScrollView style={styles.datePickerScroll} showsVerticalScrollIndicator={false}>
                  {[
                    'January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December'
                  ].map((month, index) => (
                    <TouchableOpacity
                      key={month}
                      style={[
                        styles.datePickerOption,
                        { borderBottomColor: colors.border },
                        editForm.birthday && new Date(editForm.birthday).getMonth() === index && { backgroundColor: colors.primary + '20' }
                      ]}
                      onPress={() => {
                        const currentDate = editForm.birthday ? new Date(editForm.birthday) : new Date();
                        const newDate = new Date(currentDate.getFullYear(), index, currentDate.getDate());
                        setEditForm(prev => ({ ...prev, birthday: formatDateForDatabase(newDate) }));
                      }}
                    >
                      <Text style={[
                        styles.datePickerOptionText,
                        { color: colors.text },
                        editForm.birthday && new Date(editForm.birthday).getMonth() === index && { color: colors.primary, fontFamily: 'Inter-SemiBold' }
                      ]}>
                        {month}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <View style={styles.datePickerColumn}>
                <Text style={[styles.datePickerColumnLabel, { color: colors.text }]}>Day</Text>
                <ScrollView style={styles.datePickerScroll} showsVerticalScrollIndicator={false}>
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                    <TouchableOpacity
                      key={day}
                      style={[
                        styles.datePickerOption,
                        { borderBottomColor: colors.border },
                        editForm.birthday && new Date(editForm.birthday).getDate() === day && { backgroundColor: colors.primary + '20' }
                      ]}
                      onPress={() => {
                        const currentDate = editForm.birthday ? new Date(editForm.birthday) : new Date();
                        const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                        setEditForm(prev => ({ ...prev, birthday: formatDateForDatabase(newDate) }));
                      }}
                    >
                      <Text style={[
                        styles.datePickerOptionText,
                        { color: colors.text },
                        editForm.birthday && new Date(editForm.birthday).getDate() === day && { color: colors.primary, fontFamily: 'Inter-SemiBold' }
                      ]}>
                        {day}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>

            {editForm.birthday && (
              <View style={[styles.selectedDateContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.selectedDateLabel, { color: colors.textSecondary }]}>Selected:</Text>
                <Text style={[styles.selectedDateText, { color: colors.text }]}>
                  {formatDateForDisplay(editForm.birthday)}
                </Text>
              </View>
            )}
          </View>
        </SafeAreaView>
      </Modal>

      {/* Sign Out Confirmation Modal */}
      <Modal
        visible={signOutConfirmVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSignOutConfirmVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: colors.card, padding: 28, borderRadius: 16, width: '80%', alignItems: 'center', borderWidth: 1, borderColor: colors.border }}>
            <Text style={{ fontSize: 18, fontFamily: 'Inter-SemiBold', color: colors.text, marginBottom: 12 }}>Sign Out</Text>
            <Text style={{ fontSize: 15, color: colors.textSecondary, textAlign: 'center', marginBottom: 24 }}>
              Are you sure you want to sign out?
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: '100%' }}>
              <TouchableOpacity
                style={{ flex: 1, marginRight: 8, paddingVertical: 12, borderRadius: 8, backgroundColor: colors.border, alignItems: 'center' }}
                onPress={() => setSignOutConfirmVisible(false)}
              >
                <Text style={{ color: colors.text, fontFamily: 'Inter-SemiBold' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ flex: 1, marginLeft: 8, paddingVertical: 12, borderRadius: 8, backgroundColor: colors.error, alignItems: 'center' }}
                onPress={handleSignOut}
              >
                <Text style={{ color: colors.card, fontFamily: 'Inter-SemiBold' }}>Sign Out</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Change Password Modal */}
      <Modal visible={changePasswordModalVisible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setChangePasswordModalVisible(false)}>
              <Text style={[styles.modalCancel, { color: colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Change Password</Text>
            <TouchableOpacity onPress={handleChangePassword} disabled={loading}>
              <Text style={[styles.modalSave, { color: colors.primary, opacity: loading ? 0.5 : 1 }]}>
                {loading ? 'Changing...' : 'Change'}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Current Password</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                value={passwordForm.currentPassword}
                onChangeText={(text) => setPasswordForm(prev => ({ ...prev, currentPassword: text }))}
                placeholder="Enter your current password"
                placeholderTextColor={colors.textSecondary}
                secureTextEntry
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>New Password</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                value={passwordForm.newPassword}
                onChangeText={(text) => setPasswordForm(prev => ({ ...prev, newPassword: text }))}
                placeholder="Enter your new password"
                placeholderTextColor={colors.textSecondary}
                secureTextEntry
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Confirm New Password</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                value={passwordForm.confirmPassword}
                onChangeText={(text) => setPasswordForm(prev => ({ ...prev, confirmPassword: text }))}
                placeholder="Confirm your new password"
                placeholderTextColor={colors.textSecondary}
                secureTextEntry
              />
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Quick Actions Modal */}
      <Modal
        visible={quickActionsVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setQuickActionsVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: colors.card, padding: 16, borderRadius: 16, width: '88%', borderWidth: 1, borderColor: colors.border }}>
            <Text style={{ fontSize: 18, fontFamily: 'Inter-SemiBold', color: colors.text, marginBottom: 12 }}>Quick Actions</Text>

            {/* Posts Group */}
            <View style={{ marginBottom: 8 }}>
              <Text style={{ fontSize: 12, fontFamily: 'Inter-Medium', color: colors.textSecondary, marginBottom: 6 }}>Posts</Text>
              <TouchableOpacity style={{ paddingVertical: 10, flexDirection: 'row', alignItems: 'center' }} onPress={() => { setQuickActionsVisible(false); router.push('/my-posts'); }}>
                <Edit3 size={18} color={colors.text} />
                <Text style={{ marginLeft: 10, color: colors.text }}>My Posts</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ paddingVertical: 10, flexDirection: 'row', alignItems: 'center' }} onPress={() => { setQuickActionsVisible(false); router.push('/resolved-posts'); }}>
                <Calendar size={18} color={colors.text} />
                <Text style={{ marginLeft: 10, color: colors.text }}>Resolved Posts</Text>
              </TouchableOpacity>
            </View>

            {/* Account Group */}
            <View style={{ marginBottom: 8 }}>
              <Text style={{ fontSize: 12, fontFamily: 'Inter-Medium', color: colors.textSecondary, marginBottom: 6 }}>Account</Text>
              <TouchableOpacity style={{ paddingVertical: 10, flexDirection: 'row', alignItems: 'center' }} onPress={() => { setQuickActionsVisible(false); setChangePasswordModalVisible(true); }}>
                <Lock size={18} color={colors.text} />
                <Text style={{ marginLeft: 10, color: colors.text }}>Change Password</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ paddingVertical: 10, flexDirection: 'row', alignItems: 'center' }} onPress={() => { setQuickActionsVisible(false); setDeactivateModalVisible(true); }}>
                <Shield size={18} color={colors.error} />
                <Text style={{ marginLeft: 10, color: colors.error }}>Deactivate Account</Text>
              </TouchableOpacity>
            </View>

            {/* Support Group */}
            <View style={{ marginBottom: 8 }}>
              <Text style={{ fontSize: 12, fontFamily: 'Inter-Medium', color: colors.textSecondary, marginBottom: 6 }}>Support</Text>
              <TouchableOpacity style={{ paddingVertical: 10, flexDirection: 'row', alignItems: 'center' }} onPress={() => { setQuickActionsVisible(false); router.push('/feedback'); }}>
                <MessageSquare size={18} color={colors.text} />
                <Text style={{ marginLeft: 10, color: colors.text }}>Send Feedback</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={{ marginTop: 8, paddingVertical: 12, borderRadius: 8, backgroundColor: colors.border, alignItems: 'center' }}
              onPress={() => setQuickActionsVisible(false)}
            >
              <Text style={{ color: colors.text, fontFamily: 'Inter-SemiBold' }}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Deactivate Account Modal */}
      <Modal visible={deactivateModalVisible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setDeactivateModalVisible(false)}>
              <Text style={[styles.modalCancel, { color: colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Deactivate Account</Text>
            <View style={{ width: 60 }} />
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Password Confirmation</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                value={deactivatePassword}
                onChangeText={setDeactivatePassword}
                placeholder="Enter your password to confirm"
                placeholderTextColor={colors.textSecondary}
                secureTextEntry
              />
            </View>

            <View style={[styles.warningBox, { backgroundColor: colors.error + '20', borderColor: colors.error }]}>
              <Text style={[styles.warningTitle, { color: colors.error }]}>⚠️ Warning</Text>
              <Text style={[styles.warningText, { color: colors.text }]}>
                This action will permanently delete your account and all associated data including:
              </Text>
              <Text style={[styles.warningText, { color: colors.text }]}>
                • Your profile information{'\n'}
                • All your posts{'\n'}
                • All your comments{'\n'}
                • All your messages{'\n'}
                • This action cannot be undone
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.deactivateButton, { backgroundColor: colors.error }]}
              onPress={handleDeactivateAccount}
              disabled={loading}
            >
              <Text style={[styles.deactivateButtonText, { color: colors.card }]}>
                {loading ? 'Deactivating...' : 'Deactivate Account'}
              </Text>
            </TouchableOpacity>
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
  pickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pickerText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
  },
  genderOption: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  genderOptionText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
  },
  datePickerContent: {
    flex: 1,
    padding: 20,
  },
  datePickerLabel: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
    marginBottom: 20,
    textAlign: 'center',
  },
  datePickerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  datePickerColumn: {
    flex: 1,
    marginHorizontal: 5,
  },
  datePickerColumnLabel: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 10,
    textAlign: 'center',
  },
  datePickerScroll: {
    maxHeight: 200,
  },
  datePickerOption: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    alignItems: 'center',
  },
  datePickerOptionText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
  selectedDateContainer: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  selectedDateLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    marginBottom: 4,
  },
  selectedDateText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  warningBox: {
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    marginVertical: 16,
  },
  warningTitle: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    marginBottom: 8,
  },
  warningText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    lineHeight: 20,
  },
  deactivateButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 16,
  },
  deactivateButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
  },
});