import React, { useState } from 'react';
import type { UserProfile } from '../types/user';
import { Search, Phone, Video, MessageSquare, UserCheck, ShieldAlert } from 'lucide-react';

interface ContactListProps {
  contacts: UserProfile[];
  currentUserId: string;
  onMessageClick: (contact: UserProfile) => void;
  onAudioCallClick: (contact: UserProfile) => void;
  onVideoCallClick: (contact: UserProfile) => void;
}

export const ContactList: React.FC<ContactListProps> = ({
  contacts,
  currentUserId,
  onMessageClick,
  onAudioCallClick,
  onVideoCallClick,
}) => {
  const [search, setSearch] = useState('');

  const filtered = contacts
    .filter((c) => c.userId !== currentUserId)
    .filter((c) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q);
    });

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">Contacts</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {filtered.length} contact{filtered.length === 1 ? '' : 's'} available
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="p-3.5 border-b border-slate-100 dark:border-slate-800/60">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 text-sm bg-slate-100 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 rounded-xl text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 transition-all"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/50 p-2">
        {filtered.length === 0 ? (
          <div className="p-10 text-center flex flex-col items-center justify-center text-slate-400">
            <UserCheck className="w-10 h-10 mb-2 opacity-50" />
            <p className="text-sm font-medium">No contacts match &quot;{search}&quot;</p>
            <p className="text-xs text-slate-500 mt-1">Try searching by partial name or email</p>
          </div>
        ) : (
          filtered.map((contact) => (
            <div
              key={contact.userId}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
            >
              {/* Contact Info */}
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative shrink-0">
                  {contact.photoURL ? (
                    <img
                      src={contact.photoURL}
                      alt={contact.name}
                      className="w-12 h-12 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white font-bold text-base shadow-xs">
                      {contact.name.charAt(0).toUpperCase()}
                    </div>
                  )}

                  {contact.online ? (
                    <span
                      title="Online"
                      className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full"
                    />
                  ) : (
                    <span
                      title="Offline"
                      className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-slate-300 dark:bg-slate-600 border-2 border-white dark:border-slate-900 rounded-full"
                    />
                  )}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-sm text-slate-800 dark:text-slate-100 truncate">
                      {contact.name}
                    </h3>
                    {contact.inCall && (
                      <span className="flex items-center gap-1 text-[11px] font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
                        <ShieldAlert className="w-3 h-3" />
                        In Call
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{contact.email}</p>
                  {contact.about && (
                    <p className="text-xs text-slate-400 dark:text-slate-500 truncate mt-0.5">
                      {contact.about}
                    </p>
                  )}
                </div>
              </div>

              {/* Action Buttons: Audio Call, Video Call, Message */}
              <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                <button
                  onClick={() => onAudioCallClick(contact)}
                  title="Audio Call"
                  className="p-2 sm:px-3 sm:py-2 text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/50 hover:bg-sky-100 dark:hover:bg-sky-900/50 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-sky-200 dark:border-sky-800/60"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Audio</span>
                </button>

                <button
                  onClick={() => onVideoCallClick(contact)}
                  title="Video Call"
                  className="p-2 sm:px-3 sm:py-2 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-emerald-200 dark:border-emerald-800/60"
                >
                  <Video className="w-3.5 h-3.5" />
                  <span>Video</span>
                </button>

                <button
                  onClick={() => onMessageClick(contact)}
                  title="Send Message"
                  className="p-2 sm:px-3 sm:py-2 text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Chat</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
