import React, { useState, useMemo } from 'react';
import type { UserProfile } from '../types/user';
import { useAuth } from '../contexts/AuthContext';
import {
  Search,
  Phone,
  Video,
  MessageSquare,
  UserCheck,
  ShieldAlert,
  UserPlus,
  X,
  Check,
  Copy,
  AlertCircle,
  Mail,
  Send,
  AtSign,
  User,
  Sparkles,
  Smartphone,
  PhoneCall,
} from 'lucide-react';

interface ContactListProps {
  contacts: UserProfile[];
  currentUserId: string;
  onMessageClick: (contact: UserProfile) => void;
  onAudioCallClick: (contact: UserProfile) => void;
  onVideoCallClick: (contact: UserProfile) => void;
  onOpenCallAnotherMobile?: () => void;
  onOpenDialPad?: () => void;
}

export const ContactList: React.FC<ContactListProps> = ({
  contacts,
  currentUserId,
  onMessageClick,
  onAudioCallClick,
  onVideoCallClick,
  onOpenCallAnotherMobile,
  onOpenDialPad,
}) => {
  const { addNewContact } = useAuth();

  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // Form states for adding by Email ID
  const [emailInput, setEmailInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [aboutInput, setAboutInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Filter contacts by email or name
  const filtered = useMemo(() => {
    return contacts
      .filter((c) => c.userId !== currentUserId)
      .filter((c) => {
        if (!search.trim()) return true;
        const q = search.toLowerCase().trim();
        const matchesName = c.name?.toLowerCase().includes(q);
        const matchesEmail = c.email?.toLowerCase().includes(q);
        return matchesName || matchesEmail;
      });
  }, [contacts, currentUserId, search]);

  // Check if typed search query looks like a valid email not yet in current user's contact list
  const isSearchAnEmail = useMemo(() => {
    const trimmed = search.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(trimmed);
  }, [search]);

  const searchEmailAlreadyExists = useMemo(() => {
    if (!isSearchAnEmail) return null;
    const trimmed = search.trim().toLowerCase();
    return contacts.find((c) => c.userId !== currentUserId && c.email.toLowerCase() === trimmed);
  }, [isSearchAnEmail, contacts, currentUserId, search]);

  // Real-time matched user in the modal
  const matchedUserInModal = useMemo(() => {
    const trimmed = emailInput.trim().toLowerCase();
    if (!trimmed || !trimmed.includes('@')) return null;
    return contacts.find((c) => c.email.toLowerCase() === trimmed);
  }, [emailInput, contacts]);

  const handleCopyEmail = (email: string) => {
    navigator.clipboard.writeText(email);
    setCopiedEmail(email);
    setTimeout(() => setCopiedEmail(null), 2000);
  };

  // Quick connect from the search bar
  const handleQuickConnectBySearchEmail = async () => {
    const cleanEmail = search.trim().toLowerCase();
    if (!cleanEmail) return;

    setIsSubmitting(true);
    try {
      const created = await addNewContact({
        email: cleanEmail,
      });
      setSuccessToast(`"${created.name}" (${cleanEmail}) এর সাথে কানেক্ট হয়েছে!`);
      setTimeout(() => setSuccessToast(null), 3000);
      setSearch('');
      onMessageClick(created);
    } catch (err: unknown) {
      alert((err as Error).message || 'কানেক্ট করতে সমস্যা হয়েছে');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Add Contact Form
  const handleCreateContact = async (startChatNow = false) => {
    setErrorMessage('');
    const cleanEmail = emailInput.trim().toLowerCase();

    if (!cleanEmail) {
      setErrorMessage('অনুগ্রহ করে সঠিক ইমেইল আইডি লিখুন।');
      return;
    }

    if (!cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setErrorMessage('সঠিক ইমেইল ফরম্যাট লিখুন (যেমন: name@example.com)');
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await addNewContact({
        email: cleanEmail,
        name: nameInput.trim() || undefined,
        about: aboutInput.trim() || undefined,
      });

      setSuccessToast(`"${created.name}" (${cleanEmail}) কন্টাক্ট হিসেবে সেভ হয়েছে!`);
      setTimeout(() => setSuccessToast(null), 3000);

      // Reset form
      setEmailInput('');
      setNameInput('');
      setAboutInput('');
      setShowAddModal(false);

      if (startChatNow) {
        onMessageClick(created);
      }
    } catch (err: unknown) {
      setErrorMessage((err as Error).message || 'কন্টাক্ট সেভ করতে সমস্যা হয়েছে');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 relative">
      {/* Header */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2">
            <span>Contacts</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              {filtered.length}
            </span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            ইমেইল আইডি দিয়ে কন্টাক্ট সেভ ও যোগাযোগ করুন
          </p>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap justify-end">
          {onOpenDialPad && (
            <button
              onClick={onOpenDialPad}
              className="p-2 text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
              title="ডায়াল প্যাড খুলুন"
            >
              <PhoneCall className="w-3.5 h-3.5 text-emerald-500" />
            </button>
          )}

          {onOpenCallAnotherMobile && (
            <button
              onClick={onOpenCallAnotherMobile}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-sky-600 hover:from-emerald-500 hover:to-sky-500 rounded-xl shadow-xs transition-all cursor-pointer active:scale-95 animate-pulse"
              title="অন্য মোবাইলে কল দিন"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">২য় মোবাইলে কল</span>
            </button>
          )}

          {/* Add Contact by Email Button */}
          <button
            onClick={() => {
              setErrorMessage('');
              setEmailInput('');
              setNameInput('');
              setAboutInput('');
              setShowAddModal(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 rounded-xl shadow-xs transition-all cursor-pointer hover:shadow-sky-500/20 active:scale-95"
          >
            <Mail className="w-3.5 h-3.5" />
            <span>+ নতুন কন্টাক্ট</span>
          </button>
        </div>
      </div>

      {/* Success Notification Toast */}
      {successToast && (
        <div className="mx-3.5 mt-2.5 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-2 animate-fadeIn">
          <Check className="w-4 h-4 text-emerald-500 shrink-0" />
          <span className="font-medium">{successToast}</span>
        </div>
      )}

      {/* Search Bar */}
      <div className="p-3.5 border-b border-slate-100 dark:border-slate-800/60 space-y-2">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="ইমেইল আইডি বা নাম দিয়ে খুঁজুন..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 text-sm bg-slate-100 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 rounded-xl text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 transition-all font-sans"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Quick Email Direct-Connect Helper when user types an email */}
        {isSearchAnEmail && !searchEmailAlreadyExists && (
          <div className="p-2.5 rounded-xl bg-sky-50 dark:bg-sky-950/50 border border-sky-200 dark:border-sky-800/60 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Mail className="w-4 h-4 text-sky-500 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs font-semibold text-sky-900 dark:text-sky-200 truncate">
                  {search.trim()}
                </p>
                <p className="text-[11px] text-sky-600 dark:text-sky-400">
                  সরাসরি এই ইমেইলে চ্যাট বা কল করতে চান?
                </p>
              </div>
            </div>
            <button
              onClick={handleQuickConnectBySearchEmail}
              disabled={isSubmitting}
              className="px-3 py-1.5 text-xs font-bold text-white bg-sky-600 hover:bg-sky-500 rounded-lg shadow-xs cursor-pointer shrink-0 flex items-center gap-1 active:scale-95 transition-all"
            >
              <Send className="w-3 h-3" />
              <span>কানেক্ট ও চ্যাট</span>
            </button>
          </div>
        )}
      </div>

      {/* Contact List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/50 p-2">
        {filtered.length === 0 ? (
          <div className="p-10 text-center flex flex-col items-center justify-center text-slate-400">
            <div className="w-14 h-14 rounded-2xl bg-sky-50 dark:bg-sky-950/50 border border-sky-100 dark:border-sky-900 flex items-center justify-center text-sky-500 mb-3">
              <Mail className="w-7 h-7" />
            </div>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              {search ? 'কোনো কন্টাক্ট পাওয়া যায়নি' : 'কন্টাক্ট তালিকা খালি'}
            </p>
            <p className="text-xs text-slate-500 mt-1 max-w-xs text-center">
              কারও <b>ইমেইল আইডি</b> দিয়ে তাকে কন্টাক্ট হিসেবে সেভ করুন এবং সরাসরি চ্যাট বা কল করুন।
            </p>
            <button
              onClick={() => {
                if (isSearchAnEmail) {
                  setEmailInput(search.trim());
                }
                setShowAddModal(true);
              }}
              className="mt-4 px-4 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-500 rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5 transition-all"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>+ ইমেইল দিয়ে কন্টাক্ট যোগ করুন</span>
            </button>
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
                      {contact.name ? contact.name.charAt(0).toUpperCase() : contact.email.charAt(0).toUpperCase()}
                    </div>
                  )}

                  {contact.online ? (
                    <span
                      title="অনলাইন (Online)"
                      className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full"
                    />
                  ) : (
                    <span
                      title="অফলাইন (Offline)"
                      className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-slate-300 dark:bg-slate-600 border-2 border-white dark:border-slate-900 rounded-full"
                    />
                  )}
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-sm text-slate-800 dark:text-slate-100 truncate">
                      {contact.name || contact.email.split('@')[0]}
                    </h3>
                    {contact.inCall && (
                      <span className="flex items-center gap-1 text-[10px] font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded-full border border-amber-200 dark:border-amber-800 shrink-0">
                        <ShieldAlert className="w-3 h-3" />
                        In Call
                      </span>
                    )}
                  </div>

                  {/* Primary Contact Detail: Email ID */}
                  <div className="flex items-center gap-1.5 text-xs text-sky-600 dark:text-sky-400 mt-0.5">
                    <Mail className="w-3 h-3 text-sky-500 shrink-0" />
                    <span className="font-mono text-[12px] truncate max-w-[200px] sm:max-w-[240px]">
                      {contact.email}
                    </span>
                    <button
                      onClick={() => handleCopyEmail(contact.email)}
                      title="ইমেইল কপি করুন"
                      className="text-slate-400 hover:text-sky-600 dark:hover:text-sky-300 p-0.5 rounded cursor-pointer transition-colors"
                    >
                      {copiedEmail === contact.email ? (
                        <Check className="w-3 h-3 text-emerald-500" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                    <a
                      href={`mailto:${contact.email}`}
                      title="ইমেইল পাঠান"
                      className="text-slate-400 hover:text-sky-500 p-0.5 rounded cursor-pointer"
                    >
                      <AtSign className="w-3 h-3" />
                    </a>
                  </div>

                  {contact.about && (
                    <p className="text-xs text-slate-400 dark:text-slate-500 truncate mt-0.5">
                      {contact.about}
                    </p>
                  )}
                </div>
              </div>

              {/* Action Buttons: Audio Call, Video Call, Message */}
              <div className="flex items-center gap-1.5 self-end sm:self-center shrink-0">
                <button
                  onClick={() => onAudioCallClick(contact)}
                  title="Audio Call"
                  className="p-2 sm:px-2.5 sm:py-1.5 text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/50 hover:bg-sky-100 dark:hover:bg-sky-900/50 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-sky-200 dark:border-sky-800/60"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Audio</span>
                </button>

                <button
                  onClick={() => onVideoCallClick(contact)}
                  title="Video Call"
                  className="p-2 sm:px-2.5 sm:py-1.5 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-emerald-200 dark:border-emerald-800/60"
                >
                  <Video className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Video</span>
                </button>

                <button
                  onClick={() => onMessageClick(contact)}
                  title="Send Message"
                  className="p-2 sm:px-3 sm:py-1.5 text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Chat</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* MODAL: Add New Contact by Email ID */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 relative">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 bg-sky-50 dark:bg-sky-950/50 border border-sky-200 dark:border-sky-800 text-sky-600 dark:text-sky-400 rounded-xl">
                <Mail className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  ইমেইল আইডি দিয়ে কন্টাক্ট যোগ করুন
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  কারও ইমেইল লিখে তাকে কন্টাক্টে যুক্ত ও মেসেজ করুন
                </p>
              </div>
            </div>

            {errorMessage && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleCreateContact(false);
              }}
              className="space-y-4"
            >
              {/* Email ID (Primary & Required) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  ইমেইল আইডি (Email ID) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    autoFocus
                    placeholder="যেমন: friend@gmail.com বা user@example.com"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 transition-all font-sans"
                  />
                </div>

                {/* If registered user detected */}
                {matchedUserInModal && (
                  <div className="mt-2 p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>
                      রেজিস্টার্ড ইউজার পাওয়া গেছে: <b>{matchedUserInModal.name}</b>
                    </span>
                  </div>
                )}
              </div>

              {/* Name (Optional) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  কন্টাক্টের নাম <span className="text-slate-400 text-[11px] font-normal">(ঐচ্ছিক - খালি রাখলে ইমেইল থেকে নাম হবে)</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="যেমন: সাকিব হাসান / Shakib"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 transition-all"
                  />
                </div>
              </div>

              {/* About / Note (Optional) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  কন্টাক্ট নোট / সম্পর্ক <span className="text-slate-400 text-[11px] font-normal">(ঐচ্ছিক)</span>
                </label>
                <input
                  type="text"
                  placeholder="যেমন: বন্ধু, অফিস, পরিবার"
                  value={aboutInput}
                  onChange={(e) => setAboutInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 transition-all"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-3 flex flex-col-reverse sm:flex-row items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="w-full sm:w-auto px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  বাতিল
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto px-4 py-2.5 text-xs font-semibold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>কন্টাক্ট সেভ করুন</span>
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleCreateContact(true)}
                  className="w-full sm:w-auto px-4 py-2.5 text-xs font-bold text-white bg-sky-600 hover:bg-sky-500 disabled:opacity-50 rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-95"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>যোগ করুন ও চ্যাট শুরু করুন</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
