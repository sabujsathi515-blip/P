import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { AndroidAppDownloadModal } from './AndroidAppDownloadModal';
import { Smartphone, Download } from 'lucide-react';

interface PWAInstallButtonProps {
  variant?: 'compact' | 'full' | 'sidebar';
  className?: string;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  variant = 'compact',
  className = '',
}) => {
  const { isInstalled } = usePWAInstall();
  const [showModal, setShowModal] = useState(false);

  // If already installed and running standalone, still show a compact launcher info or hide
  return (
    <>
      <AndroidAppDownloadModal isOpen={showModal} onClose={() => setShowModal(false)} />

      {variant === 'sidebar' ? (
        <button
          onClick={() => setShowModal(true)}
          title="Download Android App (অ্যান্ড্রয়েড অ্যাপ ডাউনলোড)"
          className={`relative w-11 h-11 rounded-2xl flex items-center justify-center transition-all cursor-pointer text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800/60 shadow-xs ${className}`}
        >
          <Smartphone className="w-5 h-5" />
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping" />
        </button>
      ) : variant === 'full' ? (
        <button
          onClick={() => setShowModal(true)}
          className={`flex items-center justify-center gap-2 px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-sky-600 hover:from-emerald-500 hover:to-sky-500 text-white text-xs font-semibold shadow-sm hover:shadow transition-all cursor-pointer ${className}`}
        >
          <Download className="w-4 h-4" />
          <span>অ্যান্ড্রয়েড অ্যাপ ডাউনলোড</span>
        </button>
      ) : (
        <button
          onClick={() => setShowModal(true)}
          title="Android App ডাউনলোড করুন"
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold border border-emerald-500/20 transition-colors cursor-pointer ${className}`}
        >
          <Smartphone className="w-3.5 h-3.5 shrink-0" />
          <span className="hidden sm:inline">Android App</span>
        </button>
      )}
    </>
  );
};
