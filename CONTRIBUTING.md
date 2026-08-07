# GaragePulse Mobile App — Contributing & Code Standards

> **Last Updated:** August 2026
> **Stack:** React Native 0.81 · Expo 54 · React Navigation 7 · Axios · AsyncStorage

---

## 📁 Project Structure

```
mobile/
├── assets/                    # App icons, splash screen, images
├── src/
│   ├── api/                   # HTTP layer
│   │   ├── apiInterceptor.js  # Shared Axios instance (auth, base URL, 401 handling)
│   │   ├── authService.js     # /api/auth endpoints
│   │   ├── customerService.js # /api/customers endpoints
│   │   ├── jobCardService.js  # /api/jobcards endpoints
│   │   └── ...
│   ├── components/            # Reusable UI components
│   │   ├── BottomSheetPicker.js
│   │   ├── IdleTimer.js
│   │   └── StatusStepper.js
│   ├── context/               # React Context providers
│   │   └── AuthContext.js     # Authentication state & session management
│   ├── navigation/            # React Navigation setup
│   │   └── AppNavigator.js    # Tab navigator + stack screens
│   └── screens/               # Screen-level components (one per route)
│       ├── DashboardScreen.js
│       ├── JobCardsScreen.js
│       ├── CustomersScreen.js
│       └── ...
├── App.js                     # Root component (providers + navigator)
├── index.js                   # Expo entry point
├── app.json                   # Expo configuration
├── eas.json                   # EAS Build configuration
└── package.json
```

### Where Does New Code Go?

| You need to...                          | Put it in...         |
| --------------------------------------- | -------------------- |
| Create a new screen                     | `src/screens/`       |
| Build a reusable component              | `src/components/`    |
| Add API calls for a resource            | `src/api/`           |
| Add shared application state            | `src/context/`       |
| Add a new navigation route              | `src/navigation/`    |
| Add static images or assets             | `assets/`            |

---

## 🧱 Architecture Rules

### Layer Separation

```
App.js (providers: AuthProvider, SafeAreaProvider, Toast)
  └── AppNavigator.js (navigation structure)
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
   - Import and use the shared `apiInterceptor.js` Axios instance
   - Export named functions returning Axios promises
   - **Never** handle UI state, toasts, or navigation

4. **Context** provides app-wide shared state. Currently:
   - `AuthContext` — user session, login, logout, role checks

---

## 📛 Naming Conventions

### Files

| Type           | Convention                  | Example                    |
| -------------- | --------------------------- | -------------------------- |
| Screen         | `PascalCaseScreen.js`       | `DashboardScreen.js`       |
| Component      | `PascalCase.js`             | `StatusStepper.js`         |
| API Service    | `camelCaseService.js`       | `jobCardService.js`        |
| Context        | `PascalCaseContext.js`      | `AuthContext.js`           |
| Navigator      | `PascalCase.js`             | `AppNavigator.js`          |

### Functions & Variables

```javascript
// ✅ Screens are PascalCase default exports
export default function DashboardScreen() { ... }

// ✅ Event handlers
const handleSubmit = () => { ... };
const handleDeleteCustomer = (id) => { ... };

// ✅ Data fetching functions
const fetchDashboard = async () => { ... };
const loadCustomers = async () => { ... };

// ✅ Boolean state
const [loading, setLoading] = useState(true);
const [refreshing, setRefreshing] = useState(false);
const [isModalVisible, setIsModalVisible] = useState(false);

// ✅ Navigation names match screen names
navigation.navigate('JobCardDetail', { id: jobCard._id });
```

### Navigation Route Names

| Route Name           | Screen File                  |
| -------------------- | ---------------------------- |
| `Dashboard`          | `DashboardScreen.js`         |
| `JobCards`           | `JobCardsScreen.js`          |
| `JobCardDetail`      | `JobCardDetailScreen.js`     |
| `CreateJobCard`      | `CreateJobCardScreen.js`     |
| `Customers`          | `CustomersScreen.js`         |
| `Vehicles`           | `VehiclesScreen.js`          |
| `VehicleDetail`      | `VehicleDetailScreen.js`     |
| `Settings`           | `SettingsScreen.js`          |
| `Staff`              | `StaffScreen.js`             |
| `Invoices`           | `InvoicesScreen.js`          |
| `InvoiceViewer`      | `InvoiceViewerScreen.js`     |
| `EstimationEditor`   | `EstimationEditorScreen.js`  |

---

## 🎨 Styling Rules

### StyleSheet at Bottom of File

All styles MUST use `StyleSheet.create()` defined at the bottom of the component file.

```javascript
// ✅ Correct — styles at bottom
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

// ❌ Wrong — inline styles
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
// ✅ Use consistent color values
<View style={[styles.statCard, { borderLeftColor: '#3b82f6', borderLeftWidth: 4 }]}>

