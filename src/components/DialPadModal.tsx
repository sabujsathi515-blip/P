import React, { useState } from 'react';
import type { UserProfile } from '../types/user';
import type { CallType } from '../types/call';
import {
  Phone,
  Video,
  X,
  Delete,
  User,
  Search,
  Sparkles,
  PhoneCall,
  Smartphone,
} from 'lucide-react';

interface DialPadModalProps {
  isOpen: boolean;
  onClose: () => void;
  contacts: UserProfile[];
  currentUserId: string;
  onStartCall: (targetUser: UserProfile, type: CallType) => void;
}

export const DialPadModal: React.FC<DialPadModalProps> = ({
  isOpen,
  onClose,
  contacts,
  currentUserId,
  onStartCall,
}) => {
  const [dialValue, setDialValue] = useState('');

  if (!isOpen) return null;

  const handleKeyPress = (num: string) => {
    setDialValue((prev) => prev + num);
  };

  const handleBackspace = () => {
    setDialValue((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    setDialValue('');
  };

  // Find matching contact by phone number or name or userId
  const cleanDial = dialValue.replace(/[\s-]/g, '').toLowerCase();
  const matchedContact = contacts.find((c) => {
    if (c.userId === currentUserId) return false;
    const cleanPhone = (c.phoneNumber || '').replace(/[\s-]/g, '').toLowerCase();
    return (
      (cleanPhone && cleanDial && (cleanPhone.includes(cleanDial) || cleanDial.includes(cleanPhone))) ||
      c.name.toLowerCase().includes(dialValue.toLowerCase()) ||
      c.email.toLowerCase().includes(dialValue.toLowerCase()) ||
      c.userId.toLowerCase() === dialValue.toLowerCase()
    );
  });

  const handleInitiateCall = (type: CallType) => {
    if (!dialValue.trim()) return;

    let target: UserProfile;
    if (matchedContact) {
      target = matchedContact;
    } else {
      // Create ad-hoc contact for dialed number
      target = {
        userId: `dialed-${Date.now()}`,
        name: dialValue,
        phoneNumber: dialValue,
        email: `${dialValue.replace(/[^a-zA-Z0-9]/g, '')}@connectcall.io`,
        about: 'Directly dialed contact',
        online: true,
        lastSeen: Date.now(),
        createdAt: Date.now(),
      };
    }

    onClose();
    onStartCall(target, type);
  };

  const keys = [
    { num: '1', sub: '' },
    { num: '2', sub: 'ABC' },
    { num: '3', sub: 'DEF' },
    { num: '4', sub: 'GHI' },
    { num: '5', sub: 'JKL' },
    { num: '6', sub: 'MNO' },
    { num: '7', sub: 'PQRS' },
    { num: '8', sub: 'TUV' },
    { num: '9', sub: 'WXYZ' },
    { num: '*', sub: '' },
    { num: '0', sub: '+' },
    { num: '#', sub: '' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl text-slate-900 dark:text-slate-100 flex flex-col items-center">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Title */}
        <div className="flex items-center gap-2 mb-3">
          <PhoneCall className="w-5 h-5 text-emerald-500" />
          <h3 className="font-bold text-base text-slate-800 dark:text-slate-100">
            ডায়াল প্যাড (Dial Pad)
          </h3>
        </div>

        {/* Dial display box */}
        <div className="w-full text-center mb-4 min-h-[60px] flex flex-col items-center justify-center">
          <input
            type="text"
            value={dialValue}
            onChange={(e) => setDialValue(e.target.value)}
            placeholder="নম্বর বা নাম লিখুন..."
            className="w-full text-center text-2xl font-bold tracking-wider bg-transparent text-slate-800 dark:text-slate-100 focus:outline-hidden"
          />
          {matchedContact ? (
            <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 mt-1 font-semibold animate-in fade-in">
              <User className="w-3.5 h-3.5" />
              <span>{matchedContact.name} ({matchedContact.phoneNumber || matchedContact.email})</span>
            </div>
          ) : dialValue ? (
            <span className="text-[11px] text-slate-400 mt-1">Direct Dialing</span>
          ) : null}
        </div>

        {/* 12-Key Pad */}
        <div className="grid grid-cols-3 gap-3 w-full max-w-[280px] mb-5">
          {keys.map(({ num, sub }) => (
            <button
              key={num}
              onClick={() => handleKeyPress(num)}
              className="h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 transition-all flex flex-col items-center justify-center cursor-pointer border border-slate-200/50 dark:border-slate-700/50 shadow-xs"
            >
              <span className="text-xl font-bold text-slate-800 dark:text-slate-100 leading-none">{num}</span>
              {sub && <span className="text-[9px] font-semibold text-slate-400 mt-0.5 tracking-widest">{sub}</span>}
            </button>
          ))}
        </div>

        {/* Action Bar: Audio Call, Video Call, Backspace */}
        <div className="flex items-center justify-center gap-4 w-full">
          {/* Audio Call */}
          <button
            onClick={() => handleInitiateCall('audio')}
            disabled={!dialValue.trim()}
            className="w-14 h-14 rounded-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white flex items-center justify-center shadow-lg shadow-emerald-600/30 active:scale-95 transition-all cursor-pointer"
            title="Audio Call"
          >
            <Phone className="w-6 h-6" />
          </button>

          {/* Video Call */}
          <button
            onClick={() => handleInitiateCall('video')}
            disabled={!dialValue.trim()}
            className="w-14 h-14 rounded-full bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white flex items-center justify-center shadow-lg shadow-sky-600/30 active:scale-95 transition-all cursor-pointer"
            title="Video Call"
          >
            <Video className="w-6 h-6" />
          </button>

          {/* Backspace */}
          {dialValue && (
            <button
              onClick={handleBackspace}
              className="p-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
              title="Backspace"
            >
              <Delete className="w-6 h-6" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
