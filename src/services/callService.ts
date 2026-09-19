import {
  collection,
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  updateDoc,
  query,
  where,
  orderBy,
  arrayUnion,
  limit,
} from 'firebase/firestore';
import { db, isFirebaseConfigured, handleFirestoreError, OperationType } from './firebase';
import type { CallRoom, CallRecord, CallType, CallStatus, IceCandidateItem } from '../types/call';
import type { UserProfile } from '../types/user';
import { soundService } from './soundService';

const LOCAL_STORAGE_CALL_ROOMS = 'connectcall_demo_call_rooms';
const LOCAL_STORAGE_CALL_HISTORY = 'connectcall_demo_calls';

export const generateCallRoomId = (): string => {
  const chars = '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let randomStr = '';
  for (let i = 0; i < 6; i++) {
    randomStr += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `CONNECTCALL-${randomStr}`;
};

export class CallService {
  // Generate and create a new call room
  public static async initiateCall(
    caller: UserProfile,
    receiver: UserProfile,
    type: CallType,
    offer?: RTCSessionDescriptionInit,
    customRoomId?: string
  ): Promise<CallRoom> {
    const roomId = customRoomId || generateCallRoomId();

    const roomData: CallRoom = {
      roomId,
      callerId: caller.userId,
      receiverId: receiver.userId,
      callerName: caller.name,
      callerPhoto: caller.photoURL,
      receiverName: receiver.name,
      receiverPhoto: receiver.photoURL,
      callType: type,
      offer: offer ? { type: offer.type, sdp: offer.sdp } : undefined,
      status: 'calling',
      createdAt: Date.now(),
      callerCandidates: [],
      receiverCandidates: [],
    };

    if (isFirebaseConfigured() && db) {
      try {
        await setDoc(doc(db, 'callRooms', roomId), roomData);
        soundService.playOutgoingRing();
        return roomData;
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `callRooms/${roomId}`);
      }
    } else {
      // Demo Mode: store in localStorage and dispatch event for cross-tab communication
      const rooms: Record<string, CallRoom> = JSON.parse(
        localStorage.getItem(LOCAL_STORAGE_CALL_ROOMS) || '{}'
      );
      rooms[roomId] = roomData;
      localStorage.setItem(LOCAL_STORAGE_CALL_ROOMS, JSON.stringify(rooms));
      window.dispatchEvent(new CustomEvent('connectcall_demo_room_update', { detail: roomData }));
      window.dispatchEvent(new StorageEvent('storage', { key: LOCAL_STORAGE_CALL_ROOMS }));
      soundService.playOutgoingRing();
      return roomData;
    }
  }

  // Subscribe to updates for a specific call room
  public static subscribeToCallRoom(
    roomId: string,
    onUpdate: (room: CallRoom | null) => void,
    onError?: (err: Error) => void
  ): () => void {
    if (isFirebaseConfigured() && db) {
      return onSnapshot(
        doc(db, 'callRooms', roomId),
        (snap) => {
          if (snap.exists()) {
            onUpdate(snap.data() as CallRoom);
          } else {
            onUpdate(null);
          }
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, `callRooms/${roomId}`);
          onError?.(error);
        }
      );
    } else {
      // Demo mode
      const check = () => {
        const rooms: Record<string, CallRoom> = JSON.parse(
          localStorage.getItem(LOCAL_STORAGE_CALL_ROOMS) || '{}'
        );
        onUpdate(rooms[roomId] || null);
      };

      check();
      const handler = () => check();
      window.addEventListener('connectcall_demo_room_update', handler);
      window.addEventListener('storage', handler);

      return () => {
        window.removeEventListener('connectcall_demo_room_update', handler);
        window.removeEventListener('storage', handler);
      };
    }
  }

  // Listen for incoming calls targeted to current user
  public static subscribeToIncomingCalls(
    currentUserId: string,
    onIncomingCall: (room: CallRoom | null) => void
  ): () => void {
    if (isFirebaseConfigured() && db) {
      const q = query(
        collection(db, 'callRooms'),
        where('receiverId', '==', currentUserId),
        where('status', 'in', ['calling', 'ringing']),
        limit(1)
      );

      return onSnapshot(q, (snapshot) => {
        if (!snapshot.empty) {
          const docSnap = snapshot.docs[0];
          const room = docSnap.data() as CallRoom;
          // Only trigger if created within the last 45 seconds (avoids stale ghost calls)
          if (Date.now() - room.createdAt < 45000) {
            onIncomingCall(room);
            return;
          }
        }
        onIncomingCall(null);
      });
    } else {
      // Demo mode cross-tab checking
      const check = () => {
        const rooms: Record<string, CallRoom> = JSON.parse(
          localStorage.getItem(LOCAL_STORAGE_CALL_ROOMS) || '{}'
        );
        const incoming = Object.values(rooms).find(
          (r) =>
            r.receiverId === currentUserId &&
            (r.status === 'calling' || r.status === 'ringing') &&
            Date.now() - r.createdAt < 45000
        );
        onIncomingCall(incoming || null);
      };

      check();
      const handler = () => check();
      window.addEventListener('connectcall_demo_room_update', handler);
      window.addEventListener('storage', handler);

      return () => {
        window.removeEventListener('connectcall_demo_room_update', handler);
        window.removeEventListener('storage', handler);
      };
    }
  }

  // Answer a call
  public static async answerCall(
    roomId: string,
    answer: RTCSessionDescriptionInit
  ): Promise<void> {
    const patch = {
      answer: { type: answer.type, sdp: answer.sdp },
      status: 'connected' as CallStatus,
      connectedAt: Date.now(),
    };

    if (isFirebaseConfigured() && db) {
      try {
        await updateDoc(doc(db, 'callRooms', roomId), patch);
        soundService.stopAllSounds();
        soundService.playConnectedChime();
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `callRooms/${roomId}`);
      }
    } else {
      const rooms: Record<string, CallRoom> = JSON.parse(
        localStorage.getItem(LOCAL_STORAGE_CALL_ROOMS) || '{}'
      );
      if (rooms[roomId]) {
        rooms[roomId] = { ...rooms[roomId], ...patch };
        localStorage.setItem(LOCAL_STORAGE_CALL_ROOMS, JSON.stringify(rooms));
        window.dispatchEvent(new CustomEvent('connectcall_demo_room_update', { detail: rooms[roomId] }));
        window.dispatchEvent(new StorageEvent('storage', { key: LOCAL_STORAGE_CALL_ROOMS }));
      }
      soundService.stopAllSounds();
      soundService.playConnectedChime();
    }
  }

  // Add ICE Candidate
  public static async addIceCandidate(
    roomId: string,
    candidate: RTCIceCandidate,
    isCaller: boolean
  ): Promise<void> {
    const item: IceCandidateItem = {
      candidate: candidate.candidate,
      sdpMid: candidate.sdpMid,
      sdpMLineIndex: candidate.sdpMLineIndex,
      usernameFragment: candidate.usernameFragment,
    };

    if (isFirebaseConfigured() && db) {
      try {
        await updateDoc(doc(db, 'callRooms', roomId), {
          [isCaller ? 'callerCandidates' : 'receiverCandidates']: arrayUnion(item),
        });
      } catch (err) {
        console.warn('Failed to add candidate to Firestore', err);
      }
    } else {
      const rooms: Record<string, CallRoom> = JSON.parse(
        localStorage.getItem(LOCAL_STORAGE_CALL_ROOMS) || '{}'
      );
      if (rooms[roomId]) {
        const key = isCaller ? 'callerCandidates' : 'receiverCandidates';
        rooms[roomId][key] = rooms[roomId][key] || [];
        rooms[roomId][key]!.push(item);
        localStorage.setItem(LOCAL_STORAGE_CALL_ROOMS, JSON.stringify(rooms));
        window.dispatchEvent(new CustomEvent('connectcall_demo_room_update', { detail: rooms[roomId] }));
        window.dispatchEvent(new StorageEvent('storage', { key: LOCAL_STORAGE_CALL_ROOMS }));
      }
    }
  }

  // Update Call Status (e.g., ringing, connecting, ended, declined, busy)
  public static async updateCallStatus(
    roomId: string,
    status: CallStatus,
    duration: number = 0
  ): Promise<void> {
    const endedAt = Date.now();
    const patch: Partial<CallRoom> = {
      status,
      endedAt,
      duration,
    };

    if (isFirebaseConfigured() && db) {
      try {
        await updateDoc(doc(db, 'callRooms', roomId), patch);
      } catch (err) {
        console.warn('Failed to update call status:', err);
      }
    } else {
      const rooms: Record<string, CallRoom> = JSON.parse(
        localStorage.getItem(LOCAL_STORAGE_CALL_ROOMS) || '{}'
      );
      if (rooms[roomId]) {
        rooms[roomId] = { ...rooms[roomId], ...patch };
        localStorage.setItem(LOCAL_STORAGE_CALL_ROOMS, JSON.stringify(rooms));
        window.dispatchEvent(new CustomEvent('connectcall_demo_room_update', { detail: rooms[roomId] }));
        window.dispatchEvent(new StorageEvent('storage', { key: LOCAL_STORAGE_CALL_ROOMS }));
      }
    }

    if (status === 'ended' || status === 'declined' || status === 'missed' || status === 'failed') {
      soundService.stopAllSounds();
      soundService.playEndTone();
    }
  }

  // Save completed/missed call record into call history
  public static async recordCallHistory(record: Omit<CallRecord, 'callId'>): Promise<CallRecord> {
    const callId = 'call_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const fullRecord: CallRecord = {
      callId,
      ...record,
    };

    if (isFirebaseConfigured() && db) {
      try {
        await setDoc(doc(db, 'calls', callId), fullRecord);
        return fullRecord;
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `calls/${callId}`);
      }
    } else {
      const history: CallRecord[] = JSON.parse(
        localStorage.getItem(LOCAL_STORAGE_CALL_HISTORY) || '[]'
      );
      history.unshift(fullRecord);
      localStorage.setItem(LOCAL_STORAGE_CALL_HISTORY, JSON.stringify(history));
      window.dispatchEvent(new CustomEvent('connectcall_demo_calls_updated'));
      return fullRecord;
    }
  }

  // Subscribe to call history for a user
  public static subscribeToCallHistory(
    userId: string,
    onHistory: (records: CallRecord[]) => void,
    onError?: (err: Error) => void
  ): () => void {
    if (isFirebaseConfigured() && db) {
      // Query where callerId or receiverId is userId
      const q = query(
        collection(db, 'calls'),
        where('callerId', '==', userId),
        orderBy('startedAt', 'desc'),
        limit(50)
      );

      const q2 = query(
        collection(db, 'calls'),
        where('receiverId', '==', userId),
        orderBy('startedAt', 'desc'),
        limit(50)
      );

      // Merge snapshots
      let callerCalls: CallRecord[] = [];
      let receiverCalls: CallRecord[] = [];

      const notify = () => {
        const map = new Map<string, CallRecord>();
        [...callerCalls, ...receiverCalls].forEach((c) => map.set(c.callId, c));
        const merged = Array.from(map.values()).sort((a, b) => b.startedAt - a.startedAt);
        onHistory(merged);
      };

      const unsub1 = onSnapshot(
        q,
        (snap) => {
          callerCalls = snap.docs.map((d) => d.data() as CallRecord);
          notify();
        },
        (err) => {
          handleFirestoreError(err, OperationType.LIST, 'calls');
          onError?.(err);
        }
      );

      const unsub2 = onSnapshot(
        q2,
        (snap) => {
          receiverCalls = snap.docs.map((d) => d.data() as CallRecord);
          notify();
        },
        () => {}
      );

      return () => {
        unsub1();
        unsub2();
      };
    } else {
      const load = () => {
        const history: CallRecord[] = JSON.parse(
          localStorage.getItem(LOCAL_STORAGE_CALL_HISTORY) || '[]'
        );
        const userCalls = history.filter(
          (c) => c.callerId === userId || c.receiverId === userId
        );
        userCalls.sort((a, b) => b.startedAt - a.startedAt);
        onHistory(userCalls);
      };

      load();
      const handler = () => load();
      window.addEventListener('connectcall_demo_calls_updated', handler);
      window.addEventListener('storage', handler);

      return () => {
        window.removeEventListener('connectcall_demo_calls_updated', handler);
        window.removeEventListener('storage', handler);
      };
    }
  }

  // Get single call room by ID (for shareable URL /call/:roomId)
  public static async getCallRoom(roomId: string): Promise<CallRoom | null> {
    if (isFirebaseConfigured() && db) {
      try {
        const snap = await getDoc(doc(db, 'callRooms', roomId));
        if (snap.exists()) {
          return snap.data() as CallRoom;
        }
        return null;
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, `callRooms/${roomId}`);
      }
    } else {
      const rooms: Record<string, CallRoom> = JSON.parse(
        localStorage.getItem(LOCAL_STORAGE_CALL_ROOMS) || '{}'
      );
      return rooms[roomId] || null;
    }
  }
}
