import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, Image, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Camera, MapPin, Calendar, ArrowLeft } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import Toast from 'react-native-toast-message';
import * as FileSystem from 'expo-file-system';

interface Post {
  id: string;
  title: string;
  description: string;
  category: 'lost' | 'found';
  location?: string;
  date_lost_found?: string;
  images: string[];
  status: string;
}

export default function EditPostScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { postId } = useLocalSearchParams<{ postId: string }>();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<'lost' | 'found'>('lost');
  const [location, setLocation] = useState('');
  const [dateLostFound, setDateLostFound] = useState('');
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [newImages, setNewImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [post, setPost] = useState<Post | null>(null);

  useEffect(() => {
    if (postId) {
      loadPost();
    }
  }, [postId]);

  const loadPost = async () => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('id', postId)
        .eq('user_id', user!.id)
        .single();

      if (error) throw error;

      setPost(data);
      setTitle(data.title);
      setDescription(data.description);
      setCategory(data.category);
      setLocation(data.location || '');
      setDateLostFound(data.date_lost_found || '');
      setExistingImages(data.images || []);
    } catch (error) {
      console.error('Error loading post:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to load post. Please try again.',
      });
      router.back();
    }
  };

  const pickImages = async () => {
    const { status } = await ImagePicker.getMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      const { status: newStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (newStatus !== 'granted') {
        Alert.alert(
          'Permission needed',
          'Sorry, we need camera roll permissions to add images! Please enable permissions in your device settings.',
          [
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
            { text: 'Cancel', style: 'cancel' },
          ]
        );
        return;
      }
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        allowsMultipleSelection: true,
        quality: 0.8,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const newImages = result.assets.map(asset => asset.uri);
      const totalImages = existingImages.length + newImages.length;
      
      if (totalImages > 5) {
        Toast.show({
          type: 'error',
          text1: 'Too Many Images',
          text2: 'You can only upload up to 5 images per post.',
        });
        return;
      }

      setNewImages(prev => [...prev, ...newImages]);
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Image Picker Error',
        text2: error instanceof Error ? error.message : 'Failed to pick images.',
      });
    }
  };

  const removeExistingImage = (index: number) => {
    setExistingImages(prev => prev.filter((_, i) => i !== index));
  };

  const removeNewImage = (index: number) => {
    setNewImages(prev => prev.filter((_, i) => i !== index));
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

    try {
      let finalImageUrls = [...existingImages];

      // Upload new images
      if (newImages.length > 0) {
        for (let i = 0; i < newImages.length; i++) {
          const imageUri = newImages[i];
          const fileExt = imageUri.split('.').pop();
          const fileName = `${user.id}_${Date.now()}_${i}.${fileExt || 'jpg'}`;
          const fileType = 'image/jpeg';

          const fileBase64 = await FileSystem.readAsStringAsync(imageUri, { encoding: FileSystem.EncodingType.Base64 });
          const fileBuffer = Uint8Array.from(atob(fileBase64), c => c.charCodeAt(0));
          
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('post-images')
            .upload(fileName, fileBuffer, {
              contentType: fileType,
              upsert: false,
            });

          if (uploadError) throw uploadError;

          const { data: publicUrlData } = supabase.storage.from('post-images').getPublicUrl(fileName);
          if (publicUrlData && publicUrlData.publicUrl) {
            finalImageUrls.push(publicUrlData.publicUrl);
          }
        }
      }

      // Update post
      const { error } = await supabase
        .from('posts')
        .update({
          title: title.trim(),
          description: description.trim(),
          category,
          location: location.trim() || null,
          date_lost_found: dateLostFound || null,
          images: finalImageUrls,
        })
        .eq('id', postId)
        .eq('user_id', user.id);

      if (error) throw error;

      Toast.show({
        type: 'success',
        text1: 'Post Updated',
        text2: 'Your post has been successfully updated.',
      });

      router.back();
    } catch (error) {
      console.error('Error updating post:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error instanceof Error ? error.message : 'Failed to update post. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!post) {
    return null;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Edit Post</Text>
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
            {loading ? 'Updating...' : 'Update'}
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

        {/* Images */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Photos (Max 5)</Text>
          
          {/* Existing Images */}
          {existingImages.length > 0 && (
            <View style={styles.existingImagesContainer}>
              <Text style={[styles.subsectionTitle, { color: colors.textSecondary }]}>Current Images</Text>
              <View style={styles.imagesGrid}>
                {existingImages.map((imageUri, index) => (
                  <View key={`existing-${index}`} style={styles.imageContainer}>
                    <Image source={{ uri: imageUri }} style={styles.selectedImage} />
                    <TouchableOpacity
                      style={[styles.removeImageButton, { backgroundColor: colors.error }]}
                      onPress={() => removeExistingImage(index)}
                    >
                      <Text style={[styles.removeImageText, { color: colors.card }]}>×</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* New Images */}
          {newImages.length > 0 && (
            <View style={styles.newImagesContainer}>
              <Text style={[styles.subsectionTitle, { color: colors.textSecondary }]}>New Images</Text>
              <View style={styles.imagesGrid}>
                {newImages.map((imageUri, index) => (
                  <View key={`new-${index}`} style={styles.imageContainer}>
                    <Image source={{ uri: imageUri }} style={styles.selectedImage} />
                    <TouchableOpacity
                      style={[styles.removeImageButton, { backgroundColor: colors.error }]}
                      onPress={() => removeNewImage(index)}
                    >
                      <Text style={[styles.removeImageText, { color: colors.card }]}>×</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Add More Button */}
          {(existingImages.length + newImages.length) < 5 && (
            <TouchableOpacity
              style={[styles.imagePickerButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={pickImages}
            >
              <Camera size={32} color={colors.textSecondary} />
              <Text style={[styles.imagePickerText, { color: colors.textSecondary }]}>
                Add More Photos
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Update Button */}
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
            {loading ? 'Updating Post...' : 'Update Post'}
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
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
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
  subsectionTitle: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
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
  existingImagesContainer: {
    marginBottom: 16,
  },
  newImagesContainer: {
    marginBottom: 16,
  },
  imagePickerButton: {
    height: 80,
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
  imagesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
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