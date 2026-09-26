import React, { useState, useEffect } from 'react';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { PrivacyProvider, usePrivacy } from './contexts/PrivacyContext';
import { CallProvider, useCall } from './contexts/CallContext';
import { useChat } from './hooks/useChat';
import { AuthService } from './services/authService';
import type { UserProfile } from './types/user';
import type { CallType } from './types/call';

// Components
import { AuthView } from './components/AuthModal';
import { ChatList } from './components/ChatList';
import { ChatWindow } from './components/ChatWindow';
import { ContactList } from './components/ContactList';
import { CallHistory } from './components/CallHistory';
import { Profile } from './components/Profile';
import { Settings } from './components/Settings';
import { IncomingCall } from './components/IncomingCall';
import { AudioCallScreen } from './components/AudioCallScreen';
import { VideoCallScreen } from './components/VideoCallScreen';
import { ChatPanel } from './components/ChatPanel';
import { SetupGuideModal } from './components/SetupGuideModal';
import { ScreenLockOverlay } from './components/ScreenLockOverlay';
import { CamouflageOverlay } from './components/CamouflageOverlay';
import { AndroidAppDownloadModal } from './components/AndroidAppDownloadModal';
import { PWAInstallButton } from './components/PWAInstallButton';
import { CallAnotherMobileModal } from './components/CallAnotherMobileModal';
import { DialPadModal } from './components/DialPadModal';
import { NotificationService } from './services/notificationService';
import { soundService } from './services/soundService';

import {
  MessageSquare,
  Users,
  Phone,
  User as UserIcon,
  Settings as SettingsIcon,
  Sun,
  Moon,
  HelpCircle,
  AlertCircle,
  X,
  ChevronDown,
  Sparkles,
  Lock,
  LogOut,
  Smartphone,
  PhoneCall,
  QrCode,
  Bell,
  Volume2,
} from 'lucide-react';

type NavTab = 'chats' | 'contacts' | 'calls' | 'profile' | 'settings';

