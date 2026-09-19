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
      // Demo mode
      const load = () => {
        const allChats = getDemoChats();
        const userChats = allChats.filter((c) => c.participants.includes(userId));
        userChats.sort((a, b) => b.updatedAt - a.updatedAt);
        onChats(userChats);
      };

      load();
      const handler = () => load();
      window.addEventListener('connectcall_demo_chats_updated', handler);
      window.addEventListener('storage', handler);

      return () => {
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
      // Demo mode
      const load = () => {
        const msgs = getDemoMessages(chatId);
        // Mark as seen
        let changed = false;
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
      const eventName = `connectcall_messages_${chatId}`;
      const handler = () => load();
      window.addEventListener(eventName, handler);
      window.addEventListener('storage', handler);

      return () => {
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
    replyTo?: MessageReplyInfo
  ): Promise<Message> {
    const messageId = 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const now = Date.now();

    const newMessage: Message = {
      messageId,
      chatId,
      senderId: sender.userId,
      receiverId,
      text: text.trim(),
      timestamp: now,
      status: 'sent',
      replyTo,
    };

    if (isFirebaseConfigured() && db) {
      try {
        // Save message document
        await setDoc(doc(db, 'messages', messageId), newMessage);

        // Update parent chat document
        await updateDoc(doc(db, 'chats', chatId), {
          lastMessage: {
            text: newMessage.text,
            timestamp: now,
            senderId: sender.userId,
            status: 'sent',
          },
          updatedAt: now,
          [`unreadCount.${receiverId}`]: 1, // increment/set unread
          [`typingUsers.${sender.userId}`]: false,
        });

        soundService.playMessageSound();
        return newMessage;
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `messages/${messageId}`);
      }
    } else {
      // Demo mode
      const msgs = getDemoMessages(chatId);
      msgs.push(newMessage);
      saveDemoMessages(chatId, msgs);

      // Update chats list
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
      const msgs = getDemoMessages(chatId);
      const filtered = msgs.filter((m) => m.messageId !== messageId);
      saveDemoMessages(chatId, filtered);
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
      const chats = getDemoChats();
      const chat = chats.find((c) => c.chatId === chatId);
      if (chat) {
        chat.typingUsers = chat.typingUsers || {};
        chat.typingUsers[userId] = isTyping;
        saveDemoChats(chats);
      }
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

    // Demo users search
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
