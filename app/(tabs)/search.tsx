import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Search, Filter, MapPin, Calendar, Heart, MessageCircle } from 'lucide-react-native';
import { router } from 'expo-router';

interface SearchResult {
  id: string;
  title: string;
  description: string;
  category: 'lost' | 'found';
  location?: string;
  date_lost_found?: string;
  images: string[];
  created_at: string;
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
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const categories = [
    { key: 'all', label: 'All Items' },
    { key: 'lost', label: 'Lost Items' },
    { key: 'found', label: 'Found Items' },
  ];

  const performSearch = async () => {
    if (!searchQuery.trim()) {
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
        .eq('status', 'active')
        .or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%,location.ilike.%${searchQuery}%`)
        .order('created_at', { ascending: false });

      // Add category filter if not "all"
      if (selectedCategory !== 'all') {
        query = query.eq('category', selectedCategory);
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
          };
        })
      );

      setSearchResults(resultsWithLikes);
    } catch (error) {
      console.error('Error searching posts:', error);
      Toast.show({
        type: 'error',
        text1: 'Search Error',
        text2: 'Failed to search posts. Please try again.',
      });
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
  }, [searchQuery, selectedCategory]);

  const handleViewComments = (postId: string) => {
    router.push({
      pathname: '/comments',
      params: { postId }
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
                {item.images.slice(0, 4).map((imageUri, index) => (
                  <View key={index} style={styles.gridImageContainer}>
                    <Image
                      source={{ uri: imageUri }}
                      style={[styles.gridImage, { borderColor: colors.border }]}
                      resizeMode="cover"
                    />
                    {index === 3 && item.images.length > 4 && (
                      <View style={[styles.moreImagesOverlay, { backgroundColor: colors.overlay }]}>
                        <Text style={[styles.moreImagesText, { color: colors.card }]}>
                          +{item.images.length - 4}
                        </Text>
                      </View>
                    )}
                  </View>
                ))}
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
        <Text style={[styles.headerTitle, { color: colors.text }]}>Search</Text>
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
          />
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
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
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
  categoriesContainer: {
    paddingHorizontal: 4,
  },
  categoryChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
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
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 2,
  },
  gridImageContainer: {
    width: '50%',
    aspectRatio: 1,
    position: 'relative',
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
});