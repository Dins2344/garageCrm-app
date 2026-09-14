<!-- Detailed reference for this repository, split by topic and read on demand.
     The always-on rules live in CLAUDE.md at the repo root. -->

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
- `SESSION_STORAGE_KEYS` — the list sign-out clears (logout *and* the 401 handler)
- `DEVICE_STORAGE_KEYS` — the list that deliberately survives sign-out
- Walkthrough flags (`WALKTHROUGH_SEEN_KEY`, `TOUR_SEEN_USERS_KEY`, `TOUR_SEEN_USERS_LIMIT`)
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

**Sign-out clears `SESSION_STORAGE_KEYS`, not a hand-written list** — from both
`AuthContext.logout()` and the 401 handler in `apiInterceptor.ts`. Naming keys
by hand in either one is what let them drift; the 401 path never cleared the
banner key, so a session that ended by expiry rather than by the Log Out button
leaked the dismissal to the next user.

```javascript
await AsyncStorage.multiRemove([...SESSION_STORAGE_KEYS]);
```

**A new key goes in one of two lists, and SESSION is the default.**
`DEVICE_STORAGE_KEYS` is never cleared — the two walkthrough flags and the
update snooze, which are device-scoped because `IdleTimer` signs people out
after `IDLE_TIMEOUT_MS` (30 minutes) of inactivity and a session-scoped
"already seen" flag would replay the first-run tour several times a day.

The test: *would the next person to sign in on a shared workshop phone be
harmed by inheriting this value?* A dismissed banner fails it. "This phone
already played its intro" passes it. If you are unsure, it is a SESSION key.

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

