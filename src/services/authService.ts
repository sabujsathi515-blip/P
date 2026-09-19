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
import { doc, setDoc, getDoc, updateDoc, collection, onSnapshot, query, where, getDocs } from 'firebase/firestore';
import { auth, db, isFirebaseConfigured, handleFirestoreError, OperationType } from './firebase';
import type { UserProfile } from '../types/user';
import { realtimeHub } from './realtimeHub';

// Demo pre-populated users for seamless instant testing if Firebase is in Demo Mode
export const DEMO_USERS: UserProfile[] = [
  {
    userId: 'demo-user-1',
    name: 'Sarah Connor',
    email: 'sarah@connectcall.io',
    phoneNumber: '+880 1711-234567',
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
    phoneNumber: '+880 1812-345678',
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
    phoneNumber: '+1 (555) 345-6789',
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
    phoneNumber: '+44 7700 900123',
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
    if (raw) {
      const parsed: UserProfile[] = JSON.parse(raw);
      let modified = false;
      const merged = parsed.map((u) => {
        const defaultMatch = DEMO_USERS.find((d) => d.userId === u.userId);
        if (defaultMatch && !u.phoneNumber) {
          modified = true;
          return { ...u, phoneNumber: defaultMatch.phoneNumber };
        }
        return u;
      });
      if (modified) {
        saveLocalDemoUsers(merged);
      }
      return merged;
    }
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
    about?: string,
    phoneNumber?: string
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
        phoneNumber: phoneNumber || undefined,
        photoURL: photoURL || undefined,
        about: about || 'Hey there! I am using ConnectCall.',
        online: true,
        lastSeen: Date.now(),
        createdAt: Date.now(),
      };

      await this.saveUserProfile(profile);
      return profile;
    } else {
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
        phoneNumber: phoneNumber || undefined,
        photoURL: photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`,
        about: about || 'Hey there! I am using ConnectCall.',
        online: true,
        lastSeen: Date.now(),
        createdAt: Date.now(),
      };

      // Sync to shared backend server so all devices see this user!
      try {
        await fetch('/api/users/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newProfile),
        });
      } catch (e) {
        console.warn('API sync error', e);
      }

      demoUsers.push(newProfile);
      saveLocalDemoUsers(demoUsers);
      localStorage.setItem(LOCAL_STORAGE_KEY_CURRENT_USER, JSON.stringify(newProfile));
      realtimeHub.broadcastLocally('user_update', newProfile);
      return newProfile;
    }
  }

  // Add a new contact to the directory by Email ID
  public static async addNewContact(data: {
    email: string;
    name?: string;
    phoneNumber?: string;
    about?: string;
    photoURL?: string;
  }): Promise<UserProfile> {
    const cleanEmail = data.email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      throw new Error('অনুগ্রহ করে সঠিক ইমেইল আইডি লিখুন (যেমন: name@example.com)');
    }

    if (isFirebaseConfigured() && db) {
      try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('email', '==', cleanEmail));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
          const docData = snapshot.docs[0].data() as UserProfile;
          return {
            ...docData,
            userId: snapshot.docs[0].id,
          };
        }
      } catch (err) {
        console.warn('Could not query firestore for email, falling back to local/creation', err);
      }
    }

    // Check server users first
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const serverUsers: UserProfile[] = await res.json();
        const found = serverUsers.find((u) => u.email.toLowerCase() === cleanEmail);
        if (found) {
          return found;
        }
      }
    } catch {
      // fallback
    }

    const demoUsers = getLocalDemoUsers();
    const existing = demoUsers.find((u) => u.email.toLowerCase() === cleanEmail);
    if (existing) {
      return existing;
    }

    const usernamePart = cleanEmail.split('@')[0];
    const derivedName = usernamePart
      .replace(/[._-]/g, ' ')
      .split(' ')
      .filter(Boolean)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ') || 'User';

    const contactName = data.name?.trim() || derivedName;
    const contactId = 'contact-' + Math.random().toString(36).substring(2, 9);
    
    const newContact: UserProfile = {
      userId: contactId,
      name: contactName,
      email: cleanEmail,
      phoneNumber: data.phoneNumber?.trim() || undefined,
      about: data.about?.trim() || 'Connected via Email ID',
      photoURL: data.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(cleanEmail)}`,
      online: true,
      lastSeen: Date.now(),
      createdAt: Date.now(),
    };

    if (isFirebaseConfigured() && db) {
      await this.saveUserProfile(newContact);
    } else {
      // Sync to shared backend server
      try {
        await fetch('/api/users/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newContact),
        });
      } catch (e) {
        console.warn('API sync contact error', e);
      }

      demoUsers.push(newContact);
      saveLocalDemoUsers(demoUsers);
      realtimeHub.broadcastLocally('user_update', newContact);
      window.dispatchEvent(new Event('storage'));
    }

    return newContact;
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
      // Check server first
      try {
        const res = await fetch('/api/users');
        if (res.ok) {
          const serverUsers: UserProfile[] = await res.json();
          const user = serverUsers.find((u) => u.email.toLowerCase() === email.toLowerCase());
          if (user) {
            user.online = true;
            user.lastSeen = Date.now();
            await fetch('/api/users/status', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId: user.userId, online: true }),
            }).catch(() => {});

            localStorage.setItem(LOCAL_STORAGE_KEY_CURRENT_USER, JSON.stringify(user));
            return user;
          }
        }
      } catch {
        // fallback
      }

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

  // Save profile to Firestore and full-stack backend
  public static async saveUserProfile(profile: UserProfile): Promise<void> {
    if (isFirebaseConfigured() && db) {
      try {
        await setDoc(doc(db, 'users', profile.userId), profile, { merge: true });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `users/${profile.userId}`);
      }
    } else {
      try {
        await fetch('/api/users/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(profile),
        });
      } catch (e) {
        console.warn('API save profile error', e);
      }

      const demoUsers = getLocalDemoUsers();
      const idx = demoUsers.findIndex((u) => u.userId === profile.userId);
      if (idx >= 0) {
        demoUsers[idx] = { ...demoUsers[idx], ...profile };
      } else {
        demoUsers.push(profile);
      }
      saveLocalDemoUsers(demoUsers);
      localStorage.setItem(LOCAL_STORAGE_KEY_CURRENT_USER, JSON.stringify(profile));
      realtimeHub.broadcastLocally('user_update', profile);
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
      try {
        const res = await fetch('/api/users');
        if (res.ok) {
          const serverUsers: UserProfile[] = await res.json();
          const found = serverUsers.find((u) => u.userId === userId);
          if (found) return found;
        }
      } catch {
        // fallback
      }

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
        console.warn('Could not update online status:', err);
      }
    } else {
      try {
        await fetch('/api/users/status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, online }),
        });
      } catch (e) {
        // ignore
      }

      const demoUsers = getLocalDemoUsers();
      const user = demoUsers.find((u) => u.userId === userId);
      if (user) {
        user.online = online;
        user.lastSeen = Date.now();
        saveLocalDemoUsers(demoUsers);
        realtimeHub.broadcastLocally('user_update', user);
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
      try {
        await fetch('/api/users/status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, inCall, activeCallRoomId: roomId }),
        });
      } catch (e) {
        // ignore
      }

      const demoUsers = getLocalDemoUsers();
      const user = demoUsers.find((u) => u.userId === userId);
      if (user) {
        user.inCall = inCall;
        user.activeCallRoomId = roomId;
        saveLocalDemoUsers(demoUsers);
        realtimeHub.broadcastLocally('user_update', user);
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
      let active = true;

      const load = async () => {
        if (!active) return;
        try {
          const res = await fetch('/api/users');
          if (res.ok) {
            const serverUsers: UserProfile[] = await res.json();
            if (Array.isArray(serverUsers) && serverUsers.length > 0) {
              onUsers(serverUsers);
              saveLocalDemoUsers(serverUsers);
              return;
            }
          }
        } catch {
          // fallback
        }
        onUsers(getLocalDemoUsers());
      };

      load();

      const unsub = realtimeHub.on('user_update', () => {
        load();
      });

      const interval = setInterval(load, 4000);
      const handler = () => load();
      window.addEventListener('storage', handler);

      return () => {
        active = false;
        clearInterval(interval);
        unsub();
        window.removeEventListener('storage', handler);
      };
    }
  }
}
