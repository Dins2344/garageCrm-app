<!-- Detailed reference for this repository, split by topic and read on demand.
     The always-on rules live in CLAUDE.md at the repo root. -->

## Platform-Specific Notes

### Android Shadows
Always include `elevation` alongside `shadow*` properties:

```javascript
card: {
  shadowColor: '#000',
  shadowOpacity: 0.05,
  shadowRadius: 5,
  shadowOffset: { width: 0, height: 2 },
  elevation: 2,  // Required for Android
},
```

### Safe Area
The app uses `react-native-safe-area-context` — wrap full-screen content with `SafeAreaView` when not using navigation headers.

### Keyboard Handling
For screens with forms, wrap content in `KeyboardAvoidingView`:

```javascript
import { KeyboardAvoidingView, Platform } from 'react-native';

<KeyboardAvoidingView
  behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
  style={{ flex: 1 }}
>
  {/* Form content */}
</KeyboardAvoidingView>
```

---

## TypeScript Conventions

The whole mobile app is TypeScript (`strict: true` in `tsconfig.json`, extending `expo/tsconfig.base`). No new `.jsx`/`.js` files — everything is `.tsx`/`.ts`.

### Rules
- **Every component gets an explicit `interface Props`**, colocated in the same file directly above the component. There was no PropTypes to migrate from, so this is the first source of truth for a component's contract.
- **Never define a component inside another component's render body** (e.g. a `const Field = (...) => (...)` declared inside a modal component's function). Every render of the parent creates a *new* function identity for that nested component, so React unmounts and remounts it — and its `TextInput` — on every keystroke, silently dropping everything but the first character typed. This is a real bug, not just a lint nit (`react-hooks/static-components`) — it was caught during this migration by a form-fill test failing with only the first character registering. Always hoist form-field sub-components to module scope, as `BottomSheetPicker.tsx`, `SettingsScreen.tsx`'s `Field`, and `LoginScreen.tsx`'s `Field` already do.
- **Shared domain types live in `src/types/models.ts`** (`User`, `Customer`, `Vehicle`, `JobCard`, `Invoice`, etc.) and `src/types/api.ts` (`ApiListResponse<T>`, `ApiItemResponse<T>`, `ApiMessageResponse`) — same backend contract as the web frontend's equivalent files, ported (not shared via import) since this is a separate repo/app.
- **Navigation is fully typed** via `src/types/navigation.ts`: `RootStackParamList` (every stack screen + its params) and `MainTabParamList` (the four `MainTabs` screens), plus a `declare global { namespace ReactNavigation { interface RootParamList ... } }` augmentation so `useNavigation()` infers route names without a generic. A screen's props come from `RootStackScreenProps<'ScreenName'>` or, for a `MainTabs` screen that also needs to navigate to a stack-level route (e.g. `JobCardsScreen` navigating to `JobCardDetail`), `MainTabScreenProps<'ScreenName'>` (a `CompositeScreenProps` of both navigators). Adding a screen means adding its entry to the relevant `ParamList` first — see the Navigation Rules "Adding a New Screen" steps above.
- **Avoid `any`, including on `catch` parameters.** Use `src/utils/errors.ts`'s `getErrorMessage(error: unknown, fallback: string)` to pull a backend error message out of a caught Axios error instead of `catch (e: any) { e?.response?.data?.message }` — it narrows `unknown` safely and keeps `no-explicit-any` clean.
- `@expo/vector-icons` must be a **direct** `dependencies` entry (not left to resolve transitively through `expo`'s own `node_modules`) — TypeScript's module resolution won't reach into a nested dependency's `node_modules` the way Metro's runtime resolver does.
- Run `npm run typecheck` (`tsc --noEmit`) before pushing — it's also enforced in CI (`.github/workflows/ci.yml`).

---

## Testing Conventions

Tests use **Jest** (`jest-expo` preset) + **React Native Testing Library** + its built-in `userEvent`, with API service modules mocked via `jest.mock(...)` — tests never hit a real network.

### Where tests live
- **Colocated with the file they test**: `StatusStepper.tsx` → `StatusStepper.test.tsx`, `customerService.ts` → `customerService.test.ts`, right next to each other — same reasoning as the web frontend (tests are single-file-scoped, so colocation keeps them moving/deleting with the code they verify).
- `jest.config.js` — `preset: 'jest-expo'`, `setupFilesAfterEnv: ['./jest.setup.ts']`.
- `jest.setup.ts` — global mocks every test needs: `@expo/vector-icons` (mocked to a plain `Text`, since the real one pulls in `expo-font`/`expo-asset` native asset-loading machinery that Jest can't run) and `@react-native-async-storage/async-storage` (mocked via the package's own official `.../jest/async-storage-mock`).

### Rules
- **`render()` from `@testing-library/react-native` returns a `Promise` — always `await` it.** This is a change from the deprecated `react-test-renderer`-based API: `const result = render(...)` without `await` gives you an unresolved Promise (so `result.getByText` doesn't exist), and the `screen` singleton isn't bound until the render settles, so a synchronous `screen.getByText(...)` immediately afterward fails with "`render` function has not been called." Always write `await render(...)`.
- **Mock API service modules with an explicit factory**, not a bare `jest.mock('../api/xService')` automock: `jest.mock('../api/customerService', () => ({ getCustomers: jest.fn(), ... }))`. A bare automock still has to `require()` the real module to introspect its shape, which pulls in the real `apiInterceptor.ts` and its `axios.create()` call — and axios's fetch-adapter detection crashes under jest-expo's environment. This applies to any module that (transitively) imports `apiInterceptor.ts`.
- **`AuthContext` only calls `getMe()` to re-validate a session already persisted in `AsyncStorage`** (unlike the web app, which always calls `getMe()` on mount) — tests exercising that path must seed `AsyncStorage.setItem('garagepulse_token', ...)` / `garagepulse_user` first, and `AsyncStorage.clear()` in `beforeEach` so tests don't leak state into each other.
- Priority order for new work: hooks and context (pure logic, cheap to test), the service-layer contract for any new/changed service module, one presentational-component test for anything with real branching (like `StatusStepper`), and one fetch → render (+ primary action) test per new screen — not exhaustive coverage.
- Prefer `getByText`/`getByPlaceholderText`/`getByRole` queries over `testID` where the element already has visible, accessible text. Add `testID` (and, where it doubles as a real accessibility improvement, `accessibilityLabel`) only for icon-only controls with no discoverable text — see the `add-customer-fab` button in `CustomersScreen.tsx`.

### Running tests
```bash
npm test          # single run (jest) — what CI runs
npm run test:watch # watch mode while developing
```

---

## Performance Conventions

- **`FlatList` `renderItem` and `keyExtractor` must be wrapped in `useCallback`** on every list screen (`JobCardsScreen`, `CustomersScreen`, `VehiclesScreen`, `InvoicesScreen`, `StaffScreen`). Without this, typing in a screen's search box recreates `renderItem` on every keystroke, which is a documented React Native performance anti-pattern for virtualized lists. Keep the dependency array minimal — usually just `navigation` (React Navigation guarantees it's referentially stable) plus any role-check booleans the row actually branches on.
- **Never define a component inside another component's render body** — see the TypeScript Conventions note above. This is a performance rule as much as a correctness one: even where it doesn't lose keystrokes outright, unmounting/remounting a subtree on every parent render is expensive and defeats React's reconciliation.
- **Screens are lazy-mounted by React Navigation by default** (`lazy: true` on both `createNativeStackNavigator` and `createBottomTabNavigator`) — this is the mobile equivalent of the web app's route-level code-splitting and is already correctly in place. Don't disable `lazy` without a specific reason.
- **Keep `newArchEnabled: true`** (Fabric/TurboModules, set in `app.json`) and Hermes (Expo's default JS engine) — both are already-optimal defaults for this Expo/RN version; don't turn them off.
- **Don't add `React.memo`/`useMemo`/`useCallback` beyond the FlatList case above without profiling evidence.** Unmeasured memoization mostly adds risk (stale-closure bugs from wrong dependency arrays) without a proven benefit — same stance as the web frontend.

---

## Pre-Push Checklist

- [ ] No emoji anywhere — UI text, toasts, comments, or commit messages
- [ ] No inline storage keys, external URLs, or magic numbers — import from `constants.ts`
- [ ] Dependencies installed under Node 20 / npm 10 (`nvm use`) — verify with `npx -y npm@10 ci --dry-run`
- [ ] No new component that duplicates one already in `src/components/`
- [ ] No `console.log` statements
- [ ] All colors use documented hex palette (no named colors or arbitrary hex)
- [ ] All styles use `StyleSheet.create()` (no inline style objects for reusable patterns)
- [ ] All API calls go through `src/api/` service files
- [ ] Loading states show `ActivityIndicator` with color `#3b5ff8`
- [ ] Error states show `Toast.show()` with user-friendly messages
- [ ] List screens implement pull-to-refresh (`RefreshControl`)
- [ ] New screens are registered in `AppNavigator.tsx` **and** `src/types/navigation.ts`'s `ParamList`
- [ ] Navigation params pass IDs, not full objects
- [ ] Android shadows include `elevation` property
- [ ] Forms handle keyboard avoidance on iOS
- [ ] No hardcoded API URLs — use environment variable
- [ ] No component is defined inside another component's render body
- [ ] `FlatList` `renderItem`/`keyExtractor` on list screens are wrapped in `useCallback`
- [ ] New/changed components, hooks, or service modules have at least one colocated test
- [ ] `npm run typecheck` passes with zero errors
- [ ] `npm run lint` passes
- [ ] `npm test` passes locally
