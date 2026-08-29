import Constants from 'expo-constants';

/**
 * This build's semver, embedded from `app.json` at build time.
 *
 * **Not `android.versionCode`.** `eas.json` sets `appVersionSource: 'remote'`
 * with `production.autoIncrement`, so EAS owns the version code and the `6` in
 * `app.json` is already stale — and no admin can reason about an opaque integer
 * in a policy form. The semver is developer-controlled and is what the store
 * shows.
 *
 * `''` when the manifest is unavailable (a bare dev client, or a future Expo
 * change). Callers must treat that as "no opinion" and never as "very old" —
 * blocking a build that cannot report its version would be unescapable, since
 * updating does not fix a broken version read.
 *
 * `expo-constants` is a **direct** dependency on purpose. It also resolves
 * transitively under `expo/node_modules`, which Metro finds and `tsc` does not
 * — the same trap `@expo/vector-icons` documents in
 * .claude/rules/05-platform-and-testing.md, and CI runs `npm run typecheck`.
 */
export const APP_VERSION: string = Constants.expoConfig?.version ?? '';
