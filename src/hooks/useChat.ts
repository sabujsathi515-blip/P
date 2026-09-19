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

  const typingTimeoutRef = useRef<number | null>(null);

  // Subscribe to all chats for current user
  useEffect(() => {
    if (!user) return;
    const unsub = ChatService.subscribeToUserChats(user.userId, (updatedChats) => {
      setChats(updatedChats);

      // If activeChat is open, update its reference
      if (activeChat) {
        const found = updatedChats.find((c) => c.chatId === activeChat.chatId);
        if (found) {
          setActiveChat(found);
        }
      }
    });

    return () => unsub();
  }, [user, activeChat]);

  // Subscribe to messages in current active chat
  useEffect(() => {
    if (!user || !activeChat) {
      setMessages([]);
      return;
    }

    setLoading(true);
    const unsub = ChatService.subscribeToMessages(
      activeChat.chatId,
      user.userId,
      (msgs) => {
        setMessages(msgs);
        setLoading(false);
      },
      () => {
        setLoading(false);
      }
    );

    return () => unsub();
  }, [user, activeChat?.chatId]);

  // Select or initiate chat with a user
  const openChatWithUser = useCallback(async (target: UserProfile) => {
    if (!user) return;
    setActivePartner(target);
    const chat = await ChatService.getOrCreateChat(user, target);
    setActiveChat(chat);
  }, [user]);

  // Send a message
  const sendMessage = useCallback(async (text: string) => {
    if (!user || !activeChat || !activePartner || !text.trim()) return;

    await ChatService.sendMessage(
      activeChat.chatId,
      user,
      activePartner.userId,
      text,
      replyingTo || undefined
    );
    setReplyingTo(null);
  }, [user, activeChat, activePartner, replyingTo]);

  // Typing status update with debounce
  const handleTyping = useCallback((isTyping: boolean) => {
    if (!user || !activeChat) return;

    ChatService.setTyping(activeChat.chatId, user.userId, isTyping);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    if (isTyping) {
      typingTimeoutRef.current = window.setTimeout(() => {
        ChatService.setTyping(activeChat.chatId, user.userId, false);
      }, 2500);
    }
  }, [user, activeChat]);

  // Delete message
  const deleteMessage = useCallback(async (messageId: string) => {
    if (!activeChat) return;
    await ChatService.deleteMessage(activeChat.chatId, messageId);
  }, [activeChat]);

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
