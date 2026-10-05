import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { TOKEN_KEY, ACTIVE_GARAGE_KEY, SESSION_STORAGE_KEYS } from '../utils/constants';

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || (Platform.OS === 'android' ? 'http://10.0.2.2:5000/api' : 'http://localhost:5000/api');

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    // Android's OkHttp cache answers a 304 by rebuilding the response from its
    // stored copy, headers included — so a days-old X-Token came back and was
    // saved as the session, 401ing everything seconds after login. no-cache
    // makes OkHttp skip the stored copy and use only what the server sent.
    'Cache-Control': 'no-cache'
  }
});

/** `exp` of a JWT, or NaN if it cannot be read (then comparisons are false). */
const expOf = (token: string | null): number => {
  try {
    const payload = token!.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return Number(JSON.parse(atob(payload)).exp);
  } catch {
    return NaN;
  }
};

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
  async (response) => {
    // Sliding session: the server re-issues the token on activity and hands
    // it back in this header. Not storing it means a 401 ten minutes after
    // login no matter how busy the user is.
    const fresh = response.headers?.['x-token'];
    if (typeof fresh === 'string' && fresh) {
      // Only ever move the session forward: no stored token means the user
      // signed out (a late response must not sign them back in), and a token
      // that is already expired or older than the stored one is a replay.
      // An unreadable exp is NaN, which fails both checks and so is accepted.
      const current = await AsyncStorage.getItem(TOKEN_KEY);
      const exp = expOf(fresh);
      if (current && !(exp * 1000 <= Date.now()) && !(exp <= expOf(current))) {
        await AsyncStorage.setItem(TOKEN_KEY, fresh);
      }
    }
    return response;
  },
  async (error) => {
    // Only when the request actually carried a token. A 401 on a request that
    // never sent one is not a session expiry — and the public /meta/app-update
    // call now runs on every launch *and* every resume, so a misconfigured
    // proxy answering 401 would otherwise sign people out several times a day.
    if (error.response?.status === 401 && error.config?.headers?.Authorization) {
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
