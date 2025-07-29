import React, { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Alert, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Edit3, Trash2, ArrowLeft, Image as ImageIcon, Search, X, Filter } from 'lucide-react-native';
import { router } from 'expo-router';
import Toast from 'react-native-toast-message';

export default function MyPostsScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const POSTS_PER_PAGE = 20;

  const categories = [
    { label: 'All', value: 'all' },
    { label: 'Lost', value: 'lost' },
    { label: 'Found', value: 'found' },
  ];

  const fetchPosts = useCallback(async (isRefresh = false, isLoadMore = false) => {
    if (!user) return;
    
    if (isRefresh) {
      setPage(0);
      setPosts([]);
      setHasMore(true);
    }
    
    if (isLoadMore && !hasMore) return;
    
    setLoading(!isLoadMore);
    setLoadingMore(isLoadMore);
    setError('');
    
    try {
      let query = supabase
        .from('posts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(page * POSTS_PER_PAGE, (page + 1) * POSTS_PER_PAGE - 1);

      // Apply search filter
      if (searchQuery.trim()) {
        query = query.or(`title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`);
      }

      // Apply category filter
      if (selectedCategory !== 'all') {
        query = query.eq('category', selectedCategory);
      }

      const { data, error } = await query;
      if (error) throw error;

      if (isLoadMore) {
        // Prevent duplicates by filtering out posts that already exist
        setPosts(prev => {
          const existingIds = new Set(prev.map(post => post.id));
          const newPosts = (data || []).filter(post => !existingIds.has(post.id));
          return [...prev, ...newPosts];
        });
        setHasMore((data || []).length === POSTS_PER_PAGE);
      } else {
        setPosts(data || []);
        setHasMore((data || []).length === POSTS_PER_PAGE);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load posts');
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  }, [user, searchQuery, selectedCategory, page, hasMore]);

  // Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    searchTimeoutRef.current = setTimeout(() => {
      setPage(0);
      fetchPosts(true);
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, fetchPosts]);

  // Fetch posts when filters change
  useEffect(() => {
    setPage(0);
    fetchPosts(true);
  }, [selectedCategory, fetchPosts]);

  const handleLoadMore = () => {
    if (!loadingMore && hasMore) {
      setPage(prev => prev + 1);
      fetchPosts(false, true);
    }
  };

  const handleDelete = (postId: string) => {
    Alert.alert(
      'Delete Post',
      'Are you sure you want to delete this post?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete', style: 'destructive', onPress: async () => {
            try {
              const { error } = await supabase.from('posts').delete().eq('id', postId);
              if (error) throw error;
              Toast.show({ type: 'success', text1: 'Post deleted' });
              fetchPosts(true);
            } catch (err: any) {
              Toast.show({ type: 'error', text1: 'Error', text2: err.message || 'Failed to delete post' });
            }
          }
        }
      ]
    );
  };

  const handleEdit = (postId: string) => {
    router.push({ pathname: '/edit', params: { postId } });
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
  };

  const renderPost = ({ item, index }: { item: any; index: number }) => (
    <View style={[styles.postCard, { backgroundColor: colors.card, borderColor: colors.border }]}> 
      <View style={styles.postHeader}>
        <View style={styles.postInfo}>
          <Text style={[styles.postTitle, { color: colors.text }]} numberOfLines={2}>{item.title}</Text>
          <View style={[styles.categoryBadge, { backgroundColor: item.category === 'lost' ? colors.error + '20' : colors.success + '20' }]}>
            <Text style={[styles.categoryText, { color: item.category === 'lost' ? colors.error : colors.success }]}>
              {item.category?.toUpperCase()}
            </Text>
          </View>
        </View>
        <View style={styles.postActions}>
          <TouchableOpacity style={styles.actionButton} onPress={() => handleEdit(item.id)}>
            <Edit3 size={18} color={colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={() => handleDelete(item.id)}>
            <Trash2 size={18} color={colors.error} />
          </TouchableOpacity>
        </View>
      </View>
      <Text style={[styles.postDate, { color: colors.textSecondary }]}> {new Date(item.created_at).toLocaleString()} </Text>
      <Text style={[styles.postDescription, { color: colors.text }]} numberOfLines={3}>{item.description}</Text>
      {item.images && item.images.length > 0 && (
        <View style={styles.imageRow}>
          <ImageIcon size={16} color={colors.textSecondary} />
          <Text style={[styles.imageCount, { color: colors.textSecondary }]}> {item.images.length} image{item.images.length > 1 ? 's' : ''} </Text>
        </View>
      )}
    </View>
  );

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.loadingMore}>
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading more posts...</Text>
      </View>
    );
  };

  const renderEmpty = () => {
    if (loading) return null;
    return (
      <View style={styles.centered}>
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          {searchQuery || selectedCategory !== 'all' 
            ? 'No posts match your search criteria.' 
            : 'You have not created any posts yet.'}
        </Text>
        {(searchQuery || selectedCategory !== 'all') && (
          <TouchableOpacity style={styles.clearButton} onPress={clearFilters}>
            <Text style={[styles.clearButtonText, { color: colors.primary }]}>Clear Filters</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}> 
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}> 
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>My Posts</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Search Bar */}
      <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Search size={20} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search your posts..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter Chips */}
      <View style={[styles.filterContainer, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <View style={styles.filterChips}>
          {categories.map((category) => (
            <TouchableOpacity
              key={category.value}
              style={[
                styles.filterChip,
                { backgroundColor: selectedCategory === category.value ? colors.primary : colors.card, borderColor: colors.border }
              ]}
              onPress={() => setSelectedCategory(category.value)}
            >
              <Text style={[
                styles.filterChipText,
                { color: selectedCategory === category.value ? colors.card : colors.text }
              ]}>
                {category.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {error ? (
        <View style={styles.centered}>
          <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
        </View>
      ) : (
        <FlatList
          data={posts}
          renderItem={renderPost}
          keyExtractor={(item, index) => `${item.id}-${index}`}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchPosts(true)} />}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.1}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={renderEmpty}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  backButton: { padding: 4, marginRight: 12 },
  headerTitle: { fontSize: 20, fontFamily: 'Inter-Bold', flex: 1, textAlign: 'center' },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
  },
  filterContainer: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  filterChips: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  postCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  postInfo: {
    flex: 1,
    marginRight: 8,
  },
  postTitle: { fontSize: 16, fontFamily: 'Inter-SemiBold', marginBottom: 4 },
  categoryBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  categoryText: {
    fontSize: 10,
    fontFamily: 'Inter-Bold',
  },
  postActions: { flexDirection: 'row', gap: 8 },
  actionButton: { padding: 6 },
  postDate: { fontSize: 12, fontFamily: 'Inter-Regular', marginBottom: 4 },
  postDescription: { fontSize: 14, fontFamily: 'Inter-Regular', marginBottom: 8 },
  imageRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  imageCount: { fontSize: 12, fontFamily: 'Inter-Regular', marginLeft: 4 },
  loadingMore: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
  centered: { 
    flex: 1, 
    alignItems: 'center', 
    justifyContent: 'center', 
    padding: 32 
  },
  emptyText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    marginBottom: 16,
  },
  errorText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
  },
  clearButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  clearButtonText: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },
  listContent: { padding: 20 },
}); 