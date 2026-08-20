# GaragePulse Mobile App — Contributing & Code Standards

> **Last Updated:** August 2026
> **Stack:** React Native 0.81 · Expo 54 · TypeScript · React Navigation 7 · Axios · AsyncStorage · Jest · React Native Testing Library

---

## Project Structure

```
mobile/
├── assets/                    # App icons, splash screen, images
├── src/
│   ├── api/                   # HTTP layer
│   │   ├── apiInterceptor.ts  # Shared Axios instance (auth, base URL, 401 handling)
│   │   ├── authService.ts     # /api/auth endpoints
│   │   ├── customerService.ts # /api/customers endpoints
│   │   ├── customerService.test.ts
│   │   ├── jobCardService.ts  # /api/jobcards endpoints
│   │   └── ...
│   ├── components/            # Reusable UI components
│   │   ├── BottomSheetPicker.tsx
│   │   ├── IdleTimer.tsx
│   │   ├── StatusStepper.tsx
│   │   └── StatusStepper.test.tsx
│   ├── context/               # React Context providers
│   │   ├── AuthContext.tsx    # Authentication state & session management
│   │   └── AuthContext.test.tsx
│   ├── navigation/            # React Navigation setup
│   │   └── AppNavigator.tsx   # Tab navigator + stack screens
│   ├── screens/                # Screen-level components (one per route)
│   │   ├── DashboardScreen.tsx
│   │   ├── JobCardsScreen.tsx
│   │   ├── CustomersScreen.tsx
│   │   ├── CustomersScreen.test.tsx
│   │   └── ...
│   ├── types/
│   │   ├── models.ts          # Shared domain interfaces (User, Customer, JobCard, ...)
│   │   ├── api.ts             # Generic API response envelope types
│   │   └── navigation.ts      # RootStackParamList / MainTabParamList — typed routes & params
│   └── utils/
│       ├── constants.ts     # Storage keys, limits, branding
│       ├── format.ts        # Locale-aware money/date/number formatting
│       ├── locale.ts        # DEFAULT_LOCALE + timezone choices
│       └── errors.ts          # getErrorMessage() — typed Axios error extraction (no `any`)
├── App.tsx                    # Root component (providers + navigator)
├── index.ts                   # Expo entry point
├── tsconfig.json              # TypeScript compiler config (extends expo/tsconfig.base, strict)
├── eslint.config.js           # ESLint flat config (typescript-eslint)
├── jest.config.js             # Jest config (preset: jest-expo)
├── jest.setup.ts              # Global test mocks (AsyncStorage, @expo/vector-icons)
├── app.json                   # Expo configuration
├── eas.json                   # EAS Build configuration
└── package.json
```

Every `.tsx`/`.ts` file may have a colocated `*.test.tsx`/`*.test.ts` sibling — see **Testing Conventions** below.

### Where Does New Code Go?

| You need to...                          | Put it in...         |
| --------------------------------------- | -------------------- |
| Create a new screen                     | `src/screens/`       |
| Build a reusable component              | `src/components/`    |
| Add API calls for a resource            | `src/api/`           |
| Add shared application state            | `src/context/`       |
| Add a new navigation route              | `src/navigation/` (register in `src/types/navigation.ts` too) |
| Add a shared domain type/interface      | `src/types/models.ts` |
| Add static images or assets             | `assets/`            |

---

## Architecture Rules

### Layer Separation

```
App.tsx (providers: AuthProvider, SafeAreaProvider, Toast)
  └── AppNavigator.tsx (navigation structure)
        ├── MainTabs (BottomTabNavigator)
        │   ├── DashboardScreen
        │   ├── JobCardsScreen
        │   ├── CustomersScreen
        │   └── MoreScreen
        └── Stack Screens (detail/create/edit screens)
```

### Rules:

1. **Screens** are navigation destinations. They:
   - Manage their own data fetching and local state
   - Compose reusable components
   - Handle user interactions and call API services
   - Define their styles with `StyleSheet.create()` at the bottom of the file
   - **Never** export reusable sub-components — extract to `components/`

2. **Components** are reusable UI pieces. They:
   - Accept props for customization
   - Are stateless or manage UI-only state
   - **Never** make API calls directly (data comes via props)
   - **Never** import navigation hooks (navigation is triggered from screens)

3. **API Services** handle all HTTP communication. They:
   - Live in `src/api/`
   - Import and use the shared `apiInterceptor.ts` Axios instance
   - Export named functions returning Axios promises
   - **Never** handle UI state, toasts, or navigation

