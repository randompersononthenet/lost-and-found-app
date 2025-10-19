import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform, Image, Modal, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import { useMessaging } from '@/contexts/MessagingContext';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Send, Trash2, User, MoreVertical, ImagePlus } from 'lucide-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import Toast from 'react-native-toast-message';
import UserProfileModal from '@/components/UserProfileModal';
import * as ImagePicker from 'expo-image-picker';

export default function ChatScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const { 
    messages, 
    currentConversation, 
    sendMessage, 
    sendImage,
    loadMessages, 
    setCurrentConversation,
    markConversationAsRead,
    deleteMessage
  } = useMessaging();
  const { conversationId } = useLocalSearchParams<{ conversationId: string }>();
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [sendingImage, setSendingImage] = useState(false);
  const [userProfileModalVisible, setUserProfileModalVisible] = useState(false);
  const [selectedUserProfile, setSelectedUserProfile] = useState<any>(null);
  const flatListRef = useRef<FlatList>(null);
  const [imageViewerVisible, setImageViewerVisible] = useState(false);
  const [imageViewerUrl, setImageViewerUrl] = useState<string | null>(null);

  useEffect(() => {
    if (conversationId) {
      loadMessages(conversationId);
      markConversationAsRead(conversationId);
      
      // Load conversation data for the header
      const loadConversationData = async () => {
        try {
          console.log('Loading conversation data for ID:', conversationId);
          
          // Find the conversation in the conversations list
          const { data: conversations } = await supabase
            .from('conversation_participants')
            .select('conversation_id')
            .eq('user_id', user?.id);
          
          console.log('User conversations:', conversations);
          
          if (conversations && conversations.length > 0) {
            const conversationIds = conversations.map(c => c.conversation_id);
            const { data: conversationData } = await supabase
              .from('conversations')
              .select('*')
              .eq('id', conversationId)
              .single();
            
            console.log('Conversation data:', conversationData);
            
            if (conversationData) {
              // Get participants for this conversation
              const { data: participants } = await supabase
                .from('conversation_participants')
                .select('user_id')
                .eq('conversation_id', conversationId)
                .neq('user_id', user?.id);
              
              console.log('Participants:', participants);
              
              const participantProfiles = await Promise.all(
                (participants || []).map(async (participant) => {
                  const { data: profile } = await supabase
                    .from('profiles')
                    .select('full_name, avatar_url')
                    .eq('id', participant.user_id)
                    .single();
                  return {
                    user_id: participant.user_id,
                    full_name: profile?.full_name || 'Unknown User',
                    avatar_url: profile?.avatar_url,
                  };
                })
              );
              
              console.log('Participant profiles:', participantProfiles);
              
              const conversationWithParticipants = {
                ...conversationData,
                participants: participantProfiles,
              };
              
              console.log('Setting current conversation:', conversationWithParticipants);
              setCurrentConversation(conversationWithParticipants);
            }
          }
        } catch (error) {
          console.error('Error loading conversation data:', error);
        }
      };
      
      loadConversationData();
    }
  }, [conversationId, loadMessages, markConversationAsRead, user?.id, setCurrentConversation]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !conversationId) return;

    setSending(true);
    try {
      await sendMessage(conversationId, newMessage);
      setNewMessage('');
      // Scroll to bottom after sending
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      console.error('Error sending message:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to send message',
      });
    } finally {
      setSending(false);
    }
  };

  const handlePickImage = async () => {
    if (!conversationId || sendingImage) return;
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Toast.show({ type: 'error', text1: 'Permission Needed', text2: 'Allow photo access to send images.' });
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: false,
        quality: 0.8,
      });
      if (result.canceled || !result.assets?.length) return;
      const uri = result.assets[0].uri;
      setSendingImage(true);
      await sendImage(conversationId, uri);
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (e) {
      console.error('Image pick/send failed:', e);
      Toast.show({ type: 'error', text1: 'Image Failed', text2: 'Unable to send image.' });
    } finally {
      setSendingImage(false);
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

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isOwnMessage = (message: any) => message.sender_id === user?.id;

  const getOtherParticipants = () => {
    if (!currentConversation) {
      console.log('No current conversation loaded');
      return [];
    }
    console.log('Current conversation:', currentConversation);
    console.log('Participants:', currentConversation.participants);
    return currentConversation.participants.filter(
      (p: any) => p.user_id !== user?.id
    );
  };

  const renderMessage = ({ item }: { item: any }) => (
    <View style={[
      styles.messageContainer,
      isOwnMessage(item) ? styles.ownMessage : styles.otherMessage
    ]}>
      <View style={[
        styles.messageBubble,
        {
          backgroundColor: isOwnMessage(item) ? colors.primary : colors.card,
          borderColor: colors.border,
        }
      ]}>
        {item.message_type === 'image' && item.metadata?.url ? (
          <TouchableOpacity onPress={() => { setImageViewerUrl(item.metadata.url); setImageViewerVisible(true); }}>
            <Image source={{ uri: item.metadata.url }} style={styles.messageImage} resizeMode="cover" />
          </TouchableOpacity>
        ) : (
          <Text style={[
            styles.messageText,
            { color: isOwnMessage(item) ? colors.card : colors.text }
          ]}>
            {item.content}
          </Text>
        )}
        <View style={styles.messageFooter}>
          <Text style={[
            styles.messageTime,
            { color: isOwnMessage(item) ? colors.card : colors.textSecondary }
          ]}>
            {formatTime(item.created_at)}
          </Text>
          {isOwnMessage(item) && (
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={() => deleteMessage(item.id)}
            >
              <Trash2 size={12} color={isOwnMessage(item) ? colors.card : colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );

  const renderChatHeader = () => {
    const otherParticipants = getOtherParticipants();
    
    if (otherParticipants.length === 0) {
      // Show loading state or fallback
      return (
        <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={colors.text} />
          </TouchableOpacity>
          
          <View style={styles.headerContent}>
            <View style={[styles.headerAvatar, { backgroundColor: colors.primary }]}>
              <Text style={[styles.headerAvatarText, { color: colors.card }]}>
                ?
              </Text>
            </View>
            <View style={styles.headerInfo}>
              <Text style={[styles.headerName, { color: colors.text }]}>
                Loading...
              </Text>
              <Text style={[styles.headerStatus, { color: colors.textSecondary }]}>
                Direct message
              </Text>
            </View>
          </View>

          <TouchableOpacity style={styles.moreButton}>
            <MoreVertical size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
      );
    }

    const participant = otherParticipants[0]; // For now, show first participant

    return (
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={colors.text} />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.headerContent}
          onPress={() => handleOpenUserProfile(participant.user_id)}
        >
          <View style={[styles.headerAvatar, { backgroundColor: colors.primary }]}>
            <Text style={[styles.headerAvatarText, { color: colors.card }]}>
              {participant.full_name?.charAt(0).toUpperCase() || 'U'}
            </Text>
          </View>
          <View style={styles.headerInfo}>
            <Text style={[styles.headerName, { color: colors.text }]}>
              {participant.full_name || 'Unknown User'}
            </Text>
            <Text style={[styles.headerStatus, { color: colors.textSecondary }]}>
              {otherParticipants.length === 1 ? 'Direct message' : `${otherParticipants.length} participants`}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.moreButton}>
          <MoreVertical size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {renderChatHeader()}

      <KeyboardAvoidingView 
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <User size={48} color={colors.textSecondary} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                Start a Conversation
              </Text>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                Send a message to begin chatting
              </Text>
            </View>
          }
        />

        <View style={[styles.inputContainer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.attachButton, { borderColor: colors.border, backgroundColor: colors.card }]}
            onPress={handlePickImage}
            disabled={sendingImage}
          >
            {sendingImage ? (
              <ActivityIndicator size="small" color={colors.textSecondary} />
            ) : (
              <ImagePlus size={20} color={colors.textSecondary} />
            )}
          </TouchableOpacity>
          <TextInput
            style={[styles.messageInput, { backgroundColor: colors.card, borderColor: colors.border, color: colors.text }]}
            placeholder="Type a message..."
            placeholderTextColor={colors.textSecondary}
            value={newMessage}
            onChangeText={setNewMessage}
            multiline
            maxLength={1000}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              {
                backgroundColor: newMessage.trim() && !sending && !sendingImage ? colors.primary : colors.border,
                opacity: newMessage.trim() && !sending && !sendingImage ? 1 : 0.6,
              }
            ]}
            onPress={handleSendMessage}
            disabled={!newMessage.trim() || sending || sendingImage}
          >
            <Send size={20} color={colors.card} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {sendingImage && (
        <View style={[styles.uploadBanner, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={[styles.uploadBannerText, { color: colors.textSecondary }]}>Uploading image...</Text>
        </View>
      )}

      {/* Image Viewer Modal */}
      <Modal
        visible={imageViewerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setImageViewerVisible(false)}
      >
        <View style={styles.viewerOverlay}>
          <TouchableOpacity style={styles.viewerBackdrop} activeOpacity={1} onPress={() => setImageViewerVisible(false)} />
          <View style={styles.viewerContent}>
            {imageViewerUrl && (
              <Image source={{ uri: imageViewerUrl }} style={styles.viewerImage} resizeMode="contain" />
            )}
          </View>
        </View>
      </Modal>

      {/* User Profile Modal */}
      <UserProfileModal
        visible={userProfileModalVisible}
        onClose={handleCloseUserProfile}
        userProfile={selectedUserProfile}
        onMessagePress={() => selectedUserProfile && handleOpenUserProfile(selectedUserProfile.id)}
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
  },
  backButton: {
    padding: 4,
    marginRight: 12,
  },
  headerContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerAvatarText: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
  },
  headerInfo: {
    flex: 1,
  },
  headerName: {
    fontSize: 16,
    fontFamily: 'Inter-SemiBold',
  },
  headerStatus: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
    marginTop: 2,
  },
  moreButton: {
    padding: 4,
  },
  content: {
    flex: 1,
  },
  messagesList: {
    padding: 16,
  },
  messageContainer: {
    marginBottom: 12,
  },
  ownMessage: {
    alignItems: 'flex-end',
  },
  otherMessage: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: '80%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
  },
  messageImage: {
    width: 220,
    height: 220,
    borderRadius: 12,
  },
  messageText: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    lineHeight: 22,
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
    gap: 8,
  },
  messageTime: {
    fontSize: 12,
    fontFamily: 'Inter-Regular',
  },
  deleteButton: {
    padding: 2,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    gap: 12,
  },
  attachButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  messageInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
    fontSize: 16,
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
  viewerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewerBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  viewerContent: {
    width: '90%',
    height: '80%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewerImage: {
    width: '100%',
    height: '100%',
  },
  uploadBanner: {
    position: 'absolute',
    bottom: 8,
    left: 16,
    right: 16,
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  uploadBannerText: {
    fontSize: 13,
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