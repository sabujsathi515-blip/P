import React, { useEffect, useState } from 'react';
import type { CallRecord, CallType } from '../types/call';
import type { UserProfile } from '../types/user';
import { CallService } from '../services/callService';
import {
  Phone,
  Video,
  PhoneIncoming,
  PhoneOutgoing,
  PhoneMissed,
  Clock,
  RotateCcw,
} from 'lucide-react';

interface CallHistoryProps {
  currentUserId: string;
  allUsers: UserProfile[];
  onCallUser: (user: UserProfile, type: CallType) => void;
}

export const CallHistory: React.FC<CallHistoryProps> = ({
  currentUserId,
  allUsers,
  onCallUser,
}) => {
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = CallService.subscribeToCallHistory(
      currentUserId,
      (records) => {
        setCalls(records);
        setLoading(false);
      },
      () => {
        setLoading(false);
      }
    );

    return () => unsub();
  }, [currentUserId]);

  const formatDuration = (seconds: number) => {
    if (!seconds || seconds <= 0) return '0s';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    if (m === 0) return `${s}s`;
    return `${m}m ${s}s`;
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (timestamp: number) => {
    const d = new Date(timestamp);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) return 'Today';
    const yesterday = new Date();
    yesterday.setDate(now.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">Call History</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Recent incoming, outgoing, and missed calls
          </p>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/50 p-2">
        {loading ? (
          <div className="p-10 text-center text-xs text-slate-400">Loading call history...</div>
        ) : calls.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center text-slate-400">
            <Clock className="w-12 h-12 mb-3 opacity-40" />
            <p className="text-sm font-semibold">No recent calls</p>
            <p className="text-xs text-slate-500 mt-1 max-w-xs">
              When you make or receive audio and video calls, your call log will appear here.
            </p>
          </div>
        ) : (
          calls.map((call) => {
            const isOutgoing = call.callerId === currentUserId;
            const otherUserId = isOutgoing ? call.receiverId : call.callerId;
            const otherName = isOutgoing ? call.receiverName : call.callerName;
            const otherPhoto = isOutgoing ? call.receiverPhoto : call.callerPhoto;
            const isMissed = call.status === 'missed' || call.status === 'declined';

            // Find full user profile if available
            const partnerUser = allUsers.find((u) => u.userId === otherUserId) || {
              userId: otherUserId,
              name: otherName,
              email: '',
              photoURL: otherPhoto,
              online: false,
              lastSeen: 0,
            };

            return (
              <div
                key={call.callId}
                className="flex items-center justify-between p-3.5 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
              >
                {/* Contact & Status */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative shrink-0">
                    {otherPhoto ? (
                      <img
                        src={otherPhoto}
                        alt={otherName}
                        className="w-11 h-11 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-xs">
                        {otherName.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>

                  <div className="min-w-0">
                    <h3
                      className={`font-semibold text-sm truncate ${
                        isMissed ? 'text-rose-600 dark:text-rose-400' : 'text-slate-800 dark:text-slate-100'
                      }`}
                    >
                      {otherName}
                    </h3>

                    <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {isOutgoing ? (
                        <PhoneOutgoing className="w-3.5 h-3.5 text-sky-500" />
                      ) : isMissed ? (
                        <PhoneMissed className="w-3.5 h-3.5 text-rose-500" />
                      ) : (
                        <PhoneIncoming className="w-3.5 h-3.5 text-emerald-500" />
                      )}

                      <span>
                        {formatDate(call.startedAt)} at {formatTime(call.startedAt)}
                      </span>

                      {call.duration > 0 && (
                        <>
                          <span>•</span>
                          <span>{formatDuration(call.duration)}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Call back action button */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => onCallUser(partnerUser, call.type)}
                    title={`Call again with ${call.type}`}
                    className="p-2 sm:px-3 sm:py-2 text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/50 hover:bg-sky-100 dark:hover:bg-sky-900/50 rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-sky-200 dark:border-sky-800/60 transition-colors cursor-pointer"
                  >
                    {call.type === 'video' ? (
                      <Video className="w-3.5 h-3.5" />
                    ) : (
                      <Phone className="w-3.5 h-3.5" />
                    )}
                    <span className="hidden sm:inline">Call Again</span>
                    <RotateCcw className="w-3 h-3 sm:hidden" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
