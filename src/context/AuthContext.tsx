import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { login as authLogin, register as authRegister, getMe, RegisterFormData } from '../api/authService';
import IdleTimer from '../components/IdleTimer';
import { TOKEN_KEY, USER_KEY, ALL_STORAGE_KEYS } from '../utils/constants';
import type { User } from '../types/models';

export interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (formData: RegisterFormData) => Promise<User>;
  logout: () => Promise<void>;
  hasRole: (...roles: string[]) => boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const logout = async () => {
    // Clears every key the app writes, from one list, so a new key added to
    // constants.ts is cleaned up automatically. Naming keys individually here
    // is what let the "More on the web" dismissal survive logout forever — the
    // banner could never come back, and on a shared garage device one person
    // dismissing it hid it from everyone who logged in afterwards.
    await AsyncStorage.multiRemove([...ALL_STORAGE_KEYS]);
    setUser(null);
  };

  const checkToken = async () => {
    try {
      const [token, savedUserStr] = await Promise.all([
        AsyncStorage.getItem(TOKEN_KEY),
        AsyncStorage.getItem(USER_KEY),
      ]);

      if (token && savedUserStr) {
        setUser(JSON.parse(savedUserStr));
        const res = await getMe();
        setUser(res.data);
        await AsyncStorage.setItem(USER_KEY, JSON.stringify(res.data));
      }
    } catch {
      await logout();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkToken();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = async (email: string, password: string) => {
    const { token, data } = await authLogin(email, password);
    await AsyncStorage.setItem(TOKEN_KEY, token);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(data));
    setUser(data);
    return data;
  };

  const register = async (formData: RegisterFormData) => {
    const { token, data } = await authRegister(formData);
    await AsyncStorage.setItem(TOKEN_KEY, token);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(data));
    setUser(data);
    return data;
  };

  const hasRole = (...roles: string[]) => {
    return !!user && roles.includes(user.role);
  };

  // Re-fetches the current user from the server and updates both context
  // state and the cached copy in AsyncStorage — called after a profile edit
  // so the new name/phone shows up immediately everywhere (avatar initials,
  // greetings, staff lists, ...) instead of only after the next login.
  const refreshUser = async () => {
    const res = await getMe();
    setUser(res.data);
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(res.data));
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, hasRole, refreshUser }}>
      <IdleTimer>
        {children}
      </IdleTimer>
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