// ❌ Don't use random colors
<View style={{ backgroundColor: 'dodgerblue' }}>
```

> **Future:** Consider extracting these into a shared `theme.js` constants file.

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

## 📡 API Service Rules

### Interceptor (`apiInterceptor.js`)

The shared Axios instance handles:
- **Base URL:** Reads from `EXPO_PUBLIC_API_URL` env var (falls back to local dev defaults)
- **Auth token injection:** Reads JWT from AsyncStorage and adds `Bearer` header
- **401 auto-logout:** Clears stored token/user on unauthorized responses

### Service File Pattern

```javascript
import api from './apiInterceptor';

// ✅ Named exports, one function per endpoint
export const getCustomers = (params) => api.get('/customers', { params });
export const getCustomer = (id) => api.get(`/customers/${id}`);
export const createCustomer = (data) => api.post('/customers', data);
export const updateCustomer = (id, data) => api.put(`/customers/${id}`, data);
export const deleteCustomer = (id) => api.delete(`/customers/${id}`);
```

### Rules:
- One file per backend resource (mirrors the web frontend's API layer)
- Return the Axios promise — let the calling screen handle success/error
- Never show toasts, alerts, or handle navigation inside API services
- Consistent function naming: `get*`, `create*`, `update*`, `delete*`

---

## 🧭 Navigation Rules

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
- Auth state determines which navigator is rendered (conditional in `AppNavigator.js`)
- Main tab screens: `Dashboard`, `JobCards`, `Customers`, `More`
- All other screens are stack navigators pushed on top of `MainTabs`
- Tab bar uses Ionicons from `@expo/vector-icons`
- Active tab color: `#3b5ff8` (primary), inactive: `gray`
- Navigation params should pass minimal data (preferably just `id`):

```javascript
// ✅ Pass just the ID
navigation.navigate('JobCardDetail', { id: jobCard._id });

// ❌ Don't pass entire objects through navigation params
navigation.navigate('JobCardDetail', { jobCard: entireJobCardObject });
```

### Adding a New Screen

1. Create the screen file in `src/screens/NewScreen.js`
2. Import in `AppNavigator.js`
3. Add to the appropriate navigator (Tab or Stack)
4. If it's a tab screen, add an icon mapping in `MainTabs` `screenOptions`

---

## 🔄 Screen Patterns

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

// ✅ Success after mutation
Toast.show({ type: 'success', text1: 'Customer created successfully' });

// ✅ Error
Toast.show({ type: 'error', text1: 'Failed to load data' });

// ✅ With subtitle
Toast.show({ type: 'error', text1: 'Delete failed', text2: error.message });

// ❌ Don't use Alert.alert() for routine feedback
// ❌ Don't use console.log() for user-facing messages
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

## 🔐 Authentication Pattern

### Context-Based Auth

- Auth state is managed via `AuthContext.js`
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

## 🧹 Code Style

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
// ✅ Consistent currency format matching the web app
const formatCurrency = (amount) => {
  return `₹${(amount || 0).toLocaleString('en-IN')}`;
};
```

---

## 🚫 Anti-Patterns to Avoid

```javascript
// ❌ Don't use inline styles for reusable patterns
<View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 16 }}>
// Use StyleSheet.create() instead

// ❌ Don't use arbitrary color values
<Text style={{ color: 'tomato' }}>
// Use the documented hex palette

// ❌ Don't pass complex objects through navigation params
navigation.navigate('Detail', { entireObject: {...} });
// Pass IDs, fetch on the detail screen

// ❌ Don't skip loading states
const [items, setItems] = useState([]);
// Always show ActivityIndicator while fetching

// ❌ Don't use console.log in committed code
console.log('response:', data);
// Remove before committing

// ❌ Don't call API services inside components (only in screens)
// Components receive data via props

// ❌ Don't ignore RefreshControl — all list screens need pull-to-refresh

// ❌ Don't hardcode the API base URL
const api = axios.create({ baseURL: 'http://192.168.1.5:5000/api' });
// Use EXPO_PUBLIC_API_URL environment variable
```

---

## 📱 Platform-Specific Notes

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

## ✅ Pre-Push Checklist

- [ ] No `console.log` statements
- [ ] All colors use documented hex palette (no named colors or arbitrary hex)
- [ ] All styles use `StyleSheet.create()` (no inline style objects for reusable patterns)
- [ ] All API calls go through `src/api/` service files
- [ ] Loading states show `ActivityIndicator` with color `#3b5ff8`
- [ ] Error states show `Toast.show()` with user-friendly messages
- [ ] List screens implement pull-to-refresh (`RefreshControl`)
- [ ] New screens are registered in `AppNavigator.js`
- [ ] Navigation params pass IDs, not full objects
- [ ] Android shadows include `elevation` property
- [ ] Forms handle keyboard avoidance on iOS
- [ ] No hardcoded API URLs — use environment variable
