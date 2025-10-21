import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity, Image, Alert, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useMessaging } from '@/contexts/MessagingContext';
import { supabase } from '@/lib/supabase';
import { Search, Filter, MapPin, Calendar, Heart, MessageCircle, Plus, Search as SearchIcon, Trash2 } from 'lucide-react-native';
import { router } from 'expo-router';
import Toast from 'react-native-toast-message';
import UserProfileModal from '@/components/UserProfileModal';
import ResponsiveContainer from '@/components/ResponsiveContainer';

interface UserSearchResult {
  id: string;
  full_name: string;
  avatar_url?: string;
}

export default function MessagesScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { conversations, loading, loadConversations, createConversation, deleteConversation, leaveConversation, undoLeaveConversation } = useMessaging();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [userProfileModalVisible, setUserProfileModalVisible] = useState(false);
  const [selectedUserProfile, setSelectedUserProfile] = useState<any>(null);
  const [showSearch, setShowSearch] = useState(false); // NEW
  const searchInputRef = useRef<TextInput>(null); // NEW
  // Confirm dialog state (web-friendly)
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [confirmTitle, setConfirmTitle] = useState<string>('');
  const [confirmMessage, setConfirmMessage] = useState<string>('');
  const confirmActionRef = useRef<null | (() => Promise<void> | void)>(null);

  useEffect(() => {
    if (showSearch) {
      // Focus the search input when search is shown
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }
  }, [showSearch]);

  const searchUsers = async (query: string) => {
    if (!query.trim() || !user) return;

    setSearching(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .ilike('full_name', `%${query}%`)
        .neq('id', user.id)
        .limit(10);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setSearching(false);
    }
  };

  const startConversation = async (userId: string) => {
    try {
      const conversationId = await createConversation([userId]);
      
      // Navigate to the conversation
      router.push({
        pathname: '/chat',
        params: { conversationId }
      });
      
      setSearchQuery('');
      setSearchResults([]);
    } catch (error) {
      console.error('Error starting conversation:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to start conversation',
      });
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

  const handleOpenUserProfile = async (userId: string) => {
    if (userId === user?.id) {
      // If it's the current user, navigate to their profile
      router.push('/(tabs)/profile');
      return;
    }

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
    }
  };

  const handleCloseUserProfile = () => {
    setUserProfileModalVisible(false);
    setSelectedUserProfile(null);
  };

  const renderConversation = ({ item }: { item: any }) => {
    const otherParticipants = item.participants.filter((p: any) => p.user_id !== user?.id);
    const participant = otherParticipants[0]; // Show first participant for now

    return (
      <TouchableOpacity
        style={[styles.conversationCard, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => {
          router.push({
            pathname: '/chat',
            params: { conversationId: item.id }
          });
        }}
      >
        <View style={styles.conversationHeader}>
          <TouchableOpacity 
            style={styles.userInfoContainer}
            onPress={() => handleOpenUserProfile(participant?.user_id)}
          >
            <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
              <Text style={[styles.avatarText, { color: colors.card }]}>
                {participant?.full_name?.charAt(0).toUpperCase() || 'U'}
              </Text>
            </View>
            <View style={styles.userInfo}>
              <Text style={[styles.conversationName, { color: colors.text }]}>
                {otherParticipants.map((p: any) => p.full_name).join(', ')}
              </Text>
              <Text style={[styles.postDate, { color: colors.textSecondary }]}>
                {formatDate(item.last_message_at)}
              </Text>
            </View>
          </TouchableOpacity>
          <View style={styles.conversationActions}>
            {item.unread_count > 0 && (
              <View style={[styles.unreadBadge, { backgroundColor: colors.primary }]}>
                <Text style={[styles.unreadCount, { color: colors.card }]}>
                  {item.unread_count}
                </Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.conversationContent}>
          <Text 
            style={[styles.lastMessage, { color: colors.textSecondary }]}
            numberOfLines={2}
          >
            {item.last_message_content || 'No messages yet'}
          </Text>
        </View>
        <View style={styles.conversationFooter}>
          <TouchableOpacity
            style={[styles.deleteButton, { borderColor: colors.border }]}
            onPress={() => {
              setConfirmTitle('Delete Conversation');
              setConfirmMessage('This will permanently delete the entire conversation for you. Continue?');
              confirmActionRef.current = () => deleteConversation(item.id);
              setConfirmVisible(true);
            }}
          >
            <Trash2 size={16} color={colors.textSecondary} />
            <Text style={[styles.deleteText, { color: colors.textSecondary }]}>Delete</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.leaveButton, { borderColor: colors.border }]}
            onPress={() => {
              setConfirmTitle('Leave Conversation');
              setConfirmMessage('You will be removed from this conversation. You can undo immediately after.');
              confirmActionRef.current = async () => {
                await leaveConversation(item.id);
                // Secondary undo prompt via our confirm as well
                setConfirmTitle('Left Conversation');
                setConfirmMessage('Undo leaving this conversation?');
                confirmActionRef.current = () => undoLeaveConversation(item.id);
                setConfirmVisible(true);
              };
              setConfirmVisible(true);
            }}
          >
            <Text style={[styles.leaveText, { color: colors.textSecondary }]}>Leave</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const renderSearchResult = ({ item }: { item: UserSearchResult }) => (
    <TouchableOpacity
      style={[styles.searchResultCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={() => startConversation(item.id)}
    >
      <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
        <Text style={[styles.avatarText, { color: colors.card }]}>
          {item.full_name.charAt(0).toUpperCase()}
        </Text>
      </View>
      <View style={styles.searchResultInfo}>
        <Text style={[styles.searchResultName, { color: colors.text }]}>
          {item.full_name}
        </Text>
        <Text style={[styles.searchResultSubtext, { color: colors.textSecondary }]}>
          Tap to start conversation
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ResponsiveContainer>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Messages</Text>
        <TouchableOpacity
          style={styles.newChatButton}
          onPress={() => {
            setShowSearch(true);
            setSearchQuery('');
            setSearchResults([]);
          }}
        >
          <Plus size={24} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Search Section */}
      {showSearch && (
        <View style={styles.searchSection}>
          <View style={[styles.searchBar, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
            <Search size={20} color={colors.textSecondary} />
            <TextInput
              ref={searchInputRef}
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Search users to start a conversation..."
              placeholderTextColor={colors.textSecondary}
              value={searchQuery}
              onChangeText={(text) => {
                setSearchQuery(text);
                if (text.trim()) {
                  searchUsers(text);
                } else {
                  setSearchResults([]);
                }
              }}
              autoFocus={true}
              returnKeyType="search"
            />
            <TouchableOpacity onPress={() => { setShowSearch(false); setSearchQuery(''); setSearchResults([]); }}>
              <Text style={{ color: colors.primary, marginLeft: 8, fontFamily: 'Inter-SemiBold' }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {showSearch ? (
        <FlatList
          style={{ flex: 1 }}
          data={searchResults}
          renderItem={renderSearchResult}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.searchResultsList}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              {searching ? (
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Searching...</Text>
              ) : (
                <>
                  <Search size={48} color={colors.textSecondary} />
                  <Text style={[styles.emptyTitle, { color: colors.text }]}>No Users Found</Text>
                  <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Try searching with a different name</Text>
                </>
              )}
            </View>
          }
        />
      ) : (
        <FlatList
          style={{ flex: 1 }}
          data={conversations}
          renderItem={renderConversation}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.conversationsList}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <MessageCircle size={48} color={colors.textSecondary} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No Conversations Yet</Text>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Start a conversation by tapping the + button above</Text>
            </View>
          }
        />
      )}
      </ResponsiveContainer>
      {/* User Profile Modal */}
      <UserProfileModal
        visible={userProfileModalVisible}
        onClose={handleCloseUserProfile}
        userProfile={selectedUserProfile}
        onMessagePress={() => selectedUserProfile && startConversation(selectedUserProfile.id)}
      />
      {/* Confirm Dialog (web friendly) */}
      <Modal
        visible={confirmVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: colors.card, padding: 16, borderRadius: 16, width: '88%', borderWidth: 1, borderColor: colors.border }}>
            <Text style={{ fontSize: 18, fontFamily: 'Inter-SemiBold', color: colors.text, marginBottom: 8 }}>{confirmTitle}</Text>
            <Text style={{ fontSize: 14, fontFamily: 'Inter-Regular', color: colors.textSecondary, marginBottom: 16 }}>{confirmMessage}</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
              <TouchableOpacity onPress={() => setConfirmVisible(false)} style={{ paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8, backgroundColor: colors.border, marginRight: 8 }}>
                <Text style={{ color: colors.text }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={async () => {
                  const fn = confirmActionRef.current;
                  setConfirmVisible(false);
                  // Execute after closing for snappier UX
                  try { await fn?.(); } catch {}
                  confirmActionRef.current = null;
                }}
                style={{ paddingVertical: 10, paddingHorizontal: 14, borderRadius: 8, backgroundColor: colors.primary }}
              >
                <Text style={{ color: colors.card, fontFamily: 'Inter-SemiBold' }}>Confirm</Text>
              </TouchableOpacity>
            </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
  },
  newChatButton: {
    padding: 4,
  },
  searchSection: {
    padding: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    fontFamily: 'Inter-Regular',
  },
  conversationsList: {
    padding: 16,
  },
  conversationCard: {
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
  conversationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  userInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
  },
  userInfo: {
    flex: 1,
  },
  conversationName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  postDate: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
  },
  conversationActions: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  conversationContent: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  conversationFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  deleteText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },
  leaveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginLeft: 8,
  },
  leaveText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },
  lastMessage: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    lineHeight: 18,
  },
  unreadBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  unreadCount: {
    fontSize: 12,
    fontFamily: 'Inter-Bold',
  },
  searchResultsList: {
    padding: 16,
  },
  searchResultCard: {
    flexDirection: 'row',
    alignItems: 'center',
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
  searchResultInfo: {
    flex: 1,
    marginLeft: 12,
  },
  searchResultName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
    marginBottom: 2,
  },
  searchResultSubtext: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontFamily: 'Inter-SemiBold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    lineHeight: 20,
  },
});