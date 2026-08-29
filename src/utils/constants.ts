// ─────────────────────────────────────────────────────────────
//  constants.ts — Application-wide constants for the mobile app
//  Import what you need:  import { TOKEN_KEY } from '../utils/constants';
//
//  MIRROR: the SESSION keys below MUST match frontend/src/utils/constants.ts.
//  The DEVICE keys are mobile-only by design — they track install-scoped state
//  for things the web client does not have (the first-run walkthrough, the app
//  update prompt) — so their absence there is not drift.
// ─────────────────────────────────────────────────────────────

// ── AsyncStorage keys ─────────────────────────────────────────
// Never inline these as string literals. They were repeated 18 times across
// apiInterceptor, AuthContext, GarageContext and InvoiceViewerScreen, which is
// how `garagepulse_web_banner_dismissed` came to be missing from logout's
// cleanup — the banner then never reappeared for the next user on the device.
//
// Every key belongs to exactly one of the two lists below, and which one is a
// product decision, not a technical one. The test is: **would the next person
// to sign in on a shared workshop phone be harmed by inheriting this value?**
// A dismissed banner fails that test. "This phone has already played its
// one-time intro" passes it. If you are unsure, it is a SESSION key.
export const TOKEN_KEY = 'garagepulse_token';
export const USER_KEY = 'garagepulse_user';
export const ACTIVE_GARAGE_KEY = 'garagepulse_active_garage';
export const WEB_BANNER_DISMISSED_KEY = 'garagepulse_web_banner_dismissed';

/** Install-scoped: the pre-auth intro carousel has run once on this device. */
export const WALKTHROUGH_SEEN_KEY = 'garagepulse_walkthrough_seen';
/** Install-scoped: JSON array of user ids that have seen the post-login tour. */
export const TOUR_SEEN_USERS_KEY = 'garagepulse_tour_seen_users';

/**
 * Install-scoped: the *optional* update prompt was snoozed. JSON
 * `{ version, until }`.
 *
 * Applying the classification test below: the next person to sign in on a
 * shared phone inherits a suppressed optional nag for at most 24 hours, and a
 * *mandatory* update never consults this key at all. Not harmed. As a SESSION
 * key, IdleTimer's 10-minute auto-logout would clear it several times a day and
 * the prompt would return constantly — the same failure the DEVICE list below
 * describes for the walkthrough flags.
 */
export const UPDATE_SNOOZE_KEY = 'garagepulse_update_snooze';

/**
 * Cleared on sign-out — by AuthContext.logout() *and* by the 401 handler in
 * api/apiInterceptor.ts. Both paths clear this same list; naming keys by hand
 * in either one is what let them drift (the 401 path never cleared the banner).
 */
export const SESSION_STORAGE_KEYS = [
  TOKEN_KEY,
  USER_KEY,
  ACTIVE_GARAGE_KEY,
  WEB_BANNER_DISMISSED_KEY,
] as const;

/**
 * Never cleared, on purpose. The reason is IdleTimer: the app signs itself out
 * after 10 minutes of inactivity, which in a workshop happens several times a
 * day. A "already seen" flag in SESSION_STORAGE_KEYS would mean the first-run
 * tour replays every time someone puts the phone down to do the actual work —
 * the exact opposite of "shown once".
 *
 * Adding a key here is a deliberate choice to leak it across sign-ins on a
 * shared device. TOUR_SEEN_USERS_KEY is keyed by user id precisely so "shown
 * once per person" survives while the storage itself stays install-scoped.
 */
export const DEVICE_STORAGE_KEYS = [
  WALKTHROUGH_SEEN_KEY,
  TOUR_SEEN_USERS_KEY,
  UPDATE_SNOOZE_KEY,
] as const;

// ALL_STORAGE_KEYS was removed rather than redefined as the union of the two
// lists. Its only caller was logout, where it is now wrong, and a plausible
// name sitting beside the correct one is how the banner bug comes back.
// Deleting it makes the migration a compile error instead of a silent
// behaviour change.

/** How many user ids TOUR_SEEN_USERS_KEY retains; oldest dropped first. */
export const TOUR_SEEN_USERS_LIMIT = 20;

// ── Pagination ────────────────────────────────────────────────
export const DEFAULT_PAGE_SIZE = 15;
/** Used when loading a full list to populate a picker, not a paged screen. */
export const DROPDOWN_FETCH_LIMIT = 500;
/** How many past job cards to load on a vehicle's detail screen. */
export const VEHICLE_HISTORY_LIMIT = 50;

// ── App update gate ───────────────────────────────────────────

/**
 * Play Store deep links.
 *
 * MIRROR: the https form must match `PLAY_STORE_URL` in
 * frontend/src/utils/constants.ts. Both carry `android.package` from
 * `mobile/app.json` — rename the package and these silently resolve to a
 * "not found" page.
 *
 * The server also returns a `storeUrl` on /meta/app-update and mobile
 * deliberately does **not** use it. This link is the escape hatch when a bad
 * policy has blocked the app, so it must not come from the same document that
 * did the blocking, and a compiled-in constant is not attacker-controllable.
 * The server's field exists for iOS, whose App Store id is assigned by Apple
 * and is unknowable here.
 */
export const ANDROID_PACKAGE = 'com.dctechs.garagepulse';
export const PLAY_STORE_URL = `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE}`;
export const PLAY_STORE_MARKET_URL = `market://details?id=${ANDROID_PACKAGE}`;

/**
 * Per-request timeout for the update check. `apiInterceptor` sets none, so
 * without this a hung socket has nothing to end it.
 */
export const UPDATE_CHECK_TIMEOUT_MS = 6000;
/**
 * The longest the gate may EVER withhold the app while a check is in flight.
 * See the invariant in components/UpdateGate.tsx — this is the anti-brick bound.
 */
export const UPDATE_GATE_HOLD_MS = 1200;
/** Resume checks are throttled to this. A cold start always checks. */
export const UPDATE_CHECK_INTERVAL_MS = 4 * 60 * 60 * 1000;
/** How long "Later" suppresses the prompt, for the same latestVersion. */
export const UPDATE_SNOOZE_MS = 24 * 60 * 60 * 1000;

// ── App Branding ──────────────────────────────────────────────
export const APP_NAME = 'GaragePulse';
