import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useWebRTC } from '../hooks/useWebRTC';
import { soundService } from '../services/soundService';
import { NotificationService } from '../services/notificationService';
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
} from 'lucide-react';

export const Settings: React.FC = () => {
  const { theme, setTheme } = useTheme();
  const { devices, permissions, refreshDevices } = useWebRTC();

  const [selectedCam, setSelectedCam] = useState('');
  const [selectedMic, setSelectedMic] = useState('');
  const [selectedSpeaker, setSelectedSpeaker] = useState('');
  const [isPlayingTestTone, setIsPlayingTestTone] = useState(false);
  const [notificationsGranted, setNotificationsGranted] = useState(NotificationService.isSupported());
  const [previewActive, setPreviewActive] = useState(false);

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
      </div>
    </div>
  );
};
