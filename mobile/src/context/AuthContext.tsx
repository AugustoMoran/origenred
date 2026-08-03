import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { AuthSession, AuthUser, getMe, login as apiLogin, logout as apiLogout, refreshSession } from '../api/auth';

const ACCESS_KEY = 'origenred_access';
const REFRESH_KEY = 'origenred_refresh';

interface AuthContextValue {
  user: AuthUser | null;
  accessToken: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const persistSession = async (session: AuthSession) => {
  await SecureStore.setItemAsync(ACCESS_KEY, session.accessToken);
  await SecureStore.setItemAsync(REFRESH_KEY, session.refreshToken);
};

const clearSession = async () => {
  await SecureStore.deleteItemAsync(ACCESS_KEY);
  await SecureStore.deleteItemAsync(REFRESH_KEY);
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const bootstrap = useCallback(async () => {
    try {
      const storedAccess = await SecureStore.getItemAsync(ACCESS_KEY);
      const storedRefresh = await SecureStore.getItemAsync(REFRESH_KEY);

      if (storedAccess) {
        try {
          const me = await getMe(storedAccess);
          setUser(me);
          setAccessToken(storedAccess);
          return;
        } catch {
          // access expired
        }
      }

      if (storedRefresh) {
        const session = await refreshSession(storedRefresh);
        await persistSession(session);
        setUser(session.user);
        setAccessToken(session.accessToken);
      }
    } catch {
      await clearSession();
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    bootstrap();
  }, [bootstrap]);

  const signIn = async (email: string, password: string) => {
    const session = await apiLogin(email, password);
    await persistSession(session);
    setUser(session.user);
    setAccessToken(session.accessToken);
  };

  const signOut = async () => {
    const refresh = await SecureStore.getItemAsync(REFRESH_KEY);
    if (refresh) {
      try {
        await apiLogout(refresh);
      } catch {
        // ignore
      }
    }
    await clearSession();
    setUser(null);
    setAccessToken(null);
  };

  const value = useMemo(
    () => ({ user, accessToken, loading, signIn, signOut }),
    [user, accessToken, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
