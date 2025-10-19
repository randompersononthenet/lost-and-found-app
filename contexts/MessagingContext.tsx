import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as ImageManipulator from 'expo-image-manipulator';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';
import Toast from 'react-native-toast-message';
import { sendMessageNotification } from '@/lib/pushNotifications';

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type: 'text' | 'image' | 'file';
  metadata: any;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  sender_profile?: {
    full_name: string;
    avatar_url?: string;
  };
}

interface Conversation {
  id: string;
  created_at: string;
  updated_at: string;
  last_message_at: string;
  last_message_content: string;
  last_message_sender_id: string;
  participants: {
    user_id: string;
    full_name: string;
    avatar_url?: string;
  }[];
  unread_count: number;
}

interface MessagingContextType {
  conversations: Conversation[];
  currentConversation: Conversation | null;
  messages: Message[];
  loading: boolean;
  sendMessage: (conversationId: string, content: string) => Promise<void>;
  sendImage: (conversationId: string, localUri: string) => Promise<void>;
  createConversation: (participantIds: string[]) => Promise<string>;
  loadConversations: () => Promise<void>;
  loadMessages: (conversationId: string) => Promise<void>;
  setCurrentConversation: (conversation: Conversation | null) => void;
  markConversationAsRead: (conversationId: string) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
}

const MessagingContext = createContext<MessagingContextType | undefined>(undefined);

export const useMessaging = () => {
  const context = useContext(MessagingContext);
  if (!context) {
    throw new Error('useMessaging must be used within a MessagingProvider');
  }
  return context;
};

