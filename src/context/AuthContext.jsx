import { createContext, useContext, useMemo, useState } from 'react';
import api from '../services/api';
import { AUTH_STORAGE_KEY } from '../utils/auth';

const AuthContext = createContext(null);

const loadStoredSession = () => {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    if (!parsed?.user?.email || !parsed?.user?.role) return null;
    return parsed;
  } catch (error) {
    return null;
  }
};

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => loadStoredSession());

  const login = async ({ role, email, password }) => {
    const response = await api.login({
      role,
      email,
      password,
    });

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
  };

  const logout = () => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
    }
    setSession(null);
  };

  const value = useMemo(
    () => ({
      session,
      user: session?.user || null,
      accessToken: session?.accessToken || null,
      isDemoSession: Boolean(session?.isDemo),
      isAuthenticated: Boolean(session?.user),
      login,
      logout,
    }),
    [session]
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

