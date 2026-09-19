import React, { useState } from 'react';
import type { Message, MessageReplyInfo } from '../types/chat';
import { Check, CheckCheck, Copy, Reply, Trash2, MoreVertical } from 'lucide-react';

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
  const [showMenu, setShowMenu] = useState(false);
  const [copied, setCopied] = useState(false);

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

  return (
    <div
      id={`msg-${message.messageId}`}
      className={`group relative flex flex-col mb-2.5 ${isSender ? 'items-end' : 'items-start'}`}
    >
      <div
        className={`relative max-w-[85%] sm:max-w-[70%] rounded-2xl px-3.5 py-2 shadow-xs transition-all ${
          isSender
            ? 'bg-sky-600 dark:bg-sky-500 text-white rounded-tr-xs'
            : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200/60 dark:border-slate-700/60 rounded-tl-xs'
        }`}
      >
        {/* Reply Quote Banner */}
        {message.replyTo && (
          <div
            className={`mb-1.5 rounded-lg px-2.5 py-1 text-xs border-l-3 ${
              isSender
                ? 'bg-sky-700/50 border-sky-200 text-sky-100'
                : 'bg-slate-100 dark:bg-slate-700/60 border-sky-500 text-slate-600 dark:text-slate-300'
            }`}
          >
            <div className="font-semibold">{message.replyTo.senderName}</div>
            <div className="line-clamp-1 italic text-[11px] opacity-90">{message.replyTo.text}</div>
          </div>
        )}

        {/* Message Content */}
        <p className="text-[14.5px] leading-relaxed break-words whitespace-pre-wrap">
          {renderHighlightedText(message.text, searchQuery)}
        </p>

        {/* Footer: Time & Status checkmarks */}
        <div
          className={`flex items-center justify-end gap-1.5 mt-1 text-[11px] select-none ${
            isSender ? 'text-sky-100' : 'text-slate-600 dark:text-slate-300'
          }`}
        >
          <span>{formattedTime}</span>

          {isSender && (
            <span title={`Status: ${message.status}`}>
              {message.status === 'sent' && <Check className="w-3.5 h-3.5 opacity-80" />}
              {message.status === 'delivered' && <CheckCheck className="w-3.5 h-3.5 opacity-80" />}
              {message.status === 'seen' && <CheckCheck className="w-3.5 h-3.5 text-cyan-200 dark:text-cyan-300 font-bold" />}
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