export const MessagingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  // Load conversations
  const loadConversations = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // First, get all conversations where the current user is a participant
      const { data: participantData, error: participantError } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', user.id);

      if (participantError) throw participantError;

      if (!participantData || participantData.length === 0) {
        setConversations([]);
        return;
      }

      const conversationIds = participantData.map(p => p.conversation_id);

      // Get conversations with their details
      const { data: conversationsData, error: conversationsError } = await supabase
        .from('conversations')
        .select('*')
        .in('id', conversationIds)
        .order('last_message_at', { ascending: false });

      if (conversationsError) throw conversationsError;

      // Transform data to include participants and unread counts
      const transformedConversations = await Promise.all(
        (conversationsData || []).map(async (conv) => {
          // Get participants excluding current user
          const { data: participants } = await supabase
            .from('conversation_participants')
            .select('user_id')
            .eq('conversation_id', conv.id)
            .neq('user_id', user.id);

          // Get profile data for participants
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

          // Get unread count
          const { data: unreadData } = await supabase
            .from('messages')
            .select('id')
            .eq('conversation_id', conv.id)
            .neq('sender_id', user.id)
            .gt('created_at', conv.last_message_at || '1970-01-01');

          return {
            ...conv,
            participants: participantProfiles,
            unread_count: unreadData?.length || 0,
          };
        })
      );

      setConversations(transformedConversations);
    } catch (error) {
      console.error('Error loading conversations:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to load conversations',
      });
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Send an image message
  const sendImage = useCallback(async (conversationId: string, localUri: string) => {
    if (!user || !localUri) return;

    try {
      // Client-side resize/compress for better UX and smaller uploads
      const manipulated = await ImageManipulator.manipulateAsync(
        localUri,
        [{ resize: { width: 1280 } }],
        { compress: 0.7, format: ImageManipulator.SaveFormat.JPEG }
      );

      // Prepare upload
      const response = await fetch(manipulated.uri);
      const blob = await response.blob();
      const mime = blob.type || 'image/jpeg';
      if (!mime.startsWith('image/')) {
        throw new Error('Unsupported file type');
      }
      // Basic size guard (e.g., 10MB)
      if (typeof blob.size === 'number' && blob.size > 10 * 1024 * 1024) {
        throw new Error('Image is too large after compression');
      }
      const fileExt = 'jpg';
      const fileName = `${Date.now()}.${fileExt}`;
      const path = `${conversationId}/${fileName}`;

      // Upload to storage bucket 'message-media'
      const { error: uploadError } = await supabase.storage
        .from('message-media')
        .upload(path, blob, {
          contentType: mime,
          upsert: false,
        });
      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage.from('message-media').getPublicUrl(path);
      const publicUrl = urlData?.publicUrl;
      if (!publicUrl) throw new Error('Failed to resolve uploaded image URL');

      // Insert message
      const { data: inserted, error: insertError } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content: '',
          message_type: 'image',
          metadata: { url: publicUrl },
        })
        .select()
        .single();
      if (insertError) throw insertError;

      // Optimistically add message to UI
      const newMessage: Message = {
        ...inserted,
        sender_profile: {
          full_name: user.user_metadata?.full_name || 'You',
          avatar_url: user.user_metadata?.avatar_url,
        },
      };
      setMessages(prev => [...prev, newMessage]);

      // Update conversation preview
      try {
        await supabase
          .from('conversations')
          .update({
            last_message_at: inserted.created_at,
            last_message_content: '[Image]',
            last_message_sender_id: user.id,
            updated_at: new Date().toISOString(),
          })
          .eq('id', conversationId);
        await loadConversations();
      } catch (e) {
        console.error('Error updating conversation after image send:', e);
      }
    } catch (error) {
      console.error('Error sending image:', error);
      Toast.show({ type: 'error', text1: 'Image Send Failed', text2: 'Could not send image. Please try again.' });
    }
  }, [user, loadConversations]);

  // Load messages for a conversation
  const loadMessages = useCallback(async (conversationId: string) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Get sender profile data for each message
      const messagesWithProfiles = await Promise.all(
        (data || []).map(async (message) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name, avatar_url')
            .eq('id', message.sender_id)
            .single();

          return {
            ...message,
            sender_profile: {
              full_name: profile?.full_name || 'Unknown User',
              avatar_url: profile?.avatar_url,
            },
          };
        })
      );

      setMessages(messagesWithProfiles);
    } catch (error) {
      console.error('Error loading messages:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to load messages',
      });
    }
  }, [user]);

  // Send a message
  const sendMessage = useCallback(async (conversationId: string, content: string) => {
    if (!user || !content.trim()) return;

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content: content.trim(),
          message_type: 'text',
        })
        .select()
        .single();

      if (error) throw error;

      // Optimistically add message to UI
      const newMessage: Message = {
        ...data,
        sender_profile: {
          full_name: user.user_metadata?.full_name || 'You',
          avatar_url: user.user_metadata?.avatar_url,
        },
      };

      setMessages(prev => [...prev, newMessage]);

      // Mark conversation as read for sender
      await markConversationAsRead(conversationId);

      // Update conversation's last message metadata so list shows the latest
      try {
        const preview = content.trim().length > 100 ? content.trim().substring(0, 100) + '…' : content.trim();
        await supabase
          .from('conversations')
          .update({
            last_message_at: data.created_at,
            last_message_content: preview,
            last_message_sender_id: user.id,
            updated_at: new Date().toISOString(),
          })
          .eq('id', conversationId);
        // Proactively refresh conversations to reflect new ordering
        await loadConversations();
      } catch (e) {
        console.error('Error updating conversation last message:', e);
      }

      // Send push notification to other participants
      try {
        // Get conversation participants
        const { data: participants } = await supabase
          .from('conversation_participants')
          .select('user_id')
          .eq('conversation_id', conversationId);

        if (participants) {
          const recipientIds = participants
            .map(p => p.user_id)
            .filter(id => id !== user.id);

          // Send notification to each recipient
          for (const recipientId of recipientIds) {
            await sendMessageNotification(
              recipientId,
              user.user_metadata?.full_name || 'Someone',
              content.trim().length > 50 ? content.trim().substring(0, 50) + '...' : content.trim(),
              conversationId,
              data.id
            );
          }
        }
      } catch (notificationError) {
        console.error('Error sending push notification:', notificationError);
        // Don't show error to user as message was still sent successfully
      }
    } catch (error) {
      console.error('Error sending message:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to send message',
      });
    }
  }, [user]);

  // Create a new conversation
  const createConversation = useCallback(async (participantIds: string[]): Promise<string> => {
    if (!user) throw new Error('No user logged in');

    try {
      // Check if conversation already exists by getting all conversations for current user
      const { data: userConversations } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', user.id);

      if (userConversations && userConversations.length > 0) {
        // Check each conversation to see if it has the exact same participants
        for (const userConv of userConversations) {
          const { data: participants } = await supabase
            .from('conversation_participants')
            .select('user_id')
            .eq('conversation_id', userConv.conversation_id);

          if (participants) {
            const participantUserIds = participants.map(p => p.user_id);
            const expectedParticipants = [user.id, ...participantIds].sort();
            const actualParticipants = participantUserIds.sort();

            if (JSON.stringify(expectedParticipants) === JSON.stringify(actualParticipants)) {
              return userConv.conversation_id;
            }
          }
        }
      }

      // Create new conversation
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .insert({})
        .select()
        .single();

      if (convError) throw convError;

      // Add participants
      const participants = [user.id, ...participantIds];
      const { error: partError } = await supabase
        .from('conversation_participants')
        .insert(
          participants.map(userId => ({
            conversation_id: conversation.id,
            user_id: userId,
          }))
        );

      if (partError) throw partError;

      return conversation.id;
    } catch (error) {
      console.error('Error creating conversation:', error);
      throw error;
    }
  }, [user]);

  // Mark conversation as read
  const markConversationAsRead = useCallback(async (conversationId: string) => {
    if (!user) return;

    try {
      await supabase
        .from('conversation_participants')
        .update({ last_read_at: new Date().toISOString() })
        .eq('conversation_id', conversationId)
        .eq('user_id', user.id);
    } catch (error) {
      console.error('Error marking conversation as read:', error);
    }
  }, [user]);

  // Delete a message
  const deleteMessage = useCallback(async (messageId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('messages')
        .update({ is_deleted: true })
        .eq('id', messageId)
        .eq('sender_id', user.id);

      if (error) throw error;

      // Remove from local state
      setMessages(prev => prev.filter(msg => msg.id !== messageId));
    } catch (error) {
      console.error('Error deleting message:', error);
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: 'Failed to delete message',
      });
    }
  }, [user]);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!user) return;

    // Subscribe to new messages
    const messagesSubscription = supabase
      .channel('messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${currentConversation?.id}`,
        },
        (payload) => {
          const newMessage = payload.new as Message;
          if (newMessage.sender_id !== user.id) {
            setMessages(prev => [...prev, newMessage]);
            // Mark as read if conversation is open
            if (currentConversation) {
              markConversationAsRead(currentConversation.id);
            }
            // Ensure conversations table reflects latest message for proper sorting and previews
            const preview = newMessage.message_type === 'image'
              ? '[Image]'
              : (newMessage.content?.trim()?.length > 100
                  ? newMessage.content.trim().substring(0, 100) + '…'
                  : newMessage.content?.trim() || '');
            void (async () => {
              try {
                await supabase
                  .from('conversations')
                  .update({
                    last_message_at: newMessage.created_at,
                    last_message_content: preview,
                    last_message_sender_id: newMessage.sender_id,
                    updated_at: new Date().toISOString(),
                  })
                  .eq('id', newMessage.conversation_id);
                await loadConversations();
              } catch (e) {
                console.error('Error syncing conversation last message on receive:', e);
              }
            })();
          }
        }
      )
      .subscribe();

    // Subscribe to conversation updates
    const conversationsSubscription = supabase
      .channel('conversations')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
        },
        () => {
          loadConversations();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messagesSubscription);
      supabase.removeChannel(conversationsSubscription);
    };
  }, [user, currentConversation, loadConversations, markConversationAsRead]);

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  const value: MessagingContextType = {
    conversations,
    currentConversation,
    messages,
    loading,
    sendMessage,
    sendImage,
    createConversation,
    loadConversations,
    loadMessages,
    setCurrentConversation,
    markConversationAsRead,
    deleteMessage,
  };

  return (
    <MessagingContext.Provider value={value}>
      {children}
    </MessagingContext.Provider>
  );
}; 