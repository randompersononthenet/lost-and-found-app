import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity, Image, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Search, Filter, MapPin, Calendar, Heart, MessageCircle, ChevronDown, ArrowLeft } from 'lucide-react-native';
import { router } from 'expo-router';
import Toast from 'react-native-toast-message';
import UserProfileModal from '@/components/UserProfileModal';

interface SearchResult {
  id: string;
  title: string;
  description: string;
  category: 'lost' | 'found';
  status: 'active' | 'resolved' | 'claimed';
  item_category?: string;
  location?: string;
  date_lost_found?: string;
  images: string[];
  created_at: string;
  user_id: string;
  profiles: {
    full_name: string;
    avatar_url?: string;
  };
  likes: { count: number }[];
  comments: { count: number }[];
  user_liked: boolean;
}

export default function SearchScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'lost' | 'found'>('all');
  const [selectedItemCategory, setSelectedItemCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'active' | 'resolved' | 'claimed'>('active');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [userProfileModalVisible, setUserProfileModalVisible] = useState(false);
  const [selectedUserProfile, setSelectedUserProfile] = useState<any>(null);
  const [loadingUserProfile, setLoadingUserProfile] = useState(false);
  const [itemCategoryModalVisible, setItemCategoryModalVisible] = useState(false);
  const [statusModalVisible, setStatusModalVisible] = useState(false);

  const categories = [
    { key: 'all', label: 'All Items' },
    { key: 'lost', label: 'Lost Items' },
    { key: 'found', label: 'Found Items' },
  ];

  const itemCategories = [
    { key: 'all', label: 'All Types' },
    { key: 'Electronics', label: 'Electronics' },
    { key: 'Wallets', label: 'Wallets' },
    { key: 'Keys', label: 'Keys' },
    { key: 'Documents', label: 'Documents' },
    { key: 'Clothing', label: 'Clothing' },
    { key: 'Bags', label: 'Bags' },
    { key: 'Accessories', label: 'Accessories' },
    { key: 'IDs', label: 'IDs' },
    { key: 'Others', label: 'Others' },
  ];

  const statusOptions = [
    { key: 'active', label: 'Active Only' },
    { key: 'resolved', label: 'Resolved' },
    { key: 'claimed', label: 'Claimed' },
    { key: 'all', label: 'All Status' },
  ];

  const getItemCategoryLabel = (key: string) => {
    const category = itemCategories.find(cat => cat.key === key);
    return category ? category.label : 'All Types';
  };

  const performSearch = async () => {
    if (!searchQuery.trim() && selectedCategory === 'all' && selectedItemCategory === 'all' && selectedStatus === 'active') {
      setSearchResults([]);
      setHasSearched(false);
      return;
    }

    setLoading(true);
    setHasSearched(true);

    try {
      let query = supabase
        .from('posts')
        .select(`
          *,
          profiles:user_id (
            full_name,
            avatar_url
          ),
          likes (count),
          comments (count)
        `)
        .order('created_at', { ascending: false });

      if (searchQuery.trim()) {
        query = query.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,location.ilike.%${searchQuery}%`);
      }

      if (selectedCategory !== 'all') {
        query = query.eq('category', selectedCategory);
      }

      if (selectedItemCategory !== 'all') {
        query = query.eq('item_category', selectedItemCategory);
      }

      if (selectedStatus !== 'all') {
        query = query.eq('status', selectedStatus);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Check if user liked each post
      const resultsWithLikes = await Promise.all(
        (data || []).map(async (post) => {
          const { data: userLike } = await supabase
            .from('likes')
            .select('id')
            .eq('post_id', post.id)
            .eq('user_id', user!.id)
            .single();

          return {
            ...post,
            user_liked: !!userLike,
          } as SearchResult;
        })
      );

      setSearchResults(resultsWithLikes);
    } catch (error) {
      console.error('Error searching posts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Debounce search
    const timeoutId = setTimeout(() => {
      performSearch();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchQuery, selectedCategory, selectedItemCategory, selectedStatus]);

  const handleViewComments = (postId: string) => {
    router.push({
      pathname: '/comments',
      params: { postId }
    });
  };

  const handleOpenUserProfile = async (userId: string) => {
    if (userId === user?.id) {
      // If it's the current user, navigate to their profile
      router.push('/(tabs)/profile');
      return;
    }

    setLoadingUserProfile(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;

      setSelectedUserProfile(data);
      setUserProfileModalVisible(true);
    } catch (error) {
      console.error('Error loading user profile:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to load user profile',
      });
    } finally {
      setLoadingUserProfile(false);
    }
  };

  const handleCloseUserProfile = () => {
    setUserProfileModalVisible(false);
    setSelectedUserProfile(null);
  };

  const handleMessageUser = (userProfile: any) => {
    // TODO: Implement messaging functionality
    Toast.show({
      type: 'info',
      text1: 'Coming Soon',
      text2: 'Messaging feature will be available soon!',
    });
  };

  const toggleLike = async (postId: string, currentlyLiked: boolean) => {
    if (!user) return;

    try {
      if (currentlyLiked) {
        await supabase
          .from('likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id);
      } else {
        await supabase
          .from('likes')
          .insert({
            post_id: postId,
            user_id: user.id,
          });
      }

      // Refresh search results
      performSearch();
    } catch (error) {
      console.error('Error toggling like:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else if (diffInHours < 168) {
      return `${Math.floor(diffInHours / 24)}d ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const renderSearchResult = ({ item }: { item: SearchResult }) => (
    <TouchableOpacity 
      style={[styles.resultCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={() => {
        // Navigate to post detail or comments
        handleViewComments(item.id);
      }}
    >
      {/* Post Header */}
      <View style={styles.resultHeader}>
        <TouchableOpacity 
          style={styles.userInfoContainer}
          onPress={() => handleOpenUserProfile(item.user_id)}
        >
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <Text style={[styles.avatarText, { color: colors.card }]}>
              {item.profiles.full_name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.userInfo}>
            <Text style={[styles.userName, { color: colors.text }]}>
              {item.profiles.full_name}
            </Text>
            <Text style={[styles.postDate, { color: colors.textSecondary }]}>
              {formatDate(item.created_at)}
            </Text>
          </View>
        </TouchableOpacity>
        <View style={[
          styles.categoryBadge,
          { backgroundColor: item.category === 'lost' ? colors.error : colors.success }
        ]}>
          <Text style={[styles.categoryText, { color: colors.card }]}>
            {item.category.toUpperCase()}
          </Text>
        </View>
      </View>

      {/* Post Content */}
      <View style={styles.resultContent}>
        <Text style={[styles.resultTitle, { color: colors.text }]}>
          {item.title}
        </Text>
        <Text style={[styles.resultDescription, { color: colors.textSecondary }]}>
          {item.description}
        </Text>

        {/* Location and Date */}
        {(item.location || item.date_lost_found) && (
          <View style={styles.resultMeta}>
            {item.location && (
              <View style={styles.metaItem}>
                <MapPin size={14} color={colors.textSecondary} />
                <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                  {item.location}
                </Text>
              </View>
            )}
            {item.date_lost_found && (
              <View style={styles.metaItem}>
                <Calendar size={14} color={colors.textSecondary} />
                <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                  {new Date(item.date_lost_found).toLocaleDateString()}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Images */}
        {item.images && item.images.length > 0 && (
          <View style={styles.imagesContainer}>
            {item.images.length === 1 ? (
              <Image
                source={{ uri: item.images[0] }}
                style={[styles.singleImage, { borderColor: colors.border }]}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.imagesGrid}>
                {item.images.length === 2 ? (
                  // 2 images: side by side
                  <>
                    <View style={[styles.gridImageContainer, styles.gridImageLeft]}>
                      <Image
                        source={{ uri: item.images[0] }}
                        style={[styles.gridImage, { borderColor: colors.border }]}
                        resizeMode="cover"
                      />
                    </View>
                    <View style={[styles.gridImageContainer, styles.gridImageRight]}>
                      <Image
                        source={{ uri: item.images[1] }}
                        style={[styles.gridImage, { borderColor: colors.border }]}
                        resizeMode="cover"
                      />
                    </View>
                  </>
                ) : item.images.length === 3 ? (
                  // 3 images: 2 on top, 1 on bottom
                  <>
                    <View style={[styles.gridImageContainer, styles.gridImageTopLeft]}>
                      <Image
                        source={{ uri: item.images[0] }}
                        style={[styles.gridImage, { borderColor: colors.border }]}
                        resizeMode="cover"
                      />
                    </View>
                    <View style={[styles.gridImageContainer, styles.gridImageTopRight]}>
                      <Image
                        source={{ uri: item.images[1] }}
                        style={[styles.gridImage, { borderColor: colors.border }]}
                        resizeMode="cover"
                      />
                    </View>
                    <View style={[styles.gridImageContainer, styles.gridImageBottom]}>
                      <Image
                        source={{ uri: item.images[2] }}
                        style={[styles.gridImage, { borderColor: colors.border }]}
                        resizeMode="cover"
                      />
                    </View>
                  </>
                ) : (
                  // 4+ images: 2x2 grid
                  <>
                    <View style={[styles.gridImageContainer, styles.gridImageTopLeft]}>
                      <Image
                        source={{ uri: item.images[0] }}
                        style={[styles.gridImage, { borderColor: colors.border }]}
                        resizeMode="cover"
                      />
                    </View>
                    <View style={[styles.gridImageContainer, styles.gridImageTopRight]}>
                      <Image
                        source={{ uri: item.images[1] }}
                        style={[styles.gridImage, { borderColor: colors.border }]}
                        resizeMode="cover"
                      />
                    </View>
                    <View style={[styles.gridImageContainer, styles.gridImageBottomLeft]}>
                      <Image
                        source={{ uri: item.images[2] }}
                        style={[styles.gridImage, { borderColor: colors.border }]}
                        resizeMode="cover"
                      />
                    </View>
                    <View style={[styles.gridImageContainer, styles.gridImageBottomRight]}>
                      <Image
                        source={{ uri: item.images[3] }}
                        style={[styles.gridImage, { borderColor: colors.border }]}
                        resizeMode="cover"
                      />
                      {item.images.length > 4 && (
                        <View style={[styles.moreImagesOverlay, { backgroundColor: 'rgba(0, 0, 0, 0.6)' }]}>
                          <Text style={[styles.moreImagesText, { color: colors.card }]}>
                            +{item.images.length - 4}
                          </Text>
                        </View>
                      )}
                    </View>
                  </>
                )}
              </View>
            )}
          </View>
        )}
      </View>

      {/* Actions */}
      <View style={[styles.resultActions, { borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => toggleLike(item.id, item.user_liked)}
        >
          <Heart
            size={20}
            color={item.user_liked ? colors.error : colors.textSecondary}
            fill={item.user_liked ? colors.error : 'transparent'}
          />
          <Text style={[styles.actionText, { color: colors.textSecondary }]}>
            {item.likes[0]?.count || 0}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => handleViewComments(item.id)}
        >
          <MessageCircle size={20} color={colors.textSecondary} />
          <Text style={[styles.actionText, { color: colors.textSecondary }]}>
            {item.comments[0]?.count || 0}
          </Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Search</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.searchContainer}>
        <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Search size={20} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search lost & found items..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={performSearch}
            returnKeyType="search"
          />
          <TouchableOpacity
            style={styles.searchButton}
            onPress={performSearch}
          >
            <Text style={[styles.searchButtonText, { color: colors.primary }]}>Search</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          horizontal
          data={categories}
          keyExtractor={(item) => item.key}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.categoryChip,
                {
                  backgroundColor: selectedCategory === item.key ? colors.primary : colors.surface,
                  borderColor: colors.border,
                }
              ]}
              onPress={() => setSelectedCategory(item.key as any)}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  {
                    color: selectedCategory === item.key ? colors.card : colors.text,
                  }
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          )}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesContainer}
        />
      </View>

      {/* Item Category Filter */}
      <View style={styles.itemCategoryContainer}>
        <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>Item Type:</Text>
        <TouchableOpacity
          style={[styles.dropdownButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => setItemCategoryModalVisible(true)}
        >
          <Text style={[styles.dropdownText, { color: colors.text }]}>
            {getItemCategoryLabel(selectedItemCategory)}
          </Text>
          <ChevronDown size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Item Category Modal */}
      <Modal
        visible={itemCategoryModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setItemCategoryModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setItemCategoryModalVisible(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Select Item Type</Text>
            {itemCategories.map((category) => (
              <TouchableOpacity
                key={category.key}
                style={[
                  styles.modalOption,
                  { borderBottomColor: colors.border }
                ]}
                onPress={() => {
                  setSelectedItemCategory(category.key);
                  setItemCategoryModalVisible(false);
                }}
              >
                <Text style={[
                  styles.modalOptionText,
                  { 
                    color: selectedItemCategory === category.key ? colors.primary : colors.text 
                  }
                ]}>
                  {category.label}
                </Text>
                {selectedItemCategory === category.key && (
                  <View style={[styles.checkmark, { backgroundColor: colors.primary }]} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Status Filter */}
      <View style={styles.statusFilterContainer}>
        <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>Status:</Text>
        <TouchableOpacity
          style={[styles.dropdownButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => setStatusModalVisible(true)}
        >
          <Text style={[styles.dropdownText, { color: colors.text }]}>
            {statusOptions.find(opt => opt.key === selectedStatus)?.label || 'All Status'}
          </Text>
          <ChevronDown size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Status Filter Modal */}
      <Modal
        visible={statusModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setStatusModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setStatusModalVisible(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Select Status</Text>
            {statusOptions.map((option) => (
              <TouchableOpacity
                key={option.key}
                style={[
                  styles.modalOption,
                  { borderBottomColor: colors.border }
                ]}
                onPress={() => {
                  setSelectedStatus(option.key as 'all' | 'active' | 'resolved' | 'claimed');
                  setStatusModalVisible(false);
                }}
              >
                <Text style={[
                  styles.modalOptionText,
                  { 
                    color: selectedStatus === option.key ? colors.primary : colors.text 
                  }
                ]}>
                  {option.label}
                </Text>
                {selectedStatus === option.key && (
                  <View style={[styles.checkmark, { backgroundColor: colors.primary }]} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      <FlatList
        data={searchResults}
        renderItem={renderSearchResult}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.resultsContainer}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            {!hasSearched ? (
              <>
                <Search size={48} color={colors.textSecondary} />
                <Text style={[styles.emptyStateTitle, { color: colors.text }]}>
                  Start Searching
                </Text>
                <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
                  Search for lost or found items by typing keywords above
                </Text>
              </>
            ) : loading ? (
              <>
                <Text style={[styles.emptyStateTitle, { color: colors.text }]}>
                  Searching...
                </Text>
              </>
            ) : (
              <>
                <Filter size={48} color={colors.textSecondary} />
                <Text style={[styles.emptyStateTitle, { color: colors.text }]}>
                  No Results Found
                </Text>
                <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
                  Try adjusting your search terms or filters
                </Text>
              </>
            )}
          </View>
        }
      />

      {/* User Profile Modal */}
      <UserProfileModal
        visible={userProfileModalVisible}
        onClose={handleCloseUserProfile}
        userProfile={selectedUserProfile}
        onMessagePress={() => selectedUserProfile && handleMessageUser(selectedUserProfile)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
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
    width: 40, // Adjust as needed for spacing
  },
  searchContainer: {
    padding: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
  },
  searchButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#E0E0E0', // Example background color
    marginLeft: 8,
  },
  searchButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  categoriesContainer: {
    paddingHorizontal: 4,
  },
  categoryChip: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
  },
  categoryChipText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  resultsContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  resultCard: {
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 12,
  },
  userInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 2,
  },
  postDate: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },
  resultContent: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  resultTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 8,
  },
  resultDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    lineHeight: 20,
    marginBottom: 12,
  },
  resultMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
  },
  imagesContainer: {
    marginBottom: 12,
  },
  singleImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    borderWidth: 1,
  },
  imagesGrid: {
    position: 'relative',
    height: 200,
    width: '100%',
  },
  gridImageContainer: {
    position: 'absolute',
    paddingHorizontal: 1,
    paddingVertical: 1,
  },
  gridImageLeft: {
    left: 0,
    top: 0,
    width: '50%',
    height: '100%',
  },
  gridImageRight: {
    right: 0,
    top: 0,
    width: '50%',
    height: '100%',
  },
  gridImageTopLeft: {
    left: 0,
    top: 0,
    width: '50%',
    height: '50%',
  },
  gridImageTopRight: {
    right: 0,
    top: 0,
    width: '50%',
    height: '50%',
  },
  gridImageBottom: {
    left: 0,
    bottom: 0,
    width: '100%',
    height: '50%',
  },
  gridImageBottomLeft: {
    left: 0,
    bottom: 0,
    width: '50%',
    height: '50%',
  },
  gridImageBottomRight: {
    right: 0,
    bottom: 0,
    width: '50%',
    height: '50%',
  },
  gridImage: {
    width: '100%',
    height: '100%',
    borderRadius: 4,
    borderWidth: 1,
  },
  moreImagesOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  moreImagesText: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    color: 'white',
  },
  resultActions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 24,
    gap: 4,
  },
  actionText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    lineHeight: 20,
  },
  itemCategoryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  filterLabel: {
    fontSize: 14,
    fontWeight: '500',
    marginRight: 12,
    minWidth: 70,
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 120,
  },
  dropdownText: {
    fontSize: 14,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    maxWidth: 300,
    borderRadius: 12,
    padding: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  modalOptionText: {
    fontSize: 16,
  },
  checkmark: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusFilterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
});