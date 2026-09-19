export interface UserProfile {
  userId: string;
  name: string;
  email: string;
  photoURL?: string;
  about?: string;
  online: boolean;
  lastSeen: number;
  inCall?: boolean;
  activeCallRoomId?: string;
  createdAt?: number;
  role?: string;
}

export interface UserSettings {
  theme: 'light' | 'dark' | 'system';
  microphoneId?: string;
  cameraId?: string;
  speakerId?: string;
  soundNotifications: boolean;
  messageNotifications: boolean;
  callNotifications: boolean;
  readReceipts: boolean;
  lastSeenVisibility: 'everyone' | 'contacts' | 'nobody';
  onlineStatusVisibility: 'everyone' | 'nobody';
}
