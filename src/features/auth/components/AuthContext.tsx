// ============================================================
// AuthContext.tsx
// Location: src/features/auth/components/AuthContext.tsx
//
// Session state for the SPA. The JWT access token lives in memory
// (managed by lib/apiClient); the refresh token in localStorage so a
// reload can silently refresh. On app boot we restore the stored
// user; the api layer refreshes the token lazily on the first 401.
// ============================================================

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AuthService } from '../services/authService';
import { permissionsForRoles, type Permission } from '@/lib/permissions';
import type { User } from '../types';

const USER_KEY = 'jacana…User';

function loadStoredUser(): User | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as User;
    if (!parsed?.id || !parsed?.fullName) return null;
    return parsed;
  } catch {
    return null;
  }
}

export interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  permissions: Set<Permission>;
  isLoading: boolean;
  login: (user: User) => void;
  logout: () => void;
}

// ─── Default context (used only if a component is rendered outside the Provider)
const AuthContext = createContext<AuthContextType>({
  isAuthenticated: false,
  user: null,
  permissions: new Set(),
  isLoading: true,
  login: () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(() => loadStoredUser());
  const [isLoading, setIsLoading] = useState(true);

  // Session rehydration on boot: restore the stored user immediately,
  // then resolve loading. The api layer handles token refresh lazily.
  useEffect(() => {
    const stored = loadStoredUser();
    setUser(stored);
    setIsLoading(false);
  }, []);

  const login = useCallback((nextUser: User) => {
    localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
    setUser(nextUser);
  }, []);

  const logout = useCallback(() => {
    AuthService.logout();
    localStorage.removeItem(USER_KEY);
    setUser(null);
  }, []);

  const permissions = useMemo(() => permissionsForRoles(user?.roles ?? []), [user]);

  const value = useMemo(
    () => ({
      isAuthenticated: user !== null,
      user,
      permissions,
      isLoading,
      login,
      logout,
    }),
    [user, permissions, isLoading, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(AuthContext);
}
