import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, Alert, Image, Linking, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Camera, MapPin, Calendar, ChevronDown } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import Toast from 'react-native-toast-message';
import * as ImageManipulator from 'expo-image-manipulator';
import ResponsiveContainer from '@/components/ResponsiveContainer';

export default function CreatePostScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<'lost' | 'found'>('lost');
  const [itemCategory, setItemCategory] = useState<string>('Others');
  const [location, setLocation] = useState('');
  const [dateLostFound, setDateLostFound] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [mediaPickerVisible, setMediaPickerVisible] = useState(false);

  const availableItemCategories = [
    'Electronics',
    'Wallets',
    'Keys',
    'Documents',
    'Clothing',
    'Bags',
    'Accessories',
    'IDs',
    'Others',
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

  const pickFromLibrary = async () => {
    // Check current permission status
    const { status } = await ImagePicker.getMediaLibraryPermissionsAsync();
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
      const remaining = Math.max(0, 5 - images.length);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        allowsMultipleSelection: true,
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

      const picked = result.assets.map(asset => asset.uri).slice(0, remaining);
      if (picked.length === 0) {
        Toast.show({ type: 'info', text1: 'Limit reached', text2: 'Maximum of 5 images per post.' });
      } else {
        setImages(prev => [...prev, ...picked]);
      }
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: 'Image Picker Error',
        text2: error instanceof Error ? error.message : 'Failed to pick images.',
      });
    }
  };

  const takePhoto = async () => {
    // Request camera permissions
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission needed',
        'Camera access is required to take a photo.',
        [
          { text: 'Open Settings', onPress: () => Linking.openSettings() },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
      return;
    }
    try {
      if (images.length >= 5) {
        Toast.show({ type: 'info', text1: 'Limit reached', text2: 'Maximum of 5 images per post.' });
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
      });
      if (result.canceled || !result.assets?.length) return;
      const uri = result.assets[0].uri;
      setImages(prev => prev.length < 5 ? [...prev, uri] : prev);
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Camera Error', text2: error instanceof Error ? error.message : 'Failed to take photo.' });
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

      // 1. Upload multiple images to Supabase Storage (with client-side compress + direct Blob upload)
      if (images.length > 0) {
        console.log(`Uploading ${images.length} images...`);
        // Helper: timeout wrapper
        const withTimeout = async <T,>(p: Promise<T>, ms: number, label: string): Promise<T> => {
          return await Promise.race<T>([
            p,
            new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`${label} timed out`)), ms)) as Promise<T>,
          ]);
        };

        for (let i = 0; i < images.length; i++) {
          const imageUri = images[i];
          console.log(`Uploading image ${i + 1}/${images.length}: ${imageUri}`);
          
          // Resize/compress for faster upload and lower bandwidth
          const manipulated = await ImageManipulator.manipulateAsync(
            imageUri,
            [{ resize: { width: 1280 } }],
            { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
          );

          // Fetch blob (avoids slow base64 conversion)
          const resp = await fetch(manipulated.uri);
          const blob = await resp.blob();
          const fileType = blob.type || 'image/jpeg';
          const fileExt = 'jpg';
          const fileName = `${user.id}_${Date.now()}_${i}.${fileExt}`;

          // Simple upload with timeout and one retry
          const doUpload = async () => {
            const { error: uploadError } = await supabase.storage
              .from('post-images')
              .upload(fileName, blob, {
                contentType: fileType,
                upsert: false,
              });
            if (uploadError) throw uploadError;
          };

          try {
            await withTimeout(doUpload(), 45000, 'Upload');
          } catch (e1) {
            await withTimeout(doUpload(), 45000, 'Upload (retry)');
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
        item_category: itemCategory,
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
      setItemCategory('Others');
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
      <ResponsiveContainer>
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
        {/* Category Selection (Lost/Found) */}
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

        {/* Item Category Selection */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Item Category</Text>
          <View style={styles.categoryContainer}>
            {availableItemCategories.map((c) => (
              <TouchableOpacity
                key={c}
                onPress={() => setItemCategory(c)}
                style={[
                  styles.categoryOption,
                  { borderColor: colors.border, backgroundColor: itemCategory === c ? colors.primary : colors.surface },
                ]}
              >
                <Text style={{ color: itemCategory === c ? colors.card : colors.text }}>{c}</Text>
              </TouchableOpacity>
            ))}
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
          <TouchableOpacity
            style={[styles.inputWithIcon, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => setDatePickerVisible(true)}
          >
            <Calendar size={20} color={colors.textSecondary} />
            <View style={styles.pickerContainer}>
              <Text style={[styles.pickerText, { color: dateLostFound ? colors.text : colors.textSecondary }]}>
                {dateLostFound ? formatDateForDisplay(dateLostFound) : 'When was it lost/found?'}
              </Text>
              <ChevronDown size={20} color={colors.textSecondary} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Image */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Photos (Max 5)</Text>
          <TouchableOpacity
            style={[styles.imagePickerButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => setMediaPickerVisible(true)}
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
                  <TouchableOpacity onPress={() => setMediaPickerVisible(true)} style={[styles.addMoreButton, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
                    <Camera size={24} color={colors.textSecondary} />
                    <Text style={[styles.addMoreText, { color: colors.textSecondary }]}> 
                      Add More
                    </Text>
                  </TouchableOpacity>
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
      </ResponsiveContainer>

      {/* Date Picker Modal */}
      <Modal visible={datePickerVisible} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity onPress={() => setDatePickerVisible(false)}>
              <Text style={[styles.modalCancel, { color: colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Select Date</Text>
            <TouchableOpacity onPress={() => {
              const today = new Date();
              setDateLostFound(formatDateForDatabase(today));
              setDatePickerVisible(false);
            }}>
              <Text style={[styles.modalSave, { color: colors.primary }]}>Today</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.datePickerContent}>
            <Text style={[styles.datePickerLabel, { color: colors.textSecondary }]}>
              When was the item lost/found?
            </Text>
            
            {/* Simple date picker with year, month, day selection */}
            <View style={styles.datePickerRow}>
              <View style={styles.datePickerColumn}>
                <Text style={[styles.datePickerColumnLabel, { color: colors.text }]}>Year</Text>
                <ScrollView style={styles.datePickerScroll} showsVerticalScrollIndicator={false}>
                  {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i).reverse().map((year) => (
                    <TouchableOpacity
                      key={year}
                      style={[
                        styles.datePickerOption,
                        { borderBottomColor: colors.border },
                        dateLostFound && new Date(dateLostFound).getFullYear() === year && { backgroundColor: colors.primary + '20' }
                      ]}
                      onPress={() => {
                        const currentDate = dateLostFound ? new Date(dateLostFound) : new Date();
                        const newDate = new Date(year, currentDate.getMonth(), currentDate.getDate());
                        setDateLostFound(formatDateForDatabase(newDate));
                      }}
                    >
                      <Text style={[
                        styles.datePickerOptionText,
                        { color: colors.text },
                        dateLostFound && new Date(dateLostFound).getFullYear() === year && { color: colors.primary, fontFamily: 'Inter-SemiBold' }
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
                        dateLostFound && new Date(dateLostFound).getMonth() === index && { backgroundColor: colors.primary + '20' }
                      ]}
                      onPress={() => {
                        const currentDate = dateLostFound ? new Date(dateLostFound) : new Date();
                        const newDate = new Date(currentDate.getFullYear(), index, currentDate.getDate());
                        setDateLostFound(formatDateForDatabase(newDate));
                      }}
                    >
                      <Text style={[
                        styles.datePickerOptionText,
                        { color: colors.text },
                        dateLostFound && new Date(dateLostFound).getMonth() === index && { color: colors.primary, fontFamily: 'Inter-SemiBold' }
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
                        dateLostFound && new Date(dateLostFound).getDate() === day && { backgroundColor: colors.primary + '20' }
                      ]}
                      onPress={() => {
                        const currentDate = dateLostFound ? new Date(dateLostFound) : new Date();
                        const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                        setDateLostFound(formatDateForDatabase(newDate));
                      }}
                    >
                      <Text style={[
                        styles.datePickerOptionText,
                        { color: colors.text },
                        dateLostFound && new Date(dateLostFound).getDate() === day && { color: colors.primary, fontFamily: 'Inter-SemiBold' }
                      ]}>
                        {day}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>

            {dateLostFound && (
              <View style={[styles.selectedDateContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Text style={[styles.selectedDateLabel, { color: colors.textSecondary }]}>Selected:</Text>
                <Text style={[styles.selectedDateText, { color: colors.text }]}>
                  {formatDateForDisplay(dateLostFound)}
                </Text>
              </View>
            )}
          </View>
        </SafeAreaView>
      </Modal>

      {/* Media Picker Modal */}
      <Modal visible={mediaPickerVisible} transparent animationType="fade" onRequestClose={() => setMediaPickerVisible(false)}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' }} activeOpacity={1} onPress={() => setMediaPickerVisible(false)}>
          <View style={[{ padding: 16, borderTopLeftRadius: 16, borderTopRightRadius: 16, borderWidth: 1 }, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
            <Text style={{ fontFamily: 'Inter-SemiBold', fontSize: 16, color: colors.text, marginBottom: 12 }}>Add Photos</Text>
            <TouchableOpacity style={[{ paddingVertical: 12, borderRadius: 10, borderWidth: 1, alignItems: 'center', marginBottom: 8 }, { borderColor: colors.border, backgroundColor: colors.card }]} onPress={async () => { setMediaPickerVisible(false); await takePhoto(); }}>
              <Text style={{ color: colors.text }}>Take Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[{ paddingVertical: 12, borderRadius: 10, borderWidth: 1, alignItems: 'center' }, { borderColor: colors.border, backgroundColor: colors.card }]} onPress={async () => { setMediaPickerVisible(false); await pickFromLibrary(); }}>
              <Text style={{ color: colors.text }}>Choose from Library</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
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
    flexWrap: 'wrap',
    gap: 8,
  },
  categoryOption: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 8,
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
  pickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flex: 1,
  },
  pickerText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
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
});