function MainAppContent() {
  const { user, loading: authLoading, demoUsers, switchDemoUser, isFirebase, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const { lockApp } = usePrivacy();
  const {
    activeCall,
    callStatus,
    callDurationFormatted,
    callType,
    localStream,
    remoteStream,
    isMuted,
    isCameraOff,
    isScreenSharing,
    isSpeakerOn,
    incomingCall,
    isChatDrawerOpen,
    error: callError,
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
  } = useCall();

  const [activeTab, setActiveTab] = useState<NavTab>('chats');
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [showDemoUserMenu, setShowDemoUserMenu] = useState(false);
  const [showAndroidModal, setShowAndroidModal] = useState(false);
  const [showCallAnotherMobileModal, setShowCallAnotherMobileModal] = useState(false);
  const [showDialPadModal, setShowDialPadModal] = useState(false);
  const [dismissedNotifBanner, setDismissedNotifBanner] = useState(false);
  const [mobileChatViewActive, setMobileChatViewActive] = useState(false);

  // Chat management hook
  const {
    chats,
    activeChat,
    activePartner,
    messages,
    loading: chatLoading,
    openChatWithUser,
    sendMessage,
    deleteMessage,
    handleTyping,
    replyingTo,
    setReplyingTo,
  } = useChat();

  const handledRoomRef = React.useRef(false);

  // Load registered/demo users directory
  useEffect(() => {
    if (!user?.userId) return;
    const unsub = AuthService.subscribeToAllUsers(
      (users) => {
        setAllUsers((prev) => {
          if (
            prev.length === users.length &&
            prev.every((u, i) => u.userId === users[i]?.userId && u.online === users[i]?.online && u.inCall === users[i]?.inCall)
          ) {
            return prev;
          }
          return users;
        });
      },
      () => {
        setAllUsers(demoUsers);
      }
    );
    return () => unsub();
  }, [user?.userId]);

  // Handle URL shareable room link: e.g. /call/:roomId or ?room=CONNECTCALL-... or ?joinRoom=...
  useEffect(() => {
    if (handledRoomRef.current || !user || activeCall) return;

    const params = new URLSearchParams(window.location.search);
    const roomFromQuery = params.get('room') || params.get('joinRoom');
    const pathMatch = window.location.pathname.match(/\/call\/([A-Za-z0-9_-]+)/);
    const targetRoomId = roomFromQuery || (pathMatch ? pathMatch[1] : null);

    if (targetRoomId) {
      handledRoomRef.current = true;
      // Fetch room from server
      fetch(`/api/calls/room/${encodeURIComponent(targetRoomId)}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((roomData) => {
          if (roomData && (roomData.status === 'calling' || roomData.status === 'ringing') && roomData.offer) {
            // Room is actively calling this device!
            acceptIncomingCall();
          } else {
            const demoTarget = allUsers.find((u) => u.userId !== user.userId) || demoUsers[1];
            if (demoTarget) {
              startCall(demoTarget, 'video', targetRoomId);
            }
          }
        })
        .catch(() => {
          const demoTarget = allUsers.find((u) => u.userId !== user.userId) || demoUsers[1];
          if (demoTarget) {
            startCall(demoTarget, 'video', targetRoomId);
          }
        });
    }
  }, [user?.userId, allUsers, demoUsers, activeCall, startCall, acceptIncomingCall]);

  if (authLoading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-950 text-white">
        <div className="w-12 h-12 rounded-2xl bg-sky-500/20 flex items-center justify-center animate-spin mb-3">
          <Phone className="w-6 h-6 text-sky-400" />
        </div>
        <div className="text-sm font-semibold tracking-wide">Loading ConnectCall...</div>
      </div>
    );
  }

  if (!user) {
    return <AuthView />;
  }

  // Calculate total unread chats count
  const totalUnread = chats.reduce((acc, c) => acc + (c.unreadCount?.[user.userId] || 0), 0);

  const handleStartCall = async (target: UserProfile, type: CallType) => {
    await startCall(target, type);
  };

  const handleOpenChat = (target: UserProfile) => {
    openChatWithUser(target);
    setActiveTab('chats');
    setMobileChatViewActive(true);
  };

  return (
    <div className="h-[100dvh] w-full flex flex-col bg-slate-100 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden font-sans">
      {/* GLOBAL TOAST ERROR BANNER */}
      {callError && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-rose-600 text-white shadow-xl text-xs font-semibold animate-in slide-in-from-top-4">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{callError}</span>
          <button
            onClick={clearError}
            className="p-1 hover:bg-rose-700 rounded-lg cursor-pointer ml-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* FULL-SCREEN INCOMING CALL MODAL */}
      {incomingCall && (
        <IncomingCall
          room={incomingCall}
          onAccept={acceptIncomingCall}
          onDecline={declineIncomingCall}
        />
      )}

      {/* SETUP GUIDE MODAL */}
      <SetupGuideModal isOpen={showSetupModal} onClose={() => setShowSetupModal(false)} />

      {/* ACTIVE CALL VIEW (Video or Audio) */}
      {activeCall ? (
        <div className="relative flex-1 flex h-full w-full overflow-hidden bg-slate-950">
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            {callType === 'video' ? (
              <VideoCallScreen
                room={activeCall}
                callStatus={callStatus}
                callDurationFormatted={callDurationFormatted}
                localStream={localStream}
                remoteStream={remoteStream}
                isMuted={isMuted}
                isCameraOff={isCameraOff}
                isScreenSharing={isScreenSharing}
                isSpeakerOn={isSpeakerOn}
                isChatOpen={isChatDrawerOpen}
                callLink={callLink}
                currentUserName={user.name}
                onToggleMute={toggleMute}
                onToggleCamera={toggleCamera}
                onFlipCamera={flipCamera}
                onToggleScreenShare={toggleScreenShare}
                onToggleSpeaker={toggleSpeaker}
                onToggleChat={() => setChatDrawerOpen(!isChatDrawerOpen)}
                onEndCall={endCurrentCall}
              />
            ) : (
              <AudioCallScreen
                room={activeCall}
                callStatus={callStatus}
                callDurationFormatted={callDurationFormatted}
                isMuted={isMuted}
                isSpeakerOn={isSpeakerOn}
                remoteStream={remoteStream}
                isChatOpen={isChatDrawerOpen}
                callLink={callLink}
                onToggleMute={toggleMute}
                onToggleSpeaker={toggleSpeaker}
                onToggleChat={() => setChatDrawerOpen(!isChatDrawerOpen)}
                onEndCall={endCurrentCall}
              />
            )}
          </div>

          {/* In-Call Side Chat Panel (Desktop) or Drawer (Mobile) */}
          {isChatDrawerOpen && (
            <div className="w-full sm:w-80 md:w-96 absolute sm:relative inset-y-0 right-0 z-40 bg-white dark:bg-slate-900 border-l border-slate-800 shadow-2xl">
              <ChatPanel
                partner={{
                  userId: activeCall.receiverId === user.userId ? activeCall.callerId : activeCall.receiverId,
                  name: activeCall.receiverId === user.userId ? activeCall.callerName : activeCall.receiverName,
                  email: '',
                  photoURL: activeCall.receiverId === user.userId ? activeCall.callerPhoto : activeCall.receiverPhoto,
                  online: true,
                  lastSeen: Date.now(),
                }}
                currentUserId={user.userId}
                messages={messages}
                loading={chatLoading}
                onSendMessage={sendMessage}
                onDeleteMessage={deleteMessage}
                onClose={() => setChatDrawerOpen(false)}
                replyingTo={replyingTo}
                setReplyingTo={setReplyingTo}
              />
            </div>
          )}
        </div>
      ) : (
        /* MAIN DASHBOARD APPLICATION INTERFACE */
        <div className="flex-1 flex flex-col h-full w-full overflow-hidden">
          {/* A. MOBILE TOP HEADER (Shown only on phone screens when browsing tabs) */}
          {!mobileChatViewActive && (
            <header className="md:hidden h-14 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-3.5 flex items-center justify-between shrink-0 z-20 shadow-xs">
              <div
                className="flex items-center gap-2 cursor-pointer select-none"
                onClick={() => {
                  setActiveTab('chats');
                  setMobileChatViewActive(false);
                }}
              >
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-600 to-emerald-500 text-white flex items-center justify-center shadow-xs">
                  <Phone className="w-4 h-4" />
                </div>
                <div>
                  <h1 className="text-sm font-extrabold tracking-tight text-slate-900 dark:text-white leading-none">
                    ConnectCall
                  </h1>
                  <span className="text-[10px] text-emerald-500 font-medium flex items-center gap-1 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Online
                  </span>
                </div>
              </div>

              {/* Mobile Header Quick Actions */}
              <div className="flex items-center gap-1">
                {/* Call Another Mobile / 2nd Phone Button */}
                <button
                  onClick={() => setShowCallAnotherMobileModal(true)}
                  title="অন্য মোবাইলে কল দিন / Call Another Mobile"
                  className="px-2 py-1 bg-gradient-to-r from-emerald-600 to-sky-600 hover:from-emerald-500 hover:to-sky-500 text-white rounded-xl text-[11px] font-bold flex items-center gap-1 shadow-xs cursor-pointer active:scale-95 animate-pulse"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">অন্য মোবাইলে কল</span>
                  <span className="sm:hidden">২য় ফোনে কল</span>
                </button>

                {/* Dial Pad Button */}
                <button
                  onClick={() => setShowDialPadModal(true)}
                  title="ডায়াল প্যাড"
                  className="p-1.5 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-xl transition-colors cursor-pointer"
                >
                  <PhoneCall className="w-4 h-4" />
                </button>

                {/* Privacy Lock */}
                <button
                  onClick={lockApp}
                  title="স্ক্রিন লক"
                  className="p-1.5 text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-xl transition-colors cursor-pointer"
                >
                  <Lock className="w-4 h-4" />
                </button>

                {/* Android App Download Modal */}
                <button
                  onClick={() => setShowAndroidModal(true)}
                  title="Android App"
                  className="p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  <Smartphone className="w-4 h-4" />
                </button>

                {/* Setup Guide */}
                <button
                  onClick={() => setShowSetupModal(true)}
                  title={isFirebase ? 'Firebase Connected' : 'Setup Guide'}
                  className="p-1.5 text-slate-500 hover:text-sky-500 rounded-xl transition-colors cursor-pointer"
                >
                  {isFirebase ? (
                    <Sparkles className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <HelpCircle className="w-4 h-4 text-amber-500" />
                  )}
                </button>

                {/* Mobile User Avatar with Dropdown */}
                <div className="relative ml-0.5">
                  <button
                    onClick={() => setShowDemoUserMenu(!showDemoUserMenu)}
                    className="relative group p-0.5 rounded-full cursor-pointer focus:outline-hidden"
                    title={user.name}
                  >
                    {user.photoURL ? (
                      <img
                        src={user.photoURL}
                        alt={user.name}
                        className="w-7 h-7 rounded-full object-cover border-2 border-sky-500 shadow-xs"
                      />
                    ) : (
                      <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-sky-600 to-indigo-600 text-white font-bold flex items-center justify-center text-xs border-2 border-sky-500 shadow-xs">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="absolute bottom-0 right-0 w-2 h-2 bg-emerald-500 border border-white dark:border-slate-900 rounded-full" />
                  </button>

                  {/* Mobile Profile Popover */}
                  {showDemoUserMenu && (
                    <div className="absolute right-0 top-10 z-50 w-64 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-2 text-xs animate-in fade-in slide-in-from-top-2">
                      <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-700/60 mb-1">
                        <div className="font-bold text-slate-800 dark:text-slate-100 truncate">
                          {user.name}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate">{user.email}</div>
                      </div>

                      <div className="py-1">
                        <div className="px-3 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                          Switch Account (Demo)
                        </div>
                        {demoUsers.map((dUser) => (
                          <button
                            key={dUser.userId}
                            onClick={() => {
                              switchDemoUser(dUser);
                              setShowDemoUserMenu(false);
                            }}
                            className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors text-left cursor-pointer ${
                              dUser.userId === user.userId ? 'bg-sky-50 dark:bg-sky-950/50 font-semibold' : ''
                            }`}
                          >
                            <img
                              src={dUser.photoURL}
                              alt={dUser.name}
                              className="w-6 h-6 rounded-full object-cover"
                            />
                            <span className="truncate text-slate-700 dark:text-slate-200">
                              {dUser.name}
                            </span>
                          </button>
                        ))}
                      </div>

                      <div className="pt-1 border-t border-slate-100 dark:border-slate-700/60 space-y-1">
                        <button
                          onClick={() => {
                            setActiveTab('profile');
                            setShowDemoUserMenu(false);
                          }}
                          className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-700/60 rounded-xl text-slate-700 dark:text-slate-200 cursor-pointer"
                        >
                          Account Settings
                        </button>
                        <button
                          onClick={() => {
                            setShowDemoUserMenu(false);
                            logout();
                          }}
                          className="w-full text-left px-3 py-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-xl flex items-center gap-1.5 cursor-pointer font-medium"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          <span>লগআউট</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </header>
          )}

          {/* Notification Permission Reminder Banner for Mobile Incoming Calls */}
          {typeof Notification !== 'undefined' && Notification.permission === 'default' && !dismissedNotifBanner && (
            <div className="bg-gradient-to-r from-emerald-600 via-sky-600 to-indigo-600 text-white text-xs px-3.5 py-2 flex items-center justify-between shrink-0 shadow-xs z-10 select-none">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 animate-bounce shrink-0 text-amber-300" />
                <span className="font-medium text-[11px] sm:text-xs">
                  অন্য ফোন থেকে কল আসার নোটিফিকেশন পেতে চান? (Enable Call Alerts)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={async () => {
                    soundService.unlockAudio();
                    const res = await NotificationService.requestPermission();
                    if (res === 'granted') {
                      NotificationService.notifyIncomingCall('ConnectCall', 'audio');
                    }
                    setDismissedNotifBanner(true);
                  }}
                  className="px-2.5 py-1 bg-white text-slate-900 rounded-lg font-bold text-[11px] cursor-pointer hover:bg-slate-100 shadow-xs active:scale-95"
                >
                  চালু করুন
                </button>
                <button
                  onClick={() => setDismissedNotifBanner(true)}
                  className="p-1 hover:bg-black/20 rounded cursor-pointer text-white/80"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* B. MAIN INTERFACE CONTENT: Desktop Rail + List Views + Active Chat */}
          <div className="flex-1 flex h-full w-full overflow-hidden">
            {/* 1. DESKTOP NARROW ICON RAIL (Hidden on mobile < md) */}
            <nav className="hidden md:flex md:w-18 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex-col items-center justify-between py-4 select-none shrink-0 z-20">
              {/* Top Logo & Tabs */}
              <div className="flex flex-col items-center gap-5 w-full">
                {/* App Brand Icon */}
                <div
                  title="ConnectCall"
                  className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-600 to-emerald-500 text-white flex items-center justify-center shadow-md mb-1 cursor-pointer"
                  onClick={() => setActiveTab('chats')}
                >
                  <Phone className="w-5 h-5" />
                </div>

                {/* Navigation Tab Icons */}
                <div className="flex flex-col items-center gap-2 w-full px-2">
                  {/* Chats Tab */}
                  <button
                    onClick={() => {
                      setActiveTab('chats');
                      setMobileChatViewActive(false);
                    }}
                    title="Chats"
                    className={`relative w-11 h-11 rounded-2xl flex items-center justify-center transition-all cursor-pointer ${
                      activeTab === 'chats'
                        ? 'bg-sky-500 text-white shadow-md'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <MessageSquare className="w-5 h-5" />
                    {totalUnread > 0 && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-xs">
                        {totalUnread}
                      </span>
                    )}
                  </button>

                  {/* Contacts Tab */}
                  <button
                    onClick={() => {
                      setActiveTab('contacts');
                      setMobileChatViewActive(false);
                    }}
                    title="Contacts"
                    className={`relative w-11 h-11 rounded-2xl flex items-center justify-center transition-all cursor-pointer ${
                      activeTab === 'contacts'
                        ? 'bg-sky-500 text-white shadow-md'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Users className="w-5 h-5" />
                  </button>

                  {/* Calls Tab */}
                  <button
                    onClick={() => {
                      setActiveTab('calls');
                      setMobileChatViewActive(false);
                    }}
                    title="Call History"
                    className={`relative w-11 h-11 rounded-2xl flex items-center justify-center transition-all cursor-pointer ${
                      activeTab === 'calls'
                        ? 'bg-sky-500 text-white shadow-md'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Phone className="w-5 h-5" />
                  </button>

                  {/* Profile Tab */}
                  <button
                    onClick={() => {
                      setActiveTab('profile');
                      setMobileChatViewActive(false);
                    }}
                    title="Profile"
                    className={`relative w-11 h-11 rounded-2xl flex items-center justify-center transition-all cursor-pointer ${
                      activeTab === 'profile'
                        ? 'bg-sky-500 text-white shadow-md'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <UserIcon className="w-5 h-5" />
                  </button>

                  {/* Settings Tab */}
                  <button
                    onClick={() => {
                      setActiveTab('settings');
                      setMobileChatViewActive(false);
                    }}
                    title="Settings"
                    className={`relative w-11 h-11 rounded-2xl flex items-center justify-center transition-all cursor-pointer ${
                      activeTab === 'settings'
                        ? 'bg-sky-500 text-white shadow-md'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <SettingsIcon className="w-5 h-5" />
                  </button>

                  <div className="w-6 h-px bg-slate-200 dark:bg-slate-800 my-1" />

                  {/* Dial Pad */}
                  <button
                    onClick={() => setShowDialPadModal(true)}
                    title="ডায়াল প্যাড (Dial Pad)"
                    className="relative w-11 h-11 rounded-2xl flex items-center justify-center transition-all cursor-pointer text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                  >
                    <PhoneCall className="w-5 h-5" />
                  </button>

                  {/* Call Another Mobile / 2nd Phone */}
                  <button
                    onClick={() => setShowCallAnotherMobileModal(true)}
                    title="অন্য মোবাইলে কল দিন / Call Another Mobile"
                    className="relative w-11 h-11 rounded-2xl flex items-center justify-center transition-all cursor-pointer bg-gradient-to-tr from-emerald-500 to-sky-500 text-white shadow-md hover:scale-105 active:scale-95 animate-pulse"
                  >
                    <Smartphone className="w-5 h-5" />
                  </button>

                  {/* Quick App Lock button */}
                  <button
                    onClick={lockApp}
                    title="স্ক্রিন লক করুন (গোপন চ্যাট সুরক্ষিত রাখুন)"
                    className="relative w-11 h-11 rounded-2xl flex items-center justify-center transition-all cursor-pointer text-amber-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                  >
                    <Lock className="w-5 h-5" />
                  </button>

                  {/* Android App Download button */}
                  <button
                    onClick={() => setShowAndroidModal(true)}
                    title="Android App ডাউনলোড ও ইনস্টল"
                    className="relative w-11 h-11 rounded-2xl flex items-center justify-center transition-all cursor-pointer text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <Smartphone className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Bottom Utilities: Theme Toggle & User Avatar Dropdown */}
              <div className="flex flex-col items-center gap-3 w-full px-2">
                {/* Setup Guide / Mode Button */}
                <button
                  onClick={() => setShowSetupModal(true)}
                  title={isFirebase ? 'Firebase Connected' : 'Setup Required / Demo Mode'}
                  className="w-10 h-10 rounded-2xl flex items-center justify-center text-slate-500 hover:text-sky-500 hover:bg-sky-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  {isFirebase ? (
                    <Sparkles className="w-5 h-5 text-emerald-500" />
                  ) : (
                    <HelpCircle className="w-5 h-5 text-amber-500" />
                  )}
                </button>

                {/* Theme Quick Toggle */}
                <button
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  title="Toggle Theme"
                  className="w-10 h-10 rounded-2xl flex items-center justify-center text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                </button>

                {/* Active User Avatar with Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setShowDemoUserMenu(!showDemoUserMenu)}
                    className="relative group p-0.5 rounded-full cursor-pointer focus:outline-hidden"
                    title={`${user.name} (${user.email}) - Click to switch profile`}
                  >
                    {user.photoURL ? (
                      <img
                        src={user.photoURL}
                        alt={user.name}
                        className="w-10 h-10 rounded-full object-cover border-2 border-sky-500 shadow-xs"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-sky-600 to-indigo-600 text-white font-bold flex items-center justify-center text-sm border-2 border-sky-500 shadow-xs">
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full" />
                  </button>

                  {/* Desktop Profile Switcher Popover */}
                  {showDemoUserMenu && (
                    <div className="absolute left-14 bottom-0 z-50 w-64 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 p-2 text-xs animate-in fade-in">
                      <div className="px-3 py-2 border-b border-slate-100 dark:border-slate-700/60 mb-1">
                        <div className="font-bold text-slate-800 dark:text-slate-100 truncate">
                          {user.name}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate">{user.email}</div>
                      </div>

                      <div className="py-1">
                        <div className="px-3 py-1 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                          Switch Account (Demo Testing)
                        </div>
                        {demoUsers.map((dUser) => (
                          <button
                            key={dUser.userId}
                            onClick={() => {
                              switchDemoUser(dUser);
                              setShowDemoUserMenu(false);
                            }}
                            className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700/60 transition-colors text-left cursor-pointer ${
                              dUser.userId === user.userId ? 'bg-sky-50 dark:bg-sky-950/50 font-semibold' : ''
                            }`}
                          >
                            <img
                              src={dUser.photoURL}
                              alt={dUser.name}
                              className="w-6 h-6 rounded-full object-cover"
                            />
                            <span className="truncate text-slate-700 dark:text-slate-200">
                              {dUser.name}
                            </span>
                          </button>
                        ))}
                      </div>

                      <div className="pt-1 border-t border-slate-100 dark:border-slate-700/60 space-y-1">
                        <button
                          onClick={() => {
                            setActiveTab('profile');
                            setShowDemoUserMenu(false);
                          }}
                          className="w-full text-left px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-700/60 rounded-xl text-slate-700 dark:text-slate-200 cursor-pointer"
                        >
                          Account Settings
                        </button>

                        <button
                          onClick={() => {
                            setShowDemoUserMenu(false);
                            logout();
                          }}
                          className="w-full text-left px-3 py-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-xl flex items-center gap-1.5 cursor-pointer font-medium"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          <span>লগইন পেজে যান / লগআউট</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </nav>

            {/* 2. MIDDLE LIST COLUMN (Chats, Contacts, Calls, Profile, Settings) */}
            <section
              className={`w-full md:w-80 lg:w-96 shrink-0 h-full flex flex-col bg-white dark:bg-slate-900 md:border-r border-slate-200 dark:border-slate-800 ${
                mobileChatViewActive ? 'hidden md:flex' : 'flex'
              }`}
            >
              {activeTab === 'chats' && (
                <ChatList
                  chats={chats}
                  currentUserId={user.userId}
                  activeChatId={activeChat?.chatId}
                  allUsers={allUsers}
                  onSelectChat={(chat, partner) => {
                    openChatWithUser(partner);
                    setMobileChatViewActive(true);
                  }}
                  onNewChatClick={() => setActiveTab('contacts')}
                />
              )}

              {activeTab === 'contacts' && (
                <ContactList
                  contacts={allUsers}
                  currentUserId={user.userId}
                  onMessageClick={handleOpenChat}
                  onAudioCallClick={(c) => handleStartCall(c, 'audio')}
                  onVideoCallClick={(c) => handleStartCall(c, 'video')}
                  onOpenCallAnotherMobile={() => setShowCallAnotherMobileModal(true)}
                  onOpenDialPad={() => setShowDialPadModal(true)}
                />
              )}

              {activeTab === 'calls' && (
                <CallHistory
                  currentUserId={user.userId}
                  allUsers={allUsers}
                  onCallUser={handleStartCall}
                  onOpenCallAnotherMobile={() => setShowCallAnotherMobileModal(true)}
                  onOpenDialPad={() => setShowDialPadModal(true)}
                />
              )}

              {activeTab === 'profile' && <Profile user={user} />}

              {activeTab === 'settings' && <Settings />}
            </section>

            {/* 3. RIGHT EXPANDED CONVERSATION VIEW (Active Chat Window or Empty State) */}
            <main
              className={`flex-1 flex flex-col h-full bg-slate-50 dark:bg-slate-950 overflow-hidden ${
                !mobileChatViewActive ? 'hidden md:flex' : 'flex'
              }`}
            >
              <ChatWindow
                chat={activeChat}
                partner={activePartner}
                currentUserId={user.userId}
                messages={messages}
                loading={chatLoading}
                onSendMessage={sendMessage}
                onDeleteMessage={deleteMessage}
                onStartAudioCall={(p) => handleStartCall(p, 'audio')}
                onStartVideoCall={(p) => handleStartCall(p, 'video')}
                onTyping={handleTyping}
                onBackMobile={() => setMobileChatViewActive(false)}
                replyingTo={replyingTo}
                setReplyingTo={setReplyingTo}
              />
            </main>
          </div>

          {/* C. MOBILE BOTTOM NAVIGATION BAR (WhatsApp / iOS / Android native app bar) */}
          {!mobileChatViewActive && (
            <nav className="md:hidden h-16 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 flex items-center justify-around px-1 z-30 shrink-0 select-none pb-[max(env(safe-area-inset-bottom),6px)] shadow-lg">
              {/* 1. Chats Tab */}
              <button
                onClick={() => {
                  setActiveTab('chats');
                  setMobileChatViewActive(false);
                }}
                className={`flex-1 py-1 flex flex-col items-center justify-center gap-1 transition-all cursor-pointer relative ${
                  activeTab === 'chats'
                    ? 'text-sky-600 dark:text-sky-400 font-bold'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <div className="relative">
                  <MessageSquare
                    className={`w-5 h-5 ${activeTab === 'chats' ? 'scale-110 stroke-[2.4]' : ''} transition-transform`}
                  />
                  {totalUnread > 0 && (
                    <span className="absolute -top-1.5 -right-2 min-w-4 h-4 px-1 bg-emerald-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-xs">
                      {totalUnread}
                    </span>
                  )}
                </div>
                <span className="text-[11px] font-medium leading-none">Chats</span>
              </button>

              {/* 2. Contacts Tab */}
              <button
                onClick={() => {
                  setActiveTab('contacts');
                  setMobileChatViewActive(false);
                }}
                className={`flex-1 py-1 flex flex-col items-center justify-center gap-1 transition-all cursor-pointer relative ${
                  activeTab === 'contacts'
                    ? 'text-sky-600 dark:text-sky-400 font-bold'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Users
                  className={`w-5 h-5 ${activeTab === 'contacts' ? 'scale-110 stroke-[2.4]' : ''} transition-transform`}
                />
                <span className="text-[11px] font-medium leading-none">Contacts</span>
              </button>

              {/* 3. Calls Tab */}
              <button
                onClick={() => {
                  setActiveTab('calls');
                  setMobileChatViewActive(false);
                }}
                className={`flex-1 py-1 flex flex-col items-center justify-center gap-1 transition-all cursor-pointer relative ${
                  activeTab === 'calls'
                    ? 'text-sky-600 dark:text-sky-400 font-bold'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <Phone
                  className={`w-5 h-5 ${activeTab === 'calls' ? 'scale-110 stroke-[2.4]' : ''} transition-transform`}
                />
                <span className="text-[11px] font-medium leading-none">Calls</span>
              </button>

              {/* 4. Profile Tab */}
              <button
                onClick={() => {
                  setActiveTab('profile');
                  setMobileChatViewActive(false);
                }}
                className={`flex-1 py-1 flex flex-col items-center justify-center gap-1 transition-all cursor-pointer relative ${
                  activeTab === 'profile'
                    ? 'text-sky-600 dark:text-sky-400 font-bold'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <UserIcon
                  className={`w-5 h-5 ${activeTab === 'profile' ? 'scale-110 stroke-[2.4]' : ''} transition-transform`}
                />
                <span className="text-[11px] font-medium leading-none">Profile</span>
              </button>

              {/* 5. Settings Tab */}
              <button
                onClick={() => {
                  setActiveTab('settings');
                  setMobileChatViewActive(false);
                }}
                className={`flex-1 py-1 flex flex-col items-center justify-center gap-1 transition-all cursor-pointer relative ${
                  activeTab === 'settings'
                    ? 'text-sky-600 dark:text-sky-400 font-bold'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <SettingsIcon
                  className={`w-5 h-5 ${activeTab === 'settings' ? 'scale-110 stroke-[2.4]' : ''} transition-transform`}
                />
                <span className="text-[11px] font-medium leading-none">Settings</span>
              </button>
            </nav>
          )}
        </div>
      )}

      {/* Privacy & Security Overlays */}
      <ScreenLockOverlay />
      <CamouflageOverlay />

      {/* Android App Download Modal */}
      <AndroidAppDownloadModal
        isOpen={showAndroidModal}
        onClose={() => setShowAndroidModal(false)}
      />

      {/* 2nd Mobile Pairing & Calling Modal */}
      <CallAnotherMobileModal
        isOpen={showCallAnotherMobileModal}
        onClose={() => setShowCallAnotherMobileModal(false)}
        currentUser={user}
        demoUsers={demoUsers}
        onSwitchUser={(newUser) => switchDemoUser(newUser)}
        onStartCall={(targetUser, type) => startCall(targetUser, type)}
      />

      {/* Phone Dial Pad Modal */}
      <DialPadModal
        isOpen={showDialPadModal}
        onClose={() => setShowDialPadModal(false)}
        contacts={allUsers.length > 0 ? allUsers : demoUsers}
        currentUserId={user.userId}
        onStartCall={(targetUser, type) => startCall(targetUser, type)}
      />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <PrivacyProvider>
          <CallProvider>
            <MainAppContent />
          </CallProvider>
        </PrivacyProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
