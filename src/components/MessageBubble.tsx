import React, { useState, useEffect } from 'react';
import type { Message, MessageReplyInfo } from '../types/chat';
import { usePrivacy } from '../contexts/PrivacyContext';
import {
  Check,
  CheckCheck,
  Copy,
  Reply,
  Trash2,
  MoreVertical,
  Lock,
  Timer,
  Eye,
  EyeOff,
  Flame,
} from 'lucide-react';

interface MessageBubbleProps {
  message: Message;
  isSender: boolean;
  senderName: string;
  searchQuery?: string;
  onReply: (replyInfo: MessageReplyInfo) => void;
  onDelete: (messageId: string) => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isSender,
  senderName,
  searchQuery,
  onReply,
  onDelete,
}) => {
  const { isStealthMode } = usePrivacy();
  const [showMenu, setShowMenu] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(() => {
    if (!message.expiresAt) return null;
    const diff = Math.max(0, Math.round((message.expiresAt - Date.now()) / 1000));
    return diff;
  });

  // Countdown timer for disappearing messages
  useEffect(() => {
    if (!message.expiresAt) return;

    const interval = setInterval(() => {
      const diff = Math.max(0, Math.round((message.expiresAt! - Date.now()) / 1000));
      setRemainingSeconds(diff);
      if (diff <= 0) {
        clearInterval(interval);
        onDelete(message.messageId);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [message.expiresAt, message.messageId, onDelete]);

  const formattedTime = new Date(message.timestamp).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  const handleCopy = () => {
    navigator.clipboard.writeText(message.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
    setShowMenu(false);
  };

  const handleReply = () => {
    onReply({
      messageId: message.messageId,
      text: message.text,
      senderName,
    });
    setShowMenu(false);
  };

  const handleDelete = () => {
    onDelete(message.messageId);
    setShowMenu(false);
  };

  // Text highlighting for search
  const renderHighlightedText = (text: string, query?: string) => {
    if (!query || !query.trim()) return text;
    const parts = text.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <mark key={i} className="bg-amber-300 dark:bg-amber-500 text-slate-900 rounded px-0.5 font-medium">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  // Privacy stealth masking
  const shouldMask = (isStealthMode || message.isSecret) && !isRevealed;

  return (
    <div
      id={`msg-${message.messageId}`}
      className={`group relative flex flex-col mb-2.5 ${isSender ? 'items-end' : 'items-start'}`}
    >
      <div
        className={`relative max-w-[85%] sm:max-w-[70%] rounded-2xl px-3.5 py-2 shadow-xs transition-all ${
          isSender
            ? message.isSecret
              ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-tr-xs shadow-amber-900/10'
              : 'bg-sky-600 dark:bg-sky-500 text-white rounded-tr-xs'
            : message.isSecret
            ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-950 dark:text-amber-100 border border-amber-300/70 dark:border-amber-700/60 rounded-tl-xs'
            : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200/60 dark:border-slate-700/60 rounded-tl-xs'
        }`}
      >
        {/* Disappearing / Self-destruct indicator header */}
        {message.expiresAt && (
          <div className="flex items-center gap-1 mb-1 text-[11px] font-medium opacity-90 text-amber-200 dark:text-amber-300 select-none">
            <Flame className="w-3 h-3 text-orange-400 animate-pulse" />
            <span>Disappearing in {remainingSeconds !== null ? `${remainingSeconds}s` : '...'}</span>
          </div>
        )}

        {/* Reply Quote Banner */}
        {message.replyTo && (
          <div
            className={`mb-1.5 rounded-lg px-2.5 py-1 text-xs border-l-3 ${
              isSender
                ? 'bg-black/20 border-white/70 text-white/90'
                : 'bg-slate-100 dark:bg-slate-700/60 border-sky-500 text-slate-600 dark:text-slate-300'
            }`}
          >
            <div className="font-semibold">{message.replyTo.senderName}</div>
            <div className="line-clamp-1 italic text-[11px] opacity-90">{message.replyTo.text}</div>
          </div>
        )}

        {/* Message Content with Secret Shield Masking */}
        {shouldMask ? (
          <div
            onClick={() => setIsRevealed(true)}
            className="flex items-center gap-2 py-1 cursor-pointer select-none group/mask"
            title="সিক্রেট মেসেজ দেখতে ক্লিক করুন"
          >
            <div className="filter blur-[5px] select-none text-sm tracking-wider opacity-80 pointer-events-none">
              ••••••••••••••••••••
            </div>
            <span className="flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-black/20 text-white group-hover/mask:bg-black/30 transition-colors">
              <Eye className="w-3 h-3" />
              <span>দেখুন</span>
            </span>
          </div>
        ) : (
          <div className="relative">
            <p className="text-[14.5px] leading-relaxed break-words whitespace-pre-wrap">
              {renderHighlightedText(message.text, searchQuery)}
            </p>
            {isRevealed && (
              <button
                onClick={() => setIsRevealed(false)}
                className="mt-1 flex items-center gap-1 text-[10px] opacity-75 hover:opacity-100 cursor-pointer"
                title="লুকিয়ে ফেলুন"
              >
                <EyeOff className="w-2.5 h-2.5" />
                <span>আবার গোপন করুন</span>
              </button>
            )}
          </div>
        )}

        {/* Footer: Time, Lock indicator, & Status checkmarks */}
        <div
          className={`flex items-center justify-end gap-1.5 mt-1 text-[11px] select-none ${
            isSender ? 'text-white/80' : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          {message.isSecret && (
            <span title="সিক্রেট এনক্রিপ্টেড মেসেজ" className="flex items-center gap-0.5 text-amber-300">
              <Lock className="w-2.5 h-2.5" />
            </span>
          )}

          <span>{formattedTime}</span>

          {isSender && (
            <span title={`Status: ${message.status}`}>
              {message.status === 'sent' && <Check className="w-3.5 h-3.5 opacity-80" />}
              {message.status === 'delivered' && <CheckCheck className="w-3.5 h-3.5 opacity-80" />}
              {message.status === 'seen' && (
                <CheckCheck className="w-3.5 h-3.5 text-cyan-200 dark:text-cyan-300 font-bold" />
              )}
            </span>
          )}
        </div>

        {/* Quick hover action button */}
        <div
          className={`absolute top-1 opacity-0 group-hover:opacity-100 transition-opacity ${
            isSender ? '-left-8' : '-right-8'
          }`}
        >
          <button
            onClick={() => setShowMenu(!showMenu)}
            aria-label="Message options"
            className="p-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 shadow-sm border border-slate-200 dark:border-slate-700 cursor-pointer"
          >
            <MoreVertical className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Dropdown context menu */}
        {showMenu && (
          <div
            className={`absolute z-30 top-7 w-32 bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 py-1 text-xs text-slate-700 dark:text-slate-200 ${
              isSender ? 'right-0' : 'left-0'
            }`}
          >
            <button
              onClick={handleReply}
              className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-700/60 cursor-pointer"
            >
              <Reply className="w-3.5 h-3.5 text-sky-500" />
              <span>Reply</span>
            </button>
            <button
              onClick={handleCopy}
              className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-700/60 cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5 text-slate-500" />
              <span>{copied ? 'Copied!' : 'Copy'}</span>
            </button>
            {isSender && (
              <button
                onClick={handleDelete}
                className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