4. **Context** provides app-wide shared state. Currently:
   - `AuthContext` — user session, login, logout, role checks

---

## Naming Conventions

### Files

| Type           | Convention                  | Example                    |
| -------------- | --------------------------- | -------------------------- |
| Screen         | `PascalCaseScreen.tsx`      | `DashboardScreen.tsx`      |
| Component      | `PascalCase.tsx`            | `StatusStepper.tsx`        |
| API Service    | `camelCaseService.ts`       | `jobCardService.ts`        |
| Context        | `PascalCaseContext.tsx`     | `AuthContext.tsx`          |
| Navigator      | `PascalCase.tsx`            | `AppNavigator.tsx`         |
| Test           | `<subject>.test.tsx` / `.test.ts`, colocated | `StatusStepper.test.tsx` |

`.jsx`/`.js` files are no longer added anywhere in `mobile/src/` — see **TypeScript Conventions** below.

### Functions & Variables

```javascript
// Screens are PascalCase default exports
export default function DashboardScreen() { ... }

// Event handlers
const handleSubmit = () => { ... };
const handleDeleteCustomer = (id) => { ... };

// Data fetching functions
const fetchDashboard = async () => { ... };
const loadCustomers = async () => { ... };

// Boolean state
const [loading, setLoading] = useState(true);
const [refreshing, setRefreshing] = useState(false);
const [isModalVisible, setIsModalVisible] = useState(false);

// Navigation names match screen names
navigation.navigate('JobCardDetail', { id: jobCard._id });
```

### Navigation Route Names

| Route Name           | Screen File                  |
| -------------------- | ---------------------------- |
| `Dashboard`          | `DashboardScreen.tsx`        |
| `JobCards`           | `JobCardsScreen.tsx`         |
| `JobCardDetail`      | `JobCardDetailScreen.tsx`    |
| `CreateJobCard`      | `CreateJobCardScreen.tsx`    |
| `Customers`          | `CustomersScreen.tsx`        |
| `Vehicles`           | `VehiclesScreen.tsx`         |
| `VehicleDetail`      | `VehicleDetailScreen.tsx`    |
| `Settings`           | `SettingsScreen.tsx`         |
| `Staff`              | `StaffScreen.tsx`            |
| `Invoices`           | `InvoicesScreen.tsx`         |
| `InvoiceViewer`      | `InvoiceViewerScreen.tsx`    |
| `EstimationEditor`   | `EstimationEditorScreen.tsx` |

Every route above (and its params) is registered in `src/types/navigation.ts`'s `RootStackParamList`/`MainTabParamList` — see **TypeScript Conventions** below.

---

## Styling Rules

### StyleSheet at Bottom of File

All styles MUST use `StyleSheet.create()` defined at the bottom of the component file.

```javascript
// Correct — styles at bottom
export default function DashboardScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Dashboard</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
});

// Wrong — inline styles
<View style={{ flex: 1, padding: 16, backgroundColor: '#f9fafb' }}>
```

### Color Palette (Must Match Web App)

Use these exact hex values to maintain visual consistency with the web frontend:

| Token              | Hex        | Usage                          |
| ------------------ | ---------- | ------------------------------ |
| **Primary**        | `#3b5ff8`  | Active tab tint, primary buttons, links |
| **Background**     | `#f9fafb`  | Screen background (`gray-50`)  |
| **Card Background** | `#ffffff` | Card/surface background        |
| **Text Primary**   | `#111827`  | Headings, primary text (`gray-900`) |
| **Text Secondary** | `#4b5563`  | Body text (`gray-600`)         |
| **Text Muted**     | `#6b7280`  | Captions, labels (`gray-500`)  |
| **Border**         | `#e5e7eb`  | Card borders (`gray-200`)      |
| **Border Light**   | `#f3f4f6`  | List separators (`gray-100`)   |
| **Success**        | `#10b981`  | Success states, positive       |
| **Warning**        | `#f59e0b`  | Warning states, pending        |
| **Danger/Error**   | `#ef4444`  | Error states, destructive      |
| **Info**           | `#3b82f6`  | Informational states           |
| **Purple Accent**  | `#8b5cf6`  | Charts, secondary accent       |

```javascript
// Use consistent color values
<View style={[styles.statCard, { borderLeftColor: '#3b82f6', borderLeftWidth: 4 }]}>

// Don't use random colors
<View style={{ backgroundColor: 'dodgerblue' }}>
```

> **Future:** Consider extracting these into a shared `theme.ts` constants file.

### Standard Component Styles

