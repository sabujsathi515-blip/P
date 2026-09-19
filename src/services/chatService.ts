import {
  collection,
  doc,
  setDoc,
  getDocs,
  query,
  where,
  orderBy,
  onSnapshot,
  updateDoc,
  deleteDoc,
  limit,
} from 'firebase/firestore';
import { db, isFirebaseConfigured, handleFirestoreError, OperationType } from './firebase';
import type { Chat, Message, MessageReplyInfo } from '../types/chat';
import type { UserProfile } from '../types/user';
import { soundService } from './soundService';
import { realtimeHub } from './realtimeHub';

const LOCAL_STORAGE_CHATS = 'connectcall_demo_chats';
const LOCAL_STORAGE_MESSAGES = 'connectcall_demo_messages';

// Helper to deterministically build one-to-one chatId from two user IDs
export const getDirectChatId = (user1: string, user2: string): string => {
  return [user1, user2].sort().join('_CC_');
};

const getDemoChats = (): Chat[] => {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_CHATS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error(e);
  }
  return [];
};

const saveDemoChats = (chats: Chat[]) => {
  localStorage.setItem(LOCAL_STORAGE_CHATS, JSON.stringify(chats));
  window.dispatchEvent(new CustomEvent('connectcall_demo_chats_updated'));
};

const getDemoMessages = (chatId: string): Message[] => {
  try {
    const raw = localStorage.getItem(`${LOCAL_STORAGE_MESSAGES}_${chatId}`);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error(e);
  }
  return [];
};

const saveDemoMessages = (chatId: string, messages: Message[]) => {
  localStorage.setItem(`${LOCAL_STORAGE_MESSAGES}_${chatId}`, JSON.stringify(messages));
  window.dispatchEvent(new CustomEvent(`connectcall_messages_${chatId}`));
};

export class ChatService {
  // Subscribe to all chats for a given user
  public static subscribeToUserChats(
    userId: string,
    onChats: (chats: Chat[]) => void,
    onError?: (err: Error) => void
  ): () => void {
    if (isFirebaseConfigured() && db) {
      const q = query(
        collection(db, 'chats'),
        where('participants', 'array-contains', userId),
        orderBy('updatedAt', 'desc')
      );

      return onSnapshot(
        q,
        (snapshot) => {
          const chats: Chat[] = [];
          snapshot.forEach((doc) => {
            chats.push(doc.data() as Chat);
          });
          onChats(chats);
        },
        (error) => {
          handleFirestoreError(error, OperationType.LIST, 'chats');
          onError?.(error);
        }
      );
    } else {
      let active = true;

      const load = async () => {
        if (!active) return;
        try {
          const res = await fetch(`/api/chats?userId=${encodeURIComponent(userId)}`);
          if (res.ok) {
            const data = await res.json();
            onChats(data);
            return;
          }
        } catch {
          // fallback to localStorage
        }
        const allChats = getDemoChats();
        const userChats = allChats.filter((c) => c.participants.includes(userId));
        userChats.sort((a, b) => b.updatedAt - a.updatedAt);
        onChats(userChats);
      };

      load();

      // Realtime listener for message / chat updates
      const unsubMessage = realtimeHub.on('new_message', () => {
        load();
      });

      const unsubChatUpdate = realtimeHub.on('chat_update', () => {
        load();
      });

      const interval = setInterval(load, 3000);
      const handler = () => load();
      window.addEventListener('connectcall_demo_chats_updated', handler);
      window.addEventListener('storage', handler);

      return () => {
        active = false;
        clearInterval(interval);
        unsubMessage();
        unsubChatUpdate();
        window.removeEventListener('connectcall_demo_chats_updated', handler);
        window.removeEventListener('storage', handler);
      };
    }
  }

