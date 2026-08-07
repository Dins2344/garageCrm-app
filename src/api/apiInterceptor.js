import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || (Platform.OS === 'android' ? 'http://10.0.2.2:5000/api' : 'http://localhost:5000/api');

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('garagepulse_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (e) {
      // Token read failed — request will proceed without auth header
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await AsyncStorage.removeItem('garagepulse_token');
      await AsyncStorage.removeItem('garagepulse_user');
      // Navigation dispatch needs to be handled outside interceptor ideally,
      // but Context should pick up the token removal if subscribed,
      // or we handle logout logic cleanly in AuthContext.
    }
    return Promise.reject(error);
  }
);

export default api;
