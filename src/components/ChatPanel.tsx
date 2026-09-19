import React, { useState, useRef, useEffect } from 'react';
import type { Message, MessageReplyInfo } from '../types/chat';
import type { UserProfile } from '../types/user';
import { MessageBubble } from './MessageBubble';
import { X, Send, Smile } from 'lucide-react';

interface ChatPanelProps {
  partner: UserProfile;
  currentUserId: string;
  messages: Message[];
  loading: boolean;
  onSendMessage: (text: string) => void;
  onDeleteMessage: (messageId: string) => void;
  onClose: () => void;
  replyingTo: MessageReplyInfo | null;
  setReplyingTo: (reply: MessageReplyInfo | null) => void;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
  partner,
  currentUserId,
  messages,
  loading,
  onSendMessage,
  onDeleteMessage,
  onClose,
  replyingTo,
  setReplyingTo,
}) => {
  const [text, setText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSendMessage(text);
    setText('');
    setShowEmoji(false);
  };

  const quickEmojis = ['👍', '❤️', '😊', '🎉', '🔥', '👋', '🙏'];

  return (
    <div className="flex flex-col h-full w-full bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 shadow-2xl z-40">
      {/* Panel Header */}
      <div className="h-14 px-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">
            In-Call Chat with {partner.name}
          </h3>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {loading ? (
          <div className="p-4 text-center text-xs text-slate-400">Loading messages...</div>
        ) : messages.length === 0 ? (
          <div className="p-6 text-center text-slate-400 text-xs">
            Send a message to {partner.name} during this call
          </div>
        ) : (
          messages.map((m) => (
            <MessageBubble
              key={m.messageId}
              message={m}
              isSender={m.senderId === currentUserId}
              senderName={m.senderId === currentUserId ? 'You' : partner.name}
              onReply={(r) => setReplyingTo(r)}
              onDelete={onDeleteMessage}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply Banner */}
      {replyingTo && (
        <div className="bg-sky-50 dark:bg-slate-800 border-t border-sky-200 dark:border-slate-700 px-3 py-1.5 flex items-center justify-between text-xs">
          <div className="truncate">
            <span className="font-semibold text-sky-600 dark:text-sky-400">
              Replying to {replyingTo.senderName}:
            </span>{' '}
            <span className="text-slate-500 dark:text-slate-400 italic">{replyingTo.text}</span>
          </div>
          <button onClick={() => setReplyingTo(null)} className="p-0.5 text-slate-400">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Emojis Popup */}
      {showEmoji && (
        <div className="flex items-center gap-1 p-2 bg-slate-100 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700">
          {quickEmojis.map((e) => (
            <button
              key={e}
              onClick={() => setText((prev) => prev + e)}
              className="text-lg p-1 hover:scale-125 transition-transform cursor-pointer"
            >
              {e}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <form
        onSubmit={handleSend}
        className="p-2.5 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2"
      >
        <button
          type="button"
          onClick={() => setShowEmoji(!showEmoji)}
          className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
        >
          <Smile className="w-4 h-4" />
        </button>
        <input
          type="text"
          placeholder="Message..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="flex-1 py-1.5 px-3 text-xs sm:text-sm bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden"
        />
        <button
          type="submit"
          disabled={!text.trim()}
          className="p-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white rounded-xl cursor-pointer"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
};
