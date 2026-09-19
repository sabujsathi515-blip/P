import React, { useState } from 'react';
import type { Chat } from '../types/chat';
import type { UserProfile } from '../types/user';
import { usePrivacy } from '../contexts/PrivacyContext';
import { PinModal } from './PinModal';
import { PWAInstallButton } from './PWAInstallButton';
import {
  Search,
  MessageSquarePlus,
  Check,
  CheckCheck,
  Lock,
  Unlock,
  Shield,
  Eye,
  EyeOff,
  FileText,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';

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
  const {
    isVaultUnlocked,
    unlockVault,
    lockVault,
    secretPin,
    isChatLocked,
    toggleLockChat,
    isStealthMode,
    toggleStealthMode,
    toggleCamouflage,
    lockedChatIds,
  } = usePrivacy();

  const [filterQuery, setFilterQuery] = useState('');
  const [showPinModal, setShowPinModal] = useState(false);
  const [showLockedSection, setShowLockedSection] = useState(false);

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

  // Filter based on search query
  const searchedChats = chats.filter((chat) => {
    const partner = getPartnerInfo(chat);
    if (!filterQuery.trim()) return true;
    const q = filterQuery.toLowerCase();
    return (
      partner.name.toLowerCase().includes(q) ||
      partner.email.toLowerCase().includes(q) ||
      (chat.lastMessage?.text.toLowerCase().includes(q) ?? false)
    );
  });

  // Separate normal chats and secret/locked chats
  const normalChats = searchedChats.filter((c) => !isChatLocked(c.chatId));
  const secretChats = searchedChats.filter((c) => isChatLocked(c.chatId));

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

  const handleVaultClick = () => {
    if (isVaultUnlocked) {
      setShowLockedSection(!showLockedSection);
    } else {
      setShowPinModal(true);
    }
  };

  const handleVaultUnlockSuccess = () => {
    unlockVault(secretPin);
    setShowLockedSection(true);
  };

  const renderChatItem = (chat: Chat, isSecretFolderItem = false) => {
    const partner = getPartnerInfo(chat);
    const isSelected = chat.chatId === activeChatId;
    const unreadCount = chat.unreadCount?.[currentUserId] || 0;
    const isTyping = Boolean(chat.typingUsers?.[partner.userId]);
    const locked = isChatLocked(chat.chatId);

    return (
      <div
        key={chat.chatId}
        onClick={() => onSelectChat(chat, partner)}
        className={`group/item relative flex items-center gap-3 p-3.5 cursor-pointer transition-colors ${
          isSelected
            ? isSecretFolderItem
              ? 'bg-amber-50/80 dark:bg-amber-950/40 border-l-4 border-amber-500'
              : 'bg-sky-50/80 dark:bg-sky-950/40 border-l-4 border-sky-500'
            : isSecretFolderItem
            ? 'bg-amber-50/20 dark:bg-amber-950/10 hover:bg-amber-50/50 dark:hover:bg-amber-950/30'
            : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
        }`}
      >
        {/* Avatar with Online Badge and Anti-Peep Blur */}
        <div className="relative shrink-0">
          <div className={isStealthMode ? 'filter blur-[4px] transition-all' : ''}>
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
          </div>

          {partner.online && (
            <span
              title="Online"
              className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full"
            />
          )}

          {locked && (
            <span
              title="Secret Locked Chat"
              className="absolute top-0 right-0 p-0.5 rounded-full bg-amber-500 text-white shadow-xs"
            >
              <Lock className="w-2.5 h-2.5" />
            </span>
          )}
        </div>

        {/* Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <span
              className={`font-semibold text-sm text-slate-800 dark:text-slate-100 truncate ${
                isStealthMode ? 'filter blur-[3px]' : ''
              }`}
            >
              {partner.name}
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
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
                  {isStealthMode ? (
                    <span className="text-slate-400 font-mono text-[11px] tracking-widest">
                      ••••••••••••••••
                    </span>
                  ) : (
                    <span className="truncate">
                      {chat.lastMessage?.isSecret
                        ? '🔒 সিক্রেট মেসেজ'
                        : chat.lastMessage?.text || 'No messages yet'}
                    </span>
                  )}
                </>
              )}
            </div>

            <div className="flex items-center gap-1.5 ml-2">
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 min-w-[18px] text-center bg-sky-500 text-white text-[10px] font-bold rounded-full">
                  {unreadCount}
                </span>
              )}

              {/* Quick lock toggle button */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleLockChat(chat.chatId);
                }}
                title={locked ? 'সিক্রেট চ্যাট আনলক করুন' : 'এই চ্যাটটি সিক্রেট ও গোপন করুন'}
                className="opacity-0 group-hover/item:opacity-100 p-1 rounded-md text-slate-400 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
              >
                {locked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800">
      <PinModal
        isOpen={showPinModal}
        onClose={() => setShowPinModal(false)}
        onSuccess={handleVaultUnlockSuccess}
        title="সিক্রেট চ্যাট ভল্ট আনলক করুন"
        description="লক করা গোপন চ্যাটগুলো দেখতে ৪-ডিজিটের পিন দিন (ডিফল্ট: 1234)"
      />

      {/* Header with Privacy & Android Tools */}
      <div className="p-3.5 border-b border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">Chats</h2>
          {isStealthMode && (
            <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] font-bold border border-amber-500/20 flex items-center gap-1">
              <EyeOff className="w-2.5 h-2.5" />
              <span>গোপন মোড</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {/* Stealth Mode Toggle */}
          <button
            onClick={toggleStealthMode}
            title={
              isStealthMode
                ? 'স্টিলথ মোড বন্ধ করুন (চ্যাট দৃশ্যমান)'
                : 'স্টিলথ মোড চালু করুন (চ্যাট ঝাপসা/গোপন রাখুন)'
            }
            className={`p-2 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
              isStealthMode
                ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200'
            }`}
          >
            {isStealthMode ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>

          {/* Camouflage / Panic Screen */}
          <button
            onClick={toggleCamouflage}
            title="ক্যামোফ্লেজ প্যানিক মোড (এক ক্লিকে নোট স্ক্রিনে চলে যান)"
            className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
          >
            <FileText className="w-4 h-4" />
          </button>

          {/* Android App Download button */}
          <PWAInstallButton variant="compact" />

          {/* New Chat */}
          <button
            onClick={onNewChatClick}
            title="নতুন চ্যাট শুরু করুন"
            className="p-2 rounded-xl bg-sky-50 dark:bg-sky-950/50 hover:bg-sky-100 dark:hover:bg-sky-900/50 text-sky-600 dark:text-sky-400 border border-sky-200 dark:border-sky-800/60 transition-colors cursor-pointer"
          >
            <MessageSquarePlus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Search Input */}
      <div className="p-3 pb-2">
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

      {/* Secret Vault Section Header */}
      <div className="px-3 py-1">
        <div
          onClick={handleVaultClick}
          className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
            isVaultUnlocked
              ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800/60 text-amber-900 dark:text-amber-200'
              : 'bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 hover:bg-slate-200/70'
          }`}
        >
          <div className="flex items-center gap-2 text-xs font-bold">
            <div
              className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                isVaultUnlocked
                  ? 'bg-amber-500 text-white'
                  : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
              }`}
            >
              {isVaultUnlocked ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
            </div>
            <span>সিক্রেট লক চ্যাট ভল্ট</span>
            {lockedChatIds.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-white text-[10px]">
                {lockedChatIds.length}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 text-xs">
            {isVaultUnlocked ? (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  lockVault();
                  setShowLockedSection(false);
                }}
                className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 hover:underline"
              >
                লক করুন
              </button>
            ) : (
              <span className="text-[11px] text-slate-400 flex items-center gap-1">
                <span>আনলক পিন</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Chat List Items */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/50">
        {/* Unlocked Secret Chats Section */}
        {isVaultUnlocked && showLockedSection && secretChats.length > 0 && (
          <div className="bg-amber-500/5 dark:bg-amber-500/10 border-b border-amber-300/40 dark:border-amber-800/40">
            <div className="px-4 py-1.5 text-[11px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>গোপন ও সুরক্ষিত চ্যাটসমূহ</span>
            </div>
            {secretChats.map((c) => renderChatItem(c, true))}
          </div>
        )}

        {/* Regular chats */}
        {normalChats.length === 0 && (!isVaultUnlocked || secretChats.length === 0) ? (
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
          normalChats.map((chat) => renderChatItem(chat, false))
        )}
      </div>
    </div>
  );
};
