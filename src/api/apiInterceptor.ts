import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { TOKEN_KEY, USER_KEY, ACTIVE_GARAGE_KEY } from '../utils/constants';

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || (Platform.OS === 'android' ? 'http://10.0.2.2:5000/api' : 'http://localhost:5000/api');

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem(TOKEN_KEY);
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      const garageId = await AsyncStorage.getItem(ACTIVE_GARAGE_KEY);
      if (garageId) {
        config.headers['X-Garage-Id'] = garageId;
      }
    } catch {
      // Token/garage read failed — request will proceed without those headers
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await AsyncStorage.removeItem(TOKEN_KEY);
      await AsyncStorage.removeItem(USER_KEY);
      await AsyncStorage.removeItem(ACTIVE_GARAGE_KEY);
      // Navigation dispatch needs to be handled outside interceptor ideally,
      // but Context should pick up the token removal if subscribed,
      // or we handle logout logic cleanly in AuthContext.
    }
    return Promise.reject(error);
  }
);

export default api;
