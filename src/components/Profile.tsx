import React, { useState } from 'react';
import type { UserProfile } from '../types/user';
import { useAuth } from '../contexts/AuthContext';
import { Camera, Save, LogOut, Check, Key, UserCheck, Shield, Phone } from 'lucide-react';

interface ProfileProps {
  user: UserProfile;
}

export const Profile: React.FC<ProfileProps> = ({ user }) => {
  const { updateProfile, logout, resetPassword } = useAuth();

  const [name, setName] = useState(user.name);
  const [phoneNumber, setPhoneNumber] = useState(user.phoneNumber || '');
  const [about, setAbout] = useState(user.about || '');
  const [photoURL, setPhotoURL] = useState(user.photoURL || '');
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [passwordEmailSent, setPasswordEmailSent] = useState(false);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoURL(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateProfile({
        name,
        phoneNumber,
        about,
        photoURL,
      });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    } catch (err) {
      console.error('Failed to update profile:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = async () => {
    if (!user.email) return;
    try {
      await resetPassword(user.email);
      setPasswordEmailSent(true);
      setTimeout(() => setPasswordEmailSent(false), 4000);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-900 overflow-y-auto">
      {/* Header */}
      <div className="p-4 sm:p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">Your Profile</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Manage your personal information and preferences
          </p>
        </div>
      </div>

      <div className="p-4 sm:p-8 max-w-xl mx-auto w-full">
        {/* Avatar Upload Section */}
        <div className="flex flex-col items-center mb-8">
          <div className="relative group">
            {photoURL ? (
              <img
                src={photoURL}
                alt={name}
                className="w-28 h-28 rounded-full object-cover border-4 border-sky-500 shadow-md"
              />
            ) : (
              <div className="w-28 h-28 rounded-full bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white text-3xl font-bold border-4 border-sky-500 shadow-md">
                {name.charAt(0).toUpperCase()}
              </div>
            )}

            <label
              htmlFor="profile-photo-upload"
              className="absolute bottom-0 right-0 p-2.5 rounded-full bg-sky-600 hover:bg-sky-500 text-white shadow-lg cursor-pointer transition-transform hover:scale-110 active:scale-95"
              title="Upload new photo"
            >
              <Camera className="w-4 h-4" />
              <input
                id="profile-photo-upload"
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>
          <p className="text-xs text-slate-400 mt-2">Click the camera icon to upload a photo</p>
        </div>

        {/* Profile Edit Form */}
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Full Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 text-sm bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Email Address
            </label>
            <input
              type="email"
              value={user.email}
              disabled
              className="w-full px-3.5 py-2.5 text-sm bg-slate-100/60 dark:bg-slate-800/40 text-slate-500 border border-slate-200 dark:border-slate-800 rounded-xl cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Contact Number (ফোন নম্বর)
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+880 1712-345678"
                className="w-full pl-10 pr-3.5 py-2.5 text-sm bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 transition-all font-mono"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              অন্যান্য ইউজাররা এই নম্বরে আপনাকে কল বা মেসেজ করতে পারবেন।
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              About / Status
            </label>
            <input
              type="text"
              value={about}
              onChange={(e) => setAbout(e.target.value)}
              placeholder="Hey there! I am using ConnectCall."
              className="w-full px-3.5 py-2.5 text-sm bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider mb-1.5">
              Photo URL (Optional)
            </label>
            <input
              type="url"
              value={photoURL}
              onChange={(e) => setPhotoURL(e.target.value)}
              placeholder="https://images.unsplash.com/..."
              className="w-full px-3.5 py-2.5 text-sm bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 transition-all"
            />
          </div>

          {/* Account Details Box */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-500" />
              <span>ConnectCall ID: {user.userId}</span>
            </div>
            <div className="flex items-center gap-1">
              <UserCheck className="w-3.5 h-3.5 text-sky-500" />
              <span>
                Joined: {new Date(user.createdAt || Date.now()).toLocaleDateString([], { month: 'short', year: 'numeric' })}
              </span>
            </div>
          </div>

          {/* Save Button */}
          <div className="pt-2 flex items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-semibold rounded-xl text-sm shadow-sm transition-all cursor-pointer"
            >
              {savedSuccess ? (
                <>
                  <Check className="w-4 h-4 text-emerald-300" />
                  <span>Saved Successfully!</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>{saving ? 'Saving...' : 'Save Profile Changes'}</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Security / Password section */}
        <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-800">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-3">Security & Account</h3>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 mb-3">
            <div>
              <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">Password</div>
              <div className="text-xs text-slate-500">Send password reset email link</div>
            </div>
            <button
              type="button"
              onClick={handleResetPassword}
              className="px-3 py-1.5 text-xs font-medium text-sky-600 dark:text-sky-400 bg-white dark:bg-slate-700 hover:bg-sky-50 dark:hover:bg-slate-600 rounded-xl border border-slate-200 dark:border-slate-600 flex items-center gap-1.5 cursor-pointer"
            >
              <Key className="w-3.5 h-3.5" />
              <span>{passwordEmailSent ? 'Link Sent!' : 'Reset Password'}</span>
            </button>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-rose-50/50 dark:bg-rose-950/20 border border-rose-200/60 dark:border-rose-900/40">
            <div>
              <div className="text-xs font-semibold text-rose-700 dark:text-rose-300">Sign Out</div>
              <div className="text-xs text-rose-600/70 dark:text-rose-400/70">
                Log out of your current session on this device
              </div>
            </div>
            <button
              type="button"
              onClick={() => logout()}
              className="px-3.5 py-1.5 text-xs font-semibold text-rose-600 hover:text-white hover:bg-rose-600 rounded-xl border border-rose-300 dark:border-rose-800 transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
