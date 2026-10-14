'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { ApiError, setUnauthorizedListener } from '@/lib/api';
import { tokenStorage } from '@/lib/tokenStorage';
import { authApi } from '@/services/authApi';
import type { AuthResponse, Role, User } from '@/types/api';

type AuthStatus = 'loading' | 'authenticated' | 'anonymous';

interface AuthContextValue {
  status: AuthStatus;
  user: User | null;
  login: (email: string, password: string) => Promise<User>;
  signup: (input: { name: string; email: string; password: string; role: Role }) => Promise<User>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * Holds the logged-in user. On first load it restores the session by sending
 * the stored token to GET /api/auth/me; the server decides if it is still valid.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');

  const logout = useCallback(() => {
    tokenStorage.clear();
    setUser(null);
    setStatus('anonymous');
  }, []);

  useEffect(() => {
    setUnauthorizedListener(logout);
    return () => setUnauthorizedListener(null);
  }, [logout]);

  useEffect(() => {
    if (!tokenStorage.get()) {
      setStatus('anonymous');
      return;
    }
    const controller = new AbortController();
    authApi
      .me(controller.signal)
      .then((me) => {
        setUser(me);
        setStatus('authenticated');
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        // Only forget the token if the server rejected it, not on a network blip.
        if (err instanceof ApiError && err.status === 401) tokenStorage.clear();
        setStatus('anonymous');
      });
    return () => controller.abort();
  }, []);

  const startSession = useCallback(({ token, user: nextUser }: AuthResponse) => {
    tokenStorage.set(token);
    setUser(nextUser);
    setStatus('authenticated');
    return nextUser;
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      login: async (email, password) => startSession(await authApi.login({ email, password })),
      signup: async (input) => startSession(await authApi.signup(input)),
      logout,
    }),
    [status, user, startSession, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

/** For pages behind <RequireAuth>, where a user is guaranteed. */
export function useCurrentUser(): User {
  const { user } = useAuth();
  if (!user) throw new Error('useCurrentUser used outside an authenticated page');
  return user;
}
