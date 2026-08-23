<!-- Detailed reference for this repository, split by topic and read on demand.
     The always-on rules live in CLAUDE.md at the repo root. -->

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

