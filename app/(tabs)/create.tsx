import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, Image, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Camera, MapPin, Calendar } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import Toast from 'react-native-toast-message';
import * as FileSystem from 'expo-file-system';

export default function CreatePostScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<'lost' | 'found'>('lost');
  const [location, setLocation] = useState('');
  const [dateLostFound, setDateLostFound] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const pickImage = async () => {
    // Check current permission status
    const { status, canAskAgain } = await ImagePicker.getMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      // Ask for permission if possible
      const { status: newStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (newStatus !== 'granted') {
        Alert.alert(
          'Permission needed',
          'Sorry, we need camera roll permissions to add images! Please enable permissions in your device settings.',
          [
            {
              text: 'Open Settings',
              onPress: () => Linking.openSettings(),
            },
            { text: 'Cancel', style: 'cancel' },
          ]
        );
        return;
      }
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (result.canceled || !result.assets || !result.assets[0]) {
        Toast.show({
          type: 'info',
          text1: 'No Image Selected',
          text2: 'You did not select any image.',
        });
        return;
      }

      setImage(result.assets[0].uri);
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Image Picker Error',
        text2: error instanceof Error ? error.message : 'Failed to pick image.',
      });
    }
  };

  const handleSubmit = async () => {
    if (!user || !title.trim() || !description.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Missing Information',
        text2: 'Please fill in all required fields',
      });
      return;
    }

    setLoading(true);

    let imageUrls: string[] = [];

    try {
      // 1. Upload image to Supabase Storage if one is selected
      if (image) {
        const fileExt = image.split('.').pop();
        const fileName = `${user.id}_${Date.now()}.${fileExt || 'jpg'}`;
        const fileUri = image;
        const fileType = 'image/jpeg';

        // Read file as base64
        const fileBase64 = await FileSystem.readAsStringAsync(fileUri, { encoding: FileSystem.EncodingType.Base64 });
        const fileBuffer = Buffer.from(fileBase64, 'base64');

        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('post-images')
          .upload(fileName, fileBuffer, {
            contentType: fileType,
            upsert: true,
          });

        if (uploadError) {
          throw uploadError;
        }

        // Get public URL
        const { data: publicUrlData } = supabase.storage.from('post-images').getPublicUrl(fileName);
        if (publicUrlData && publicUrlData.publicUrl) {
          imageUrls = [publicUrlData.publicUrl];
        } else {
          throw new Error('Failed to get public URL for uploaded image.');
        }
      }

      // 2. Insert post with public image URL(s)
      const postData = {
        user_id: user.id,
        title: title.trim(),
        description: description.trim(),
        category,
        location: location.trim() || null,
        date_lost_found: dateLostFound || null,
        images: imageUrls,
        status: 'active',
      };

      const { error } = await supabase
        .from('posts')
        .insert(postData);

      if (error) throw error;

      Toast.show({
        type: 'success',
        text1: 'Post Created',
        text2: 'Your post has been successfully created',
      });

      // Reset form
      setTitle('');
      setDescription('');
      setCategory('lost');
      setLocation('');
      setDateLostFound('');
      setImage(null);

      // Navigate back to feed
      router.push('/(tabs)');
    } catch (error) {
      console.error('Error creating post:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error instanceof Error ? error.message : 'Failed to create post. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Create Post</Text>
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={loading || !title.trim() || !description.trim()}
          style={[
            styles.submitButton,
            {
              backgroundColor: (loading || !title.trim() || !description.trim()) ? colors.border : colors.primary,
              opacity: (loading || !title.trim() || !description.trim()) ? 0.6 : 1,
            }
          ]}
        >
          <Text style={[styles.submitButtonText, { color: colors.card }]}>
            {loading ? 'Posting...' : 'Post'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Category Selection */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Category</Text>
          <View style={styles.categoryContainer}>
            <TouchableOpacity
              style={[
                styles.categoryOption,
                {
                  backgroundColor: category === 'lost' ? colors.error : colors.surface,
                  borderColor: colors.border,
                }
              ]}
              onPress={() => setCategory('lost')}
            >
              <Text
                style={[
                  styles.categoryOptionText,
                  { color: category === 'lost' ? colors.card : colors.text }
                ]}
              >
                Lost Item
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.categoryOption,
                {
                  backgroundColor: category === 'found' ? colors.success : colors.surface,
                  borderColor: colors.border,
                }
              ]}
              onPress={() => setCategory('found')}
            >
              <Text
                style={[
                  styles.categoryOptionText,
                  { color: category === 'found' ? colors.card : colors.text }
                ]}
              >
                Found Item
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Title */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Title *</Text>
          <TextInput
            style={[styles.textInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
            placeholder="What did you lose/find?"
            placeholderTextColor={colors.textSecondary}
            value={title}
            onChangeText={setTitle}
            maxLength={100}
          />
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Description *</Text>
          <TextInput
            style={[styles.textArea, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
            placeholder="Provide more details about the item..."
            placeholderTextColor={colors.textSecondary}
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            maxLength={500}
          />
        </View>

        {/* Location */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Location</Text>
          <View style={[styles.inputWithIcon, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <MapPin size={20} color={colors.textSecondary} />
            <TextInput
              style={[styles.textInputWithIcon, { color: colors.text }]}
              placeholder="Where was it lost/found?"
              placeholderTextColor={colors.textSecondary}
              value={location}
              onChangeText={setLocation}
              maxLength={100}
            />
          </View>
        </View>

        {/* Date */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Date</Text>
          <View style={[styles.inputWithIcon, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Calendar size={20} color={colors.textSecondary} />
            <TextInput
              style={[styles.textInputWithIcon, { color: colors.text }]}
              placeholder="When was it lost/found? (YYYY-MM-DD)"
              placeholderTextColor={colors.textSecondary}
              value={dateLostFound}
              onChangeText={setDateLostFound}
            />
          </View>
        </View>

        {/* Image */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Photo</Text>
          <TouchableOpacity
            style={[styles.imagePickerButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={pickImage}
          >
            {image ? (
              <View style={styles.imageContainer}>
                <Image source={{ uri: image }} style={styles.selectedImage} />
                <TouchableOpacity
                  style={[styles.removeImageButton, { backgroundColor: colors.error }]}
                  onPress={() => setImage(null)}
                >
                  <Text style={[styles.removeImageText, { color: colors.card }]}>×</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <Camera size={32} color={colors.textSecondary} />
                <Text style={[styles.imagePickerText, { color: colors.textSecondary }]}>
                  Add Photo
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Additional Submit Button at Bottom */}
        <TouchableOpacity
          onPress={handleSubmit}
          disabled={loading || !title.trim() || !description.trim()}
          style={[
            styles.bottomSubmitButton,
            {
              backgroundColor: (loading || !title.trim() || !description.trim()) ? colors.border : colors.primary,
              opacity: (loading || !title.trim() || !description.trim()) ? 0.6 : 1,
            }
          ]}
        >
          <Text style={[styles.bottomSubmitButtonText, { color: colors.card }]}>
            {loading ? 'Creating Post...' : 'Create Post'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
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
  submitButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  submitButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 8,
  },
  categoryContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  categoryOption: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  categoryOptionText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },
  textInput: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
  },
  textArea: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    minHeight: 100,
  },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  textInputWithIcon: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
  },
  imagePickerButton: {
    height: 120,
    borderRadius: 8,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  imagePickerText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    marginTop: 8,
  },
  selectedImage: {
    width: '100%',
    height: '100%',
    borderRadius: 6,
  },
  imageContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeImageText: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    lineHeight: 20,
  },
  bottomSubmitButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 32,
  },
  bottomSubmitButtonText: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
  },
});