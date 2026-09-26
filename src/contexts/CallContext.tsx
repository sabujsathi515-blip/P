import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import type { CallRoom, CallType, CallStatus } from '../types/call';
import type { UserProfile } from '../types/user';
import { WebRTCService } from '../services/WebRTCService';
import { CallService } from '../services/callService';
import { AuthService } from '../services/authService';
import { soundService } from '../services/soundService';
import { NotificationService } from '../services/notificationService';
import { useAuth } from './AuthContext';

interface CallContextType {
  activeCall: CallRoom | null;
  callStatus: CallStatus | null;
  callDuration: number;
  callDurationFormatted: string;
  callType: CallType;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isMuted: boolean;
  isCameraOff: boolean;
  isScreenSharing: boolean;
  isSpeakerOn: boolean;
  incomingCall: CallRoom | null;
  isChatDrawerOpen: boolean;
  error: string | null;
  callLink: string;
  startCall: (targetUser: UserProfile, type: CallType, existingRoomId?: string) => Promise<void>;
  acceptIncomingCall: () => Promise<void>;
  declineIncomingCall: () => Promise<void>;
  endCurrentCall: () => Promise<void>;
  toggleMute: () => void;
  toggleCamera: () => void;
  flipCamera: () => Promise<void>;
  toggleScreenShare: () => Promise<void>;
  toggleSpeaker: () => void;
  setChatDrawerOpen: (open: boolean) => void;
  clearError: () => void;
}

const CallContext = createContext<CallContextType | undefined>(undefined);

