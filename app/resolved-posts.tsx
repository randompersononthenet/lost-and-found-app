import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, RefreshCw, MapPin, Calendar, Heart, MessageCircle, Edit, Trash2 } from 'lucide-react-native';
import { router } from 'expo-router';
import Toast from 'react-native-toast-message';

interface ResolvedPost {
  id: string;
  title: string;
  description: string;
  category: 'lost' | 'found';
  status: 'resolved' | 'claimed';
  item_category?: string;
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
  user_id: string;
}

export default function ResolvedPostsScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [resolvedPosts, setResolvedPosts] = useState<ResolvedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (user) {
      loadResolvedPosts();
    }
  }, [user]);

  const loadResolvedPosts = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
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
        .eq('user_id', user.id)
        .in('status', ['resolved', 'claimed'])
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Check if user liked each post
      const postsWithLikes = await Promise.all(
        (data || []).map(async (post) => {
          const { data: userLike } = await supabase
            .from('likes')
            .select('id')
            .eq('post_id', post.id)
            .eq('user_id', user.id)
            .single();

          return {
            ...post,
            user_liked: !!userLike,
          } as ResolvedPost;
        })
      );

      setResolvedPosts(postsWithLikes);
    } catch (error) {
      console.error('Error loading resolved posts:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to load resolved posts',
      });
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadResolvedPosts();
    setRefreshing(false);
  };

  const reactivatePost = async (postId: string) => {
    Alert.alert(
      'Reactivate Post',
      'Are you sure you want to reactivate this post? It will appear in the feed again.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reactivate',
          style: 'default',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('posts')
                .update({ status: 'active' })
                .eq('id', postId)
                .eq('user_id', user!.id);

              if (error) throw error;

              // Remove from resolved posts list
              setResolvedPosts(prev => prev.filter(post => post.id !== postId));
              
              Toast.show({
                type: 'success',
                text1: 'Post Reactivated',
                text2: 'Your post is now active again in the feed',
              });
            } catch (error) {
              console.error('Error reactivating post:', error);
              Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Failed to reactivate post. Please try again.',
              });
            }
          }
        }
      ]
    );
  };

  const deletePost = async (postId: string) => {
    Alert.alert(
      'Delete Post',
      'Are you sure you want to permanently delete this post? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('posts')
                .delete()
                .eq('id', postId)
                .eq('user_id', user!.id);

              if (error) throw error;

              // Remove from resolved posts list
              setResolvedPosts(prev => prev.filter(post => post.id !== postId));
              
              Toast.show({
                type: 'success',
                text1: 'Post Deleted',
                text2: 'Your post has been permanently deleted',
              });
            } catch (error) {
              console.error('Error deleting post:', error);
              Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Failed to delete post. Please try again.',
              });
            }
          }
        }
      ]
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return 'Today';
    if (diffDays === 2) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays} days ago`;
    
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Resolved Posts</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Resolved Posts</Text>
        <View style={styles.headerSpacer} />
      </View>

      {resolvedPosts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No Resolved Posts</Text>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Posts that you mark as resolved or claimed will appear here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={resolvedPosts}
          renderItem={({ item }) => (
            <View style={[styles.postCard, { borderColor: colors.border, backgroundColor: colors.surface }]}>
              <View style={styles.postHeader}>
                <View style={styles.userInfoContainer}>
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
                </View>
                
                <View style={styles.postHeaderActions}>
                  <View style={[
                    styles.statusBadge,
                    { backgroundColor: item.status === 'resolved' ? colors.success : colors.warning }
                  ]}>
                    <Text style={[styles.statusText, { color: colors.card }]}>
                      {item.status === 'resolved' ? 'Resolved' : 'Claimed'}
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
              </View>

              <View style={styles.postContent}>
                <Text style={[styles.postTitle, { color: colors.text }]}>{item.title}</Text>
                <Text style={[styles.postDescription, { color: colors.textSecondary }]}>
                  {item.description}
                </Text>
              </View>

              <View style={styles.postActions}>
                <View style={styles.actionButtons}>
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: colors.primary }]}
                    onPress={() => reactivatePost(item.id)}
                  >
                    <RefreshCw size={16} color={colors.card} />
                    <Text style={[styles.actionButtonText, { color: colors.card }]}>
                      Reactivate
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: colors.error }]}
                    onPress={() => deletePost(item.id)}
                  >
                    <Trash2 size={16} color={colors.card} />
                    <Text style={[styles.actionButtonText, { color: colors.card }]}>
                      Delete
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.postsList}
          refreshing={refreshing}
          onRefresh={onRefresh}
          showsVerticalScrollIndicator={false}
        />
      )}
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
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
    width: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    lineHeight: 24,
  },
  postsList: {
    padding: 16,
  },
  postCard: {
    marginBottom: 16,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  postHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
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
  postContent: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  postTitle: {
    fontSize: 18,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 8,
  },
  postDescription: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    lineHeight: 20,
    marginBottom: 12,
  },
  postActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    padding: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  actionButtonText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },
}); 