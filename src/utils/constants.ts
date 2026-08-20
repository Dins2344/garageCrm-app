// ─────────────────────────────────────────────────────────────
//  constants.ts — Application-wide constants for the mobile app
//  Import what you need:  import { TOKEN_KEY } from '../utils/constants';
//
//  MIRROR: the storage keys below MUST match frontend/src/utils/constants.ts.
//  Both apps read and write the same key names, and the web app documents them
//  in .agents/AGENTS.md under "Cross-App Rules".
// ─────────────────────────────────────────────────────────────

// ── AsyncStorage keys ─────────────────────────────────────────
// Never inline these as string literals. They were repeated 18 times across
// apiInterceptor, AuthContext, GarageContext and InvoiceViewerScreen, which is
// how `garagepulse_web_banner_dismissed` came to be missing from logout's
// cleanup — the banner then never reappeared for the next user on the device.
export const TOKEN_KEY = 'garagepulse_token';
export const USER_KEY = 'garagepulse_user';
export const ACTIVE_GARAGE_KEY = 'garagepulse_active_garage';
export const WEB_BANNER_DISMISSED_KEY = 'garagepulse_web_banner_dismissed';

/**
 * Every key the app writes.
 *
 * Logout clears this list rather than naming keys one at a time, so adding a
 * new key here is enough to have it cleaned up on sign-out.
 */
export const ALL_STORAGE_KEYS = [
  TOKEN_KEY,
  USER_KEY,
  ACTIVE_GARAGE_KEY,
  WEB_BANNER_DISMISSED_KEY,
] as const;

// ── Pagination ────────────────────────────────────────────────
export const DEFAULT_PAGE_SIZE = 15;
/** Used when loading a full list to populate a picker, not a paged screen. */
export const DROPDOWN_FETCH_LIMIT = 500;
/** How many past job cards to load on a vehicle's detail screen. */
export const VEHICLE_HISTORY_LIMIT = 50;

// ── App Branding ──────────────────────────────────────────────
export const APP_NAME = 'GaragePulse';
