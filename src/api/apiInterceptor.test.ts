import AsyncStorage from '@react-native-async-storage/async-storage';
import { TOKEN_KEY } from '../utils/constants';

// Real axios crashes under jest-expo at create() time, so capture what the
// module registers on a fake instance and drive the handlers directly.
const mockCreated: { defaults?: { headers: Record<string, string> }; onResponse?: (r: unknown) => Promise<unknown> } = {};
jest.mock('axios', () => ({
  create: (defaults: { headers: Record<string, string> }) => {
    mockCreated.defaults = defaults;
    return {
      interceptors: {
        request: { use: jest.fn() },
        response: { use: (ok: (r: unknown) => Promise<unknown>) => { mockCreated.onResponse = ok; } },
      },
    };
  },
}));
require('./apiInterceptor');

// Unsigned JWT-shaped string — the client only reads `exp`, never verifies.
const jwtWithExp = (exp: number) =>
  `h.${btoa(JSON.stringify({ exp })).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_')}.s`;
const now = () => Math.floor(Date.now() / 1000);
const respond = (xToken: string) => mockCreated.onResponse!({ headers: { 'x-token': xToken } });

describe('apiInterceptor X-Token handling', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('stores a re-issued token that outlives the current one', async () => {
    await AsyncStorage.setItem(TOKEN_KEY, jwtWithExp(now() + 60));
    const fresh = jwtWithExp(now() + 600);

    await respond(fresh);

    expect(await AsyncStorage.getItem(TOKEN_KEY)).toBe(fresh);
  });

  // The production incident: a 304 rebuilt from OkHttp's cache replayed a
  // days-old X-Token, and storing it 401'd every request after login.
  it('ignores an X-Token that is already expired', async () => {
    const current = jwtWithExp(now() + 600);
    await AsyncStorage.setItem(TOKEN_KEY, current);

    await respond(jwtWithExp(now() - 3600));

    expect(await AsyncStorage.getItem(TOKEN_KEY)).toBe(current);
  });

  it('ignores an X-Token older than the stored one', async () => {
    const current = jwtWithExp(now() + 600);
    await AsyncStorage.setItem(TOKEN_KEY, current);

    await respond(jwtWithExp(now() + 300));

    expect(await AsyncStorage.getItem(TOKEN_KEY)).toBe(current);
  });

  it('does not sign a signed-out user back in from a late response', async () => {
    await respond(jwtWithExp(now() + 600));

    expect(await AsyncStorage.getItem(TOKEN_KEY)).toBeNull();
  });

  it('asks the HTTP cache not to answer for the server', () => {
    expect(mockCreated.defaults!.headers['Cache-Control']).toBe('no-cache');
  });
});
