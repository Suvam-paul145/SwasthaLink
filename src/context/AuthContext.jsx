import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api, { setAuthToken } from '../services/api';
import {
  AUTH_STORAGE_KEY,
  generateAdminId,
  generateDoctorId,
  getUserRoles,
  setUserRoles,
  ROLES_STORAGE_KEY,
} from '../utils/auth';

const AuthContext = createContext(null);

const SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000;

const loadStoredSession = () => {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    if (!parsed?.user?.email || !parsed?.user?.role) return null;

    if (parsed.loggedInAt) {
      const elapsed = Date.now() - new Date(parsed.loggedInAt).getTime();
      if (elapsed > SESSION_MAX_AGE_MS) {
        window.localStorage.removeItem(AUTH_STORAGE_KEY);
        return null;
      }
    }

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

  useEffect(() => {
    if (!session?.accessToken) return;

    let cancelled = false;
    setIsVerifying(true);

    api.verifySession()
      .then(async (result) => {
        if (cancelled) return;
        if (result?.success && result?.user) {
          // For patients, restore linkedPid from stored session or re-fetch
          let linkedPid = session.user?.linkedPid || null;
          if (!linkedPid && result.user.role === 'patient') {
            try {
              const profile = await api.getPatientProfile();
              linkedPid = profile?.linked_pid || null;
            } catch {
              // Silently continue — PID fetch is non-critical during verify
            }
          }

          const updatedSession = {
            ...session,
            user: {
              ...result.user,
              linkedPid,
            },
          };
          setSession(updatedSession);
          if (typeof window !== 'undefined') {
            window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updatedSession));
          }
        }
      })
      .catch(() => {
        if (cancelled) return;
        if (typeof window !== 'undefined') {
          window.localStorage.removeItem(AUTH_STORAGE_KEY);
        }
        setAuthToken(null);
        setSession(null);
      })
      .finally(() => {
        if (!cancelled) setIsVerifying(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback(async ({ role, email, password }) => {
    const response = await api.login({ role, email, password });

    if (response.access_token) {
      setAuthToken(response.access_token);
    }

    // Auto-generate system IDs based on role
    let systemId = response.user?.system_id;
    if (!systemId) {
      if (role === 'admin') systemId = generateAdminId();
      else if (role === 'doctor') systemId = generateDoctorId();
    }

    // For patients, fetch their linked PID from the backend profile
    let linkedPid = null;
    if (role === 'patient') {
      try {
        const profile = await api.getPatientProfile();
        linkedPid = profile?.linked_pid || null;
      } catch (err) {
        // Profile fetch may fail for new users — not critical
        console.warn('Could not fetch patient profile during login:', err.message);
      }
    }

    const nextSession = {
      user: {
        ...response.user,
        systemId,
        linkedPid,
      },
      accessToken: response.access_token || null,
      isDemo: Boolean(response.is_demo),
      loggedInAt: new Date().toISOString(),
    };

    // Store available roles for multi-role switching
    const existingRoles = getUserRoles();
    const availableRoles = response.user?.available_roles || [role];
    const mergedRoles = [...new Set([...existingRoles, ...availableRoles])];
    setUserRoles(mergedRoles);

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextSession));
    }

    setSession(nextSession);
    return nextSession;
  }, []);

  const switchRole = useCallback(async (newRole) => {
    if (!session?.user) return null;
    
    // Generate new system ID for new role
    let systemId = session.user.systemId;
    if (newRole === 'admin') systemId = generateAdminId();
    else if (newRole === 'doctor') systemId = generateDoctorId();
    else systemId = session.user.systemId;

    const nextSession = {
      ...session,
      user: {
        ...session.user,
        role: newRole,
        systemId,
      },
      switchedAt: new Date().toISOString(),
    };

    if (typeof window !== 'undefined') {
      window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextSession));
    }

    setSession(nextSession);
    return nextSession;
  }, [session]);

  const updateUserProfile = useCallback((updates) => {
    setSession((currentSession) => {
      if (!currentSession?.user) return currentSession;

      const nextSession = {
        ...currentSession,
        user: {
          ...currentSession.user,
          ...updates,
        },
        updatedAt: new Date().toISOString(),
      };

      if (typeof window !== 'undefined') {
        window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextSession));
      }

      return nextSession;
    });
  }, []);

  const logout = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
      window.localStorage.removeItem(ROLES_STORAGE_KEY);
    }
    setAuthToken(null);
    setSession(null);
  }, []);

  const availableRoles = useMemo(() => getUserRoles(), [session]);

  const value = useMemo(
    () => ({
      session,
      user: session?.user || null,
      accessToken: session?.accessToken || null,
      isDemoSession: Boolean(session?.isDemo),
      isAuthenticated: Boolean(session?.user),
      isVerifying,
      availableRoles,
      login,
      switchRole,
      updateUserProfile,
      logout,
    }),
    [session, isVerifying, availableRoles, login, switchRole, updateUserProfile, logout]
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
