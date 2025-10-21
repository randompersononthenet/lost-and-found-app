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
  sendMessage: (conversationId: string, content: string, metadata?: any) => Promise<void>;
  sendImage: (conversationId: string, localUri: string) => Promise<void>;
  sendImages: (conversationId: string, localUris: string[]) => Promise<void>;
  createConversation: (participantIds: string[]) => Promise<string>;
  loadConversations: () => Promise<void>;
  loadMessages: (conversationId: string) => Promise<void>;
  setCurrentConversation: (conversation: Conversation | null) => void;
  markConversationAsRead: (conversationId: string) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  deleteConversation: (conversationId: string) => Promise<void>;
  leaveConversation: (conversationId: string) => Promise<void>;
  undoLeaveConversation: (conversationId: string) => Promise<void>;
  // Typing indicators
  setTyping: (conversationId: string, isTyping: boolean) => void;
  isAnyoneTyping: boolean;
  // Read receipts map: user_id -> last_read_at for current conversation
  participantsReadMap: Record<string, string>;
  // Reactions
  reactions: Record<string, { counts: Record<string, number>; byMe?: string }>;
  addReaction: (messageId: string, reaction: string) => Promise<void>;
  removeReaction: (messageId: string) => Promise<void>;
  // Search
  searchMessages: (conversationId: string, query: string) => Promise<Message[]>;
  listConversationImages: (conversationId: string) => Promise<Message[]>;
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
  const [isAnyoneTyping, setIsAnyoneTyping] = useState(false);
  const [participantsReadMap, setParticipantsReadMap] = useState<Record<string, string>>({});
  const typingChannelRef = React.useRef<ReturnType<typeof supabase.channel> | null>(null);
  const typingDebounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const [reactions, setReactions] = useState<Record<string, { counts: Record<string, number>; byMe?: string }>>({});

  // Load conversations (batched queries to avoid N+1)
  const loadConversations = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);

      // 1) All conversation IDs for current user
      const { data: participantData, error: participantError } = await supabase
        .from('conversation_participants')
        .select('conversation_id, last_read_at')
        .eq('user_id', user.id);
      if (participantError) throw participantError;
      if (!participantData || participantData.length === 0) {
        setConversations([]);
        return;
      }
      const conversationIds = participantData.map(p => p.conversation_id);
      const lastReadMap: Record<string, string | null> = {};
      participantData.forEach((p: any) => { lastReadMap[p.conversation_id] = p.last_read_at || null; });

      // 2) Fetch conversations in one query (limit columns)
      const { data: conversationsData, error: conversationsError } = await supabase
        .from('conversations')
        .select('id, created_at, updated_at, last_message_at, last_message_content, last_message_sender_id')
        .in('id', conversationIds)
        .order('last_message_at', { ascending: false });
      if (conversationsError) throw conversationsError;

      const convIdsSet = new Set((conversationsData || []).map(c => c.id));

      // 3) Fetch all other participants for these conversations in a single call
      const { data: allParticipants, error: participantsErr } = await supabase
        .from('conversation_participants')
        .select('conversation_id, user_id')
        .in('conversation_id', Array.from(convIdsSet))
        .neq('user_id', user.id);
      if (participantsErr) throw participantsErr;

      // 4) Fetch all needed profiles in one query
      const uniqueUserIds = Array.from(new Set((allParticipants || []).map((p: any) => p.user_id)));
      let profilesById: Record<string, { full_name: string; avatar_url?: string }> = {};
      if (uniqueUserIds.length > 0) {
        const { data: profilesData, error: profilesErr } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', uniqueUserIds);
        if (profilesErr) throw profilesErr;
        (profilesData || []).forEach((pr: any) => { profilesById[pr.id] = { full_name: pr.full_name, avatar_url: pr.avatar_url }; });
      }

      // 5) Assemble conversations with participants and a lightweight unread indicator
      const convToParticipants: Record<string, Array<{ user_id: string; full_name: string; avatar_url?: string }>> = {};
      (allParticipants || []).forEach((row: any) => {
        const prof = profilesById[row.user_id] || { full_name: 'Unknown User' };
        (convToParticipants[row.conversation_id] || (convToParticipants[row.conversation_id] = [])).push({
          user_id: row.user_id,
          full_name: prof.full_name,
          avatar_url: prof.avatar_url,
        });
      });

      const transformed = (conversationsData || []).map((conv: any) => {
        const participants = convToParticipants[conv.id] || [];
        // Unread indicator: if there is a newer last_message than my last_read_at, show 1, else 0
        const lastRead = lastReadMap[conv.id] ? new Date(String(lastReadMap[conv.id])).getTime() : 0;
        const lastMsg = conv.last_message_at ? new Date(String(conv.last_message_at)).getTime() : 0;
        const unread_count = lastMsg > lastRead ? 1 : 0; // lightweight boolean badge
        return { ...conv, participants, unread_count } as any;
      });

      // 6) Deduplicate by participant set (if needed) and sort
      const byParticipantKey = new Map<string, any>();
      for (const conv of transformed) {
        const key = (conv.participants || []).map((p: any) => p.user_id).sort().join('|');
        const existing = byParticipantKey.get(key);
        if (!existing) byParticipantKey.set(key, conv);
        else {
          const a = new Date(existing.last_message_at || existing.updated_at || existing.created_at || 0).getTime();
          const b = new Date(conv.last_message_at || conv.updated_at || conv.created_at || 0).getTime();
          if (b > a) byParticipantKey.set(key, conv);
        }
      }
      const uniqueConversations = Array.from(byParticipantKey.values()).sort((a: any, b: any) =>
        new Date(b.last_message_at || b.updated_at || b.created_at || 0).getTime() -
        new Date(a.last_message_at || a.updated_at || a.created_at || 0).getTime()
      );

      setConversations(uniqueConversations);
    } catch (error) {
      console.error('Error loading conversations:', error);
      Toast.show({ type: 'error', text1: 'Error', text2: 'Failed to load conversations' });
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Delete an entire conversation (all messages, participants, then the conversation itself)
  const deleteConversation = useCallback(async (conversationId: string) => {
    if (!user) return;
    try {
      setLoading(true);
      // Remove messages
      await supabase
        .from('messages')
        .delete()
        .eq('conversation_id', conversationId);
      // Remove participants
      await supabase
        .from('conversation_participants')
        .delete()
        .eq('conversation_id', conversationId);
      // Remove conversation
      await supabase
        .from('conversations')
        .delete()
        .eq('id', conversationId);

      // Update local state
      setConversations(prev => prev.filter(c => c.id !== conversationId));
      if (currentConversation?.id === conversationId) {
        setCurrentConversation(null);
        setMessages([]);
      }
      Toast.show({ type: 'success', text1: 'Conversation deleted' });
    } catch (error) {
      console.error('Error deleting conversation:', error);
      Toast.show({ type: 'error', text1: 'Delete failed', text2: 'Could not delete conversation' });
    } finally {
      setLoading(false);
    }
  }, [user, currentConversation]);

  // Leave a conversation (remove current user from participants)
  const leaveConversation = useCallback(async (conversationId: string) => {
    if (!user) return;
    try {
      await supabase
        .from('conversation_participants')
        .delete()
        .eq('conversation_id', conversationId)
        .eq('user_id', user.id);
      setConversations(prev => prev.filter(c => c.id !== conversationId));
      if (currentConversation?.id === conversationId) {
        setCurrentConversation(null);
        setMessages([]);
      }
      Toast.show({ type: 'success', text1: 'Left conversation' });
    } catch (e) {
      console.error('leaveConversation error:', e);
      Toast.show({ type: 'error', text1: 'Leave failed', text2: 'Unable to leave conversation' });
    }
  }, [user, currentConversation]);

  // Undo leave (re-add current user as participant)
  const undoLeaveConversation = useCallback(async (conversationId: string) => {
    if (!user) return;
    try {
      await supabase
        .from('conversation_participants')
        .insert({ conversation_id: conversationId, user_id: user.id });
      await loadConversations();
      Toast.show({ type: 'success', text1: 'Rejoined conversation' });
    } catch (e) {
      console.error('undoLeaveConversation error:', e);
      Toast.show({ type: 'error', text1: 'Rejoin failed', text2: 'Could not rejoin' });
    }
  }, [user, loadConversations]);

  // --- Read receipts: load participants' last_read_at for current conversation ---
  const loadParticipantsReadMap = useCallback(async (conversationId: string) => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('conversation_participants')
        .select('user_id, last_read_at')
        .eq('conversation_id', conversationId);
      if (error) throw error;
      const map: Record<string, string> = {};
      (data || []).forEach((row: any) => {
        if (row.user_id && row.last_read_at) map[row.user_id] = row.last_read_at;
      });
      setParticipantsReadMap(map);
    } catch (e) {
      console.error('Error loading participants read map:', e);
    }
  }, [user]);

  // Send an image message
  const sendImage = useCallback(async (conversationId: string, localUri: string) => {
    if (!user || !localUri) return;

    try {
      // Client-side resize/compress for better UX and smaller uploads
      const manipulated = await ImageManipulator.manipulateAsync(
        localUri,
        [{ resize: { width: 1024 } }],
        { compress: 0.65, format: ImageManipulator.SaveFormat.JPEG }
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

      // Helper: timeout wrapper
      const withTimeout = async <T,>(p: Promise<T>, ms: number, label: string): Promise<T> => {
        return await Promise.race<T>([
          p,
          new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`${label} timed out`)), ms)) as Promise<T>,
        ]);
      };

      // Upload to storage bucket 'message-media' with simple retry
      const doUpload = async () => {
        const { error: uploadError } = await supabase.storage
          .from('message-media')
          .upload(path, blob, {
            contentType: mime,
            upsert: false,
          });
        if (uploadError) throw uploadError;
      };

      try {
        await withTimeout(doUpload(), 45000, 'Upload');
      } catch (e1) {
        // quick retry once
        await withTimeout(doUpload(), 45000, 'Upload (retry)');
      }

      // Get public URL
      const { data: urlData } = supabase.storage.from('message-media').getPublicUrl(path);
      const publicUrl = urlData?.publicUrl;
      if (!publicUrl) throw new Error('Failed to resolve uploaded image URL');

      // Verify the URL is accessible
      try {
        await withTimeout(fetch(publicUrl, { method: 'HEAD', cache: 'no-store' }), 15000, 'URL verify');
      } catch (verifyErr) {
        // Not fatal if bucket is private and you intend to sign later, but surface a warning
        console.warn('Image public URL not immediately accessible:', verifyErr);
      }

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

      Toast.show({ type: 'success', text1: 'Image uploaded', text2: 'Your image was sent.' });
    } catch (error) {
      console.error('Error sending image:', error);
      Toast.show({ type: 'error', text1: 'Image Send Failed', text2: 'Could not send image. Please try again.' });
    }
  }, [user, loadConversations]);

  // Send multiple images (max 5)
  const sendImages = useCallback(async (conversationId: string, localUris: string[]) => {
    if (!user || !Array.isArray(localUris) || localUris.length === 0) return;
    const capped = localUris.slice(0, 5);
    for (const uri of capped) {
      try {
        await sendImage(conversationId, uri);
      } catch (e) {
        console.error('Failed to send one of the images:', e);
        // Continue sending remaining images
      }
    }
  }, [user, sendImage]);

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

      setMessages(data || []);

      // Load reactions for these messages
      const ids = (data || []).map((m: any) => m.id);
      if (ids.length) {
        const { data: rx } = await supabase
          .from('message_reactions')
          .select('message_id, user_id, reaction')
          .in('message_id', ids);
        const map: Record<string, { counts: Record<string, number>; byMe?: string }> = {};
        (rx || []).forEach((r: any) => {
          if (!map[r.message_id]) map[r.message_id] = { counts: {} };
          map[r.message_id].counts[r.reaction] = (map[r.message_id].counts[r.reaction] || 0) + 1;
          if (r.user_id === user.id) map[r.message_id].byMe = r.reaction;
        });
        setReactions(map);
      } else {
        setReactions({});
      }
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
  const sendMessage = useCallback(async (conversationId: string, content: string, metadata?: any) => {
    if (!user || !content.trim()) return;

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content: content.trim(),
          message_type: 'text',
          metadata: metadata || null,
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
      // Refresh read map after updating
      loadParticipantsReadMap(conversationId);
    } catch (error) {
      console.error('Error marking conversation as read:', error);
    }
  }, [user, loadParticipantsReadMap]);

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

  // Realtime reactions sync for current conversation
  useEffect(() => {
    if (!user || !currentConversation) return;
    const channel = supabase
      .channel('message_reactions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'message_reactions' }, (payload) => {
        const r = payload.new as any;
        const oldR = payload.old as any;
        if (!r && !oldR) return;
        const msgId = (r && r.message_id) || (oldR && oldR.message_id);
        // Update map only if we currently have this message in view
        if (!messages.find(m => m.id === msgId)) return;
        setReactions(prev => {
          const next = { ...prev };
          const ensure = () => (next[msgId] || (next[msgId] = { counts: {} }));
          switch (payload.eventType) {
            case 'INSERT': {
              const bucket = ensure();
              bucket.counts[r.reaction] = (bucket.counts[r.reaction] || 0) + 1;
              if (r.user_id === user.id) bucket.byMe = r.reaction;
              break;
            }
            case 'UPDATE': {
              // Assume single reaction per user; decrement old, increment new
              const bucket = ensure();
              if (oldR?.reaction) {
                bucket.counts[oldR.reaction] = Math.max(0, (bucket.counts[oldR.reaction] || 1) - 1);
                if (bucket.counts[oldR.reaction] === 0) delete bucket.counts[oldR.reaction];
              }
              bucket.counts[r.reaction] = (bucket.counts[r.reaction] || 0) + 1;
              if (r.user_id === user.id) bucket.byMe = r.reaction;
              break;
            }
            case 'DELETE': {
              const bucket = ensure();
              const react = oldR?.reaction;
              if (react) {
                bucket.counts[react] = Math.max(0, (bucket.counts[react] || 1) - 1);
                if (bucket.counts[react] === 0) delete bucket.counts[react];
              }
              if (oldR?.user_id === user.id) delete bucket.byMe;
              break;
            }
          }
          return next;
        });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, currentConversation, messages]);

  const addReaction = useCallback(async (messageId: string, reaction: string) => {
    if (!user) return;
    // optimistic update
    let prevSnapshot: typeof reactions | null = null;
    setReactions(prev => {
      prevSnapshot = prev;
      const next = { ...prev } as typeof prev;
      const bucket = next[messageId] ? { ...next[messageId], counts: { ...next[messageId].counts } } : { counts: {} as Record<string, number> };
      // if user had a different reaction, decrement it first
      if (bucket.byMe && bucket.byMe !== reaction) {
        bucket.counts[bucket.byMe] = Math.max(0, (bucket.counts[bucket.byMe] || 1) - 1);
        if (bucket.counts[bucket.byMe] === 0) delete bucket.counts[bucket.byMe];
      }
      bucket.byMe = reaction;
      bucket.counts[reaction] = (bucket.counts[reaction] || 0) + 1;
      next[messageId] = bucket;
      return next;
    });
    try {
      // Try insert; if unique constraint on (message_id, user_id) fails, update
      const { error: insertError } = await supabase
        .from('message_reactions')
        .insert({ message_id: messageId, user_id: user.id, reaction });
      if (insertError && !String(insertError.message).toLowerCase().includes('duplicate')) {
        throw insertError;
      }
      if (insertError) {
        // update existing
        const { error: updateError } = await supabase
          .from('message_reactions')
          .update({ reaction })
          .eq('message_id', messageId)
          .eq('user_id', user.id);
        if (updateError) throw updateError;
      }
    } catch (e) {
      console.error('Error adding reaction:', e);
      // rollback
      if (prevSnapshot) setReactions(prevSnapshot);
      Toast.show({ type: 'error', text1: 'Reaction failed', text2: 'Could not add reaction' });
    }
  }, [user, reactions]);

  const removeReaction = useCallback(async (messageId: string) => {
    if (!user) return;
    // optimistic update
    let prevSnapshot: typeof reactions | null = null;
    setReactions(prev => {
      prevSnapshot = prev;
      const next = { ...prev } as typeof prev;
      const bucket = next[messageId];
      if (!bucket || !bucket.byMe) return prev;
      const current = bucket.byMe;
      const newCounts = { ...bucket.counts };
      newCounts[current] = Math.max(0, (newCounts[current] || 1) - 1);
      if (newCounts[current] === 0) delete newCounts[current];
      next[messageId] = { counts: newCounts };
      return next;
    });
    try {
      const { error } = await supabase
        .from('message_reactions')
        .delete()
        .eq('message_id', messageId)
        .eq('user_id', user.id);
      if (error) throw error;
    } catch (e) {
      console.error('Error removing reaction:', e);
      if (prevSnapshot) setReactions(prevSnapshot);
      Toast.show({ type: 'error', text1: 'Reaction failed', text2: 'Could not remove reaction' });
    }
  }, [user, reactions]);

  // Subscribe to participants read changes for current conversation (read receipts)
  useEffect(() => {
    if (!user || !currentConversation) return;
    loadParticipantsReadMap(currentConversation.id);
    const readChannel = supabase
      .channel('participants_read')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'conversation_participants',
        filter: `conversation_id=eq.${currentConversation.id}`,
      }, () => {
        loadParticipantsReadMap(currentConversation.id);
      })
      .subscribe();
    return () => {
      supabase.removeChannel(readChannel);
    };
  }, [user, currentConversation, loadParticipantsReadMap]);

  // Typing indicators: join presence channel per conversation
  useEffect(() => {
    if (!user || !currentConversation) return;

    // cleanup previous channel
    if (typingChannelRef.current) {
      supabase.removeChannel(typingChannelRef.current);
      typingChannelRef.current = null;
    }

    const channel = supabase.channel(`typing:${currentConversation.id}`, { config: { presence: { key: user.id } } });
    typingChannelRef.current = channel;

    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState() as Record<string, Array<{ isTyping?: boolean }>>;
      // Someone else typing?
      let any = false;
      Object.entries(state).forEach(([uid, metas]) => {
        if (uid !== user.id && metas.some((m: any) => m.isTyping)) any = true;
      });
      setIsAnyoneTyping(any);
    });

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({ isTyping: false });
      }
    });

    return () => {
      if (typingChannelRef.current) {
        supabase.removeChannel(typingChannelRef.current);
        typingChannelRef.current = null;
      }
      setIsAnyoneTyping(false);
    };
  }, [user, currentConversation]);

  const setTyping = useCallback((conversationId: string, isTyping: boolean) => {
    if (!typingChannelRef.current || !currentConversation || currentConversation.id !== conversationId) return;
    // throttle: immediately set true, and auto-false after 2s idle
    void typingChannelRef.current.track({ isTyping }).catch(() => {});
    if (isTyping) {
      if (typingDebounceRef.current) clearTimeout(typingDebounceRef.current);
      typingDebounceRef.current = setTimeout(() => {
        void typingChannelRef.current?.track({ isTyping: false }).catch(() => {});
      }, 2000);
    }
  }, [currentConversation]);

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
    sendImages,
    createConversation,
    loadConversations,
    loadMessages,
    setCurrentConversation,
    markConversationAsRead,
    deleteMessage,
    deleteConversation,
    leaveConversation,
    undoLeaveConversation,
    setTyping,
    isAnyoneTyping,
    participantsReadMap,
    reactions,
    addReaction,
    removeReaction,
    searchMessages: async (conversationId: string, query: string) => {
      if (!user || !conversationId || !query.trim()) return [];
      try {
        // Prefer RPC for ranked, limited FTS
        const q = query.trim();
        const rpc = await supabase.rpc('search_messages', { conv: conversationId, q, lim: 50, off: 0 });
        if (!rpc.error) return rpc.data || [];
        // Fallback to FTS on content_tsv using websearch
        let fts = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', conversationId)
          .eq('is_deleted', false)
          .eq('message_type', 'text')
          .textSearch('content_tsv', q, { type: 'websearch' })
          .order('created_at', { ascending: true })
          .limit(50);
        if (!fts.error) return fts.data || [];
        // Fallback to ilike
        const fallback = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', conversationId)
          .eq('is_deleted', false)
          .eq('message_type', 'text')
          .ilike('content', `%${q}%`)
          .order('created_at', { ascending: true })
          .limit(50);
        if (fallback.error) throw fallback.error;
        return fallback.data || [];
      } catch (e) {
        console.error('searchMessages error:', e);
        Toast.show({ type: 'error', text1: 'Search Failed', text2: 'Unable to search messages' });
        return [];
      }
    },
    listConversationImages: async (conversationId: string) => {
      if (!user || !conversationId) return [];
      try {
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .eq('conversation_id', conversationId)
          .eq('is_deleted', false)
          .eq('message_type', 'image')
          .order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
      } catch (e) {
        console.error('listConversationImages error:', e);
        Toast.show({ type: 'error', text1: 'Load Failed', text2: 'Unable to load images' });
        return [];
      }
    },
  };

  return (
    <MessagingContext.Provider value={value}>
      {children}
    </MessagingContext.Provider>
  );
}; 