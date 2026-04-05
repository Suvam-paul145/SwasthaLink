import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api, { setAuthToken } from '../services/api';
import { AUTH_STORAGE_KEY } from '../utils/auth';

const AuthContext = createContext(null);

const SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Load stored session from localStorage.
 * Returns null if missing, expired, or malformed.
 */
const loadStoredSession = () => {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    if (!parsed?.user?.email || !parsed?.user?.role) return null;

    // Check if session is within 24-hour window
    if (parsed.loggedInAt) {
      const elapsed = Date.now() - new Date(parsed.loggedInAt).getTime();
      if (elapsed > SESSION_MAX_AGE_MS) {
        // Session expired — clear it
        window.localStorage.removeItem(AUTH_STORAGE_KEY);
        return null;
      }
    }

    // Restore the auth token for API requests
    if (parsed.accessToken) {
      setAuthToken(parsed.accessToken);
    }

    return parsed;
  } catch (error) {
    return null;
  }
};

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => loadStoredSession());
  const [isVerifying, setIsVerifying] = useState(false);

  /**
   * On mount, verify the stored JWT with the backend.
   * If invalid/expired, clear session and force re-login.
   */
  useEffect(() => {
    if (!session?.accessToken) return;

    let cancelled = false;
    setIsVerifying(true);

    api.verifySession()
      .then((result) => {
        if (cancelled) return;
        if (result?.success && result?.user) {
          // Update session with fresh profile data
          const updatedSession = {
            ...session,
            user: result.user,
          };
          setSession(updatedSession);
          if (typeof window !== 'undefined') {
            window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updatedSession));
          }
        }
      })
      .catch(() => {
        if (cancelled) return;
        // Token is invalid or expired — force re-login
        if (typeof window !== 'undefined') {
          window.localStorage.removeItem(AUTH_STORAGE_KEY);
        }
        setAuthToken(null);
        setSession(null);
      })
      .finally(() => {
        if (!cancelled) setIsVerifying(false);
      });

    return () => { cancelled = true; };
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback(async ({ role, email, password }) => {
    const response = await api.login({ role, email, password });

    // Set JWT token for all future API requests
    if (response.access_token) {
      setAuthToken(response.access_token);
    }

    const nextSession = {
      user: response.user,
      accessToken: response.access_token || null,
      isDemo: Boolean(response.is_demo),
      loggedInAt: new Date().toISOString(),
    };

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextSession));
    }

    setSession(nextSession);
    return nextSession;
  }, []);

  const logout = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
    }
    setAuthToken(null);
    setSession(null);
  }, []);

  const value = useMemo(
    () => ({
      session,
      user: session?.user || null,
      accessToken: session?.accessToken || null,
      isDemoSession: Boolean(session?.isDemo),
      isAuthenticated: Boolean(session?.user),
      isVerifying,
      login,
      logout,
    }),
    [session, isVerifying, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
