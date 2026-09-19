import React, { useState } from 'react';
import { usePrivacy } from '../contexts/PrivacyContext';
import { useAuth } from '../contexts/AuthContext';
import { Lock, LogOut, ShieldAlert, ArrowRight, KeyRound } from 'lucide-react';

export const ScreenLockOverlay: React.FC = () => {
  const { isAppLocked, unlockApp, secretPin } = usePrivacy();
  const { user, logout } = useAuth();
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isAppLocked) return null;

  const handleDigit = (digit: string) => {
    if (pin.length < 4) {
      const next = pin + digit;
      setPin(next);
      setError(null);

      if (next.length === 4) {
        if (unlockApp(next)) {
          setPin('');
        } else {
          setError('ভুল পিন কোড! আবার চেষ্টা করুন (ডিফল্ট: 1234)');
          setPin('');
        }
      }
    }
  };

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
    setError(null);
  };

  const handleLogoutToLogin = async () => {
    await logout();
    unlockApp(secretPin);
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center p-4 bg-slate-950 text-white select-none">
      {/* Background ambient lighting */}
      <div className="absolute top-1/3 -left-20 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/3 -right-20 w-80 h-80 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 text-center shadow-2xl relative z-10">
        {/* Shield icon */}
        <div className="w-16 h-16 mx-auto rounded-3xl bg-gradient-to-tr from-amber-600 to-orange-500 text-white flex items-center justify-center shadow-lg shadow-orange-500/20 mb-3">
          <Lock className="w-8 h-8" />
        </div>

        <h2 className="text-xl font-bold tracking-tight">ConnectCall সিক্রেট লক</h2>
        <p className="text-xs text-slate-400 mt-1">
          অননুমোদিত দেখা রোধ করতে আপনার চ্যাট লক করা হয়েছে। আনলক করতে পিন দিন।
        </p>

        {/* User avatar snippet */}
        {user && (
          <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800 border border-slate-700 text-xs text-slate-300">
            {user.photoURL ? (
              <img src={user.photoURL} alt={user.name} className="w-5 h-5 rounded-full object-cover" />
            ) : (
              <div className="w-5 h-5 rounded-full bg-sky-600 text-white font-bold flex items-center justify-center text-[10px]">
                {user.name.charAt(0)}
              </div>
            )}
            <span className="font-medium">{user.name}</span>
          </div>
        )}

        {error && (
          <div className="mt-3 py-1 px-3 rounded-lg bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs">
            {error}
          </div>
        )}

        {/* Dots */}
        <div className="flex items-center justify-center gap-3 my-5">
          {[0, 1, 2, 3].map((idx) => (
            <div
              key={idx}
              className={`w-3.5 h-3.5 rounded-full transition-all ${
                pin.length > idx ? 'bg-amber-400 scale-125' : 'bg-slate-700'
              }`}
            />
          ))}
        </div>

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-2.5 max-w-[220px] mx-auto mb-5">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((n) => (
            <button
              key={n}
              onClick={() => handleDigit(n)}
              className="h-11 rounded-2xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-base font-bold text-white transition-all cursor-pointer"
            >
              {n}
            </button>
          ))}
          <div />
          <button
            onClick={() => handleDigit('0')}
            className="h-11 rounded-2xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-base font-bold text-white transition-all cursor-pointer"
          >
            0
          </button>
          <button
            onClick={handleBackspace}
            className="h-11 rounded-2xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-xs font-semibold text-slate-400 transition-all flex items-center justify-center cursor-pointer"
          >
            মুছুন
          </button>
        </div>

        {/* Alternative: Sign Out to Login Screen */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
          <button
            onClick={handleLogoutToLogin}
            className="text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>অন্য অ্যাকাউন্টে লগইন</span>
          </button>

          <span className="text-[11px] text-slate-500">পিন: 1234</span>
        </div>
      </div>
    </div>
  );
};
