import React, { useState } from 'react';
import { isFirebaseConfigured, firebaseConfig } from '../services/firebase';
import { X, Copy, Check, ExternalLink, ShieldCheck, Database, Key, Upload, FileText, CheckCircle2, AlertCircle } from 'lucide-react';

interface SetupGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SetupGuideModal: React.FC<SetupGuideModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = useState(false);
  const [jsonInput, setJsonInput] = useState('');
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const isConfigured = isFirebaseConfigured();

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        parseAndApplyJson(text);
      }
    };
    reader.readAsText(file);
  };

  const parseAndApplyJson = (rawText: string) => {
    setImportError(null);
    setImportStatus(null);
    try {
      const data = JSON.parse(rawText);
      const projectId = data.project_info?.project_id || data.projectId;
      const senderId = data.project_info?.project_number || data.messagingSenderId;
      const storageBucket = data.project_info?.storage_bucket || data.storageBucket || `${projectId}.appspot.com`;
      const apiKey = data.client?.[0]?.api_key?.[0]?.current_key || data.apiKey;
      const appId = data.client?.[0]?.client_info?.mobilesdk_app_id || data.appId;
      const authDomain = `${projectId}.firebaseapp.com`;

      if (!projectId || !apiKey) {
        throw new Error('Valid project_id and api_key not found in the JSON file.');
      }

      const extracted = {
        apiKey,
        authDomain,
        projectId,
        storageBucket,
        messagingSenderId: String(senderId || ''),
        appId: appId || '',
      };

      localStorage.setItem('connectcall_firebase_config', JSON.stringify(extracted));
      setImportStatus(`সফলভাবে কানেক্ট হয়েছে! Project ID: ${projectId}. পেজ রিলোড হচ্ছে...`);
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Invalid JSON file.');
    }
  };

  const handleClearCustomConfig = () => {
    localStorage.removeItem('connectcall_firebase_config');
    window.location.reload();
  };

  const envTemplate = `# Firebase Web Configuration
VITE_FIREBASE_API_KEY=AIzaSy...
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=1234567890
VITE_FIREBASE_APP_ID=1:1234567890:web:...

# Optional Free STUN/TURN ICE Servers
# VITE_TURN_URL=turn:openrelay.metered.ca:80
# VITE_TURN_USERNAME=openrelayproject
# VITE_TURN_CREDENTIAL=openrelayproject`;

  const copyConfig = () => {
    navigator.clipboard.writeText(envTemplate);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-xl ${isConfigured ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400' : 'bg-amber-100 text-amber-600 dark:bg-amber-950 dark:text-amber-400'}`}>
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-800 dark:text-slate-100">
                {isConfigured ? 'Firebase Connected' : 'Firebase Setup Guide & Demo Mode'}
              </h3>
              <p className="text-xs text-slate-500">
                {isConfigured
                  ? 'Your app is connected to live Cloud Firestore & Auth'
                  : 'Currently operating in Zero-Config Demo Mode with full WebRTC'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
          {/* Active Config Status or 1-Click Upload */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 via-sky-500/10 to-indigo-500/10 border border-emerald-500/30">
            <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-100 mb-2">
              <Upload className="w-4 h-4 text-emerald-500" />
              <span>১-ক্লিকে google-services.json ফাইল আপলোড করুন:</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
              আপনার Firebase থেকে ডাউনলোড করা <code className="px-1 py-0.5 rounded bg-slate-200 dark:bg-slate-700 font-mono">google-services.json</code> ফাইলটি সরাসরি এখানে আপলোড করুন। অ্যাপ নিজে থেকেই সব কনফিগারেশন সেট করে নেবে।
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-2">
              <label className="w-full sm:w-auto px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer shadow-sm transition-all active:scale-95">
                <FileText className="w-4 h-4" />
                <span>Upload google-services.json</span>
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>

              {isConfigured && (
                <button
                  onClick={handleClearCustomConfig}
                  className="text-xs text-rose-500 hover:underline px-3 py-1 cursor-pointer"
                >
                  Reset / Clear Config
                </button>
              )}
            </div>

            {/* Paste JSON directly */}
            <div className="mt-3">
              <details className="text-xs text-slate-500">
                <summary className="cursor-pointer font-medium hover:text-slate-700 dark:hover:text-slate-300">
                  অথবা JSON টেক্সট পেস্ট করুন (Click to paste raw JSON)
                </summary>
                <div className="mt-2 space-y-2">
                  <textarea
                    rows={4}
                    value={jsonInput}
                    onChange={(e) => setJsonInput(e.target.value)}
                    placeholder='{"project_info": {"project_id": "my-app", ...}}'
                    className="w-full p-2 rounded-xl bg-slate-900 text-slate-200 font-mono text-[11px] border border-slate-700 focus:outline-hidden"
                  />
                  <button
                    onClick={() => parseAndApplyJson(jsonInput)}
                    disabled={!jsonInput.trim()}
                    className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    Apply Config
                  </button>
                </div>
              </details>
            </div>

            {importStatus && (
              <div className="mt-3 p-2.5 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>{importStatus}</span>
              </div>
            )}

            {importError && (
              <div className="mt-3 p-2.5 bg-rose-500/20 border border-rose-500/40 rounded-xl text-xs text-rose-800 dark:text-rose-300 flex items-center gap-2 font-medium">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                <span>{importError}</span>
              </div>
            )}
          </div>

          <div className="p-3.5 rounded-2xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 text-sky-800 dark:text-sky-200">
            <div className="flex items-center gap-2 font-bold mb-1">
              <ShieldCheck className="w-4 h-4 text-sky-500" />
              <span>Full WebRTC Functionality in Demo Mode</span>
            </div>
            <p className="text-xs text-sky-700 dark:text-sky-300">
              You can test real calls right now! Open two browser tabs or windows side-by-side, switch demo accounts via the demo switcher in the bottom bar, and start a video/audio call between tabs. WebRTC media streams run directly in hardware.
            </p>
          </div>

          <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm">
            How to Connect Your Real Firebase Project:
          </h4>

          <ol className="list-decimal pl-5 space-y-2 text-xs">
            <li>
              Go to the{' '}
              <a
                href="https://console.firebase.google.com"
                target="_blank"
                rel="noreferrer"
                className="text-sky-600 dark:text-sky-400 font-semibold underline inline-flex items-center gap-1"
              >
                Firebase Console <ExternalLink className="w-3 h-3" />
              </a>{' '}
              and click <strong>Add Project</strong>.
            </li>
            <li>
              Enable <strong>Authentication</strong> (Email/Password &amp; Google Sign-In).
            </li>
            <li>
              Enable <strong>Cloud Firestore</strong> (Start in production or test mode).
            </li>
            <li>
              Enable <strong>Firebase Storage</strong> for image attachment uploads.
            </li>
            <li>
              Create a Web App in Project Settings, copy the configuration values into your{' '}
              <code className="bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded font-mono">.env</code> file.
            </li>
          </ol>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-semibold text-xs text-slate-700 dark:text-slate-300">
                Environment Variables Template:
              </span>
              <button
                onClick={copyConfig}
                className="flex items-center gap-1 text-xs text-sky-600 dark:text-sky-400 hover:underline cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy Template'}</span>
              </button>
            </div>
            <pre className="p-3 bg-slate-900 text-slate-200 rounded-xl font-mono text-[11px] overflow-x-auto border border-slate-800">
              {envTemplate}
            </pre>
          </div>

          <div className="p-3 bg-slate-100 dark:bg-slate-800/60 rounded-xl text-xs flex items-start gap-2">
            <Key className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <p>
              Once your credentials are added to <code className="font-mono">.env</code>, restart the application to seamlessly transition from Demo Mode to production Firestore signaling.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-semibold cursor-pointer shadow-xs"
          >
            Got it, continue testing
          </button>
        </div>
      </div>
    </div>
  );
};
