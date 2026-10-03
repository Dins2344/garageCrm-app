import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { downloadExport } from './exportService';
import { TOKEN_KEY, ACTIVE_GARAGE_KEY } from '../utils/constants';

jest.mock('./apiInterceptor', () => ({ API_BASE_URL: 'https://api.example.com/api' }));
jest.mock('expo-file-system/legacy', () => ({
  cacheDirectory: 'file:///cache/',
  downloadAsync: jest.fn(),
  deleteAsync: jest.fn(),
}));

describe('downloadExport', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    await AsyncStorage.setItem(TOKEN_KEY, 'tok');
    await AsyncStorage.setItem(ACTIVE_GARAGE_KEY, 'g2');
  });

  it('downloads the export with the auth and branch headers and returns the file', async () => {
    jest.mocked(FileSystem.downloadAsync).mockResolvedValue({ status: 200 } as FileSystem.FileSystemDownloadResult);

    const uri = await downloadExport('customers');

    expect(uri).toMatch(/^file:\/\/\/cache\/customers-\d{4}-\d{2}-\d{2}\.xlsx$/);
    expect(FileSystem.downloadAsync).toHaveBeenCalledWith(
      'https://api.example.com/api/customers/export',
      uri,
      { headers: { Authorization: 'Bearer tok', 'X-Garage-Id': 'g2' } },
    );
  });

  it('throws and deletes the file when the server refuses', async () => {
    jest.mocked(FileSystem.downloadAsync).mockResolvedValue({ status: 403 } as FileSystem.FileSystemDownloadResult);

    await expect(downloadExport('vehicles')).rejects.toThrow('403');
    expect(FileSystem.deleteAsync).toHaveBeenCalledWith(
      expect.stringMatching(/vehicles-.*\.xlsx$/),
      { idempotent: true },
    );
  });
});
