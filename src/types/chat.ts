export type MessageStatus = 'sent' | 'delivered' | 'seen';

export interface MessageReplyInfo {
  messageId: string;
  text: string;
  senderName: string;
}

export interface Message {
  messageId: string;
  chatId: string;
  senderId: string;
  receiverId: string;
  text: string;
  timestamp: number;
  status: MessageStatus;
  replyTo?: MessageReplyInfo;
  isSecret?: boolean;
  expiresAt?: number;
  disappearingDuration?: number;
  encrypted?: boolean;
}

export interface ChatParticipantInfo {
  name: string;
  email: string;
  photoURL?: string;
}

export interface Chat {
  chatId: string;
  participants: string[];
  participantDetails?: Record<string, ChatParticipantInfo>;
  lastMessage?: {
    text: string;
    timestamp: number;
    senderId: string;
    status: MessageStatus;
    isSecret?: boolean;
  };
  unreadCount?: Record<string, number>;
  typingUsers?: Record<string, boolean>;
  updatedAt: number;
  isSecretChat?: boolean;
  disappearingTimer?: number;
}
