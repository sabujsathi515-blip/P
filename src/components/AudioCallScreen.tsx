import React, { useRef, useEffect } from 'react';
import type { CallRoom, CallStatus } from '../types/call';
import { CallControls } from './CallControls';
import { MicOff, Wifi, ShieldCheck } from 'lucide-react';

interface AudioCallScreenProps {
  room: CallRoom;
  callStatus: CallStatus | null;
  callDurationFormatted: string;
  isMuted: boolean;
  isSpeakerOn: boolean;
  remoteStream: MediaStream | null;
  isChatOpen: boolean;
  callLink: string;
  onToggleMute: () => void;
  onToggleSpeaker: () => void;
  onToggleChat: () => void;
  onEndCall: () => void;
}

export const AudioCallScreen: React.FC<AudioCallScreenProps> = ({
  room,
  callStatus,
  callDurationFormatted,
  isMuted,
  isSpeakerOn,
  remoteStream,
  isChatOpen,
  callLink,
  onToggleMute,
  onToggleSpeaker,
  onToggleChat,
  onEndCall,
}) => {
  const audioRef = useRef<HTMLAudioElement>(null);

  // Bind remote audio stream to HTML5 audio element
  useEffect(() => {
    if (audioRef.current && remoteStream) {
      audioRef.current.srcObject = remoteStream;
      audioRef.current.play().catch((err) => console.warn('Audio autoplay prevented:', err));
    }
  }, [remoteStream]);

  // Adjust speaker output volume / muted state
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.muted = !isSpeakerOn;
    }
  }, [isSpeakerOn]);

  const partnerName = room.callerName;
  const partnerPhoto = room.callerPhoto;

  const renderStatusLabel = () => {
    switch (callStatus) {
      case 'calling':
        return 'Calling...';
      case 'ringing':
        return 'Ringing...';
      case 'connecting':
        return 'Connecting WebRTC...';
      case 'connected':
        return callDurationFormatted;
      case 'reconnecting':
        return 'Reconnecting...';
      case 'ended':
        return 'Call Ended';
      case 'declined':
        return 'Call Declined';
      case 'missed':
        return 'Missed Call';
      case 'failed':
        return 'Connection Failed';
      default:
        return 'Connecting...';
    }
  };

  return (
    <div className="relative flex flex-col items-center justify-between h-full w-full bg-radial from-slate-900 to-slate-950 text-white p-6 sm:p-10 select-none overflow-hidden">
      {/* Hidden audio element for remote audio stream playback */}
      <audio ref={audioRef} autoPlay playsInline />

      {/* Top Bar: Encrypted status & Room ID */}
      <div className="flex items-center justify-between w-full max-w-md text-xs text-slate-400">
        <div className="flex items-center gap-1.5 bg-slate-800/60 px-3 py-1.5 rounded-full border border-slate-700/50">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Encrypted Audio</span>
        </div>
        <div className="flex items-center gap-1.5 bg-slate-800/60 px-3 py-1.5 rounded-full border border-slate-700/50">
          <Wifi className="w-3.5 h-3.5 text-sky-400" />
          <span>{room.roomId}</span>
        </div>
      </div>

      {/* Central Profile & Ringing Wave */}
      <div className="flex flex-col items-center my-auto">
        <div className="relative mb-6">
          <div
            className={`w-36 h-36 sm:w-44 sm:h-44 rounded-full p-1.5 flex items-center justify-center transition-all ${
              callStatus === 'connected'
                ? 'border-4 border-emerald-500/80 shadow-[0_0_40px_rgba(16,185,129,0.3)]'
                : 'animate-ring-pulse border-4 border-sky-500'
            }`}
          >
            {partnerPhoto ? (
              <img
                src={partnerPhoto}
                alt={partnerName}
                className="w-full h-full rounded-full object-cover shadow-2xl"
              />
            ) : (
              <div className="w-full h-full rounded-full bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white text-5xl font-bold shadow-2xl">
                {partnerName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          {/* Muted mic badge indicator */}
          {isMuted && (
            <div
              title="Your microphone is muted"
              className="absolute bottom-2 right-2 p-2 rounded-full bg-rose-600 text-white shadow-lg border-2 border-slate-900"
            >
              <MicOff className="w-5 h-5" />
            </div>
          )}
        </div>

        <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">{partnerName}</h2>

        <div className="mt-2 text-sm font-semibold tracking-wider text-sky-400 uppercase bg-sky-950/60 px-4 py-1.5 rounded-full border border-sky-800/60">
          {renderStatusLabel()}
        </div>
      </div>

      {/* Bottom Controls Bar */}
      <div className="w-full max-w-md pb-4 sm:pb-6">
        <CallControls
          callType="audio"
          isMuted={isMuted}
          isCameraOff={false}
          isScreenSharing={false}
          isSpeakerOn={isSpeakerOn}
          isChatOpen={isChatOpen}
          callLink={callLink}
          onToggleMute={onToggleMute}
          onToggleCamera={() => {}}
          onToggleScreenShare={() => {}}
          onToggleSpeaker={onToggleSpeaker}
          onToggleChat={onToggleChat}
          onEndCall={onEndCall}
        />
      </div>
    </div>
  );
};
