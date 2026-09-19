import { useState, useEffect, useCallback, useRef } from 'react';
import type { Chat, Message, MessageReplyInfo } from '../types/chat';
import type { UserProfile } from '../types/user';
import { ChatService } from '../services/chatService';
import { useAuth } from '../contexts/AuthContext';

export const useChat = (initialTargetUser?: UserProfile | null) => {
  const { user } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<Chat | null>(null);
  const [activePartner, setActivePartner] = useState<UserProfile | null>(initialTargetUser || null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [replyingTo, setReplyingTo] = useState<MessageReplyInfo | null>(null);

  const activeChatRef = useRef<Chat | null>(null);
  activeChatRef.current = activeChat;

  const activePartnerRef = useRef<UserProfile | null>(null);
  activePartnerRef.current = activePartner;

  const userRef = useRef<UserProfile | null>(null);
  userRef.current = user;

  const typingTimeoutRef = useRef<number | null>(null);

  // Subscribe to all chats for current user - ONLY depends on user ID
  useEffect(() => {
    if (!user?.userId) {
      setChats([]);
      return;
    }

    const unsub = ChatService.subscribeToUserChats(user.userId, (updatedChats) => {
      setChats(updatedChats);

      // If activeChat is open, update its reference safely without causing infinite loops
      const currentActive = activeChatRef.current;
      if (currentActive) {
        const found = updatedChats.find((c) => c.chatId === currentActive.chatId);
        if (found) {
          setActiveChat((prev) => {
            if (!prev) return found;
            // Only update state if meaningful properties actually changed
            if (
              prev.updatedAt !== found.updatedAt ||
              prev.lastMessage?.timestamp !== found.lastMessage?.timestamp ||
              prev.lastMessage?.text !== found.lastMessage?.text
            ) {
              return found;
            }
            return prev;
          });
        }
      }
    });

    return () => unsub();
  }, [user?.userId]);

  // Subscribe to messages in current active chat - ONLY depends on primitive IDs
  const activeChatId = activeChat?.chatId;
  const currentUserId = user?.userId;

  useEffect(() => {
    if (!currentUserId || !activeChatId) {
      setMessages([]);
      return;
    }

    setLoading(true);
    const unsub = ChatService.subscribeToMessages(
      activeChatId,
      currentUserId,
      (msgs) => {
        setMessages(msgs);
        setLoading(false);
      },
      () => {
        setLoading(false);
      }
    );

    return () => unsub();
  }, [currentUserId, activeChatId]);

  // Select or initiate chat with a user
  const openChatWithUser = useCallback(async (target: UserProfile) => {
    const currentUser = userRef.current;
    if (!currentUser) return;
    setActivePartner(target);
    const chat = await ChatService.getOrCreateChat(currentUser, target);
    setActiveChat(chat);
  }, []);

  // Send a message
  const sendMessage = useCallback(async (
    text: string,
    options?: { isSecret?: boolean; disappearingDuration?: number }
  ) => {
    const currentUser = userRef.current;
    const currentChat = activeChatRef.current;
    const currentPartner = activePartnerRef.current;

    if (!currentUser || !currentChat || !currentPartner || !text.trim()) return;

    await ChatService.sendMessage(
      currentChat.chatId,
      currentUser,
      currentPartner.userId,
      text,
      replyingTo || undefined,
      options
    );
    setReplyingTo(null);
  }, [replyingTo]);

  // Typing status update with debounce
  const handleTyping = useCallback((isTyping: boolean) => {
    const currentUser = userRef.current;
    const currentChat = activeChatRef.current;
    if (!currentUser || !currentChat) return;

    ChatService.setTyping(currentChat.chatId, currentUser.userId, isTyping);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    if (isTyping) {
      typingTimeoutRef.current = window.setTimeout(() => {
        if (userRef.current && activeChatRef.current) {
          ChatService.setTyping(activeChatRef.current.chatId, userRef.current.userId, false);
        }
      }, 2500);
    }
  }, []);

  // Delete message
  const deleteMessage = useCallback(async (messageId: string) => {
    const currentChat = activeChatRef.current;
    if (!currentChat) return;
    await ChatService.deleteMessage(currentChat.chatId, messageId);
  }, []);

  // Filter messages based on search query
  const filteredMessages = messages.filter((m) => {
    if (!searchQuery.trim()) return true;
    return m.text.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return {
    chats,
    activeChat,
    activePartner,
    messages: filteredMessages,
    allMessagesCount: messages.length,
    loading,
    searchQuery,
    setSearchQuery,
    replyingTo,
    setReplyingTo,
    openChatWithUser,
    setActiveChat,
    sendMessage,
    deleteMessage,
    handleTyping,
  };
};
