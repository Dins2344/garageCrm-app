import api from './apiInterceptor';
import { getAppUpdate } from './updateService';

/**
 * The case where the app cannot read its own version — a bare dev client, or a
 * future Expo change that makes `Constants.expoConfig` null.
 *
 * A separate file rather than a `resetModules` dance in `updateService.test.ts`,
 * matching how `SettingsScreen.country.test.tsx` splits out a mock variant:
 * `jest.mock` factories are hoisted, so varying one within a file fights the
 * runtime rather than testing anything.
 */
jest.mock('./apiInterceptor', () => ({ __esModule: true, default: { get: jest.fn() } }));
jest.mock('../utils/appVersion', () => ({ APP_VERSION: '' }));

const mockGet = jest.mocked(api.get);

beforeEach(() => {
  jest.clearAllMocks();
  mockGet.mockResolvedValue({ data: { success: true, data: {} } });
});

/**
 * Omitted, not sent empty. The server reads an absent version as "no opinion"
 * and says nothing — which is the only safe direction, since a device that
 * cannot report its version also cannot fix that by updating.
 */
it('omits the version param rather than sending an empty one', async () => {
  await getAppUpdate();

  const params = mockGet.mock.calls[0][1]?.params as Record<string, unknown>;
  expect(params).not.toHaveProperty('version');
  expect(params.platform).toBeTruthy();
});