```javascript
// Card pattern
card: {
  backgroundColor: '#fff',
  borderRadius: 12,
  padding: 16,
  marginBottom: 16,
  shadowColor: '#000',
  shadowOpacity: 0.05,
  shadowRadius: 5,
  shadowOffset: { width: 0, height: 2 },
  elevation: 2,                    // Android shadow
},

// Screen container
container: {
  flex: 1,
  backgroundColor: '#f9fafb',
  padding: 16,
},

// Loading container
loadingContainer: {
  flex: 1,
  justifyContent: 'center',
  alignItems: 'center',
},

// Section title
sectionTitle: {
  fontSize: 18,
  fontWeight: 'bold',
  color: '#111827',
  marginBottom: 16,
},
```

### Spacing Standards

| Usage              | Value   |
| ------------------ | ------- |
| Screen padding     | `16`    |
| Card padding       | `16`    |
| Card border radius | `12`    |
| Card margin bottom | `16`    |
| Section gap        | `20`    |
| Element spacing    | `8–12`  |

### Typography Standards

| Element            | Font Size | Weight   | Color     |
| ------------------ | --------- | -------- | --------- |
| Screen title       | `24`      | `bold`   | `#111827` |
| Section title      | `18`      | `bold`   | `#111827` |
| Stat value         | `20`      | `bold`   | `#1f2937` |
| Body text          | `15`      | `normal` | `#4b5563` |
| Label text         | `13`      | `500`    | `#6b7280` |
| Caption/muted      | `12`      | `normal` | `#9ca3af` |

---

## API Service Rules

### Interceptor (`apiInterceptor.ts`)

The shared Axios instance handles:
- **Base URL:** Reads from `EXPO_PUBLIC_API_URL` env var (falls back to local dev defaults)
- **Auth token injection:** Reads JWT from AsyncStorage and adds `Bearer` header
- **401 auto-logout:** Clears stored token/user on unauthorized responses

### Service File Pattern

```typescript
import api from './apiInterceptor';
import type { ApiListResponse, ApiItemResponse, ApiMessageResponse } from '../types/api';
import type { Customer } from '../types/models';

export interface CustomerListParams {
  search?: string;
  page?: number;
  limit?: number;
}

// Named exports, one function per endpoint, typed params + envelope return
export const getCustomers = async (params?: CustomerListParams): Promise<ApiListResponse<Customer>> => {
  const res = await api.get('/customers', { params });
  return res.data;
};
export const getCustomer = async (id: string): Promise<ApiItemResponse<Customer>> => {
  const res = await api.get(`/customers/${id}`);
  return res.data;
};
export const createCustomer = async (data: Partial<Customer>): Promise<ApiItemResponse<Customer>> => {
  const res = await api.post('/customers', data);
  return res.data;
};
export const updateCustomer = async (id: string, data: Partial<Customer>): Promise<ApiItemResponse<Customer>> => {
  const res = await api.put(`/customers/${id}`, data);
  return res.data;
};
export const deleteCustomer = async (id: string): Promise<ApiMessageResponse> => {
  const res = await api.delete(`/customers/${id}`);
  return res.data;
};
```

