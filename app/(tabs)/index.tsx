import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, RefreshControl, TouchableOpacity, Image, Modal, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Heart, MessageCircle, Share, MapPin, Calendar, X, Edit, Trash2 } from 'lucide-react-native';
import { router } from 'expo-router';
import Toast from 'react-native-toast-message';

interface Post {
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
  user_id: string; // Added user_id to the Post interface
}

export default function FeedScreen() {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [imageModalVisible, setImageModalVisible] = useState(false);

  useEffect(() => {
    if (!user) {
      router.replace('/auth');
      return;
    }
    loadPosts();
  }, [user]);

  const loadPosts = async () => {
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
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Check if user liked each post
      const postsWithLikes = await Promise.all(
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

      setPosts(postsWithLikes);
    } catch (error) {
      console.error('Error loading posts:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadPosts();
    setRefreshing(false);
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

      // Update local state
      setPosts(prev => prev.map(post => 
        post.id === postId
          ? {
              ...post,
              user_liked: !currentlyLiked,
              likes: [{
                count: currentlyLiked 
                  ? Math.max(0, post.likes[0]?.count - 1 || 0)
                  : (post.likes[0]?.count || 0) + 1
              }]
            }
          : post
      ));
    } catch (error) {
      console.error('Error toggling like:', error);
    }
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

  const openImageModal = (imageUri: string) => {
    setSelectedImage(imageUri);
    setImageModalVisible(true);
  };

  const closeImageModal = () => {
    setImageModalVisible(false);
    setSelectedImage(null);
  };

  const handleEditPost = (post: Post) => {
    // Navigate to edit screen with post data
    router.push({
      pathname: '/edit',
      params: { postId: post.id }
    });
  };

  const handleDeletePost = async (post: Post) => {
    Alert.alert(
      'Delete Post',
      'Are you sure you want to delete this post? This action cannot be undone.',
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
                .eq('id', post.id)
                .eq('user_id', user!.id);

              if (error) throw error;

              Toast.show({
                type: 'success',
                text1: 'Post Deleted',
                text2: 'Your post has been successfully deleted.',
              });

              // Refresh the feed
              loadPosts();
            } catch (error) {
              console.error('Error deleting post:', error);
              Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Failed to delete post. Please try again.',
              });
            }
          },
        },
      ]
    );
  };

  const renderPost = ({ item }: { item: Post }) => (
    <View style={[styles.postCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Post Header */}
      <View style={styles.postHeader}>
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
        <View style={styles.headerActions}>
          <View style={[
            styles.categoryBadge,
            { backgroundColor: item.category === 'lost' ? colors.error : colors.success }
          ]}>
            <Text style={[styles.categoryText, { color: colors.card }]}>
              {item.category.toUpperCase()}
            </Text>
          </View>
          
          {/* Edit/Delete buttons for post owner */}
          {user && item.user_id === user.id && (
            <View style={styles.postActions}>
              <TouchableOpacity
                style={styles.actionIcon}
                onPress={() => handleEditPost(item)}
              >
                <Edit size={16} color={colors.textSecondary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionIcon}
                onPress={() => handleDeletePost(item)}
              >
                <Trash2 size={16} color={colors.error} />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      {/* Post Content */}
      <View style={styles.postContent}>
        <Text style={[styles.postTitle, { color: colors.text }]}>
          {item.title}
        </Text>
        <Text style={[styles.postDescription, { color: colors.textSecondary }]}>
          {item.description}
        </Text>

        {/* Location and Date */}
        {(item.location || item.date_lost_found) && (
          <View style={styles.postMeta}>
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
              <TouchableOpacity onPress={() => openImageModal(item.images[0])}>
                <Image
                  source={{ uri: item.images[0] }}
                  style={[styles.singleImage, { borderColor: colors.border }]}
                  resizeMode="cover"
                />
              </TouchableOpacity>
            ) : (
              <View style={styles.imagesGrid}>
                {item.images.slice(0, 4).map((imageUri, index) => (
                  <TouchableOpacity 
                    key={index} 
                    style={styles.gridImageContainer}
                    onPress={() => openImageModal(imageUri)}
                  >
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
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}
      </View>

      {/* Actions */}
      <View style={[styles.postActions, { borderTopColor: colors.border }]}>
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

        <TouchableOpacity style={styles.actionButton}>
          <MessageCircle size={20} color={colors.textSecondary} />
          <Text style={[styles.actionText, { color: colors.textSecondary }]}>
            {item.comments[0]?.count || 0}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton}>
          <Share size={20} color={colors.textSecondary} />
          <Text style={[styles.actionText, { color: colors.textSecondary }]}>
            Share
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (!user) {
    return null;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Lost & Found</Text>
      </View>

      <FlatList
        data={posts}
        renderItem={renderPost}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={styles.feedContent}
        showsVerticalScrollIndicator={false}
      />

      {/* Image Modal */}
      <Modal
        visible={imageModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={closeImageModal}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={styles.modalBackground} 
            onPress={closeImageModal}
            activeOpacity={1}
          />
          <View style={styles.modalContent}>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={closeImageModal}
            >
              <X size={24} color={colors.card} />
            </TouchableOpacity>
            {selectedImage && (
              <Image
                source={{ uri: selectedImage }}
                style={styles.modalImage}
                resizeMode="contain"
              />
            )}
          </View>
        </View>
      </Modal>
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
  feedContent: {
    paddingVertical: 10,
  },
  postCard: {
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  postHeader: {
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  postActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionIcon: {
    padding: 4,
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
  postMeta: {
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
  postActions: {
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
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContent: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  modalImage: {
    width: '100%',
    height: '100%',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 1,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});