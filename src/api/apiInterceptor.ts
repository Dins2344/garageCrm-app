import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { TOKEN_KEY, ACTIVE_GARAGE_KEY, SESSION_STORAGE_KEYS } from '../utils/constants';

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
      // The same list AuthContext.logout() clears. This used to name three keys
      // by hand and so never cleared WEB_BANNER_DISMISSED_KEY — a session that
      // ended by 401 rather than by the Log Out button leaked the banner
      // dismissal to the next user on the device, which is the exact bug the
      // one-list rule exists to prevent. Two sign-out paths, one list.
      await AsyncStorage.multiRemove([...SESSION_STORAGE_KEYS]);
    }
    return Promise.reject(error);
  }
);

export default api;
