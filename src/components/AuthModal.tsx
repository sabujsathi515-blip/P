import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { PWAInstallButton } from './PWAInstallButton';
import { Phone, Mail, Lock, User, ArrowRight, Check, AlertCircle, Camera, ShieldCheck, Smartphone } from 'lucide-react';

interface AuthViewProps {
  onSuccess?: () => void;
  onClose?: () => void;
}

type AuthMode = 'welcome' | 'login' | 'register' | 'forgot' | 'profile_setup';

export const AuthView: React.FC<AuthViewProps> = ({ onSuccess, onClose }) => {
  const { login, register, resetPassword, signInWithGoogle, switchDemoUser, demoUsers, isFirebase } = useAuth();

  const [mode, setMode] = useState<AuthMode>('welcome');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [about, setAbout] = useState('Hey there! I am using ConnectCall.');
  const [photoURL, setPhotoURL] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const clearForm = () => {
    setError(null);
    setSuccessMsg(null);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    clearForm();
    setLoading(true);
    try {
      await login(email, password);
      onSuccess?.();
    } catch (err: unknown) {
      setError((err as Error).message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    clearForm();

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setMode('profile_setup');
  };

  const handleCompleteProfileSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    clearForm();
    setLoading(true);
    try {
      await register(fullName, email, password, photoURL || undefined, about);
      onSuccess?.();
    } catch (err: unknown) {
      setError((err as Error).message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    clearForm();
    if (!email) {
      setError('Please provide your account email');
      return;
    }
    setLoading(true);
    try {
      await resetPassword(email);
      setSuccessMsg('Password reset instructions sent to your email.');
    } catch (err: unknown) {
      setError((err as Error).message || 'Failed to send reset link');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    clearForm();
    setLoading(true);
    try {
      await signInWithGoogle();
      onSuccess?.();
    } catch (err: unknown) {
      setError((err as Error).message || 'Google sign in failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = (userItem: (typeof demoUsers)[0]) => {
    switchDemoUser(userItem);
    onSuccess?.();
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-950 p-4 select-none relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 -left-20 w-80 h-80 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 text-white shadow-2xl relative z-10 animate-in fade-in duration-200">
        {/* Logo / Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-sky-600 to-emerald-500 flex items-center justify-center text-white shadow-lg mb-3">
            <Phone className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white">CONNECTCALL</h1>
          <p className="text-xs text-slate-400 mt-1">Connect instantly. Talk freely.</p>
        </div>

        {/* Error message banner */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Success message banner */}
        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-950/60 border border-emerald-800/80 text-emerald-300 text-xs flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* MODE: WELCOME */}
        {mode === 'welcome' && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-slate-800/60 border border-slate-700/60 text-xs text-slate-300 text-center leading-relaxed">
              Experience ultra-crisp audio, high-definition video calls, and instant real-time messaging powered by WebRTC.
            </div>

            <div className="space-y-2.5 pt-2">
              <button
                onClick={() => {
                  clearForm();
                  setMode('login');
                }}
                className="w-full py-3 px-4 bg-sky-600 hover:bg-sky-500 text-white font-semibold rounded-xl text-sm shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Sign In to Your Account</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => {
                  clearForm();
                  setMode('register');
                }}
                className="w-full py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl text-sm border border-slate-700 transition-all cursor-pointer"
              >
                Create New Account
              </button>

              {isFirebase && (
                <button
                  onClick={handleGoogleSignIn}
                  disabled={loading}
                  className="w-full py-2.5 px-4 bg-white hover:bg-slate-100 text-slate-900 font-semibold rounded-xl text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.67v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.16z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.34 24 12 24z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.16 0 9.97 0 12s.45 3.84 1.25 5.42l4.03-3.15z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.34 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                    />
                  </svg>
                  <span>Sign In with Google</span>
                </button>
              )}
            </div>

            {/* Instant Demo Switcher */}
            <div className="pt-4 border-t border-slate-800">
              <p className="text-[11px] text-center text-slate-400 mb-2 font-medium">
                Or jump right in with a Demo Profile:
              </p>
              <div className="grid grid-cols-2 gap-2">
                {demoUsers.slice(0, 4).map((u) => (
                  <button
                    key={u.userId}
                    onClick={() => handleDemoLogin(u)}
                    className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-left border border-slate-700/60 transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <img
                      src={u.photoURL}
                      alt={u.name}
                      className="w-7 h-7 rounded-full object-cover shrink-0"
                    />
                    <div className="truncate">
                      <div className="text-xs font-semibold text-white truncate">{u.name}</div>
                      <div className="text-[10px] text-slate-400 capitalize">{u.role || 'Member'}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* MODE: LOGIN */}
        {mode === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 text-sm bg-slate-800 text-white border border-slate-700 rounded-xl focus:outline-hidden focus:border-sky-500"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => {
                    clearForm();
                    setMode('forgot');
                  }}
                  className="text-xs text-sky-400 hover:underline cursor-pointer"
                >
                  Forgot?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 text-sm bg-slate-800 text-white border border-slate-700 rounded-xl focus:outline-hidden focus:border-sky-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-semibold rounded-xl text-sm shadow-md transition-all cursor-pointer mt-2"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>

            <div className="text-center text-xs text-slate-400 pt-2">
              Don&apos;t have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  clearForm();
                  setMode('register');
                }}
                className="text-sky-400 font-semibold hover:underline cursor-pointer"
              >
                Register
              </button>
            </div>

            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  clearForm();
                  setMode('welcome');
                }}
                className="text-xs text-slate-500 hover:text-slate-300 cursor-pointer"
              >
                ← Back
              </button>
            </div>
          </form>
        )}

        {/* MODE: REGISTER (Step 1) */}
        {mode === 'register' && (
          <form onSubmit={handleRegister} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Full Name
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  placeholder="Alex Rivera"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2 text-sm bg-slate-800 text-white border border-slate-700 rounded-xl focus:outline-hidden focus:border-sky-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder="alex@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2 text-sm bg-slate-800 text-white border border-slate-700 rounded-xl focus:outline-hidden focus:border-sky-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  placeholder="Min 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2 text-sm bg-slate-800 text-white border border-slate-700 rounded-xl focus:outline-hidden focus:border-sky-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  placeholder="Repeat password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2 text-sm bg-slate-800 text-white border border-slate-700 rounded-xl focus:outline-hidden focus:border-sky-500"
                />
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-semibold rounded-xl text-sm shadow-md transition-all cursor-pointer mt-2"
            >
              Continue to Profile Setup →
            </button>

            <div className="text-center text-xs text-slate-400">
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  clearForm();
                  setMode('login');
                }}
                className="text-sky-400 font-semibold hover:underline cursor-pointer"
              >
                Sign In
              </button>
            </div>
          </form>
        )}

        {/* MODE: PROFILE SETUP (Step 2) */}
        {mode === 'profile_setup' && (
          <form onSubmit={handleCompleteProfileSetup} className="space-y-4">
            <div className="text-center mb-2">
              <h3 className="font-bold text-base text-white">Complete Your Profile</h3>
              <p className="text-xs text-slate-400">Set your avatar and status message</p>
            </div>

            <div className="flex flex-col items-center">
              <div className="w-20 h-20 rounded-full border-2 border-sky-500 overflow-hidden bg-slate-800 flex items-center justify-center relative mb-2">
                {photoURL ? (
                  <img src={photoURL} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <Camera className="w-8 h-8 text-slate-500" />
                )}
              </div>
              <input
                type="url"
                placeholder="Profile Photo Image URL (optional)"
                value={photoURL}
                onChange={(e) => setPhotoURL(e.target.value)}
                className="w-full text-xs px-3 py-2 bg-slate-800 text-white border border-slate-700 rounded-xl focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                About / Status
              </label>
              <input
                type="text"
                value={about}
                onChange={(e) => setAbout(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-800 text-white border border-slate-700 rounded-xl focus:outline-hidden"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-sm shadow-md transition-all cursor-pointer"
            >
              {loading ? 'Creating Account...' : 'Finish & Launch ConnectCall'}
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => setMode('register')}
                className="text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
              >
                ← Back
              </button>
            </div>
          </form>
        )}

        {/* MODE: FORGOT PASSWORD */}
        {mode === 'forgot' && (
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div className="text-xs text-slate-400 leading-relaxed">
              Enter your email address and we will send you a password reset link.
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2.5 text-sm bg-slate-800 text-white border border-slate-700 rounded-xl focus:outline-hidden focus:border-sky-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-semibold rounded-xl text-sm transition-all cursor-pointer"
            >
              {loading ? 'Sending link...' : 'Send Password Reset Email'}
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  clearForm();
                  setMode('login');
                }}
                className="text-xs text-sky-400 hover:underline cursor-pointer"
              >
                ← Back to Login
              </button>
            </div>
          </form>
        )}

        {/* Android App & Privacy Footer Banner */}
        <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-400">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>সিক্রেট চ্যাট ও পিন ভল্ট এনক্রিপশন সক্রিয়</span>
          </div>

          <PWAInstallButton variant="compact" />
        </div>
      </div>
    </div>
  );
};
