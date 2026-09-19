import React, { createContext, useContext, useEffect, useState } from 'react';
import type { UserProfile } from '../types/user';
import { AuthService, getLocalDemoUsers, DEMO_USERS } from '../services/authService';
import { isFirebaseConfigured } from '../services/firebase';

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  isFirebase: boolean;
  demoUsers: UserProfile[];
  login: (email: string, pass: string) => Promise<UserProfile>;
  register: (name: string, email: string, pass: string, photoURL?: string, about?: string) => Promise<UserProfile>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signInWithGoogle: () => Promise<UserProfile>;
  switchDemoUser: (user: UserProfile) => void;
  refreshDemoUsers: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [demoUsers, setDemoUsers] = useState<UserProfile[]>(() => getLocalDemoUsers());
  const isFirebase = isFirebaseConfigured();

  const refreshDemoUsers = () => {
    setDemoUsers(getLocalDemoUsers());
  };

  useEffect(() => {
    // If demo mode and no user is logged in, default to the first demo user (Sarah Connor) for instant exploration!
    if (!isFirebase) {
      const stored = localStorage.getItem('connectcall_current_demo_user');
      if (stored) {
        try {
          setUser(JSON.parse(stored));
        } catch (_) {
          setUser(DEMO_USERS[0]);
          localStorage.setItem('connectcall_current_demo_user', JSON.stringify(DEMO_USERS[0]));
        }
      } else {
        setUser(DEMO_USERS[0]);
        localStorage.setItem('connectcall_current_demo_user', JSON.stringify(DEMO_USERS[0]));
      }
      setLoading(false);
      return;
    }

    const unsub = AuthService.subscribeToAuthState(
      (profile) => {
        setUser(profile);
        setLoading(false);
      },
      (err) => {
        console.error('Auth state error', err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [isFirebase]);

  // Online status heartbeat and visibility handler
  useEffect(() => {
    if (!user) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        AuthService.setUserOnlineStatus(user.userId, false).catch(() => {});
      } else {
        AuthService.setUserOnlineStatus(user.userId, true).catch(() => {});
      }
    };

    const handleBeforeUnload = () => {
      AuthService.setUserOnlineStatus(user.userId, false).catch(() => {});
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [user]);

  const login = async (email: string, pass: string) => {
    setLoading(true);
    try {
      const profile = await AuthService.login(email, pass);
      setUser(profile);
      return profile;
    } finally {
      setLoading(false);
    }
  };

  const register = async (name: string, email: string, pass: string, photoURL?: string, about?: string) => {
    setLoading(true);
    try {
      const profile = await AuthService.register(name, email, pass, photoURL, about);
      setUser(profile);
      refreshDemoUsers();
      return profile;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await AuthService.logout(user?.userId);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    if (!user) return;
    const updated: UserProfile = { ...user, ...updates };
    setUser(updated);
    await AuthService.saveUserProfile(updated);
    refreshDemoUsers();
  };

  const resetPassword = async (email: string) => {
    await AuthService.resetPassword(email);
  };

  const signInWithGoogle = async () => {
    setLoading(true);
    try {
      const profile = await AuthService.signInWithGoogle();
      setUser(profile);
      return profile;
    } finally {
      setLoading(false);
    }
  };

  const switchDemoUser = (newUser: UserProfile) => {
    setUser(newUser);
    localStorage.setItem('connectcall_current_demo_user', JSON.stringify(newUser));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isFirebase,
        demoUsers,
        login,
        register,
        logout,
        updateProfile,
        resetPassword,
        signInWithGoogle,
        switchDemoUser,
        refreshDemoUsers,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
