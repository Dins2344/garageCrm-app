# GaragePulse Mobile — Working Agreement

`garageCrm-app` — the Android/iOS client for a multi-tenant garage/workshop
CRM. React Native 0.81 · Expo 54 · TypeScript · React Navigation 7 · Axios ·
AsyncStorage · Jest + React Native Testing Library. Ships to the Play Store via
EAS as `com.dctechs.garagepulse`.

**This is a standalone repository.** The API (`garageCrm-be`) and the web
client (`garageCrm-fe`) live in separate repos and deploy on their own
schedule. Anything shared with them is duplicated by hand — see *Mirrored
files* below.

**Published builds cannot be force-upgraded.** Someone is running last
release's binary against today's API, so backend changes must stay additive
and this app must tolerate fields it does not know about.

---

## Non-negotiables

1. **Run ESLint before pushing.** This repo's `tsconfig` does not set
   `noUnusedLocals`, so `tsc` passes on unused imports while ESLint errors on
   them — and CI runs `npm run lint`. Typecheck plus tests is not sufficient.
2. **Storage keys always come from `utils/constants.ts`**, never inlined.
3. **Never hardcode currency, locale, tax labels or date formats** — they come
   from `useGarage().locale` via `utils/format.ts`.
4. **Never use emoji.** Use `@expo/vector-icons` Ionicons.
5. **Never define a component inside another component's render body** — React
   treats it as a new type every render, so it loses state and input focus on
   every keystroke. Module scope, always.
6. **Install dependencies under Node 20 / npm 10** — a lock file from a newer
   npm fails CI's `npm ci`.

## Layering

Screens own data fetching and local state, and define `StyleSheet.create()` at
the bottom of the file. Components take props and never call API services or
navigation hooks. API modules in `src/api/` never touch UI state or toasts.

## Use the components that exist

| Need | Use |
| --- | --- |
| Dropdown / option list | `BottomSheetPicker` (supports `searchable`) |
| Labelled text input | `Field` from `FormControls` |
| Primary action button | `PrimaryBtn` from `FormControls` |
| Screen wrapper / max width | `ResponsiveScreen` |
| Job status progression | `StatusStepper` |
| Toast styling | `toastConfig` |

Use it → extend it with a prop → only then build new.

## Storage keys

```javascript
import { TOKEN_KEY, ALL_STORAGE_KEYS } from '../utils/constants';
await AsyncStorage.getItem(TOKEN_KEY);
await AsyncStorage.multiRemove([...ALL_STORAGE_KEYS]);   // logout
```

They were inlined 18 times once, which is how the "More on the web" banner key
got left out of logout — the banner never reappeared, and on a shared garage
device one person's dismissal hid it from everyone after them. Logout clears
`ALL_STORAGE_KEYS` as a list, so a new key is handled by being declared there.
A storage key must never live in a component file.

## Locale

`locale` comes from `useGarage()`; format through `src/utils/format.ts`.
Resolution order is active branch → `user.locale` → India, because staff never
load a branch list and `user.locale` is their only source.

## Hermes `Intl` caveat

`utils/format.ts` probes `Intl` once at module load and falls back to
`"INR 1,234.00"` if it is unavailable. Avoid `currencyDisplay: 'narrowSymbol'`,
`notation: 'compact'`, `formatToParts`, `PluralRules` and `RelativeTimeFormat`
— Hermes support is unreliable.

**jest-expo runs on Node's full-ICU V8, not Hermes.** A green test run does not
prove formatting works on a device. Formatting changes need a manual check on a
real Android device and an iOS simulator.

## Mirrored files — kept in step with `garageCrm-fe` by hand

There is no shared package between the two clients. These files are duplicates,
and a change to one without the other is a silent divergence. The other repo is
**`github.com/Dins2344/garageCrm-fe`** — if you only have this one cloned, open a
matching PR there.

| This repo | Web repo |
| --- | --- |
| `src/types/models.ts` | `src/types/models.ts` |
| `src/utils/format.ts` | `src/utils/format.ts` |
| `src/utils/locale.ts` | `src/utils/locale.ts` |
| `src/utils/format.test.ts` | `src/utils/format.test.ts` |
| `src/hooks/useCountries.ts` | `src/hooks/useCountries.ts` |
| `src/utils/constants.ts` (the `garagepulse_*` key strings only) | `src/utils/constants.ts` |
| `.claude/rules/00-shared-*.md` | `.claude/rules/00-shared-*.md` |

Enum string values must also match `types/domain.ts` in `garageCrm-be`.

## Testing notes

- Screens using `useFocusEffect` need it mocked, or a `NavigationContainer`.
  Mock factories are hoisted above imports, so `require()` inside the factory
  and prefix any outer variable with `mock`.
- Mock `GarageContext` with a real `locale` (`DEFAULT_LOCALE`) — the provider
  never yields `undefined`.
- Scope queries with `within(getByTestId(...))` where a label appears in more
  than one section.

## Verifying

```bash
npx tsc --noEmit && npx eslint . && npm test
```

Before pushing dependency changes: `npx -y npm@10 ci --dry-run`.

---

## Reference

| Topic | File |
| --- | --- |
| Project structure, layering, naming | `.claude/rules/01-architecture.md` |
| Styling rules and shadow conventions | `.claude/rules/02-styling.md` |
| API services, navigation, screen patterns | `.claude/rules/03-data-and-navigation.md` |
| Auth, style, constants, icons, reuse, anti-patterns | `.claude/rules/04-conventions.md` |
| Platform notes, TypeScript, testing, performance | `.claude/rules/05-platform-and-testing.md` |
| Shared: API contract, colours, enums, universal don'ts | `.claude/rules/00-shared-contract.md` |
| Shared: no emoji | `.claude/rules/00-shared-no-emoji.md` |
| Shared: Node/npm version discipline | `.claude/rules/00-shared-node-and-npm.md` |
| Shared: constants | `.claude/rules/00-shared-constants.md` |
| Shared: component reuse and UI guidelines | `.claude/rules/00-shared-component-reuse.md` |

`00-shared-*` files are duplicated across all three repos. Change one, copy it
to the other two.
