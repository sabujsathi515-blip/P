import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import type { UserProfile } from '../types/user';
import type { CallType } from '../types/call';
import { soundService } from '../services/soundService';
import { NotificationService } from '../services/notificationService';
import {
  Smartphone,
  Phone,
  Video,
  Copy,
  Check,
  Share2,
  X,
  Volume2,
  Bell,
  BellRing,
  QrCode,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Users,
} from 'lucide-react';

interface CallAnotherMobileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  demoUsers: UserProfile[];
  onSwitchUser: (user: UserProfile) => void;
  onStartCall: (targetUser: UserProfile, type: CallType) => void;
}

export const CallAnotherMobileModal: React.FC<CallAnotherMobileModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  demoUsers,
  onSwitchUser,
  onStartCall,
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCallLink, setCopiedCallLink] = useState(false);
  const [testingSound, setTestingSound] = useState(false);
  const [notifPermission, setNotifPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );

  // Determine opposing mobile user (if current is Sarah, other is Alex; if current is Alex, other is Sarah)
  const otherUser = demoUsers.find((u) => u.userId !== currentUser.userId) || demoUsers[1] || demoUsers[0];

  const targetMobileParam = otherUser.userId === 'demo-user-2' ? 'demo-user-2' : otherUser.userId;
  const mobile2Url = typeof window !== 'undefined'
    ? `${window.location.origin}/?user=${encodeURIComponent(targetMobileParam)}&device=2`
    : '';

  // Generate QR code for mobile 2 link
  useEffect(() => {
    if (!mobile2Url) return;
    QRCode.toDataURL(mobile2Url, {
      width: 260,
      margin: 2,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.warn('QR code generation error:', err));
  }, [mobile2Url]);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(mobile2Url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2200);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'ConnectCall - Open on 2nd Mobile',
          text: `ConnectCall এ কল রিসিভ করতে আপনার ২য় ফোনে এই লিংকটি খুলুন:`,
          url: mobile2Url,
        });
      } catch (_) {
        handleCopyLink();
      }
    } else {
      handleCopyLink();
    }
  };

  const handleTestSound = () => {
    soundService.unlockAudio();
    soundService.playIncomingRing();
    setTestingSound(true);
    setTimeout(() => {
      soundService.stopAllSounds();
      setTestingSound(false);
    }, 4000);
  };

  const handleRequestNotification = async () => {
    const res = await NotificationService.requestPermission();
    setNotifPermission(res);
    if (res === 'granted') {
      NotificationService.notifyIncomingCall('ConnectCall Tester', 'audio');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-7 shadow-2xl text-slate-900 dark:text-slate-100 max-h-[92vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title */}
        <div className="flex items-center gap-3.5 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-sky-600 text-white flex items-center justify-center shadow-lg shadow-sky-500/20 shrink-0">
            <Smartphone className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              অন্য মোবাইলে কল দিন ও রিসিভ করুন
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Call between two real mobiles or browser tabs with live WebRTC
            </p>
          </div>
        </div>

        {/* Current Device Status Banner */}
        <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5">
            {currentUser.photoURL ? (
              <img
                src={currentUser.photoURL}
                alt={currentUser.name}
                className="w-10 h-10 rounded-full object-cover border border-emerald-500"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-sky-600 text-white flex items-center justify-center font-bold text-sm">
                {currentUser.name.charAt(0)}
              </div>
            )}
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">এই ডিভাইস (Device 1):</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{currentUser.name}</p>
            </div>
          </div>

          <div className="flex items-center gap-1 overflow-x-auto text-[11px]">
            <span className="text-slate-400 mr-1 text-[10px]">Switch:</span>
            {demoUsers.slice(0, 3).map((u) => (
              <button
                key={u.userId}
                onClick={() => onSwitchUser(u)}
                className={`px-2 py-1 rounded-lg font-medium cursor-pointer transition-colors ${
                  u.userId === currentUser.userId
                    ? 'bg-emerald-600 text-white font-bold'
                    : 'bg-white dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                {u.name.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>

        {/* STEP 1: OPEN ON 2ND MOBILE */}
        <div className="space-y-4">
          <div className="border border-sky-200 dark:border-sky-900/60 bg-sky-50/70 dark:bg-sky-950/30 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-sky-600 text-white text-xs font-bold flex items-center justify-center">
                  ১
                </span>
                <h3 className="font-bold text-sm text-sky-950 dark:text-sky-200">
                  ২য় মোবাইলে এই অ্যাপটি খুলুন ({otherUser.name} হিসেবে):
                </h3>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 mb-3">
              অন্য মোবাইলের ক্যামেরা দিয়ে নিচের QR কোডটি স্ক্যান করুন অথবা লিংকটি কপি করে WhatsApp/Messenger এ পাঠান:
            </p>

            {/* QR Code and Quick Copy */}
            <div className="flex flex-col sm:flex-row items-center gap-4 bg-white dark:bg-slate-900 p-3 rounded-xl border border-sky-100 dark:border-slate-800">
              {qrDataUrl ? (
                <div className="p-2 bg-white rounded-lg shadow-sm shrink-0 border border-slate-200">
                  <img src={qrDataUrl} alt="Scan QR Code on 2nd Phone" className="w-28 h-28 sm:w-32 sm:h-32" />
                </div>
              ) : (
                <div className="w-28 h-28 bg-slate-200 rounded-lg flex items-center justify-center text-slate-400">
                  <QrCode className="w-8 h-8" />
                </div>
              )}

              <div className="flex-1 w-full space-y-2">
                <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-[11px] font-mono break-all text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 line-clamp-2">
                  {mobile2Url}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyLink}
                    className="flex-1 py-2 px-3 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs cursor-pointer transition-all active:scale-95"
                  >
                    {copiedLink ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
                    <span>{copiedLink ? 'লিংক কপি হয়েছে!' : 'Copy Link for Phone 2'}</span>
                  </button>

                  <button
                    onClick={handleShare}
                    title="Share via WhatsApp, SMS, etc."
                    className="p-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl cursor-pointer transition-colors"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* STEP 2: DIAL / CALL 2ND MOBILE */}
          <div className="border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/70 dark:bg-emerald-950/30 rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center">
                ২
              </span>
              <h3 className="font-bold text-sm text-emerald-950 dark:text-emerald-200">
                ২য় মোবাইল খোলা থাকলে এখনই কল দিন:
              </h3>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 mb-3">
              নিচের বাটনে চাপ দিলে ২য় মোবাইলে সাথে সাথে রিংটোন বাজবে এবং স্ক্রিনে কল আসবে:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                onClick={() => {
                  onClose();
                  onStartCall(otherUser, 'audio');
                }}
                className="py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 cursor-pointer transition-all active:scale-95 animate-pulse"
              >
                <Phone className="w-4 h-4" />
                <span>Call {otherUser.name.split(' ')[0]} (Audio)</span>
              </button>

              <button
                onClick={() => {
                  onClose();
                  onStartCall(otherUser, 'video');
                }}
                className="py-3 px-4 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md shadow-sky-600/20 cursor-pointer transition-all active:scale-95"
              >
                <Video className="w-4 h-4" />
                <span>Call {otherUser.name.split(' ')[0]} (Video)</span>
              </button>
            </div>
          </div>

          {/* SOUND & NOTIFICATION HELPER */}
          <div className="border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-3.5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <Volume2 className="w-4 h-4 text-amber-500 shrink-0" />
              <span className="text-slate-600 dark:text-slate-300">
                রিংটোন ও ভাইব্রেশন টেস্ট করুন:
              </span>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={handleTestSound}
                className="flex-1 sm:flex-initial px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30 rounded-lg font-semibold cursor-pointer transition-colors"
              >
                {testingSound ? 'রিং বাজছে... (4s)' : '🔊 টেস্ট রিং বাজান'}
              </button>

              {notifPermission !== 'granted' && (
                <button
                  onClick={handleRequestNotification}
                  className="flex-1 sm:flex-initial px-3 py-1.5 bg-sky-500/10 hover:bg-sky-500/20 text-sky-700 dark:text-sky-400 border border-sky-500/30 rounded-lg font-semibold cursor-pointer transition-colors flex items-center gap-1"
                >
                  <Bell className="w-3.5 h-3.5" />
                  <span>নোটিফিকেশন অন</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-5 pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
          >
            বন্ধ করুন (Close)
          </button>
        </div>
      </div>
    </div>
  );
};
