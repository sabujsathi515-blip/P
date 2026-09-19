import React, { useState, useRef, useEffect } from 'react';
import type { Chat, Message, MessageReplyInfo } from '../types/chat';
import type { UserProfile } from '../types/user';
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
} from 'lucide-react';

interface ChatWindowProps {
  chat: Chat | null;
  partner: UserProfile | null;
  currentUserId: string;
  messages: Message[];
  loading: boolean;
  onSendMessage: (text: string) => void;
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
  const [inputText, setInputText] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText);
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

  const quickEmojis = ['👍', '❤️', '😊', '🎉', '🔥', '👋', '🙏', '🚀', '💯'];

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

          {/* Partner Avatar */}
          <div className="relative shrink-0">
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
            {partner.online && (
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full" />
            )}
          </div>

          {/* Name & Status */}
          <div className="min-w-0">
            <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 truncate">
              {partner.name}
            </h3>
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

        {/* Action Buttons: Audio Call, Video Call, Search */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
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
            placeholder="Search within this chat..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 text-xs sm:text-sm bg-transparent border-none text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden"
            autoFocus
          />
          {searchQuery && (
            <span className="text-xs text-slate-400">
              {messages.filter((m) => m.text.toLowerCase().includes(searchQuery.toLowerCase())).length} found
            </span>
          )}
          <button
            onClick={() => {
              setShowSearch(false);
              setSearchQuery('');
            }}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-1">
        {loading ? (
          <div className="flex items-center justify-center h-full text-slate-400 text-xs">
            Loading messages...
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-slate-400">
            <p className="text-sm font-medium">No messages in this conversation yet</p>
            <p className="text-xs text-slate-400 mt-1">Say hello to {partner.name} 👋</p>
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
        className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2 z-10 shrink-0"
      >
        <button
          type="button"
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          title="Add emoji"
        >
          <Smile className="w-5 h-5" />
        </button>

        <input
          ref={inputRef}
          type="text"
          placeholder={`Message ${partner.name}...`}
          value={inputText}
          onChange={handleInputChange}
          className="flex-1 py-2 px-4 text-sm bg-slate-100 dark:bg-slate-800/80 text-slate-900 dark:text-slate-100 border border-slate-200/60 dark:border-slate-700/60 rounded-2xl focus:outline-hidden focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 transition-all placeholder:text-slate-400"
        />

        <button
          type="submit"
          disabled={!inputText.trim()}
          className="p-2.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-40 disabled:hover:bg-sky-600 text-white rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center shrink-0"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