  // Subscribe to real-time messages for a specific chat
  public static subscribeToMessages(
    chatId: string,
    currentUserId: string,
    onMessages: (msgs: Message[]) => void,
    onError?: (err: Error) => void
  ): () => void {
    if (isFirebaseConfigured() && db) {
      const q = query(
        collection(db, 'messages'),
        where('chatId', '==', chatId),
        orderBy('timestamp', 'asc'),
        limit(200)
      );

      return onSnapshot(
        q,
        (snapshot) => {
          const msgs: Message[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data() as Message;
            msgs.push(data);

            // Automatically mark incoming messages as seen
            if (data.receiverId === currentUserId && data.status !== 'seen') {
              updateDoc(doc(db!, 'messages', data.messageId), { status: 'seen' }).catch(() => {});
            }
          });
          onMessages(msgs);
        },
        (error) => {
          handleFirestoreError(error, OperationType.LIST, `messages for ${chatId}`);
          onError?.(error);
        }
      );
    } else {
      let active = true;

      const load = async () => {
        if (!active) return;
        try {
          const res = await fetch(`/api/chats/${chatId}/messages`);
          if (res.ok) {
            let msgs: Message[] = await res.json();
            const now = Date.now();
            msgs = msgs.filter((m) => !m.expiresAt || m.expiresAt > now);

            // Mark as seen on server
            const hasUnseen = msgs.some((m) => m.receiverId === currentUserId && m.status !== 'seen');
            if (hasUnseen) {
              fetch(`/api/chats/${chatId}/seen`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: currentUserId }),
              }).catch(() => {});
            }

            onMessages(msgs);
            return;
          }
        } catch {
          // fallback
        }

        let msgs = getDemoMessages(chatId);
        const now = Date.now();
        const initialCount = msgs.length;
        msgs = msgs.filter((m) => !m.expiresAt || m.expiresAt > now);
        let changed = msgs.length !== initialCount;

        msgs.forEach((m) => {
          if (m.receiverId === currentUserId && m.status !== 'seen') {
            m.status = 'seen';
            changed = true;
          }
        });
        if (changed) {
          saveDemoMessages(chatId, msgs);
        }
        onMessages(msgs);
      };

      load();

      // Realtime listener for incoming messages
      const unsubNewMsg = realtimeHub.on('new_message', (payload: { chatId: string; message: Message }) => {
        if (payload && payload.chatId === chatId) {
          load();
        }
      });

      const unsubDelMsg = realtimeHub.on('message_deleted', (payload: { chatId: string }) => {
        if (payload && payload.chatId === chatId) {
          load();
        }
      });

      const unsubSeen = realtimeHub.on('messages_seen', (payload: { chatId: string }) => {
        if (payload && payload.chatId === chatId) {
          load();
        }
      });

      // Periodic check every 2 seconds
      const interval = setInterval(load, 2000);
      const eventName = `connectcall_messages_${chatId}`;
      const handler = () => load();
      window.addEventListener(eventName, handler);
      window.addEventListener('storage', handler);

      return () => {
        active = false;
        clearInterval(interval);
        unsubNewMsg();
        unsubDelMsg();
        unsubSeen();
        window.removeEventListener(eventName, handler);
        window.removeEventListener('storage', handler);
      };
    }
  }

  // Get or Create one-to-one chat
  public static async getOrCreateChat(
    currentUser: UserProfile,
    targetUser: UserProfile
  ): Promise<Chat> {
    const chatId = getDirectChatId(currentUser.userId, targetUser.userId);

    const chatData: Chat = {
      chatId,
      participants: [currentUser.userId, targetUser.userId],
      participantDetails: {
        [currentUser.userId]: {
          name: currentUser.name,
          email: currentUser.email,
          photoURL: currentUser.photoURL,
        },
        [targetUser.userId]: {
          name: targetUser.name,
          email: targetUser.email,
          photoURL: targetUser.photoURL,
        },
      },
      updatedAt: Date.now(),
      unreadCount: {
        [currentUser.userId]: 0,
        [targetUser.userId]: 0,
      },
    };

    if (isFirebaseConfigured() && db) {
      try {
        await setDoc(doc(db, 'chats', chatId), chatData, { merge: true });
        return chatData;
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `chats/${chatId}`);
      }
    } else {
      try {
        const res = await fetch('/api/chats', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(chatData),
        });
        if (res.ok) {
          const created = await res.json();
          return created;
        }
      } catch (e) {
        console.warn('API getOrCreateChat fallback', e);
      }

      const allChats = getDemoChats();
      const existing = allChats.find((c) => c.chatId === chatId);
      if (existing) {
        return existing;
      }
      allChats.push(chatData);
      saveDemoChats(allChats);
      return chatData;
    }
  }

  // Send a message
  public static async sendMessage(
    chatId: string,
    sender: UserProfile,
    receiverId: string,
    text: string,
    replyTo?: MessageReplyInfo,
    options?: { isSecret?: boolean; disappearingDuration?: number }
  ): Promise<Message> {
    const messageId = 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const now = Date.now();
    const expiresAt = options?.disappearingDuration
      ? now + options.disappearingDuration * 1000
      : undefined;

    const newMessage: Message = {
      messageId,
      chatId,
      senderId: sender.userId,
      receiverId,
      text: text.trim(),
      timestamp: now,
      status: 'sent',
      replyTo,
      isSecret: options?.isSecret || false,
      expiresAt,
      disappearingDuration: options?.disappearingDuration,
      encrypted: true,
    };

    if (isFirebaseConfigured() && db) {
      try {
        await setDoc(doc(db, 'messages', messageId), newMessage);

        await updateDoc(doc(db, 'chats', chatId), {
          lastMessage: {
            text: newMessage.text,
            timestamp: now,
            senderId: sender.userId,
            status: 'sent',
          },
          updatedAt: now,
          [`unreadCount.${receiverId}`]: 1,
          [`typingUsers.${sender.userId}`]: false,
        });

        soundService.playMessageSound();
        return newMessage;
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `messages/${messageId}`);
      }
    } else {
      // POST to full-stack real-time API
      try {
        await fetch(`/api/chats/${chatId}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newMessage),
        });
      } catch (e) {
        console.warn('Failed to send message via API, falling back to local', e);
      }

      // Local storage & BroadcastChannel fallback
      const msgs = getDemoMessages(chatId);
      msgs.push(newMessage);
      saveDemoMessages(chatId, msgs);

      realtimeHub.broadcastLocally('new_message', { chatId, message: newMessage });

      const chats = getDemoChats();
      const chat = chats.find((c) => c.chatId === chatId);
      if (chat) {
        chat.lastMessage = {
          text: newMessage.text,
          timestamp: now,
          senderId: sender.userId,
          status: 'sent',
        };
        chat.updatedAt = now;
        chat.unreadCount = chat.unreadCount || {};
        chat.unreadCount[receiverId] = (chat.unreadCount[receiverId] || 0) + 1;
        chat.typingUsers = chat.typingUsers || {};
        chat.typingUsers[sender.userId] = false;
        saveDemoChats(chats);
      }

      soundService.playMessageSound();
      return newMessage;
    }
  }

  // Delete message
  public static async deleteMessage(chatId: string, messageId: string): Promise<void> {
    if (isFirebaseConfigured() && db) {
      try {
        await deleteDoc(doc(db, 'messages', messageId));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `messages/${messageId}`);
      }
    } else {
      try {
        await fetch(`/api/chats/${chatId}/messages/${messageId}`, {
          method: 'DELETE',
        });
      } catch (e) {
        console.warn('Failed to delete message via API', e);
      }

      const msgs = getDemoMessages(chatId);
      const filtered = msgs.filter((m) => m.messageId !== messageId);
      saveDemoMessages(chatId, filtered);
      realtimeHub.broadcastLocally('message_deleted', { chatId, messageId });
    }
  }

  // Set typing indicator
  public static async setTyping(chatId: string, userId: string, isTyping: boolean): Promise<void> {
    if (isFirebaseConfigured() && db) {
      try {
        await updateDoc(doc(db, 'chats', chatId), {
          [`typingUsers.${userId}`]: isTyping,
        });
      } catch (_) {}
    } else {
      try {
        await fetch(`/api/chats/${chatId}/typing`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, isTyping }),
        });
      } catch (_) {}

      const chats = getDemoChats();
      const chat = chats.find((c) => c.chatId === chatId);
      if (chat) {
        chat.typingUsers = chat.typingUsers || {};
        chat.typingUsers[userId] = isTyping;
        saveDemoChats(chats);
      }
      realtimeHub.broadcastLocally('typing', { chatId, userId, isTyping });
    }
  }

  // Get all users for contacts page search
  public static async searchUsers(queryText: string, currentUserId: string): Promise<UserProfile[]> {
    const qLower = queryText.toLowerCase().trim();

    if (isFirebaseConfigured() && db) {
      try {
        const snap = await getDocs(collection(db, 'users'));
        const users: UserProfile[] = [];
        snap.forEach((docSnap) => {
          const u = docSnap.data() as UserProfile;
          if (u.userId !== currentUserId) {
            if (
              !qLower ||
              u.name.toLowerCase().includes(qLower) ||
              u.email.toLowerCase().includes(qLower)
            ) {
              users.push(u);
            }
          }
        });
        return users;
      } catch (err) {
        console.warn('Could not query users collection, falling back', err);
      }
    }

    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const serverUsers: UserProfile[] = await res.json();
        return serverUsers
          .filter((u) => u.userId !== currentUserId)
          .filter(
            (u) =>
              !qLower ||
              u.name.toLowerCase().includes(qLower) ||
              u.email.toLowerCase().includes(qLower)
          );
      }
    } catch {
      // fallback
    }

    const localUsers: UserProfile[] = JSON.parse(
      localStorage.getItem('connectcall_demo_users') || '[]'
    );
    return localUsers
      .filter((u) => u.userId !== currentUserId)
      .filter(
        (u) =>
          !qLower ||
          u.name.toLowerCase().includes(qLower) ||
          u.email.toLowerCase().includes(qLower)
      );
  }
}
