import api from './apiInterceptor';
import { getAppUpdate } from './updateService';
import { UPDATE_CHECK_TIMEOUT_MS } from '../utils/constants';

jest.mock('./apiInterceptor', () => ({ __esModule: true, default: { get: jest.fn() } }));
jest.mock('../utils/appVersion', () => ({ APP_VERSION: '1.0.9' }));

const mockGet = jest.mocked(api.get);

beforeEach(() => {
  jest.clearAllMocks();
  mockGet.mockResolvedValue({ data: { success: true, data: {} } });
});

describe('getAppUpdate', () => {
  it('calls the public endpoint with platform and version', async () => {
    await getAppUpdate();

    expect(mockGet).toHaveBeenCalledWith('/meta/app-update', expect.objectContaining({
      params: expect.objectContaining({ platform: 'ios', version: '1.0.9' }),
    }));
  });

  /**
   * Load-bearing: apiInterceptor's axios instance sets no timeout, so without
   * this a hung socket has nothing to end it and the gate waits on a promise
   * that never settles.
   */
  it('sets its own request timeout', async () => {
    await getAppUpdate();

    expect(mockGet).toHaveBeenCalledWith('/meta/app-update', expect.objectContaining({
      timeout: UPDATE_CHECK_TIMEOUT_MS,
    }));
  });

  it('unwraps the response envelope', async () => {
    const decision = { updateAvailable: true, updateRequired: false };
    mockGet.mockResolvedValue({ data: { success: true, data: decision } });

    await expect(getAppUpdate()).resolves.toEqual({ success: true, data: decision });
  });
});
