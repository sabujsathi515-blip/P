import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, collection, onSnapshot } from 'firebase/firestore';
import { auth, db, isFirebaseConfigured, handleFirestoreError, OperationType } from './firebase';
import type { UserProfile } from '../types/user';

// Demo pre-populated users for seamless instant testing if Firebase is in Demo Mode
export const DEMO_USERS: UserProfile[] = [
  {
    userId: 'demo-user-1',
    name: 'Sarah Connor',
    email: 'sarah@connectcall.io',
    photoURL: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    about: 'Always ready for an audio or video call! 🚀',
    online: true,
    lastSeen: Date.now(),
    createdAt: Date.now() - 86400000 * 7,
  },
  {
    userId: 'demo-user-2',
    name: 'Alex Vance',
    email: 'alex@connectcall.io',
    photoURL: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
    about: 'Working on WebRTC & real-time communication.',
    online: true,
    lastSeen: Date.now() - 1000 * 60 * 3,
    createdAt: Date.now() - 86400000 * 5,
  },
  {
    userId: 'demo-user-3',
    name: 'David Chen',
    email: 'david@connectcall.io',
    photoURL: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80',
    about: 'Available during regular office hours.',
    online: false,
    lastSeen: Date.now() - 1000 * 60 * 45,
    createdAt: Date.now() - 86400000 * 3,
  },
  {
    userId: 'demo-user-4',
    name: 'Elena Rostova',
    email: 'elena@connectcall.io',
    photoURL: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    about: 'Design & UX lead at ConnectCall 🎨',
    online: true,
    lastSeen: Date.now(),
    createdAt: Date.now() - 86400000 * 2,
  },
];

const LOCAL_STORAGE_KEY_DEMO_USERS = 'connectcall_demo_users';
const LOCAL_STORAGE_KEY_CURRENT_USER = 'connectcall_current_demo_user';

export const getLocalDemoUsers = (): UserProfile[] => {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY_DEMO_USERS);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.error('Failed to load demo users', e);
  }
  localStorage.setItem(LOCAL_STORAGE_KEY_DEMO_USERS, JSON.stringify(DEMO_USERS));
  return DEMO_USERS;
};

export const saveLocalDemoUsers = (users: UserProfile[]) => {
  localStorage.setItem(LOCAL_STORAGE_KEY_DEMO_USERS, JSON.stringify(users));
};

