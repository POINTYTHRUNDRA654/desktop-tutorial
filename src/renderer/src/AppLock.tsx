/**
 * AppLock — real implementation of the "Auto-Lock After Inactivity" and
 * "Require Password for Settings" toggles in Privacy Settings.
 *
 * Password verification happens in the main process (main.ts
 * security:verify-password) against a salted scrypt hash — the renderer
 * never has access to the hash, only pass/fail.
 */
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Lock, ShieldAlert } from 'lucide-react';

function getApi(): any {
  return (window as any).electron?.api ?? (window as any).electronAPI;
}

interface AppLockContextValue {
  hasPassword: boolean;
  autoLockEnabled: boolean;
  requirePasswordForSettings: boolean;
  refreshLockConfig: () => Promise<void>;
  /** Verify a password against the stored hash without engaging the global lock overlay (used by the Settings gate). */
  verify: (password: string) => Promise<boolean>;
}

const AppLockContext = createContext<AppLockContextValue | null>(null);

export function useAppLock(): AppLockContextValue {
  const ctx = useContext(AppLockContext);
  if (!ctx) throw new Error('useAppLock must be used within AppLockProvider');
  return ctx;
}

const ACTIVITY_EVENTS = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart'] as const;

export const AppLockProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [hasPassword, setHasPassword] = useState(false);
  const [autoLockEnabled, setAutoLockEnabled] = useState(false);
  const [requirePasswordForSettings, setRequirePasswordForSettings] = useState(false);
  const [timeoutMinutes, setTimeoutMinutes] = useState(30);
  const [locked, setLocked] = useState(false);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState('');
  const lastActivityRef = useRef(Date.now());

  const refreshLockConfig = useCallback(async () => {
    try {
      const api = getApi();
      const [settings, passwordStatus] = await Promise.all([
        api?.getSettings?.(),
        api?.security?.hasPassword?.(),
      ]);
      const p = settings?.privacySettings;
      const has = !!passwordStatus?.hasPassword;
      setHasPassword(has);
      setAutoLockEnabled(!!p?.autoLockAfterInactivity && has);
      setRequirePasswordForSettings(!!p?.requirePasswordForSettings && has);
      setTimeoutMinutes(typeof p?.inactivityTimeoutMinutes === 'number' && p.inactivityTimeoutMinutes > 0 ? p.inactivityTimeoutMinutes : 30);
    } catch {
      // leave defaults (locked features effectively disabled) — never crash the app over this
    }
  }, []);

  useEffect(() => { void refreshLockConfig(); }, [refreshLockConfig]);

  const verify = useCallback(async (password: string): Promise<boolean> => {
    try {
      const result = await getApi()?.security?.verifyPassword?.(password);
      return !!result?.valid;
    } catch {
      return false;
    }
  }, []);

  // Inactivity tracking
  useEffect(() => {
    const markActivity = () => { lastActivityRef.current = Date.now(); };
    ACTIVITY_EVENTS.forEach(evt => window.addEventListener(evt, markActivity, { passive: true }));
    return () => ACTIVITY_EVENTS.forEach(evt => window.removeEventListener(evt, markActivity));
  }, []);

  useEffect(() => {
    if (!autoLockEnabled) return;
    const thresholdMs = timeoutMinutes * 60 * 1000;
    const interval = setInterval(() => {
      if (!locked && Date.now() - lastActivityRef.current >= thresholdMs) {
        setLocked(true);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [autoLockEnabled, timeoutMinutes, locked]);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const ok = await verify(attempt);
    if (ok) {
      setLocked(false);
      setAttempt('');
      lastActivityRef.current = Date.now();
    } else {
      setError('Incorrect password.');
    }
  };

  return (
    <AppLockContext.Provider value={{ hasPassword, autoLockEnabled, requirePasswordForSettings, refreshLockConfig, verify }}>
      {children}
      {locked && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/95 backdrop-blur-sm">
          <form onSubmit={handleUnlock} className="w-full max-w-sm bg-slate-900 border border-slate-700 rounded-xl p-8 shadow-2xl">
            <div className="flex flex-col items-center mb-6">
              <div className="w-14 h-14 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center mb-4">
                <Lock className="w-6 h-6 text-blue-400" />
              </div>
              <h2 className="text-lg font-bold text-slate-100">Mossy is locked</h2>
              <p className="text-sm text-slate-400 mt-1">Enter your password to continue.</p>
            </div>
            <input
              type="password"
              autoFocus
              value={attempt}
              onChange={(e) => setAttempt(e.target.value)}
              placeholder="Password"
              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-md text-slate-100 mb-3"
            />
            {error && (
              <div className="flex items-center gap-2 text-sm text-red-400 mb-3">
                <ShieldAlert className="w-4 h-4" /> {error}
              </div>
            )}
            <button type="submit" className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-md font-semibold transition-colors">
              Unlock
            </button>
          </form>
        </div>
      )}
    </AppLockContext.Provider>
  );
};

/** Wrap sensitive content (the Privacy/Security settings tab) with a one-time password prompt when "Require Password for Settings" is on. */
export const RequireUnlock: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { requirePasswordForSettings, verify } = useAppLock();
  const [unlocked, setUnlocked] = useState(false);
  const [attempt, setAttempt] = useState('');
  const [error, setError] = useState('');

  if (!requirePasswordForSettings || unlocked) return <>{children}</>;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (await verify(attempt)) {
      setUnlocked(true);
    } else {
      setError('Incorrect password.');
    }
  };

  return (
    <div className="flex items-center justify-center py-20">
      <form onSubmit={handleSubmit} className="w-full max-w-sm bg-slate-800/50 border border-slate-700/50 rounded-xl p-8">
        <div className="flex flex-col items-center mb-6">
          <Lock className="w-8 h-8 text-blue-400 mb-3" />
          <h2 className="text-lg font-bold text-slate-100">Password required</h2>
          <p className="text-sm text-slate-400 mt-1 text-center">This section is protected — enter your password to view it.</p>
        </div>
        <input
          type="password"
          autoFocus
          value={attempt}
          onChange={(e) => setAttempt(e.target.value)}
          placeholder="Password"
          className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-md text-slate-100 mb-3"
        />
        {error && <div className="text-sm text-red-400 mb-3">{error}</div>}
        <button type="submit" className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-md font-semibold transition-colors">
          Unlock
        </button>
      </form>
    </div>
  );
};
