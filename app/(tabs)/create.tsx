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
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const pickImages = async () => {
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
        allowsEditing: false, // Disable editing for multiple images
        allowsMultipleSelection: true, // Enable multiple selection
        quality: 0.8,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        Toast.show({
          type: 'info',
          text1: 'No Images Selected',
          text2: 'You did not select any images.',
        });
        return;
      }

      // Add new images to existing ones (max 5 images)
      const newImages = result.assets.map(asset => asset.uri);
      const totalImages = images.length + newImages.length;
      
      if (totalImages > 5) {
        Toast.show({
          type: 'error',
          text1: 'Too Many Images',
          text2: 'You can only upload up to 5 images per post.',
        });
        return;
      }

      setImages(prev => [...prev, ...newImages]);
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Image Picker Error',
        text2: error instanceof Error ? error.message : 'Failed to pick images.',
      });
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
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
      // Test Supabase connection first
      console.log('Testing Supabase connection...');
      try {
        const { data: testData, error: testError } = await supabase
          .from('posts')
          .select('id')
          .limit(1);
        
        console.log('Database connection test:', testError ? 'Failed' : 'Success');
      } catch (error) {
        console.error('Database connection test failed:', error);
      }

      // 1. Upload multiple images to Supabase Storage
      if (images.length > 0) {
        console.log(`Uploading ${images.length} images...`);
        
        for (let i = 0; i < images.length; i++) {
          const imageUri = images[i];
          console.log(`Uploading image ${i + 1}/${images.length}: ${imageUri}`);
          
          const fileExt = imageUri.split('.').pop();
          const fileName = `${user.id}_${Date.now()}_${i}.${fileExt || 'jpg'}`;
          const fileType = 'image/jpeg';

          // Convert base64 to proper format for Supabase Storage
          const fileBase64 = await FileSystem.readAsStringAsync(imageUri, { encoding: FileSystem.EncodingType.Base64 });
          const fileBuffer = Uint8Array.from(atob(fileBase64), c => c.charCodeAt(0));
          
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('post-images')
            .upload(fileName, fileBuffer, {
              contentType: fileType,
              upsert: false,
            });

          if (uploadError) {
            console.error(`Upload error for image ${i + 1}:`, uploadError.message);
            throw uploadError;
          }

          // Get public URL
          const { data: publicUrlData } = supabase.storage.from('post-images').getPublicUrl(fileName);
          if (publicUrlData && publicUrlData.publicUrl) {
            imageUrls.push(publicUrlData.publicUrl);
            console.log(`Image ${i + 1} uploaded successfully:`, publicUrlData.publicUrl);
          } else {
            throw new Error(`Failed to get public URL for image ${i + 1}.`);
          }
        }
      }

      // 2. Insert post with public image URLs
      console.log('Creating post with image URLs:', imageUrls);
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
      setImages([]);

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
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Photos (Max 5)</Text>
          <TouchableOpacity
            style={[styles.imagePickerButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={pickImages}
          >
            {images.length > 0 ? (
              <View style={styles.imagesGrid}>
                {images.map((imageUri, index) => (
                  <View key={index} style={styles.imageContainer}>
                    <Image source={{ uri: imageUri }} style={styles.selectedImage} />
                    <TouchableOpacity
                      style={[styles.removeImageButton, { backgroundColor: colors.error }]}
                      onPress={() => removeImage(index)}
                    >
                      <Text style={[styles.removeImageText, { color: colors.card }]}>×</Text>
                    </TouchableOpacity>
                  </View>
                ))}
                {images.length < 5 && (
                  <View style={[styles.addMoreButton, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <Camera size={24} color={colors.textSecondary} />
                    <Text style={[styles.addMoreText, { color: colors.textSecondary }]}>
                      Add More
                    </Text>
                  </View>
                )}
              </View>
            ) : (
              <>
                <Camera size={32} color={colors.textSecondary} />
                <Text style={[styles.imagePickerText, { color: colors.textSecondary }]}>
                  Add Photos
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
    minHeight: 120,
    borderRadius: 8,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  imagePickerText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    marginTop: 8,
  },
  imagesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    width: '100%',
  },
  imageContainer: {
    width: 80,
    height: 80,
    position: 'relative',
    borderRadius: 8,
    overflow: 'hidden',
  },
  selectedImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 0, 0, 0.8)',
  },
  removeImageText: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
    lineHeight: 16,
    color: 'white',
  },
  addMoreButton: {
    width: 80,
    height: 80,
    borderRadius: 8,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addMoreText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
    marginTop: 4,
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