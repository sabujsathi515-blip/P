import React, { useState } from 'react';
import { Lock, X, KeyRound, AlertCircle, CheckCircle } from 'lucide-react';

interface PinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  title?: string;
  description?: string;
  isSettingNewPin?: boolean;
  currentPin?: string;
  onSetNewPin?: (newPin: string) => void;
}

export const PinModal: React.FC<PinModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  title = 'Enter Secret PIN',
  description = 'চ্যাট গোপন রাখতে আপনার ৪-ডিজিটের সিক্রেট পিন দিন (ডিফল্ট: 1234)',
  isSettingNewPin = false,
  currentPin = '1234',
  onSetNewPin,
}) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [confirmPin, setConfirmPin] = useState('');
  const [step, setStep] = useState<'enter' | 'confirm'>('enter');

  if (!isOpen) return null;

  const handleDigitClick = (num: string) => {
    if (pin.length < 4) {
      const nextPin = pin + num;
      setPin(nextPin);
      setError(null);

      if (nextPin.length === 4) {
        if (isSettingNewPin) {
          if (step === 'enter') {
            setConfirmPin(nextPin);
            setPin('');
            setStep('confirm');
          } else {
            if (nextPin === confirmPin) {
              onSetNewPin?.(nextPin);
              onSuccess();
              handleClose();
            } else {
              setError('পিন মিলছে না! আবার চেষ্টা করুন');
              setPin('');
            }
          }
        } else {
          // Verify PIN
          if (nextPin === currentPin || nextPin === '1234') {
            onSuccess();
            handleClose();
          } else {
            setError('ভুল পিন! আবার দিন (ডিফল্ট: 1234)');
            setPin('');
          }
        }
      }
    }
  };

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
    setError(null);
  };

  const handleClose = () => {
    setPin('');
    setConfirmPin('');
    setError(null);
    setStep('enter');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl text-center text-slate-900 dark:text-slate-100">
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Lock Icon */}
        <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center shadow-md mb-3">
          <Lock className="w-7 h-7" />
        </div>

        <h3 className="text-lg font-bold">
          {isSettingNewPin
            ? step === 'enter'
              ? 'নতুন সিক্রেট পিন সেট করুন'
              : 'পিন নিশ্চিত করুন'
            : title}
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
          {isSettingNewPin
            ? step === 'enter'
              ? '৪-ডিজিটের একটি নতুন সিক্রেট কোড প্রবেশ করান'
              : 'যাচাই করার জন্য পুনরায় একই পিন দিন'
            : description}
        </p>

        {/* Error message */}
        {error && (
          <div className="mt-3 py-1 px-3 rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 text-xs flex items-center justify-center gap-1.5 animate-shake">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* PIN Dots Display */}
        <div className="flex items-center justify-center gap-3 my-6">
          {[0, 1, 2, 3].map((idx) => {
            const isFilled = pin.length > idx;
            return (
              <div
                key={idx}
                className={`w-4 h-4 rounded-full transition-all duration-150 ${
                  isFilled
                    ? 'bg-amber-500 scale-110 shadow-xs shadow-amber-500/50'
                    : 'bg-slate-200 dark:bg-slate-700'
                }`}
              />
            );
          })}
        </div>

        {/* Numeric Keypad */}
        <div className="grid grid-cols-3 gap-2.5 max-w-[240px] mx-auto">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
            <button
              key={num}
              onClick={() => handleDigitClick(num)}
              className="h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 text-base font-bold text-slate-800 dark:text-slate-100 transition-all cursor-pointer select-none"
            >
              {num}
            </button>
          ))}
          <div />
          <button
            onClick={() => handleDigitClick('0')}
            className="h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 text-base font-bold text-slate-800 dark:text-slate-100 transition-all cursor-pointer select-none"
          >
            0
          </button>
          <button
            onClick={handleBackspace}
            className="h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-100 dark:hover:bg-rose-950/40 text-slate-500 hover:text-rose-600 active:scale-95 text-xs font-semibold transition-all flex items-center justify-center cursor-pointer select-none"
          >
            মুছুন
          </button>
        </div>

        {!isSettingNewPin && (
          <div className="mt-4 text-[11px] text-slate-400">
            ডিফল্ট সিক্রেট পিন: <span className="font-mono font-bold text-amber-500">1234</span>
          </div>
        )}
      </div>
    </div>
  );
};
