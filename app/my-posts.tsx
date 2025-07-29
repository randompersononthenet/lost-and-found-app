import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Edit3, Trash2, ArrowLeft, Image as ImageIcon } from 'lucide-react-native';
import { router } from 'expo-router';
import Toast from 'react-native-toast-message';

export default function MyPostsScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchPosts = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setPosts(data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load posts');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

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
              fetchPosts();
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

  const renderPost = ({ item }: { item: any }) => (
    <View style={[styles.postCard, { backgroundColor: colors.card, borderColor: colors.border }]}> 
      <View style={styles.postHeader}>
        <Text style={[styles.postTitle, { color: colors.text }]} numberOfLines={2}>{item.title}</Text>
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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}> 
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}> 
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>My Posts</Text>
        <View style={{ width: 24 }} />
      </View>
      {loading ? (
        <View style={styles.centered}><Text style={{ color: colors.textSecondary }}>Loading...</Text></View>
      ) : error ? (
        <View style={styles.centered}><Text style={{ color: colors.error }}>{error}</Text></View>
      ) : posts.length === 0 ? (
        <View style={styles.centered}><Text style={{ color: colors.textSecondary }}>You have not created any posts yet.</Text></View>
      ) : (
        <FlatList
          data={posts}
          renderItem={renderPost}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchPosts(); }} />}
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
  postCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  postTitle: { fontSize: 16, fontFamily: 'Inter-SemiBold', flex: 1, marginRight: 8 },
  postActions: { flexDirection: 'row', gap: 8 },
  actionButton: { padding: 6 },
  postDate: { fontSize: 12, fontFamily: 'Inter-Regular', marginBottom: 4 },
  postDescription: { fontSize: 14, fontFamily: 'Inter-Regular', marginBottom: 8 },
  imageRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  imageCount: { fontSize: 12, fontFamily: 'Inter-Regular', marginLeft: 4 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  listContent: { padding: 20 },
}); 