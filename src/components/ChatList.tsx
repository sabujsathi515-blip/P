import React, { useState } from 'react';
import type { Chat } from '../types/chat';
import type { UserProfile } from '../types/user';
import { Search, MessageSquarePlus, Check, CheckCheck } from 'lucide-react';

interface ChatListProps {
  chats: Chat[];
  currentUserId: string;
  activeChatId?: string;
  onSelectChat: (chat: Chat, partner: UserProfile) => void;
  onNewChatClick: () => void;
  allUsers: UserProfile[];
}

export const ChatList: React.FC<ChatListProps> = ({
  chats,
  currentUserId,
  activeChatId,
  onSelectChat,
  onNewChatClick,
  allUsers,
}) => {
  const [filterQuery, setFilterQuery] = useState('');

  // Helper to extract the other participant info
  const getPartnerInfo = (chat: Chat): UserProfile => {
    const partnerId = chat.participants.find((p) => p !== currentUserId) || '';
    const cachedUser = allUsers.find((u) => u.userId === partnerId);
    if (cachedUser) return cachedUser;

    const details = chat.participantDetails?.[partnerId];
    return {
      userId: partnerId,
      name: details?.name || 'Contact',
      email: details?.email || '',
      photoURL: details?.photoURL,
      online: false,
      lastSeen: 0,
    };
  };

  const filteredChats = chats.filter((chat) => {
    const partner = getPartnerInfo(chat);
    if (!filterQuery.trim()) return true;
    const q = filterQuery.toLowerCase();
    return (
      partner.name.toLowerCase().includes(q) ||
      partner.email.toLowerCase().includes(q) ||
      (chat.lastMessage?.text.toLowerCase().includes(q) ?? false)
    );
  });

  const formatChatTimestamp = (timestamp?: number) => {
    if (!timestamp) return '';
    const d = new Date(timestamp);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();

    if (isToday) {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    const daysDiff = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff < 7) {
      return d.toLocaleDateString([], { weekday: 'short' });
    }
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800">
      {/* Header */}
      <div className="p-3.5 border-b border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between">
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">Chats</h2>
        <button
          onClick={onNewChatClick}
          title="New Chat"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-50 dark:bg-sky-950/50 hover:bg-sky-100 dark:hover:bg-sky-900/50 text-sky-600 dark:text-sky-400 text-xs font-semibold rounded-xl border border-sky-200 dark:border-sky-800/60 transition-colors cursor-pointer"
        >
          <MessageSquarePlus className="w-4 h-4" />
          <span>New Chat</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="p-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search chats or messages..."
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 text-sm bg-slate-100 dark:bg-slate-800/70 border border-slate-200/60 dark:border-slate-700/60 rounded-xl text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 transition-all"
          />
        </div>
      </div>

      {/* Chat List Items */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/50">
        {filteredChats.length === 0 ? (
          <div className="p-8 text-center flex flex-col items-center justify-center text-slate-400 dark:text-slate-500">
            <div className="w-12 h-12 mb-3 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
              <Search className="w-6 h-6" />
            </div>
            <p className="text-sm font-medium">No conversations found</p>
            <p className="text-xs text-slate-400 mt-1 max-w-[200px]">
              {filterQuery ? 'Try another search term' : 'Start a new chat from your contacts!'}
            </p>
            {!filterQuery && (
              <button
                onClick={onNewChatClick}
                className="mt-4 px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-medium cursor-pointer shadow-sm transition-colors"
              >
                Browse Contacts
              </button>
            )}
          </div>
        ) : (
          filteredChats.map((chat) => {
            const partner = getPartnerInfo(chat);
            const isSelected = chat.chatId === activeChatId;
            const unreadCount = chat.unreadCount?.[currentUserId] || 0;
            const isTyping = Boolean(chat.typingUsers?.[partner.userId]);

            return (
              <div
                key={chat.chatId}
                onClick={() => onSelectChat(chat, partner)}
                className={`relative flex items-center gap-3 p-3.5 cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-sky-50/80 dark:bg-sky-950/40 border-l-4 border-sky-500'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
              >
                {/* Avatar with Online Badge */}
                <div className="relative shrink-0">
                  {partner.photoURL ? (
                    <img
                      src={partner.photoURL}
                      alt={partner.name}
                      className="w-12 h-12 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-sky-600 to-indigo-500 flex items-center justify-center text-white font-bold text-base shadow-xs">
                      {partner.name.charAt(0).toUpperCase()}
                    </div>
                  )}

                  {partner.online && (
                    <span
                      title="Online"
                      className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full"
                    />
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-sm text-slate-800 dark:text-slate-100 truncate">
                      {partner.name}
                    </span>
                    <span className="text-[11px] text-slate-600 dark:text-slate-300 font-medium">
                      {formatChatTimestamp(chat.lastMessage?.timestamp || chat.updatedAt)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="text-xs text-slate-500 dark:text-slate-400 truncate flex items-center gap-1">
                      {isTyping ? (
                        <span className="text-sky-500 dark:text-sky-400 font-medium animate-pulse">
                          typing...
                        </span>
                      ) : (
                        <>
                          {chat.lastMessage?.senderId === currentUserId && (
                            <span className="shrink-0 text-slate-400">
                              {chat.lastMessage.status === 'seen' ? (
                                <CheckCheck className="w-3.5 h-3.5 text-sky-500 inline" />
                              ) : (
                                <Check className="w-3.5 h-3.5 inline" />
                              )}
                            </span>
                          )}
                          <span className="truncate">
                            {chat.lastMessage?.text || 'No messages yet'}
                          </span>
                        </>
                      )}
                    </div>

                    {unreadCount > 0 && (
                      <span className="shrink-0 ml-2 px-1.5 py-0.5 min-w-[18px] text-center bg-sky-500 text-white text-[10px] font-bold rounded-full">
                        {unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
