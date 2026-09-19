import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import { usePrivacy } from '../contexts/PrivacyContext';
import { useWebRTC } from '../hooks/useWebRTC';
import { soundService } from '../services/soundService';
import { NotificationService } from '../services/notificationService';
import { PWAInstallButton } from './PWAInstallButton';
import {
  Sun,
  Moon,
  Laptop,
  Camera,
  Mic,
  Volume2,
  Bell,
  Play,
  Check,
  Video,
  Shield,
  Lock,
  Eye,
  EyeOff,
  Smartphone,
  LogOut,
  KeyRound,
  FileText,
} from 'lucide-react';

export const Settings: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const { user, logout } = useAuth();
  const {
    secretPin,
    setSecretPin,
    isAppLockEnabled,
    setAppLockEnabled,
    isStealthMode,
    toggleStealthMode,
    toggleCamouflage,
  } = usePrivacy();
  const { devices, permissions, refreshDevices } = useWebRTC();

  const [selectedCam, setSelectedCam] = useState('');
  const [selectedMic, setSelectedMic] = useState('');
  const [selectedSpeaker, setSelectedSpeaker] = useState('');
  const [isPlayingTestTone, setIsPlayingTestTone] = useState(false);
  const [notificationsGranted, setNotificationsGranted] = useState(NotificationService.isSupported());
  const [previewActive, setPreviewActive] = useState(false);
  const [newPinInput, setNewPinInput] = useState('');
  const [pinSavedMessage, setPinSavedMessage] = useState('');

  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const previewStreamRef = useRef<MediaStream | null>(null);

  // Stop video preview on unmount
  useEffect(() => {
    return () => {
      if (previewStreamRef.current) {
        previewStreamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  const handleTogglePreview = async () => {
    if (previewActive) {
      if (previewStreamRef.current) {
        previewStreamRef.current.getTracks().forEach((t) => t.stop());
        previewStreamRef.current = null;
      }
      setPreviewActive(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: selectedCam ? { deviceId: { exact: selectedCam } } : true,
          audio: false,
        });
        previewStreamRef.current = stream;
        if (videoPreviewRef.current) {
          videoPreviewRef.current.srcObject = stream;
          videoPreviewRef.current.play();
        }
        setPreviewActive(true);
        refreshDevices();
      } catch (err) {
        console.error('Failed to start camera preview:', err);
      }
    }
  };

  const handleTestAudio = () => {
    setIsPlayingTestTone(true);
    soundService.playRingtoneBeep();
    setTimeout(() => {
      soundService.playConnectedChime();
      setIsPlayingTestTone(false);
    }, 1500);
  };

  const handleRequestNotifications = async () => {
    const perm = await NotificationService.requestPermission();
    const isGranted = perm === 'granted';
    setNotificationsGranted(isGranted);
    if (isGranted) {
      NotificationService.notifyIncomingCall('Test User', 'audio');
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 overflow-y-auto">
      {/* Header */}
      <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">Settings</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Configure appearance, devices, and call preferences
          </p>
        </div>
      </div>

      <div className="p-4 sm:p-8 max-w-xl mx-auto w-full space-y-6">
        {/* Appearance Section */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-3">Theme & Appearance</h3>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setTheme('light')}
              className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                theme === 'light'
                  ? 'border-sky-500 bg-white dark:bg-slate-700 shadow-sm text-sky-600 dark:text-sky-300'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700'
              }`}
            >
              <Sun className="w-5 h-5" />
              <span className="text-xs font-semibold">Light</span>
            </button>

            <button
              onClick={() => setTheme('dark')}
              className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                theme === 'dark'
                  ? 'border-sky-500 bg-white dark:bg-slate-700 shadow-sm text-sky-600 dark:text-sky-300'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700'
              }`}
            >
              <Moon className="w-5 h-5" />
              <span className="text-xs font-semibold">Dark</span>
            </button>

            <button
              onClick={() => setTheme('system')}
              className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer ${
                theme === 'system'
                  ? 'border-sky-500 bg-white dark:bg-slate-700 shadow-sm text-sky-600 dark:text-sky-300'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-700'
              }`}
            >
              <Laptop className="w-5 h-5" />
              <span className="text-xs font-semibold">System</span>
            </button>
          </div>
        </div>

        {/* Media Devices Selection */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 space-y-4">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Camera & Microphone</h3>

          {/* Camera Selection */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              <Camera className="w-4 h-4 text-sky-500" />
              <span>Camera</span>
            </label>
            <select
              value={selectedCam}
              onChange={(e) => setSelectedCam(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200"
            >
              <option value="">Default Camera</option>
              {devices.videoInputs.map((d, i) => (
                <option key={d.deviceId || i} value={d.deviceId}>
                  {d.label || `Camera ${i + 1}`}
                </option>
              ))}
            </select>
          </div>

          {/* Microphone Selection */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              <Mic className="w-4 h-4 text-emerald-500" />
              <span>Microphone</span>
            </label>
            <select
              value={selectedMic}
              onChange={(e) => setSelectedMic(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200"
            >
              <option value="">Default Microphone</option>
              {devices.audioInputs.map((d, i) => (
                <option key={d.deviceId || i} value={d.deviceId}>
                  {d.label || `Microphone ${i + 1}`}
                </option>
              ))}
            </select>
          </div>

          {/* Speaker Selection */}
          <div>
            <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              <Volume2 className="w-4 h-4 text-amber-500" />
              <span>Speaker Output</span>
            </label>
            <select
              value={selectedSpeaker}
              onChange={(e) => setSelectedSpeaker(e.target.value)}
              className="w-full px-3 py-2 text-xs sm:text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200"
            >
              <option value="">Default Speaker</option>
              {devices.audioOutputs.map((d, i) => (
                <option key={d.deviceId || i} value={d.deviceId}>
                  {d.label || `Speaker ${i + 1}`}
                </option>
              ))}
            </select>
          </div>

          {/* Video Preview & Audio Test Buttons */}
          <div className="pt-2 flex flex-col sm:flex-row gap-2">
            <button
              onClick={handleTogglePreview}
              className={`flex-1 py-2 px-3 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer border ${
                previewActive
                  ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 text-rose-600 dark:text-rose-400'
                  : 'bg-white dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200'
              }`}
            >
              <Video className="w-4 h-4" />
              <span>{previewActive ? 'Stop Camera Preview' : 'Test Camera Preview'}</span>
            </button>

            <button
              onClick={handleTestAudio}
              disabled={isPlayingTestTone}
              className="flex-1 py-2 px-3 text-xs font-semibold bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-slate-100 rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 text-sky-500" />
              <span>{isPlayingTestTone ? 'Playing Tone...' : 'Test Ringtone / Audio'}</span>
            </button>
          </div>

          {/* Active Camera Video Preview Screen */}
          {previewActive && (
            <div className="mt-3 rounded-2xl overflow-hidden bg-black aspect-video relative flex items-center justify-center border border-slate-700 shadow-inner">
              <video
                ref={videoPreviewRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover video-mirror"
              />
              <span className="absolute bottom-2 left-2 bg-black/60 px-2 py-0.5 rounded text-[10px] text-white">
                Live Video Preview
              </span>
            </div>
          )}
        </div>

        {/* Browser Notifications */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-100 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 flex items-center justify-center">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200">Call & Chat Notifications</div>
              <div className="text-xs text-slate-500">Alerts when you receive incoming calls or messages</div>
            </div>
          </div>

          <button
            onClick={handleRequestNotifications}
            className="px-3.5 py-1.5 text-xs font-semibold bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 flex items-center gap-1 cursor-pointer"
          >
            {notificationsGranted ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                <span>Enabled</span>
              </>
            ) : (
              <span>Enable Alerts</span>
            )}
          </button>
        </div>

        {/* Android App Download Section */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-sky-500/5 to-transparent border border-emerald-500/30">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <span>Android App ইনস্টল করুন</span>
                  <span className="px-1.5 py-0.2 bg-emerald-500 text-white rounded-md text-[9px]">PWA / APK</span>
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  ফোনে সরাসরি ফুলস্ক্রিন ডাউনলোড ও ইনস্টল করে ব্যবহার করুন
                </div>
              </div>
            </div>

            <PWAInstallButton />
          </div>
        </div>

        {/* Security & Secret Chat Controls */}
        <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/25 space-y-4">
          <div className="flex items-center gap-3 pb-2 border-b border-amber-500/20">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-xs">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                গোপনীয়তা ও সিক্রেট চ্যাট সেটিংস
              </div>
              <div className="text-xs text-slate-500">
                চ্যাট ও কল অন্যদের নজর থেকে সুরক্ষিত রাখুন
              </div>
            </div>
          </div>

          {/* App Lock toggle */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                অ্যাপ পিন লক (App Lock)
              </div>
              <div className="text-[11px] text-slate-500">
                অ্যাপ ওপেন করতে বা সিক্রেট চ্যাট খুলতে ৪ ডিজিটের পিন আবশ্যক
              </div>
            </div>
            <button
              onClick={() => setAppLockEnabled(!isAppLockEnabled)}
              className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                isAppLockEnabled ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform absolute top-1 ${
                  isAppLockEnabled ? 'left-6' : 'left-1'
                }`}
              />
            </button>
          </div>

          {/* PIN Changer */}
          <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/60">
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
              সিক্রেট পিন পরিবর্তন করুন (বর্তমান: {secretPin})
            </label>
            <div className="flex items-center gap-2">
              <input
                type="password"
                maxLength={4}
                placeholder="নতুন ৪-ডিজিটের পিন"
                value={newPinInput}
                onChange={(e) => setNewPinInput(e.target.value.replace(/\D/g, ''))}
                className="w-36 px-3 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl tracking-widest text-center font-mono"
              />
              <button
                onClick={() => {
                  if (newPinInput.length === 4) {
                    setSecretPin(newPinInput);
                    setNewPinInput('');
                    setPinSavedMessage('পিন সফলভাবে সংরক্ষিত হয়েছে!');
                    setTimeout(() => setPinSavedMessage(''), 3000);
                  }
                }}
                disabled={newPinInput.length !== 4}
                className="px-3 py-1.5 text-xs font-semibold bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white rounded-xl transition-colors cursor-pointer"
              >
                সংরক্ষণ করুন
              </button>
            </div>
            {pinSavedMessage && (
              <div className="text-[11px] text-emerald-600 font-medium mt-1">
                {pinSavedMessage}
              </div>
            )}
          </div>

          {/* Stealth Mode and Panic Camouflage buttons */}
          <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/60 flex flex-col sm:flex-row gap-2">
            <button
              onClick={toggleStealthMode}
              className="flex-1 py-2 px-3 text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer text-slate-700 dark:text-slate-200"
            >
              {isStealthMode ? <Eye className="w-4 h-4 text-amber-500" /> : <EyeOff className="w-4 h-4" />}
              <span>{isStealthMode ? 'স্টিলথ মোড বন্ধ করুন' : 'স্টিলথ ঝাপসা মোড অন'}</span>
            </button>

            <button
              onClick={toggleCamouflage}
              className="flex-1 py-2 px-3 text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 rounded-xl flex items-center justify-center gap-1.5 cursor-pointer text-slate-700 dark:text-slate-200"
            >
              <FileText className="w-4 h-4 text-slate-500" />
              <span>ক্যামোফ্লেজ স্ক্রিন পরীক্ষা</span>
            </button>
          </div>
        </div>

        {/* Account & Logout */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
              অ্যাকাউন্ট: {user?.name}
            </div>
            <div className="text-xs text-slate-500">{user?.email}</div>
          </div>

          <button
            onClick={() => logout()}
            className="px-3.5 py-1.5 text-xs font-semibold bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/40 border border-rose-200 dark:border-rose-800 rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>লগআউট / নতুন লগইন</span>
          </button>
        </div>
      </div>
    </div>
  );
};
