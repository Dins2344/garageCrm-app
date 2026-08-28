import type { CompositeScreenProps, NavigatorScreenParams } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';

export type MainTabParamList = {
  JobCards: undefined;
  Vehicles: undefined;
  Home: undefined;
  Dashboard: undefined;
  More: undefined;
};

export type RootStackParamList = {
  Login: undefined;
  Main: NavigatorScreenParams<MainTabParamList> | undefined;
  JobCardDetail: { id: string };
  EstimationEditor: { id: string };
  InvoiceViewer: { invoiceId: string };
  CreateJobCard: undefined;
  Customers: undefined;
  VehicleDetail: { id: string };
  Invoices: undefined;
  Settings: undefined;
  Staff: undefined;
  EditProfile: undefined;
  ChangePassword: undefined;
  Walkthrough: undefined;
};

// Props for a screen that lives directly on the root Stack.Navigator.
export type RootStackScreenProps<T extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, T>;

// Props for a screen that lives on the nested MainTabs bottom-tab navigator —
// composed with the root stack so `navigation.navigate('JobCardDetail', ...)`
// (a route that lives one level up, on the stack) still type-checks.
export type MainTabScreenProps<T extends keyof MainTabParamList> = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, T>,
  NativeStackScreenProps<RootStackParamList>
>;

// Lets useNavigation()/navigation.navigate(...) infer route names and params
// anywhere in the app without repeating the generic — see React Navigation's
// TypeScript guide ("Specifying default types for hooks and utility functions").
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ReactNavigation {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type -- required declaration-merging shape, see React Navigation's TS guide
    interface RootParamList extends RootStackParamList {}
  }
}
