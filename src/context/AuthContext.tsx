import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { login as authLogin, register as authRegister, getMe, RegisterFormData } from '../api/authService';
import IdleTimer from '../components/IdleTimer';
import type { User } from '../types/models';

export interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (formData: RegisterFormData) => Promise<User>;
  logout: () => Promise<void>;
  hasRole: (...roles: string[]) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const logout = async () => {
    await AsyncStorage.removeItem('garagepulse_token');
    await AsyncStorage.removeItem('garagepulse_user');
    setUser(null);
  };

  const checkToken = async () => {
    try {
      const [token, savedUserStr] = await Promise.all([
        AsyncStorage.getItem('garagepulse_token'),
        AsyncStorage.getItem('garagepulse_user'),
      ]);

      if (token && savedUserStr) {
        setUser(JSON.parse(savedUserStr));
        const res = await getMe();
        setUser(res.data);
        await AsyncStorage.setItem('garagepulse_user', JSON.stringify(res.data));
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
    await AsyncStorage.setItem('garagepulse_token', token);
    await AsyncStorage.setItem('garagepulse_user', JSON.stringify(data));
    setUser(data);
    return data;
  };

  const register = async (formData: RegisterFormData) => {
    const { token, data } = await authRegister(formData);
    await AsyncStorage.setItem('garagepulse_token', token);
    await AsyncStorage.setItem('garagepulse_user', JSON.stringify(data));
    setUser(data);
    return data;
  };

  const hasRole = (...roles: string[]) => {
    return !!user && roles.includes(user.role);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, hasRole }}>
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
