import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import {
  Download,
  Smartphone,
  CheckCircle2,
  X,
  Share2,
  Shield,
  WifiOff,
  BellRing,
  ExternalLink,
  Copy,
  Check,
} from 'lucide-react';

interface AndroidAppDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AndroidAppDownloadModal: React.FC<AndroidAppDownloadModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { isInstallable, isInstalled, isAndroid, install } = usePWAInstall();
  const [copiedLink, setCopiedLink] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [installSuccess, setInstallSuccess] = useState(false);

  if (!isOpen) return null;

  const currentUrl = window.location.href;

  const handleInstallClick = async () => {
    setInstalling(true);
    const result = await install();
    setInstalling(false);
    if (result) {
      setInstallSuccess(true);
      setTimeout(() => {
        onClose();
      }, 2000);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(currentUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleDownloadAppLauncher = () => {
    // Generate a standalone HTML / web shortcut file that opens ConnectCall directly
    const shortcutContent = `[InternetShortcut]
URL=${currentUrl}
IconFile=${window.location.origin}/pwa-192x192.png
IconIndex=0
`;
    const blob = new Blob([shortcutContent], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ConnectCall-Android-App.url';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl text-slate-900 dark:text-slate-100 max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3.5 mb-5">
          <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-emerald-500 to-sky-600 text-white flex items-center justify-center shadow-lg shadow-sky-500/20 shrink-0">
            <Smartphone className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold tracking-tight">Android App Download</h2>
              <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold uppercase tracking-wider border border-emerald-500/20">
                APK / PWA
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              ConnectCall অ্যান্ড্রয়েড ফোনে ডাউনলোড ও ইনস্টল করুন
            </p>
          </div>
        </div>

        {/* Primary Download / Install Action */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-sky-50 to-indigo-50 dark:from-slate-800/80 dark:to-slate-800/40 border border-sky-200 dark:border-slate-700 mb-5">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <span>ConnectCall Mobile for Android</span>
                {isInstalled && (
                  <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Installed
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                কোনো প্লে স্টোর ছাড়াই সরাসরি ফোনে ডাউনলোড ও ইনস্টল করুন। ফুলস্ক্রিন কলিং ও সিক্রেট চ্যাট সুবিধা।
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-2.5">
            {isInstallable ? (
              <button
                onClick={handleInstallClick}
                disabled={installing || installSuccess}
                className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-sky-600 to-emerald-600 hover:from-sky-500 hover:to-emerald-500 text-white text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>
                  {installSuccess
                    ? 'ইনস্টলেশন সফল!'
                    : installing
                    ? 'ইনস্টল হচ্ছে...'
                    : 'Download & Install App (1-Click)'}
                </span>
              </button>
            ) : (
              <button
                onClick={handleDownloadAppLauncher}
                className="w-full sm:flex-1 py-3 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download Android Web Launcher</span>
              </button>
            )}

            <button
              onClick={handleCopyLink}
              className="w-full sm:w-auto py-3 px-4 rounded-xl bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              title="Copy Android App URL"
            >
              {copiedLink ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              <span>{copiedLink ? 'কপি হয়েছে' : 'লিংক কপি করুন'}</span>
            </button>
          </div>
        </div>

        {/* Step-by-Step Android Installation Guide */}
        <div className="space-y-3 mb-5">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            অ্যান্ড্রয়েড ফোনে যেভাবে ডাউনলোড করবেন (Chrome Browser)
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
              <div className="w-6 h-6 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold text-xs mb-2">
                ১
              </div>
              <div className="font-semibold text-slate-800 dark:text-slate-200">Chrome মেনু চাপুন</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                ব্রাউজারের উপরে ডানদিকের তিনটি ডট (⋮) বাটনে চাপ দিন।
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
              <div className="w-6 h-6 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold text-xs mb-2">
                ২
              </div>
              <div className="font-semibold text-slate-800 dark:text-slate-200">"Install app" চাপুন</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                মেনু থেকে <strong>"Install app"</strong> অথবা <strong>"Add to Home screen"</strong> সিলেক্ট করুন।
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
              <div className="w-6 h-6 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold text-xs mb-2">
                ৩
              </div>
              <div className="font-semibold text-slate-800 dark:text-slate-200">অ্যাপ ডাউনলোড শেষ!</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                ফোনের হোমস্ক্রিনে ConnectCall অ্যাপ আইকন চলে আসবে এবং সরাসরি চালু হবে।
              </div>
            </div>
          </div>
        </div>

        {/* Native Android Features */}
        <div className="p-3.5 rounded-2xl bg-slate-100/70 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
          <div className="text-xs font-semibold text-slate-800 dark:text-slate-200 mb-2">
            অ্যান্ড্রয়েড অ্যাপের বিশেষ সুবিধাসমূহ:
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-600 dark:text-slate-400">
            <div className="flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span>সিক্রেট চ্যাট ও পিন লক</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Smartphone className="w-3.5 h-3.5 text-sky-500 shrink-0" />
              <span>ফুলস্ক্রিন ভিডিও ও অডিও কল</span>
            </div>
            <div className="flex items-center gap-1.5">
              <WifiOff className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span>অফলাইন ক্যাশিং ও দ্রুত গতি</span>
            </div>
            <div className="flex items-center gap-1.5">
              <BellRing className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
              <span>ইনকামিং কল রিংটোন ও নোটিফিকেশন</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-5 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-xs font-semibold transition-colors cursor-pointer"
          >
            বন্ধ করুন
          </button>
        </div>
      </div>
    </div>
  );
};
