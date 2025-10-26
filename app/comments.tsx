import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Send, Trash2 } from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import Toast from 'react-native-toast-message';
import UserProfileModal from '@/components/UserProfileModal';
import { sendCommentNotification } from '@/lib/pushNotifications';
import ResponsiveContainer from '@/components/ResponsiveContainer';

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profiles: {
    full_name: string;
    avatar_url?: string;
  };
}

interface Post {
  id: string;
  title: string;
  description: string;
  category: 'lost' | 'found';
  images: string[];
  user_id: string;
  profiles: {
    full_name: string;
  };
}

export default function CommentsScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { postId } = useLocalSearchParams<{ postId: string }>();
  
  const [comments, setComments] = useState<Comment[]>([]);
  const [post, setPost] = useState<Post | null>(null);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [userProfileModalVisible, setUserProfileModalVisible] = useState(false);
  const [selectedUserProfile, setSelectedUserProfile] = useState<any>(null);
  const [loadingUserProfile, setLoadingUserProfile] = useState(false);

  useEffect(() => {
    if (postId) {
      loadPost();
      loadComments();
    }
  }, [postId]);

  const loadPost = async () => {
    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          id,
          title,
          description,
          category,
          images,
          user_id,
          profiles:user_id (
            full_name
          )
        `)
        .eq('id', postId)
        .single();

      if (error) throw error;
      
      // Transform the data to match the Post interface
      const prof: any = Array.isArray((data as any).profiles) ? (data as any).profiles[0] : (data as any).profiles;
      const transformedData: Post = {
        id: data.id,
        title: data.title,
        description: data.description,
        category: data.category,
        images: data.images,
        user_id: data.user_id,
        profiles: {
          full_name: prof?.full_name || 'Unknown User'
        }
      };
      
      setPost(transformedData);
    } catch (error) {
      console.error('Error loading post:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to load post.',
      });
      router.back();
    }
  };

  const loadComments = async () => {
    try {
      const { data, error } = await supabase
        .from('comments')
        .select(`
          id,
          content,
          created_at,
          user_id,
          profiles:user_id (
            full_name,
            avatar_url
          )
        `)
        .eq('post_id', postId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      // Transform the data to match the Comment interface
      const transformedComments: Comment[] = (data || []).map((comment: any) => {
        const prof = Array.isArray(comment.profiles) ? comment.profiles[0] : comment.profiles;
        return {
          id: comment.id,
          content: comment.content,
          created_at: comment.created_at,
          user_id: comment.user_id,
          profiles: {
            full_name: prof?.full_name || 'Unknown User',
            avatar_url: prof?.avatar_url,
          },
        };
      });
      
      setComments(transformedComments);
    } catch (error) {
      console.error('Error loading comments:', error);
    }
  };

  const handleSubmitComment = async () => {
    if (!user || !newComment.trim()) {
      Toast.show({
        type: 'error',
        text1: 'Missing Information',
        text2: 'Please enter a comment.',
      });
      return;
    }

    setSubmitting(true);

    try {
      const { data: commentData, error } = await supabase
        .from('comments')
        .insert({
          post_id: postId,
          user_id: user.id,
          content: newComment.trim(),
        })
        .select()
        .single();

      if (error) throw error;

      setNewComment('');
      loadComments(); // Reload comments to show the new one

      // Send push notification to post author (if not commenting on own post)
      if (post && post.profiles && user.id !== post.user_id) {
        try {
          await sendCommentNotification(
            post.user_id,
            user.user_metadata?.full_name || 'Someone',
            post.title,
            postId,
            commentData.id
          );
        } catch (notificationError) {
          console.error('Error sending push notification:', notificationError);
          // Don't show error to user as comment was still posted successfully
        }
      }

      Toast.show({
        type: 'success',
        text1: 'Comment Added',
        text2: 'Your comment has been posted.',
      });
    } catch (error) {
      console.error('Error adding comment:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to add comment. Please try again.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string, commentUserId: string) => {
    if (commentUserId !== user?.id) {
      Toast.show({
        type: 'error',
        text1: 'Unauthorized',
        text2: 'You can only delete your own comments.',
      });
      return;
    }

    Alert.alert(
      'Delete Comment',
      'Are you sure you want to delete this comment?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('comments')
                .delete()
                .eq('id', commentId)
                .eq('user_id', user!.id);

              if (error) throw error;

              loadComments(); // Reload comments
              Toast.show({
                type: 'success',
                text1: 'Comment Deleted',
                text2: 'Your comment has been deleted.',
              });
            } catch (error) {
              console.error('Error deleting comment:', error);
              Toast.show({
                type: 'error',
                text1: 'Error',
                text2: 'Failed to delete comment.',
              });
            }
          },
        },
      ]
    );
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

  const renderComment = ({ item }: { item: Comment }) => (
    <View style={[styles.commentCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.commentHeader}>
        <TouchableOpacity 
          style={styles.userInfoContainer}
          onPress={() => handleOpenUserProfile(item.user_id)}
        >
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <Text style={[styles.avatarText, { color: colors.card }]}>
              {item.profiles.full_name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.commentInfo}>
            <Text style={[styles.commentAuthor, { color: colors.text }]}>
              {item.profiles.full_name}
            </Text>
            <Text style={[styles.commentDate, { color: colors.textSecondary }]}>
              {formatDate(item.created_at)}
            </Text>
          </View>
        </TouchableOpacity>
        {user && item.user_id === user.id && (
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => handleDeleteComment(item.id, item.user_id)}
          >
            <Trash2 size={16} color={colors.error} />
          </TouchableOpacity>
        )}
      </View>
      <Text style={[styles.commentContent, { color: colors.text }]}>
        {item.content}
      </Text>
    </View>
  );

  if (!post) {
    return null;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}> 
      <ResponsiveContainer>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}> 
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Comments</Text>
            <Text style={[styles.postTitle, { color: colors.textSecondary }]}> 
              {post.title}
            </Text>
          </View>
        </View>

        {/* Comments List */}
        <FlatList
          style={{ flex: 1 }}
          data={comments}
          renderItem={renderComment}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.commentsList}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}> 
                No comments yet. Be the first to comment!
              </Text>
            </View>
          }
        />

        {/* Comment Input */}
        <View style={[styles.inputContainer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}> 
          <TextInput
            style={[styles.commentInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
            placeholder="Add a comment..."
            placeholderTextColor={colors.textSecondary}
            value={newComment}
            onChangeText={setNewComment}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              {
                backgroundColor: newComment.trim() ? colors.primary : colors.border,
                opacity: newComment.trim() && !submitting ? 1 : 0.6,
              }
            ]}
            onPress={handleSubmitComment}
            disabled={!newComment.trim() || submitting}
          >
            <Send size={20} color={colors.card} />
          </TouchableOpacity>
        </View>
      </ResponsiveContainer>

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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  backButton: {
    padding: 4,
    marginRight: 12,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
  },
  postTitle: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    marginTop: 2,
  },
  commentsList: {
    padding: 16,
  },
  commentCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  userInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 14,
    fontFamily: 'Inter-Bold',
  },
  commentInfo: {
    flex: 1,
  },
  commentAuthor: {
    fontSize: 14,
    fontFamily: 'Inter-SemiBold',
  },
  commentDate: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
  },
  deleteButton: {
    padding: 4,
  },
  commentContent: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    lineHeight: 20,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    gap: 12,
  },
  commentInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
}); 