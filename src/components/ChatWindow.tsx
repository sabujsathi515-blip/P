import React, { useState, useRef, useEffect } from 'react';
import type { Chat, Message, MessageReplyInfo } from '../types/chat';
import type { UserProfile } from '../types/user';
import { usePrivacy } from '../contexts/PrivacyContext';
import { MessageBubble } from './MessageBubble';
import {
  Phone,
  Video,
  Search,
  X,
  Send,
  ArrowLeft,
  Smile,
  ShieldCheck,
  Lock,
  Unlock,
  Timer,
  Eye,
  EyeOff,
  Flame,
  Shield,
} from 'lucide-react';

interface ChatWindowProps {
  chat: Chat | null;
  partner: UserProfile | null;
  currentUserId: string;
  messages: Message[];
  loading: boolean;
  onSendMessage: (
    text: string,
    options?: { isSecret?: boolean; disappearingDuration?: number }
  ) => void;
  onDeleteMessage: (messageId: string) => void;
  onStartAudioCall: (partner: UserProfile) => void;
  onStartVideoCall: (partner: UserProfile) => void;
  onTyping: (isTyping: boolean) => void;
  onBackMobile?: () => void;
  replyingTo: MessageReplyInfo | null;
  setReplyingTo: (reply: MessageReplyInfo | null) => void;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  chat,
  partner,
  currentUserId,
  messages,
  loading,
  onSendMessage,
  onDeleteMessage,
  onStartAudioCall,
  onStartVideoCall,
  onTyping,
  onBackMobile,
  replyingTo,
  setReplyingTo,
}) => {
  const {
    isChatLocked,
    toggleLockChat,
    isStealthMode,
    toggleStealthMode,
    chatDisappearingTimers,
    setChatDisappearingTimer,
  } = usePrivacy();

  const [inputText, setInputText] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showTimerMenu, setShowTimerMenu] = useState(false);
  const [isSecretSend, setIsSecretSend] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const chatId = chat?.chatId || '';
  const isLocked = isChatLocked(chatId);
  const activeDisappearingDuration = chatDisappearingTimers[chatId] || 0;

  // Auto-scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    onSendMessage(inputText, {
      isSecret: isSecretSend || isLocked,
      disappearingDuration: activeDisappearingDuration > 0 ? activeDisappearingDuration : undefined,
    });

    setInputText('');
    onTyping(false);
    setShowEmojiPicker(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    onTyping(e.target.value.length > 0);
  };

  const handleAddEmoji = (emoji: string) => {
    setInputText((prev) => prev + emoji);
    inputRef.current?.focus();
  };

  const formatLastSeen = (timestamp?: number) => {
    if (!timestamp) return 'Offline';
    const diffMins = Math.floor((Date.now() - timestamp) / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return new Date(timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const isPartnerTyping = partner?.userId ? Boolean(chat?.typingUsers?.[partner.userId]) : false;

  const quickEmojis = ['👍', '❤️', '😊', '🎉', '🔥', '👋', '🙏', '🔒', '🤫'];

  const timerOptions = [
    { label: 'Off', seconds: 0 },
    { label: '10 seconds', seconds: 10 },
    { label: '30 seconds', seconds: 30 },
    { label: '1 minute', seconds: 60 },
    { label: '5 minutes', seconds: 300 },
    { label: '1 hour', seconds: 3600 },
    { label: '24 hours', seconds: 86400 },
  ];

  if (!partner) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50 dark:bg-slate-950 text-center">
        <div className="w-20 h-20 rounded-3xl bg-sky-100 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 flex items-center justify-center text-sky-600 dark:text-sky-400 mb-4 shadow-sm">
          <Phone className="w-10 h-10" />
        </div>
        <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">ConnectCall Web</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mt-2">
          Select a conversation from the sidebar or start a new chat with your contacts to begin messaging and calling.
        </p>
        <div className="mt-6 flex items-center gap-2 text-xs text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>Real-time WebRTC audio, video & encrypted messaging</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-100/60 dark:bg-slate-950 relative overflow-hidden">
      {/* Top Header */}
      <div className="h-16 px-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0 z-10 shadow-xs">
        <div className="flex items-center gap-3 min-w-0">
          {onBackMobile && (
            <button
              onClick={onBackMobile}
              className="md:hidden p-1.5 -ml-1 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}

          {/* Partner Avatar with Anti-Peeping Blur */}
          <div className="relative shrink-0">
            <div className={isStealthMode ? 'filter blur-[4px]' : ''}>
              {partner.photoURL ? (
                <img
                  src={partner.photoURL}
                  alt={partner.name}
                  className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-sky-600 to-indigo-500 flex items-center justify-center text-white font-bold text-sm shadow-xs">
                  {partner.name.charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            {partner.online && (
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full" />
            )}

            {isLocked && (
              <span className="absolute top-0 right-0 p-0.5 rounded-full bg-amber-500 text-white shadow-xs">
                <Lock className="w-2 h-2" />
              </span>
            )}
          </div>

          {/* Name & Status */}
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h3
                className={`font-bold text-sm text-slate-800 dark:text-slate-100 truncate ${
                  isStealthMode ? 'filter blur-[3px]' : ''
                }`}
              >
                {partner.name}
              </h3>
              {isLocked && (
                <span className="px-1.5 py-0.2 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[9px] font-bold border border-amber-500/20">
                  সিক্রেট
                </span>
              )}
            </div>

            <p className="text-[12px] text-slate-500 dark:text-slate-400 truncate">
              {isPartnerTyping ? (
                <span className="text-sky-500 dark:text-sky-400 font-semibold animate-pulse">
                  typing...
                </span>
              ) : partner.online ? (
                <span className="text-emerald-500 font-medium">Online</span>
              ) : (
                `Last seen: ${formatLastSeen(partner.lastSeen)}`
              )}
            </p>
          </div>
        </div>

        {/* Action Buttons: Secret Lock, Disappearing Timer, Call, Search */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {/* Secret / Lock Chat Toggle */}
          <button
            onClick={() => toggleLockChat(chatId)}
            title={
              isLocked
                ? 'চ্যাটটি এখন সিক্রেট ভল্টে লক করা রয়েছে (আনলক করতে ক্লিক করুন)'
                : 'এই চ্যাটটি সিক্রেট ও গোপন করুন (অন্য কেউ দেখতে পাবে না)'
            }
            className={`p-2 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
              isLocked
                ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
            }`}
          >
            {isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
          </button>

          {/* Disappearing Messages Timer Button */}
          <div className="relative">
            <button
              onClick={() => setShowTimerMenu(!showTimerMenu)}
              title="অটো-ডিলিট / ডিসঅ্যাপিয়ারিং মেসেজ টাইমার"
              className={`p-2 rounded-xl border text-xs font-medium transition-all cursor-pointer flex items-center gap-1 ${
                activeDisappearingDuration > 0
                  ? 'bg-orange-500 text-white border-orange-600 shadow-xs'
                  : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100'
              }`}
            >
              <Timer className="w-4 h-4" />
              {activeDisappearingDuration > 0 && (
                <span className="text-[10px] font-bold">
                  {activeDisappearingDuration >= 3600
                    ? `${activeDisappearingDuration / 3600}h`
                    : activeDisappearingDuration >= 60
                    ? `${activeDisappearingDuration / 60}m`
                    : `${activeDisappearingDuration}s`}
                </span>
              )}
            </button>

            {/* Timer menu popover */}
            {showTimerMenu && (
              <div className="absolute right-0 top-11 w-44 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 p-1.5 z-30 animate-in fade-in zoom-in-95">
                <div className="px-2 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  মেসেজ মুছে যাওয়ার সময়
                </div>
                {timerOptions.map((opt) => (
                  <button
                    key={opt.seconds}
                    onClick={() => {
                      setChatDisappearingTimer(chatId, opt.seconds);
                      setShowTimerMenu(false);
                    }}
                    className={`w-full text-left px-3 py-1.5 rounded-xl text-xs flex items-center justify-between transition-colors cursor-pointer ${
                      activeDisappearingDuration === opt.seconds
                        ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400 font-bold'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    <span>{opt.label}</span>
                    {activeDisappearingDuration === opt.seconds && (
                      <Flame className="w-3 h-3 text-orange-500" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => onStartAudioCall(partner)}
            title="Start Audio Call"
            className="p-2 sm:px-3 sm:py-2 text-slate-600 dark:text-slate-300 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/40 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer text-xs font-semibold"
          >
            <Phone className="w-4 h-4 text-sky-500" />
            <span className="hidden sm:inline">Audio</span>
          </button>

          <button
            onClick={() => onStartVideoCall(partner)}
            title="Start Video Call"
            className="p-2 sm:px-3 sm:py-2 text-slate-600 dark:text-slate-300 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/40 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer text-xs font-semibold"
          >
            <Video className="w-4 h-4 text-emerald-500" />
            <span className="hidden sm:inline">Video</span>
          </button>

          <button
            onClick={() => setShowSearch(!showSearch)}
            title="Search inside conversation"
            className={`p-2 rounded-xl transition-colors cursor-pointer ${
              showSearch
                ? 'bg-sky-100 dark:bg-sky-900/40 text-sky-600 dark:text-sky-400'
                : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Search className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* In-conversation Search Bar */}
      {showSearch && (
        <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-2 flex items-center gap-2 z-10 animate-in slide-in-from-top-2">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="Search messages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 text-xs bg-transparent text-slate-800 dark:text-slate-100 focus:outline-hidden"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Secret / Disappearing message banner */}
      {(isLocked || activeDisappearingDuration > 0) && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-1.5 text-xs text-amber-800 dark:text-amber-300 flex items-center justify-between select-none">
          <div className="flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-amber-500" />
            <span>
              {isLocked
                ? 'গোপন মোড সক্রিয়: এই চ্যাটটি পিন লক ভল্টে সুরক্ষিত'
                : 'এনক্রিপ্টেড সিক্রেট চ্যাট'}
              {activeDisappearingDuration > 0 &&
                ` • মেসেজ ${activeDisappearingDuration} সেকেন্ড পর অটো ডিলিট হবে`}
            </span>
          </div>
          <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">
            PRIVATE
          </span>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-1">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-slate-400">
            <div className="w-14 h-14 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center mb-2">
              <Lock className="w-7 h-7 text-amber-500/70" />
            </div>
            <p className="text-sm font-semibold">কোনো মেসেজ নেই</p>
            <p className="text-xs text-slate-400 max-w-xs mt-1">
              সিক্রেট মেসেজ পাঠাতে নিচের টেক্সট বক্সে লিখুন। মেসেজ এন্ড-টু-এন্ড এনক্রিপ্টেড।
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <MessageBubble
              key={msg.messageId}
              message={msg}
              isSender={msg.senderId === currentUserId}
              senderName={msg.senderId === currentUserId ? 'You' : partner.name}
              searchQuery={searchQuery}
              onReply={(replyInfo) => setReplyingTo(replyInfo)}
              onDelete={onDeleteMessage}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Typing Indicator bottom badge */}
      {isPartnerTyping && (
        <div className="px-4 py-1 text-xs text-sky-600 dark:text-sky-400 italic bg-white/80 dark:bg-slate-900/80 backdrop-blur-xs flex items-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full bg-sky-500 animate-bounce" />
          <span>{partner.name} is typing...</span>
        </div>
      )}

      {/* Reply Preview Bar */}
      {replyingTo && (
        <div className="bg-sky-50 dark:bg-slate-800/90 border-t border-sky-200 dark:border-slate-700 px-4 py-2 flex items-center justify-between z-10">
          <div className="border-l-3 border-sky-500 pl-2 text-xs">
            <span className="font-semibold text-sky-600 dark:text-sky-400">
              Replying to {replyingTo.senderName}
            </span>
            <p className="text-slate-600 dark:text-slate-300 line-clamp-1 italic text-[11px]">
              {replyingTo.text}
            </p>
          </div>
          <button
            onClick={() => setReplyingTo(null)}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Emoji Quick Picker Popup */}
      {showEmojiPicker && (
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-md rounded-2xl p-2 mx-4 mb-2 flex items-center gap-1.5 z-20 overflow-x-auto">
          {quickEmojis.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => handleAddEmoji(emoji)}
              className="text-xl p-1.5 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-transform hover:scale-125 cursor-pointer"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Message Input Form */}
      <form
        onSubmit={handleSend}
        className={`p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2 z-10 shrink-0 transition-colors ${
          isSecretSend ? 'bg-amber-50/50 dark:bg-amber-950/20' : ''
        }`}
      >
        <button
          type="button"
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          title="Add emoji"
        >
          <Smile className="w-5 h-5" />
        </button>

        {/* Secret Message Toggle */}
        <button
          type="button"
          onClick={() => setIsSecretSend(!isSecretSend)}
          title={
            isSecretSend
              ? 'সিক্রেট মোড অন (মেসেজ লক থাকবে)'
              : 'সিক্রেট মেসেজ পাঠাতে ক্লিক করুন'
          }
          className={`p-2 rounded-xl border text-xs transition-all cursor-pointer ${
            isSecretSend
              ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700 hover:bg-slate-200'
          }`}
        >
          <Lock className="w-4 h-4" />
        </button>

        <input
          ref={inputRef}
          type="text"
          placeholder={
            isSecretSend
              ? `🔒 Send secret message to ${partner.name}...`
              : `Message ${partner.name}...`
          }
          value={inputText}
          onChange={handleInputChange}
          className={`flex-1 py-2 px-4 text-sm rounded-2xl focus:outline-hidden transition-all placeholder:text-slate-400 ${
            isSecretSend
              ? 'bg-amber-100/60 dark:bg-amber-950/40 border border-amber-400 dark:border-amber-600 focus:ring-2 focus:ring-amber-500/40 text-amber-900 dark:text-amber-100'
              : 'bg-slate-100 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 border border-slate-200/60 dark:border-slate-700/60 focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500'
          }`}
        />

        <button
          type="submit"
          disabled={!inputText.trim()}
          className={`p-2.5 text-white rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center shrink-0 disabled:opacity-40 ${
            isSecretSend
              ? 'bg-amber-600 hover:bg-amber-500'
              : 'bg-sky-600 hover:bg-sky-500'
          }`}
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
