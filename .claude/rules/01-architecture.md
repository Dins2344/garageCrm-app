<!-- Detailed reference for this repository, split by topic and read on demand.
     The always-on rules live in CLAUDE.md at the repo root. -->

# GaragePulse Mobile — Code Standards Reference

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
│   │   ├── FeatureCarousel.tsx  # First-run tour pager (+ tourSlides.ts content)
│   │   ├── WalkthroughGate.tsx  # Chooses intro / role tour / the app
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
| `Walkthrough`        | `WalkthroughScreen.tsx` (replay only — first run is handled by `WalkthroughGate`) |

Every route above (and its params) is registered in `src/types/navigation.ts`'s `RootStackParamList`/`MainTabParamList` — see **TypeScript Conventions** below.

---

