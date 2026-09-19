import React from 'react';
import type { CallRoom } from '../types/call';
import { Phone, PhoneOff, Video } from 'lucide-react';

interface IncomingCallProps {
  room: CallRoom;
  onAccept: () => void;
  onDecline: () => void;
}

export const IncomingCall: React.FC<IncomingCallProps> = ({
  room,
  onAccept,
  onDecline,
}) => {
  const isVideo = room.callType === 'video';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 text-center shadow-2xl flex flex-col items-center">
        {/* Pulsing Avatar */}
        <div className="relative mb-6">
          <div className="animate-ring-pulse rounded-full">
            {room.callerPhoto ? (
              <img
                src={room.callerPhoto}
                alt={room.callerName}
                className="w-28 h-28 rounded-full object-cover border-4 border-sky-500 shadow-xl"
              />
            ) : (
              <div className="w-28 h-28 rounded-full bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white text-3xl font-bold shadow-xl border-4 border-sky-500">
                {room.callerName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          <div className="absolute -bottom-2 -right-2 p-2 rounded-full bg-sky-500 text-white shadow-md">
            {isVideo ? <Video className="w-5 h-5" /> : <Phone className="w-5 h-5" />}
          </div>
        </div>

        {/* Caller Name */}
        <h2 className="text-2xl font-bold text-white tracking-tight">{room.callerName}</h2>
        <p className="text-sm font-medium text-sky-400 mt-1">
          {isVideo ? 'Incoming Video Call...' : 'Incoming Audio Call...'}
        </p>
        <p className="text-xs text-slate-400 mt-1">ConnectCall Secure WebRTC</p>

        {/* Buttons: DECLINE vs ACCEPT */}
        <div className="flex items-center justify-center gap-6 mt-10 w-full">
          {/* Decline */}
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={onDecline}
              aria-label="Decline call"
              className="w-16 h-16 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all cursor-pointer"
            >
              <PhoneOff className="w-7 h-7" />
            </button>
            <span className="text-xs font-semibold text-rose-400 tracking-wide uppercase">Decline</span>
          </div>

          {/* Accept */}
          <div className="flex flex-col items-center gap-2">
            <button
              onClick={onAccept}
              aria-label="Accept call"
              className="w-16 h-16 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all cursor-pointer animate-bounce"
            >
              {isVideo ? <Video className="w-7 h-7" /> : <Phone className="w-7 h-7" />}
            </button>
            <span className="text-xs font-semibold text-emerald-400 tracking-wide uppercase">Accept</span>
          </div>
        </div>
      </div>
    </div>
  );
};