export class AuthService {
  // Listen for auth state changes
  public static subscribeToAuthState(
    onUser: (user: UserProfile | null) => void,
    onError?: (err: Error) => void
  ): () => void {
    if (isFirebaseConfigured() && auth) {
      return onAuthStateChanged(
        auth,
        async (firebaseUser: User | null) => {
          if (!firebaseUser) {
            onUser(null);
            return;
          }
          try {
            const profile = await this.getUserProfile(firebaseUser.uid);
            if (profile) {
              await this.setUserOnlineStatus(firebaseUser.uid, true);
              onUser(profile);
            } else {
              // Create default profile if not found
              const newProfile: UserProfile = {
                userId: firebaseUser.uid,
                name: firebaseUser.displayName || 'ConnectCall User',
                email: firebaseUser.email || '',
                photoURL: firebaseUser.photoURL || undefined,
                about: 'Hey there! I am using ConnectCall.',
                online: true,
                lastSeen: Date.now(),
                createdAt: Date.now(),
              };
              await this.saveUserProfile(newProfile);
              onUser(newProfile);
            }
          } catch (err) {
            console.error('Failed to fetch user profile:', err);
            onError?.(err as Error);
          }
        },
        onError
      );
    } else {
      // Demo mode fallback
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY_CURRENT_USER);
      if (stored) {
        try {
          const user = JSON.parse(stored);
          onUser(user);
        } catch (_) {
          onUser(null);
        }
      } else {
        onUser(null);
      }
      return () => {};
    }
  }

  // Register with email and password
  public static async register(
    name: string,
    email: string,
    pass: string,
    photoURL?: string,
    about?: string
  ): Promise<UserProfile> {
    if (isFirebaseConfigured() && auth && db) {
      const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
      const user = userCredential.user;

      if (name || photoURL) {
        await updateProfile(user, {
          displayName: name,
          photoURL: photoURL || null,
        });
      }

      const profile: UserProfile = {
        userId: user.uid,
        name: name || user.displayName || 'ConnectCall User',
        email: user.email || email,
        photoURL: photoURL || undefined,
        about: about || 'Hey there! I am using ConnectCall.',
        online: true,
        lastSeen: Date.now(),
        createdAt: Date.now(),
      };

      await this.saveUserProfile(profile);
      return profile;
    } else {
      // Demo Mode Registration
      const demoUsers = getLocalDemoUsers();
      const existing = demoUsers.find((u) => u.email.toLowerCase() === email.toLowerCase());
      if (existing) {
        throw new Error('An account with this email already exists in demo storage.');
      }

      const newId = 'demo-user-' + Math.random().toString(36).substring(2, 9);
      const newProfile: UserProfile = {
        userId: newId,
        name,
        email,
        photoURL: photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`,
        about: about || 'Hey there! I am using ConnectCall.',
        online: true,
        lastSeen: Date.now(),
        createdAt: Date.now(),
      };

      demoUsers.push(newProfile);
      saveLocalDemoUsers(demoUsers);
      localStorage.setItem(LOCAL_STORAGE_KEY_CURRENT_USER, JSON.stringify(newProfile));
      return newProfile;
    }
  }

  // Login
  public static async login(email: string, pass: string): Promise<UserProfile> {
    if (isFirebaseConfigured() && auth && db) {
      const userCredential = await signInWithEmailAndPassword(auth, email, pass);
      const user = userCredential.user;
      let profile = await this.getUserProfile(user.uid);
      if (!profile) {
        profile = {
          userId: user.uid,
          name: user.displayName || 'ConnectCall User',
          email: user.email || email,
          photoURL: user.photoURL || undefined,
          about: 'Hey there! I am using ConnectCall.',
          online: true,
          lastSeen: Date.now(),
        };
        await this.saveUserProfile(profile);
      } else {
        await this.setUserOnlineStatus(user.uid, true);
      }
      return profile;
    } else {
      // Demo login: find matching user or sign into demo Sarah Connor
      const demoUsers = getLocalDemoUsers();
      const user = demoUsers.find((u) => u.email.toLowerCase() === email.toLowerCase());
      if (!user) {
        throw new Error('User not found. In Demo Mode, try sarah@connectcall.io or create a new account.');
      }
      user.online = true;
      user.lastSeen = Date.now();
      saveLocalDemoUsers(demoUsers);
      localStorage.setItem(LOCAL_STORAGE_KEY_CURRENT_USER, JSON.stringify(user));
      return user;
    }
  }

  // Google Sign In
  public static async signInWithGoogle(): Promise<UserProfile> {
    if (isFirebaseConfigured() && auth && db) {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      const user = userCredential.user;

      let profile = await this.getUserProfile(user.uid);
      if (!profile) {
        profile = {
          userId: user.uid,
          name: user.displayName || 'Google User',
          email: user.email || '',
          photoURL: user.photoURL || undefined,
          about: 'Hey there! I am using ConnectCall.',
          online: true,
          lastSeen: Date.now(),
          createdAt: Date.now(),
        };
        await this.saveUserProfile(profile);
      } else {
        await this.setUserOnlineStatus(user.uid, true);
      }
      return profile;
    } else {
      // Demo switch to Sarah Connor
      const demoUsers = getLocalDemoUsers();
      const user = demoUsers[0];
      localStorage.setItem(LOCAL_STORAGE_KEY_CURRENT_USER, JSON.stringify(user));
      return user;
    }
  }

  // Forgot password
  public static async resetPassword(email: string): Promise<void> {
    if (isFirebaseConfigured() && auth) {
      await sendPasswordResetEmail(auth, email);
    } else {
      // Simulate successful reset email sent in demo
      await new Promise((r) => setTimeout(r, 600));
    }
  }

  // Logout
  public static async logout(currentUserId?: string): Promise<void> {
    if (currentUserId) {
      await this.setUserOnlineStatus(currentUserId, false).catch(() => {});
    }

    if (isFirebaseConfigured() && auth) {
      await signOut(auth);
    } else {
      localStorage.removeItem(LOCAL_STORAGE_KEY_CURRENT_USER);
    }
  }

  // Save profile to Firestore
  public static async saveUserProfile(profile: UserProfile): Promise<void> {
    if (isFirebaseConfigured() && db) {
      try {
        await setDoc(doc(db, 'users', profile.userId), profile, { merge: true });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `users/${profile.userId}`);
      }
    } else {
      const demoUsers = getLocalDemoUsers();
      const idx = demoUsers.findIndex((u) => u.userId === profile.userId);
      if (idx >= 0) {
        demoUsers[idx] = { ...demoUsers[idx], ...profile };
      } else {
        demoUsers.push(profile);
      }
      saveLocalDemoUsers(demoUsers);
      localStorage.setItem(LOCAL_STORAGE_KEY_CURRENT_USER, JSON.stringify(profile));
    }
  }

  // Get user profile
  public static async getUserProfile(userId: string): Promise<UserProfile | null> {
    if (isFirebaseConfigured() && db) {
      try {
        const snap = await getDoc(doc(db, 'users', userId));
        if (snap.exists()) {
          return snap.data() as UserProfile;
        }
        return null;
      } catch (err) {
        handleFirestoreError(err, OperationType.GET, `users/${userId}`);
      }
    } else {
      const demoUsers = getLocalDemoUsers();
      return demoUsers.find((u) => u.userId === userId) || null;
    }
  }

  // Update online status
  public static async setUserOnlineStatus(userId: string, online: boolean): Promise<void> {
    if (isFirebaseConfigured() && db) {
      try {
        await updateDoc(doc(db, 'users', userId), {
          online,
          lastSeen: Date.now(),
        });
      } catch (err) {
        // Soft fail if document not yet created
        console.warn('Could not update online status:', err);
      }
    } else {
      const demoUsers = getLocalDemoUsers();
      const user = demoUsers.find((u) => u.userId === userId);
      if (user) {
        user.online = online;
        user.lastSeen = Date.now();
        saveLocalDemoUsers(demoUsers);
      }
    }
  }

  // Set user in call status (for busy indicator)
  public static async setUserCallStatus(userId: string, inCall: boolean, roomId?: string): Promise<void> {
    if (isFirebaseConfigured() && db) {
      try {
        await updateDoc(doc(db, 'users', userId), {
          inCall,
          activeCallRoomId: roomId || null,
        });
      } catch (err) {
        console.warn('Could not update inCall status:', err);
      }
    } else {
      const demoUsers = getLocalDemoUsers();
      const user = demoUsers.find((u) => u.userId === userId);
      if (user) {
        user.inCall = inCall;
        user.activeCallRoomId = roomId;
        saveLocalDemoUsers(demoUsers);
      }
    }
  }

  // Subscribe to all users directory
  public static subscribeToAllUsers(
    onUsers: (users: UserProfile[]) => void,
    onError?: (err: Error) => void
  ): () => void {
    if (isFirebaseConfigured() && db) {
      return onSnapshot(
        collection(db, 'users'),
        (snap) => {
          const users = snap.docs.map((d) => d.data() as UserProfile);
          onUsers(users);
        },
        (err) => {
          handleFirestoreError(err, OperationType.LIST, 'users');
          onError?.(err);
        }
      );
    } else {
      const load = () => {
        onUsers(getLocalDemoUsers());
      };
      load();
      const handler = () => load();
      window.addEventListener('storage', handler);
      return () => {
        window.removeEventListener('storage', handler);
      };
    }
  }
}
