import React, { useState } from 'react';
import type { CallType } from '../types/call';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Volume2,
  VolumeX,
  MonitorUp,
  MonitorOff,
  MessageSquare,
  PhoneOff,
  Share2,
  RotateCcw,
  Check,
} from 'lucide-react';

interface CallControlsProps {
  callType: CallType;
  isMuted: boolean;
  isCameraOff: boolean;
  isScreenSharing: boolean;
  isSpeakerOn: boolean;
  isChatOpen: boolean;
  callLink: string;
  onToggleMute: () => void;
  onToggleCamera: () => void;
  onFlipCamera?: () => void;
  onToggleScreenShare: () => void;
  onToggleSpeaker: () => void;
  onToggleChat: () => void;
  onEndCall: () => void;
}

export const CallControls: React.FC<CallControlsProps> = ({
  callType,
  isMuted,
  isCameraOff,
  isScreenSharing,
  isSpeakerOn,
  isChatOpen,
  callLink,
  onToggleMute,
  onToggleCamera,
  onFlipCamera,
  onToggleScreenShare,
  onToggleSpeaker,
  onToggleChat,
  onEndCall,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = async () => {
    if (!callLink) return;
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Join my ConnectCall session',
          text: 'Join my WebRTC call on ConnectCall:',
          url: callLink,
        });
      } else {
        await navigator.clipboard.writeText(callLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (_) {
      await navigator.clipboard.writeText(callLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="flex items-center justify-center gap-1.5 sm:gap-3 px-2.5 sm:px-4 py-2 sm:py-3 bg-slate-900/95 backdrop-blur-md rounded-2xl sm:rounded-3xl border border-slate-800 shadow-2xl max-w-[96vw] overflow-x-auto">
      {/* Microphone Mute / Unmute */}
      <button
        onClick={onToggleMute}
        title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
        className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center transition-all cursor-pointer shrink-0 ${
          isMuted
            ? 'bg-rose-600/90 text-white hover:bg-rose-500'
            : 'bg-slate-800 text-slate-100 hover:bg-slate-700'
        }`}
      >
        {isMuted ? <MicOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Mic className="w-4 h-4 sm:w-5 sm:h-5" />}
      </button>

      {/* Camera On / Off (if Video call) */}
      {callType === 'video' && (
        <>
          <button
            onClick={onToggleCamera}
            title={isCameraOff ? 'Turn Camera On' : 'Turn Camera Off'}
            className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center transition-all cursor-pointer shrink-0 ${
              isCameraOff
                ? 'bg-rose-600/90 text-white hover:bg-rose-500'
                : 'bg-slate-800 text-slate-100 hover:bg-slate-700'
            }`}
          >
            {isCameraOff ? <VideoOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Video className="w-4 h-4 sm:w-5 sm:h-5" />}
          </button>

          {/* Flip Front / Back Camera (Mobile) */}
          {onFlipCamera && !isCameraOff && (
            <button
              onClick={onFlipCamera}
              title="Flip Camera (Front / Rear)"
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center transition-all cursor-pointer shrink-0 bg-slate-800 text-slate-100 hover:bg-slate-700 active:scale-95"
            >
              <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          )}
        </>
      )}

      {/* Screen Share (video call only) */}
      {callType === 'video' && (
        <button
          onClick={onToggleScreenShare}
          title={isScreenSharing ? 'Stop Screen Share' : 'Share Screen'}
          className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center transition-all cursor-pointer shrink-0 ${
            isScreenSharing
              ? 'bg-sky-500 text-white hover:bg-sky-400'
              : 'bg-slate-800 text-slate-100 hover:bg-slate-700'
          }`}
        >
          {isScreenSharing ? <MonitorOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <MonitorUp className="w-4 h-4 sm:w-5 sm:h-5" />}
        </button>
      )}

      {/* Speaker Output toggle */}
      <button
        onClick={onToggleSpeaker}
        title={isSpeakerOn ? 'Speaker On' : 'Speaker Off'}
        className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center transition-all cursor-pointer shrink-0 ${
          isSpeakerOn
            ? 'bg-slate-800 text-slate-100 hover:bg-slate-700'
            : 'bg-amber-600 text-white hover:bg-amber-500'
        }`}
      >
        {isSpeakerOn ? <Volume2 className="w-4 h-4 sm:w-5 sm:h-5" /> : <VolumeX className="w-4 h-4 sm:w-5 sm:h-5" />}
      </button>

      {/* In-Call Chat Drawer Toggle */}
      <button
        onClick={onToggleChat}
        title={isChatOpen ? 'Close Chat' : 'Open In-Call Chat'}
        className={`w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl flex items-center justify-center transition-all cursor-pointer shrink-0 ${
          isChatOpen
            ? 'bg-sky-500 text-white hover:bg-sky-400'
            : 'bg-slate-800 text-slate-100 hover:bg-slate-700'
        }`}
      >
        <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5" />
      </button>

      {/* Copy / Share Call Link */}
      {callLink && (
        <button
          onClick={handleCopyLink}
          title="Share Call Link"
          className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-slate-800 text-slate-100 hover:bg-slate-700 flex items-center justify-center transition-all cursor-pointer shrink-0"
        >
          {copied ? <Check className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" /> : <Share2 className="w-4 h-4 sm:w-5 sm:h-5" />}
        </button>
      )}

      {/* End Call Button */}
      <button
        onClick={onEndCall}
        title="End Call"
        className="w-12 sm:w-14 h-10 sm:h-12 rounded-xl sm:rounded-2xl bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all cursor-pointer ml-1 shrink-0"
      >
        <PhoneOff className="w-5 h-5 sm:w-6 sm:h-6" />
      </button>
    </div>
  );
};