export const CallProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();

  const [activeCall, setActiveCall] = useState<CallRoom | null>(null);
  const [callStatus, setCallStatus] = useState<CallStatus | null>(null);
  const [callType, setCallType] = useState<CallType>('audio');
  const [callDuration, setCallDuration] = useState(0);

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);

  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);

  const [incomingCall, setIncomingCall] = useState<CallRoom | null>(null);
  const [isChatDrawerOpen, setChatDrawerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const webrtcRef = useRef<WebRTCService | null>(null);
  const timerRef = useRef<number | null>(null);
  const unansweredTimerRef = useRef<number | null>(null);
  const processedCandidatesRef = useRef<Set<string>>(new Set());
  const currentRoomIdRef = useRef<string | null>(null);

  const activeCallRef = useRef<CallRoom | null>(null);
  activeCallRef.current = activeCall;

  const userRef = useRef<UserProfile | null>(null);
  userRef.current = user;

  const callDurationRef = useRef<number>(0);
  callDurationRef.current = callDuration;

  // Format MM:SS duration
  const formatDuration = (totalSeconds: number): string => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const clearError = () => setError(null);

  // Initialize WebRTC instance
  const getOrCreateWebRTC = useCallback(() => {
    if (!webrtcRef.current) {
      webrtcRef.current = new WebRTCService({
        onRemoteStream: (stream) => {
          setRemoteStream(stream);
        },
        onConnectionStateChange: (state) => {
          if (state === 'connected') {
            setCallStatus('connected');
            soundService.stopAllSounds();
            soundService.playConnectedChime();
          } else if (state === 'disconnected' || state === 'failed') {
            setCallStatus((prev) => (prev === 'connected' ? 'reconnecting' : 'failed'));
          }
        },
        onError: (err) => {
          setError(err);
        },
      });
    }
    return webrtcRef.current;
  }, []);

  // Timer loop for call duration
  useEffect(() => {
    if (callStatus === 'connected') {
      if (unansweredTimerRef.current) {
        clearTimeout(unansweredTimerRef.current);
        unansweredTimerRef.current = null;
      }
      timerRef.current = window.setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [callStatus]);

  // Clean end call helper - stable callback reference with zero cycle dependencies
  const cleanUpCall = useCallback(async (finalStatus: CallStatus = 'ended') => {
    soundService.stopAllSounds();
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (unansweredTimerRef.current) {
      clearTimeout(unansweredTimerRef.current);
      unansweredTimerRef.current = null;
    }

    const currentActiveCall = activeCallRef.current;
    const currentUser = userRef.current;

    if (currentActiveCall && currentUser) {
      const durationSeconds = callDurationRef.current;
      // Record history
      await CallService.recordCallHistory({
        callerId: currentActiveCall.callerId,
        receiverId: currentActiveCall.receiverId,
        callerName: currentActiveCall.callerName,
        callerPhoto: currentActiveCall.callerPhoto,
        receiverName: currentActiveCall.receiverName,
        receiverPhoto: currentActiveCall.receiverPhoto,
        type: currentActiveCall.callType,
        status: finalStatus,
        startedAt: currentActiveCall.createdAt,
        endedAt: Date.now(),
        duration: durationSeconds,
      }).catch(console.error);

      // Update room in Firestore
      await CallService.updateCallStatus(currentActiveCall.roomId, finalStatus, durationSeconds).catch(console.error);

      // Mark user no longer in call
      await AuthService.setUserCallStatus(currentUser.userId, false).catch(console.error);
    }

    if (webrtcRef.current) {
      webrtcRef.current.endCall();
      webrtcRef.current = null;
    }

    setLocalStream(null);
    setRemoteStream(null);
    setActiveCall(null);
    setCallStatus(null);
    setCallDuration(0);
    setIsMuted(false);
    setIsCameraOff(false);
    setIsScreenSharing(false);
    setChatDrawerOpen(false);
    processedCandidatesRef.current.clear();
  }, []);

  // Listen for incoming calls - ONLY depends on user ID
  useEffect(() => {
    if (!user?.userId) return;

    const unsub = CallService.subscribeToIncomingCalls(user.userId, (room) => {
      if (room && !activeCallRef.current) {
        setIncomingCall((prev) => {
          if (prev?.roomId === room.roomId && prev?.status === room.status) {
            return prev;
          }
          soundService.playIncomingRing();
          NotificationService.notifyIncomingCall(room.callerName, room.callType);
          return room;
        });
      } else if (!room) {
        setIncomingCall((prev) => {
          if (!prev) return null;
          soundService.stopAllSounds();
          return null;
        });
      }
    });

    return () => unsub();
  }, [user?.userId]);

  // Start outgoing call
  const startCall = async (targetUser: UserProfile, type: CallType, existingRoomId?: string) => {
    if (!user) {
      setError('Please log in to make a call.');
      return;
    }

    // Check if user is already in a call or target is busy
    if (activeCall) {
      setError('You are already on an active call.');
      return;
    }

    if (targetUser.inCall) {
      setError(`${targetUser.name} is currently on another call.`);
      return;
    }

    try {
      setCallType(type);
      setCallStatus('calling');
      setCallDuration(0);
      setIsMuted(false);
      setIsCameraOff(false);
      setIsScreenSharing(false);
      setError(null);

      const webrtc = getOrCreateWebRTC();

      // 1. Request local media stream (real hardware camera / microphone)
      const stream = await webrtc.getLocalStream(type === 'video', true);
      setLocalStream(stream);

      // 2. Create SDP Offer
      const offer = await webrtc.createOffer();

      // 3. Create Room document in Firestore
      const room = await CallService.initiateCall(user, targetUser, type, offer, existingRoomId);
      currentRoomIdRef.current = room.roomId;
      setActiveCall(room);
      await AuthService.setUserCallStatus(user.userId, true, room.roomId);

      // 4. Attach ICE candidate callback to stream to Firestore
      webrtc.setCallbacks({
        onIceCandidate: (candidate) => {
          if (room.roomId) {
            CallService.addIceCandidate(room.roomId, candidate, true);
          }
        },
      });

      // 5. Unanswered call timeout (40 seconds) -> marks as Missed Call
      unansweredTimerRef.current = window.setTimeout(async () => {
        if (callStatus === 'calling' || callStatus === 'ringing') {
          NotificationService.notifyMissedCall(targetUser.name, type);
          await cleanUpCall('missed');
          setError('No answer. Call marked as missed.');
        }
      }, 40000);
    } catch (err: unknown) {
      const errorObj = err as Error;
      console.error('Call initiation failed:', errorObj);
      setError(errorObj.message || 'Failed to start call. Ensure camera/microphone permissions are granted.');
      soundService.stopAllSounds();
      setCallStatus(null);
      setActiveCall(null);
      if (webrtcRef.current) {
        webrtcRef.current.endCall();
        webrtcRef.current = null;
      }
    }
  };

  // Accept incoming call
  const acceptIncomingCall = async () => {
    if (!incomingCall || !user) return;

    soundService.stopAllSounds();
    const room = incomingCall;
    setIncomingCall(null);

    try {
      setCallType(room.callType);
      setActiveCall(room);
      setCallStatus('connecting');
      setCallDuration(0);
      setError(null);

      const webrtc = getOrCreateWebRTC();

      // 1. Request microphone / camera
      const stream = await webrtc.getLocalStream(room.callType === 'video', true);
      setLocalStream(stream);

      // 2. Set ICE candidate callback for receiver
      webrtc.setCallbacks({
        onIceCandidate: (candidate) => {
          CallService.addIceCandidate(room.roomId, candidate, false);
        },
      });

      // 3. Create SDP Answer
      if (!room.offer) {
        throw new Error('Call offer was missing from the room.');
      }
      const answer = await webrtc.createAnswer(room.offer);

      // 4. Send Answer to Firestore
      await CallService.answerCall(room.roomId, answer);
      await AuthService.setUserCallStatus(user.userId, true, room.roomId);

      // Process any caller ICE candidates that arrived early
      if (room.callerCandidates) {
        for (const c of room.callerCandidates) {
          const key = c.candidate;
          if (!processedCandidatesRef.current.has(key)) {
            processedCandidatesRef.current.add(key);
            await webrtc.addIceCandidate(c as unknown as RTCIceCandidateInit);
          }
        }
      }
    } catch (err: unknown) {
      const errorObj = err as Error;
      console.error('Failed to accept call:', errorObj);
      setError(errorObj.message || 'Could not connect the call.');
      await cleanUpCall('failed');
    }
  };

  // Decline incoming call
  const declineIncomingCall = async () => {
    if (!incomingCall) return;
    soundService.stopAllSounds();
    const room = incomingCall;
    setIncomingCall(null);

    await CallService.updateCallStatus(room.roomId, 'declined');
    await CallService.recordCallHistory({
      callerId: room.callerId,
      receiverId: room.receiverId,
      callerName: room.callerName,
      callerPhoto: room.callerPhoto,
      receiverName: room.receiverName,
      receiverPhoto: room.receiverPhoto,
      type: room.callType,
      status: 'declined',
      startedAt: room.createdAt,
      endedAt: Date.now(),
      duration: 0,
    }).catch(console.error);
  };

  // End active call
  const endCurrentCall = async () => {
    await cleanUpCall('ended');
  };

  // Listen to active Call Room updates (for Answer, ICE Candidates, and remote Hangup)
  useEffect(() => {
    if (!activeCall?.roomId || !user) return;

    const unsub = CallService.subscribeToCallRoom(activeCall.roomId, async (room) => {
      if (!room) {
        await cleanUpCall('ended');
        return;
      }

      // Check if remote user ended or declined the call
      if (['ended', 'declined', 'missed', 'busy', 'failed'].includes(room.status)) {
        await cleanUpCall(room.status);
        if (room.status === 'declined') {
          setError('Call was declined.');
        } else if (room.status === 'busy') {
          setError('User is currently on another call.');
        }
        return;
      }

      // Caller side: handle incoming SDP answer from receiver
      if (room.callerId === user.userId && room.answer && webrtcRef.current) {
        if (unansweredTimerRef.current) {
          clearTimeout(unansweredTimerRef.current);
          unansweredTimerRef.current = null;
        }
        await webrtcRef.current.handleAnswer(room.answer);
        setCallStatus((prev) => (prev !== 'connected' ? 'connected' : prev));
        soundService.stopAllSounds();
      }

      // Handle exchange of ICE candidates
      const isCaller = room.callerId === user.userId;
      const remoteCandidates = isCaller ? room.receiverCandidates : room.callerCandidates;

      if (remoteCandidates && webrtcRef.current) {
        for (const candidate of remoteCandidates) {
          const key = candidate.candidate;
          if (!processedCandidatesRef.current.has(key)) {
            processedCandidatesRef.current.add(key);
            await webrtcRef.current.addIceCandidate(candidate as unknown as RTCIceCandidateInit);
          }
        }
      }
    });

    return () => unsub();
  }, [activeCall?.roomId, user?.userId, cleanUpCall]);

  // Controls: Mute
  const toggleMute = () => {
    if (!webrtcRef.current) return;
    const newState = webrtcRef.current.toggleMicrophone();
    setIsMuted(!newState);
  };

  // Controls: Camera
  const toggleCamera = () => {
    if (!webrtcRef.current) return;
    const newState = webrtcRef.current.toggleCamera();
    setIsCameraOff(!newState);
  };

  // Controls: Mobile Front / Rear Camera Flip
  const flipCamera = async () => {
    if (!webrtcRef.current) return;
    try {
      const newTrack = await webrtcRef.current.switchCameraFacing();
      if (newTrack && localStream) {
        setLocalStream(new MediaStream(localStream.getTracks()));
      }
    } catch (err) {
      console.warn('Flip camera error:', err);
    }
  };

  // Controls: Screen Share
  const toggleScreenShare = async () => {
    if (!webrtcRef.current) return;
    try {
      if (isScreenSharing) {
        await webrtcRef.current.stopScreenShare();
        setIsScreenSharing(false);
      } else {
        const stream = await webrtcRef.current.startScreenShare(() => {
          setIsScreenSharing(false);
        });
        setLocalStream(stream);
        setIsScreenSharing(true);
      }
    } catch (err: unknown) {
      const errorObj = err as Error;
      if (errorObj.name !== 'NotAllowedError') {
        setError(errorObj.message || 'Screen sharing failed.');
      }
    }
  };

  // Controls: Speaker
  const toggleSpeaker = () => {
    setIsSpeakerOn((prev) => !prev);
  };

  const callLink = activeCall?.roomId
    ? `${window.location.origin}/call/${activeCall.roomId}`
    : '';

  return (
    <CallContext.Provider
      value={{
        activeCall,
        callStatus,
        callDuration,
        callDurationFormatted: formatDuration(callDuration),
        callType,
        localStream,
        remoteStream,
        isMuted,
        isCameraOff,
        isScreenSharing,
        isSpeakerOn,
        incomingCall,
        isChatDrawerOpen,
        error,
        callLink,
        startCall,
        acceptIncomingCall,
        declineIncomingCall,
        endCurrentCall,
        toggleMute,
        toggleCamera,
        flipCamera,
        toggleScreenShare,
        toggleSpeaker,
        setChatDrawerOpen,
        clearError,
      }}
    >
      {children}
    </CallContext.Provider>
  );
};

export const useCall = () => {
  const context = useContext(CallContext);
  if (!context) {
    throw new Error('useCall must be used within a CallProvider');
  }
  return context;
};
