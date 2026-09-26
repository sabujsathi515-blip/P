import React, { createContext, useContext, useEffect, useState } from 'react';
import type { UserProfile } from '../types/user';
import { AuthService, getLocalDemoUsers, DEMO_USERS } from '../services/authService';
import { isFirebaseConfigured } from '../services/firebase';
import { realtimeHub } from '../services/realtimeHub';

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  isFirebase: boolean;
  demoUsers: UserProfile[];
  login: (email: string, pass: string) => Promise<UserProfile>;
  register: (name: string, email: string, pass: string, photoURL?: string, about?: string, phoneNumber?: string) => Promise<UserProfile>;
  addNewContact: (contact: { email: string; name?: string; phoneNumber?: string; about?: string; photoURL?: string }) => Promise<UserProfile>;
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
    // If demo mode and user hasn't explicitly logged out
    if (!isFirebase) {
      const urlParams = new URLSearchParams(window.location.search);
      const userParam = urlParams.get('user')?.toLowerCase() || urlParams.get('userId');
      const deviceParam = urlParams.get('device');

      const currentDemoList = getLocalDemoUsers();

      if (userParam || deviceParam) {
        let matched: UserProfile | undefined;
        if (userParam) {
          if (userParam.includes('alex') || userParam === 'demo-user-2' || userParam === '2') {
            matched = currentDemoList[1] || DEMO_USERS[1];
          } else if (userParam.includes('david') || userParam === 'demo-user-3' || userParam === '3') {
            matched = currentDemoList[2] || DEMO_USERS[2];
          } else if (userParam.includes('elena') || userParam === 'demo-user-4' || userParam === '4') {
            matched = currentDemoList[3] || DEMO_USERS[3];
          } else if (userParam.includes('sarah') || userParam === 'demo-user-1' || userParam === '1') {
            matched = currentDemoList[0] || DEMO_USERS[0];
          } else {
            matched = currentDemoList.find(
              (u) => u.userId === userParam || u.email.toLowerCase().includes(userParam)
            );
          }
        }
        if (!matched && deviceParam === '2') {
          matched = currentDemoList[1] || DEMO_USERS[1];
        }

        if (matched) {
          localStorage.removeItem('connectcall_logged_out');
          localStorage.setItem('connectcall_current_demo_user', JSON.stringify(matched));
          setUser(matched);
          setLoading(false);
          return;
        }
      }

      const isLoggedOut = localStorage.getItem('connectcall_logged_out') === 'true';
      if (isLoggedOut) {
        setUser(null);
        setLoading(false);
        return;
      }

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

  // Online status heartbeat, visibility handler, and realtimeHub connection
  useEffect(() => {
    if (!user) {
      realtimeHub.disconnect();
      return;
    }

    realtimeHub.connect(user.userId);
    AuthService.setUserOnlineStatus(user.userId, true).catch(() => {});

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
  }, [user?.userId]);

  const login = async (email: string, pass: string) => {
    setLoading(true);
    try {
      const profile = await AuthService.login(email, pass);
      localStorage.removeItem('connectcall_logged_out');
      setUser(profile);
      return profile;
    } finally {
      setLoading(false);
    }
  };

  const register = async (name: string, email: string, pass: string, photoURL?: string, about?: string, phoneNumber?: string) => {
    setLoading(true);
    try {
      const profile = await AuthService.register(name, email, pass, photoURL, about, phoneNumber);
      localStorage.removeItem('connectcall_logged_out');
      setUser(profile);
      refreshDemoUsers();
      return profile;
    } finally {
      setLoading(false);
    }
  };

  const addNewContact = async (contact: { email: string; name?: string; phoneNumber?: string; about?: string; photoURL?: string }) => {
    const created = await AuthService.addNewContact(contact);
    refreshDemoUsers();
    return created;
  };

  const logout = async () => {
    setLoading(true);
    try {
      await AuthService.logout(user?.userId);
      localStorage.setItem('connectcall_logged_out', 'true');
      localStorage.removeItem('connectcall_current_demo_user');
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
      localStorage.removeItem('connectcall_logged_out');
      setUser(profile);
      return profile;
    } finally {
      setLoading(false);
    }
  };

  const switchDemoUser = (newUser: UserProfile) => {
    localStorage.removeItem('connectcall_logged_out');
    setUser(newUser);
    localStorage.setItem('connectcall_current_demo_user', JSON.stringify(newUser));
    realtimeHub.connect(newUser.userId);
    AuthService.setUserOnlineStatus(newUser.userId, true).catch(() => {});
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
        addNewContact,
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
