import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { registerAuth } from '../api/client';
import type { AuthUser } from '../types/auth';

interface AuthContextValue {
  accessToken: string | null;
  user: AuthUser | null;
  loading: boolean;
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
  clearSession: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const API_BASE = import.meta.env.VITE_API_URL ?? import.meta.env.VITE_API_BASE_URL ?? '/api/v1';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const tokenRef = useRef<string | null>(null);
  useEffect(() => {
    tokenRef.current = accessToken;
  }, [accessToken]);

  const setSession = useCallback((token: string, u: AuthUser) => {
    setAccessToken(token);
    setUser(u);
  }, []);

  const clearSession = useCallback(() => {
    setAccessToken(null);
    setUser(null);
  }, []);

  // register handlers for api client (once)
  useEffect(() => {
    registerAuth({
      getToken: () => tokenRef.current,
      setSession: (t, u) => setSession(t, u as AuthUser),
      clearSession,
    });
  }, [setSession, clearSession]);

  // silent refresh on boot
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/auth/refresh`, {
          method: 'POST',
          credentials: 'include',
        });
        if (!cancelled && res.ok) {
          const json = (await res.json()) as { data: { accessToken: string; user: AuthUser } };
          setAccessToken(json.data.accessToken);
          setUser(json.data.user);
        }
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback((token: string, u: AuthUser) => {
    setAccessToken(token);
    setUser(u);
  }, []);

  const logout = useCallback(() => {
    setAccessToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ accessToken, user, loading, login, logout, clearSession }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}