import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { readStoredAccessToken, writeStoredAccessToken } from './auth-storage';

export type AuthContextValue = {
  accessToken: string | null;
  setAccessToken: (token: string | null) => void;
  clearAuth: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [accessToken, setAccessTokenState] = useState<string | null>(() =>
    readStoredAccessToken()
  );

  const setAccessToken = useCallback((token: string | null) => {
    setAccessTokenState(token);
    writeStoredAccessToken(token);
  }, []);

  const clearAuth = useCallback(() => setAccessToken(null), [setAccessToken]);

  const value = useMemo(
    () => ({ accessToken, setAccessToken, clearAuth }),
    [accessToken, setAccessToken, clearAuth]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth 必须在 AuthProvider 内使用');
  }
  return ctx;
}
