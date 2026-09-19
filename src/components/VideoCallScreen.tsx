import React, { useRef, useEffect } from 'react';
import type { CallRoom, CallStatus } from '../types/call';
import { CallControls } from './CallControls';
import { MicOff, VideoOff, Wifi, ShieldCheck, Monitor } from 'lucide-react';

interface VideoCallScreenProps {
  room: CallRoom;
  callStatus: CallStatus | null;
  callDurationFormatted: string;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isMuted: boolean;
  isCameraOff: boolean;
  isScreenSharing: boolean;
  isSpeakerOn: boolean;
  isChatOpen: boolean;
  callLink: string;
  currentUserName: string;
  onToggleMute: () => void;
  onToggleCamera: () => void;
  onToggleScreenShare: () => void;
  onToggleSpeaker: () => void;
  onToggleChat: () => void;
  onEndCall: () => void;
}

export const VideoCallScreen: React.FC<VideoCallScreenProps> = ({
  room,
  callStatus,
  callDurationFormatted,
  localStream,
  remoteStream,
  isMuted,
  isCameraOff,
  isScreenSharing,
  isSpeakerOn,
  isChatOpen,
  callLink,
  currentUserName,
  onToggleMute,
  onToggleCamera,
  onToggleScreenShare,
  onToggleSpeaker,
  onToggleChat,
  onEndCall,
}) => {
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);

  // Bind remote stream
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
      remoteVideoRef.current.play().catch((err) => console.warn('Remote video playback warning:', err));
    }
  }, [remoteStream]);

  // Bind local stream
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
      localVideoRef.current.play().catch((err) => console.warn('Local video playback warning:', err));
    }
  }, [localStream]);

  // Adjust speaker volume
  useEffect(() => {
    if (remoteVideoRef.current) {
      remoteVideoRef.current.muted = !isSpeakerOn;
    }
  }, [isSpeakerOn]);

  const partnerName = room.callerName;
  const partnerPhoto = room.callerPhoto;
  const isConnected = callStatus === 'connected';

  return (
    <div className="relative flex-1 flex flex-col h-full w-full bg-slate-950 overflow-hidden select-none">
      {/* REMOTE PARTICIPANT (Large Full Video) */}
      <div className="relative flex-1 w-full h-full flex items-center justify-center bg-slate-950">
        {remoteStream && remoteStream.getVideoTracks().length > 0 && isConnected ? (
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover sm:object-contain"
          />
        ) : (
          /* Placeholder avatar when remote video is not yet streaming or connecting */
          <div className="flex flex-col items-center justify-center p-6 text-center">
            <div className="relative mb-4">
              <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-full border-4 border-slate-700 p-1 flex items-center justify-center bg-slate-900">
                {partnerPhoto ? (
                  <img
                    src={partnerPhoto}
                    alt={partnerName}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full rounded-full bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white text-4xl font-bold">
                    {partnerName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">{partnerName}</h3>
            <p className="text-sm text-sky-400 mt-1 font-medium">
              {isConnected ? 'Camera is turned off' : `${callStatus || 'Connecting WebRTC...'}`}
            </p>
          </div>
        )}

        {/* Video Overlays (Top Header Info) */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-20 pointer-events-none">
          <div className="flex items-center gap-2 bg-slate-900/80 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-slate-700/60 text-white text-xs font-medium shadow-lg">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold">{partnerName}</span>
            <span>•</span>
            <span className="text-slate-300">{isConnected ? callDurationFormatted : 'Connecting...'}</span>
          </div>

          <div className="hidden sm:flex items-center gap-2 bg-slate-900/80 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-slate-700/60 text-slate-300 text-xs shadow-lg">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>P2P WebRTC HD</span>
            <span>•</span>
            <Wifi className="w-3.5 h-3.5 text-sky-400" />
            <span>{room.roomId}</span>
          </div>
        </div>

        {/* LOCAL PARTICIPANT (Small Floating Video) */}
        <div className="absolute bottom-24 right-4 sm:bottom-28 sm:right-6 w-28 h-36 sm:w-44 sm:h-56 rounded-2xl overflow-hidden shadow-2xl border-2 border-slate-700/80 bg-slate-900 z-20 group">
          {localStream && !isCameraOff ? (
            <video
              ref={localVideoRef}
              autoPlay
              muted
              playsInline
              className={`w-full h-full object-cover ${isScreenSharing ? '' : 'video-mirror'}`}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center bg-slate-800 text-white">
              <VideoOff className="w-6 h-6 text-slate-400 mb-1" />
              <span className="text-[11px] font-medium text-slate-300 truncate max-w-[90%]">
                {currentUserName}
              </span>
              <span className="text-[9px] text-slate-400">Camera Off</span>
            </div>
          )}

          {/* Floating Local Badges */}
          <div className="absolute top-2 left-2 flex items-center gap-1">
            {isScreenSharing && (
              <span
                title="Sharing Screen"
                className="p-1 rounded-md bg-sky-500/90 text-white text-[10px]"
              >
                <Monitor className="w-3 h-3" />
              </span>
            )}
            {isMuted && (
              <span
                title="Microphone muted"
                className="p-1 rounded-md bg-rose-600/90 text-white text-[10px]"
              >
                <MicOff className="w-3 h-3" />
              </span>
            )}
          </div>

          <div className="absolute bottom-1 left-2 text-[10px] font-semibold text-white/90 drop-shadow-md">
            You
          </div>
        </div>
      </div>

      {/* BOTTOM CALL CONTROLS */}
      <div className="absolute bottom-4 left-0 right-0 flex justify-center z-30 px-4">
        <CallControls
          callType="video"
          isMuted={isMuted}
          isCameraOff={isCameraOff}
          isScreenSharing={isScreenSharing}
          isSpeakerOn={isSpeakerOn}
          isChatOpen={isChatOpen}
          callLink={callLink}
          onToggleMute={onToggleMute}
          onToggleCamera={onToggleCamera}
          onToggleScreenShare={onToggleScreenShare}
          onToggleSpeaker={onToggleSpeaker}
          onToggleChat={onToggleChat}
          onEndCall={onEndCall}
        />
      </div>
    </div>
  );
};
