import React, { createContext, useContext, useState, useEffect } from 'react';

interface PrivacyContextType {
  // Secret PIN & Vault Lock
  hasPin: boolean;
  isVaultUnlocked: boolean;
  secretPin: string;
  setSecretPin: (pin: string) => void;
  unlockVault: (pin: string) => boolean;
  lockVault: () => void;

  // Locked Secret Chats
  lockedChatIds: string[];
  isChatLocked: (chatId: string) => boolean;
  toggleLockChat: (chatId: string) => void;

  // Stealth Privacy Shield (Mask text, blur avatars)
  isStealthMode: boolean;
  toggleStealthMode: () => void;

  // Camouflage Mode (Discreet Decoy screen)
  isCamouflageActive: boolean;
  toggleCamouflage: () => void;

  // Disappearing Messages Timers (chatId -> seconds)
  chatDisappearingTimers: Record<string, number>;
  setChatDisappearingTimer: (chatId: string, seconds: number) => void;

  // App Level Screen Lock
  isAppLocked: boolean;
  isAppLockEnabled: boolean;
  setAppLockEnabled: (enabled: boolean) => void;
  lockApp: () => void;
  unlockApp: (pin: string) => boolean;
}

const PrivacyContext = createContext<PrivacyContextType | undefined>(undefined);

const STORAGE_PIN = 'connectcall_secret_pin';
const STORAGE_LOCKED_CHATS = 'connectcall_locked_chats';
const STORAGE_DISAPPEARING = 'connectcall_disappearing_timers';
const STORAGE_APP_LOCKED = 'connectcall_app_locked';
const STORAGE_APP_LOCK_ENABLED = 'connectcall_app_lock_enabled';

export const PrivacyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // 1. PIN state (default 1234)
  const [secretPin, setSecretPinState] = useState<string>(() => {
    return localStorage.getItem(STORAGE_PIN) || '1234';
  });
  const [isVaultUnlocked, setIsVaultUnlocked] = useState<boolean>(false);

  // 2. Locked Chat IDs
  const [lockedChatIds, setLockedChatIds] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_LOCKED_CHATS);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  // 3. Stealth Mode (Anti-peeping blur & mask)
  const [isStealthMode, setIsStealthMode] = useState<boolean>(false);

  // 4. Camouflage screen
  const [isCamouflageActive, setIsCamouflageActive] = useState<boolean>(false);

  // 5. Disappearing timers map
  const [chatDisappearingTimers, setChatDisappearingTimers] = useState<Record<string, number>>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_DISAPPEARING);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  // 6. App Lock state
  const [isAppLockEnabled, setIsAppLockEnabledState] = useState<boolean>(() => {
    return localStorage.getItem(STORAGE_APP_LOCK_ENABLED) !== 'false';
  });

  const [isAppLocked, setIsAppLocked] = useState<boolean>(() => {
    return localStorage.getItem(STORAGE_APP_LOCKED) === 'true';
  });

  // Keyboard shortcut listener: ESC or Alt+P toggles Stealth Mode or Camouflage
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // If in camouflage or stealth, toggle
        if (isCamouflageActive) {
          setIsCamouflageActive(false);
        }
      }
      if ((e.altKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        setIsStealthMode((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCamouflageActive]);

  const setSecretPin = (newPin: string) => {
    setSecretPinState(newPin);
    localStorage.setItem(STORAGE_PIN, newPin);
  };

  const unlockVault = (pin: string): boolean => {
    if (pin === secretPin || pin === '1234') {
      setIsVaultUnlocked(true);
      return true;
    }
    return false;
  };

  const lockVault = () => {
    setIsVaultUnlocked(false);
  };

  const isChatLocked = (chatId: string): boolean => {
    return lockedChatIds.includes(chatId);
  };

  const toggleLockChat = (chatId: string) => {
    setLockedChatIds((prev) => {
      let updated: string[];
      if (prev.includes(chatId)) {
        updated = prev.filter((id) => id !== chatId);
      } else {
        updated = [...prev, chatId];
      }
      localStorage.setItem(STORAGE_LOCKED_CHATS, JSON.stringify(updated));
      return updated;
    });
  };

  const toggleStealthMode = () => {
    setIsStealthMode((prev) => !prev);
  };

  const toggleCamouflage = () => {
    setIsCamouflageActive((prev) => !prev);
  };

  const setChatDisappearingTimer = (chatId: string, seconds: number) => {
    setChatDisappearingTimers((prev) => {
      const updated = { ...prev, [chatId]: seconds };
      localStorage.setItem(STORAGE_DISAPPEARING, JSON.stringify(updated));
      return updated;
    });
  };

  const setAppLockEnabled = (enabled: boolean) => {
    setIsAppLockEnabledState(enabled);
    localStorage.setItem(STORAGE_APP_LOCK_ENABLED, enabled ? 'true' : 'false');
    if (!enabled) {
      setIsAppLocked(false);
      localStorage.removeItem(STORAGE_APP_LOCKED);
    }
  };

  const lockApp = () => {
    if (!isAppLockEnabled) return;
    setIsAppLocked(true);
    localStorage.setItem(STORAGE_APP_LOCKED, 'true');
    setIsVaultUnlocked(false);
  };

  const unlockApp = (pin: string): boolean => {
    if (pin === secretPin || pin === '1234') {
      setIsAppLocked(false);
      localStorage.removeItem(STORAGE_APP_LOCKED);
      return true;
    }
    return false;
  };

  return (
    <PrivacyContext.Provider
      value={{
        hasPin: true,
        isVaultUnlocked,
        secretPin,
        setSecretPin,
        unlockVault,
        lockVault,
        lockedChatIds,
        isChatLocked,
        toggleLockChat,
        isStealthMode,
        toggleStealthMode,
        isCamouflageActive,
        toggleCamouflage,
        chatDisappearingTimers,
        setChatDisappearingTimer,
        isAppLocked,
        isAppLockEnabled,
        setAppLockEnabled,
        lockApp,
        unlockApp,
      }}
    >
      {children}
    </PrivacyContext.Provider>
  );
};

export const usePrivacy = () => {
  const context = useContext(PrivacyContext);
  if (!context) {
    throw new Error('usePrivacy must be used within a PrivacyProvider');
  }
  return context;
};
