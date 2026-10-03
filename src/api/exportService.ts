import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { API_BASE_URL } from './apiInterceptor';
import { TOKEN_KEY, ACTIVE_GARAGE_KEY } from '../utils/constants';

export type ExportEntity = 'customers' | 'vehicles';

export const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/**
 * Downloads `GET /<entity>/export` (owner/admin only) straight to disk and
 * returns the file uri — natively, like the invoice PDF, because RN has no
 * `atob` to turn an axios arraybuffer into a file. That bypasses the axios
 * interceptor, so the auth and garage headers are attached here.
 *
 * `downloadAsync` resolves on ANY status and writes the error body into the
 * file, so a non-200 must be turned into a throw or the user is handed a
 * "spreadsheet" that is really a JSON error message.
 */
export const downloadExport = async (entity: ExportEntity): Promise<string> => {
  const [token, garageId] = await Promise.all([
    AsyncStorage.getItem(TOKEN_KEY),
    AsyncStorage.getItem(ACTIVE_GARAGE_KEY),
  ]);
  // ISO rather than toLocaleDateString: Hermes' Intl is unreliable, and a
  // locale format with slashes would be a path, not a filename.
  const fileUri = `${FileSystem.cacheDirectory}${entity}-${new Date().toISOString().slice(0, 10)}.xlsx`;

  const { status } = await FileSystem.downloadAsync(`${API_BASE_URL}/${entity}/export`, fileUri, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(garageId ? { 'X-Garage-Id': garageId } : {}),
    },
  });

  if (status !== 200) {
    await FileSystem.deleteAsync(fileUri, { idempotent: true });
    throw new Error(`Export failed with status ${status}`);
  }
  return fileUri;
};
