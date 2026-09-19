export type CallType = 'audio' | 'video';

export type CallStatus =
  | 'calling'
  | 'ringing'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'ended'
  | 'declined'
  | 'missed'
  | 'failed'
  | 'busy';

export interface CallRecord {
  callId: string;
  callerId: string;
  receiverId: string;
  callerName: string;
  callerPhoto?: string;
  receiverName: string;
  receiverPhoto?: string;
  type: CallType;
  status: CallStatus;
  startedAt: number;
  endedAt?: number;
  duration: number; // in seconds
}

export interface IceCandidateItem {
  candidate: string;
  sdpMid?: string | null;
  sdpMLineIndex?: number | null;
  usernameFragment?: string | null;
}

export interface CallRoom {
  roomId: string;
  callerId: string;
  receiverId: string;
  callerName: string;
  callerPhoto?: string;
  receiverName: string;
  receiverPhoto?: string;
  callType: CallType;
  offer?: RTCSessionDescriptionInit;
  answer?: RTCSessionDescriptionInit;
  callerCandidates?: IceCandidateItem[];
  receiverCandidates?: IceCandidateItem[];
  status: CallStatus;
  createdAt: number;
  connectedAt?: number;
  endedAt?: number;
  duration?: number;
}