### Rules:
- One file per backend resource (mirrors the web frontend's API layer)
- Unwrap `res.data` (the API response envelope) before returning — never return the raw Axios response
- Never show toasts, alerts, or handle navigation inside API services
- Consistent function naming: `get*`, `create*`, `update*`, `delete*`

---

## Navigation Rules

### Navigator Structure

```
AppNavigator
├── (Authenticated)
│   ├── MainTabs (BottomTabNavigator)
│   │   ├── Dashboard
│   │   ├── JobCards
│   │   ├── Customers
│   │   └── More
│   └── Stack Screens
│       ├── JobCardDetail
│       ├── CreateJobCard
│       ├── Vehicles
│       ├── VehicleDetail
│       ├── Invoices
│       ├── InvoiceViewer
│       ├── EstimationEditor
│       ├── Settings
│       └── Staff
└── (Unauthenticated)
    └── Login
```

### Rules:
- Auth state determines which navigator is rendered (conditional in `AppNavigator.tsx`)
- Main tab screens: `Dashboard`, `JobCards`, `Customers`, `More`
- All other screens are stack navigators pushed on top of `MainTabs`
- Tab bar uses Ionicons from `@expo/vector-icons`
- Active tab color: `#3b5ff8` (primary), inactive: `gray`
- Navigation params should pass minimal data (preferably just `id`):

```javascript
// Pass just the ID
navigation.navigate('JobCardDetail', { id: jobCard._id });

// Don't pass entire objects through navigation params
navigation.navigate('JobCardDetail', { jobCard: entireJobCardObject });
```

### Adding a New Screen

1. Create the screen file in `src/screens/NewScreen.tsx`
2. Add the route (and its params, or `undefined` if none) to `RootStackParamList` or `MainTabParamList` in `src/types/navigation.ts`
3. Import in `AppNavigator.tsx` and add to the appropriate navigator (Tab or Stack)
4. If it's a tab screen, add an icon mapping in `MainTabs` `screenOptions`

---

## Screen Patterns

### Standard Data-Fetching Screen

```javascript
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, ActivityIndicator, RefreshControl } from 'react-native';
import { getItems } from '../api/itemService';
import Toast from 'react-native-toast-message';

export default function ItemsScreen() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchItems = async () => {
    try {
      const { data } = await getItems();
      setItems(data.data);
    } catch (error) {
      Toast.show({ type: 'error', text1: 'Failed to load items' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchItems();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b5ff8" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Render items */}
    </ScrollView>
  );
}

const styles = StyleSheet.create({ ... });
```

### Toast Notifications

```javascript
import Toast from 'react-native-toast-message';

// Success after mutation
Toast.show({ type: 'success', text1: 'Customer created successfully' });

// Error
Toast.show({ type: 'error', text1: 'Failed to load data' });

// With subtitle
Toast.show({ type: 'error', text1: 'Delete failed', text2: error.message });

// Don't use Alert.alert() for routine feedback
// Don't use console.log() for user-facing messages
```

### Pull-to-Refresh

All list screens MUST implement pull-to-refresh:

```javascript
<ScrollView
  refreshControl={
    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
  }
>
```

Or for FlatList:

```javascript
<FlatList
  data={items}
  refreshing={refreshing}
  onRefresh={onRefresh}
  renderItem={...}
/>
```

---

## Authentication Pattern

### Context-Based Auth

- Auth state is managed via `AuthContext.tsx`
- Token and user are persisted to `AsyncStorage` under:
  - `garagepulse_token` — JWT string
  - `garagepulse_user` — JSON-serialized user object
- On app launch, `checkToken()` validates the stored token via `getMe()` API call
- `AppNavigator` conditionally renders Login or Main app based on `user` state

### Role Checking

```javascript
const { user, hasRole } = useAuth();

// Check a single role
if (hasRole('owner', 'admin')) {
  // Show admin controls
}
```

### Idle Auto-Logout

The `IdleTimer` component wraps the app and auto-logs out after inactivity. It's embedded inside `AuthContext.Provider`.

---

## Code Style

### Module System
- **ES Modules** (`import` / `export`) throughout the mobile app
- Use `export default function ScreenName()` for screens
- Use named exports for API services: `export const getItems = ...`

### Formatting
- 2 spaces for indentation
- Single quotes for strings
- Semicolons at end of statements
- One empty line between logical sections
- Styles block always at the very bottom of the file

### Currency Formatting

```javascript
// Consistent currency format matching the web app
const formatCurrency = (amount) => {
  return `₹${(amount || 0).toLocaleString('en-IN')}`;
};
```

---

## Constants — What Belongs in `utils/constants.ts`

All app-wide constants live in `src/utils/constants.ts`.

### What Goes Here:
- AsyncStorage keys (`TOKEN_KEY`, `USER_KEY`, `ACTIVE_GARAGE_KEY`, `WEB_BANNER_DISMISSED_KEY`)
- `ALL_STORAGE_KEYS` — the list logout clears
- Limits and page sizes (`DEFAULT_PAGE_SIZE`, `DROPDOWN_FETCH_LIMIT`, `VEHICLE_HISTORY_LIMIT`)
- Branding (`APP_NAME`)

External URLs that come from an env var stay with their helper — see
`WEB_APP_URL` in `utils/webApp.ts`.

### What Does NOT Go Here:

- **One-off screen copy.** A heading, button label, placeholder or toast used
  in exactly one place reads better inline.
- **Currency symbol, locale, tax labels, phone examples.** These resolve from
  the garage's country at runtime through `utils/locale.ts` and
  `utils/format.ts`.

### Storage keys are the ones that bite

```javascript
// Don't inline the key
await AsyncStorage.getItem('garagepulse_token');

// Import it
import { TOKEN_KEY } from '../utils/constants';
await AsyncStorage.getItem(TOKEN_KEY);
```

These were inlined 18 times across `apiInterceptor`, `AuthContext`,
`GarageContext` and `InvoiceViewerScreen`. That is exactly how
`garagepulse_web_banner_dismissed` came to be missing from logout's cleanup —
the "More on the web" banner never reappeared, and on a shared garage device
one person dismissing it hid it from everyone who logged in afterwards.

**Logout clears `ALL_STORAGE_KEYS`, not a hand-written list.** When you add a
new key, add it to that array and sign-out cleanup is handled:

```javascript
await AsyncStorage.multiRemove([...ALL_STORAGE_KEYS]);
```

A storage key must never be defined in a component file. `AuthContext`
importing `WEB_BANNER_DISMISSED_KEY` from `WebAppBanner` was a layering
inversion — constants do not depend on UI.

---

## No Emoji — Use Ionicons

Emoji are not used anywhere in this app: not in screen text, section headings,
toast messages, button labels, comments, or commit messages. They render from
the platform font, so the same character looks different across Android
versions and against iOS, and beside the app's Ionicons they read as clip art.

`[emoji]` below stands in for a literal emoji character — this file stays free
of them so a repo-wide scan finds zero hits.

```javascript
// Don't prefix UI strings with an emoji
<Text style={s.cardTitle}>[emoji] Customer</Text>
Toast.show({ type: 'success', text1: '[emoji] Job Card Created!' });

// Use an Ionicon next to the text
<View style={s.cardTitleRow}>
  <Ionicons name="person-outline" size={16} color="#3b5ff8" />
  <Text style={s.cardTitle}>Customer</Text>
</View>
Toast.show({ type: 'success', text1: 'Job Card Created!' });

// Don't store emoji as data either — type the field as an icon name
const FEATURES = [{ icon: '[emoji]', label: 'Job Card Management' }];
const FEATURES: { icon: IconName; label: string }[] =
  [{ icon: 'clipboard-outline', label: 'Job Card Management' }];
```

`IconName` is the standard alias for the Ionicons name union — most screens
already declare it:

```typescript
type IconName = ComponentProps<typeof Ionicons>['name'];
```

---

## Reuse Components Before Building New Ones

This app has a small, deliberate component set. A new component written from
React Native defaults looks obviously bolted on — square corners, hairline grey
borders, system font weights — and quietly forks the design language.

**Check these first:**

| Need                          | Use                                  |
| ----------------------------- | ------------------------------------ |
| Dropdown / option list        | `BottomSheetPicker` (supports `searchable`) |
| Text input with a label       | `Field` from `FormControls`          |
| Primary action button         | `PrimaryBtn` from `FormControls`     |
| Screen wrapper / max width    | `ResponsiveScreen`                   |
| Job status progression        | `StatusStepper`                      |
| Toast styling                 | `toastConfig`                        |

**The order of preference:**

1. Use the existing component.
2. Add a prop to it, if it is nearly right.
3. Only then write a new one — styled from the palette and shadow conventions
   in **Styling Rules** above, never from defaults.

```javascript
// Don't hand-roll a picker when BottomSheetPicker exists
<Modal>...custom option list...</Modal>

// Don't create a second card style that almost matches the shared one
card: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#ccc' }
// Match the documented look: borderRadius 16-20, soft tinted shadow, no hard border
```

Two components that look 95% alike will drift apart, and that drift is what
makes an app feel machine-assembled.

---

## Anti-Patterns to Avoid

```javascript
// Don't use emoji in UI text, toasts, or headings
<Text style={s.cardTitle}>[emoji] Service Details</Text>
// Use an Ionicon beside the text

// Don't create a new component without checking components/ first
// Reuse or extend — BottomSheetPicker, Field, PrimaryBtn, ResponsiveScreen

// Don't use inline styles for reusable patterns
<View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 16 }}>
// Use StyleSheet.create() instead

// Don't use arbitrary color values
<Text style={{ color: 'tomato' }}>
// Use the documented hex palette

// Don't pass complex objects through navigation params
navigation.navigate('Detail', { entireObject: {...} });
// Pass IDs, fetch on the detail screen

// Don't skip loading states
const [items, setItems] = useState([]);
// Always show ActivityIndicator while fetching

// Don't use console.log in committed code
console.log('response:', data);
// Remove before committing

// Don't call API services inside components (only in screens)
// Components receive data via props

// Don't ignore RefreshControl — all list screens need pull-to-refresh

// Don't hardcode the API base URL
const api = axios.create({ baseURL: 'http://192.168.1.5:5000/api' });
// Use EXPO_PUBLIC_API_URL environment variable
```

---

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
