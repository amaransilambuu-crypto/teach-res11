import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User } from '../types.ts';
import { api, getStoredToken, setStoredToken, removeStoredToken, detectDevice } from '../services/api.ts';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  currentDevice: string;
  login: (identifier: string, pass: string, rememberMe?: boolean) => Promise<void>;
  register: (username: string, email: string, pass: string, role?: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  refreshCurrentUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(() => Boolean(getStoredToken()));
  const currentDevice = detectDevice();

  const refreshUser = useCallback(async () => {
    const token = getStoredToken();
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const data = await api.auth.getMe();
      setUser(data.user);
    } catch (err) {
      console.warn('Auth token verification failed:', err);
      removeStoredToken();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Restore authenticated session on application startup
  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (identifier: string, pass: string, rememberMe = true) => {
    const res = await api.auth.login(identifier, pass, rememberMe);
    setStoredToken(res.token);
    setUser(res.user);
  };

  const register = async (username: string, email: string, pass: string, role = 'teacher') => {
    const res = await api.auth.register(username, email, pass, role);
    setStoredToken(res.token);
    setUser(res.user);
  };

  const logout = () => {
    removeStoredToken();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isLoading: loading,
        isAuthenticated: !!user,
        isAdmin: user?.role === 'admin',
        currentDevice,
        login,
        register,
        logout,
        refreshUser,
        refreshCurrentUser: refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
