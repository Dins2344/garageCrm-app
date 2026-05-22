import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { login as authLogin, register as authRegister, getMe } from '../api/authService';
import IdleTimer from '../components/IdleTimer';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkToken();
  }, []);

  const checkToken = async () => {
    try {
      const token = await AsyncStorage.getItem('garagepulse_token');
      const savedUserStr = await AsyncStorage.getItem('garagepulse_user');
      
      if (token && savedUserStr) {
        setUser(JSON.parse(savedUserStr));
        const res = await getMe();
        setUser(res.data);
        await AsyncStorage.setItem('garagepulse_user', JSON.stringify(res.data));
      }
    } catch (e) {
      await logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const { token, data } = await authLogin(email, password);
    await AsyncStorage.setItem('garagepulse_token', token);
    await AsyncStorage.setItem('garagepulse_user', JSON.stringify(data));
    setUser(data);
    return data;
  };

  const register = async (formData) => {
    const { token, data } = await authRegister(formData);
    await AsyncStorage.setItem('garagepulse_token', token);
    await AsyncStorage.setItem('garagepulse_user', JSON.stringify(data));
    setUser(data);
    return data;
  };

  const logout = async () => {
    await AsyncStorage.removeItem('garagepulse_token');
    await AsyncStorage.removeItem('garagepulse_user');
    setUser(null);
  };

  const hasRole = (...roles) => {
    return user && roles.includes(user.role);
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
