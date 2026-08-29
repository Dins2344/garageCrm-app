import React from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { NavigationContainer, DefaultTheme, type Theme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../context/AuthContext';
import FloatingTabBar from '../components/FloatingTabBar';
import type { RootStackParamList, MainTabParamList } from '../types/navigation';

/**
 * React Navigation paints the header and the screen card from its own theme,
 * not from our StyleSheets — left at its default those surfaces stay pure
 * white and read as cooler than the bone ground beside them.
 */
const navTheme: Theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.primary,
    background: colors.background,
    card: colors.surface,
    text: colors.textPrimary,
    border: colors.border,
  },
};

import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import DashboardScreen from '../screens/DashboardScreen';
import JobCardsScreen from '../screens/JobCardsScreen';
import CustomersScreen from '../screens/CustomersScreen';
import MoreScreen from '../screens/MoreScreen';
import JobCardDetailScreen from '../screens/JobCardDetailScreen';
import CreateJobCardScreen from '../screens/CreateJobCardScreen';
import VehiclesScreen from '../screens/VehiclesScreen';
import VehicleDetailScreen from '../screens/VehicleDetailScreen';
import SettingsScreen from '../screens/SettingsScreen';
import StaffScreen from '../screens/StaffScreen';
import EstimationEditorScreen from '../screens/EstimationEditorScreen';
import InvoiceViewerScreen from '../screens/InvoiceViewerScreen';
import InvoicesScreen from '../screens/InvoicesScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import ChangePasswordScreen from '../screens/ChangePasswordScreen';
import WalkthroughScreen from '../screens/WalkthroughScreen';
import WalkthroughGate from '../components/WalkthroughGate';
import { colors } from '../theme';

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

function MainTabs() {
  return (
    <Tab.Navigator
      // Without this, React Navigation defaults to whichever tab is declared
      // *first* in JSX below — which is now JobCards, since Home was moved
      // to the center of the dock. This decouples "visual position" from
      // "the tab you land on after login" so Home stays the actual default.
      initialRouteName="Home"
      // Fully custom floating dock — icons/labels/styling all live in
      // FloatingTabBar, so nothing here needs tabBarIcon/tabBarStyle.
      tabBar={props => <FloatingTabBar {...props} />}
      screenOptions={{
        tabBarHideOnKeyboard: true,
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    >
      {/* Home is deliberately centered in the dock (2 tabs on each side). */}
      <Tab.Screen name="JobCards" component={JobCardsScreen} options={{ title: 'Job Cards' }} />
      <Tab.Screen name="Vehicles" component={VehiclesScreen} options={{ title: 'Vehicles' }} />
      <Tab.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
      <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'Dashboard' }} />
      <Tab.Screen name="More" component={MoreScreen} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
         <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    // Wraps the navigator rather than living inside it: while the gate is
    // showing the walkthrough, NavigationContainer is never constructed, so
    // Login cannot flash behind it.
    <WalkthroughGate>
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen name="JobCardDetail" component={JobCardDetailScreen} />
            <Stack.Screen name="EstimationEditor" component={EstimationEditorScreen} />
            <Stack.Screen name="InvoiceViewer" component={InvoiceViewerScreen} />
            <Stack.Screen name="CreateJobCard" component={CreateJobCardScreen} />
            <Stack.Screen
              name="Customers"
              component={CustomersScreen}
              options={{ headerShown: true, title: 'Customers', headerTitleStyle: { fontWeight: 'bold' } }}
            />
            <Stack.Screen
              name="VehicleDetail"
              component={VehicleDetailScreen}
              options={{ headerShown: true, title: 'Vehicle Details', headerTitleStyle: { fontWeight: 'bold' } }}
            />
            <Stack.Screen
              name="Invoices"
              component={InvoicesScreen}
              options={{ headerShown: false }}
            />
            <Stack.Screen
              name="Settings"
              component={SettingsScreen}
              options={{ headerShown: true, title: 'Settings', headerTitleStyle: { fontWeight: 'bold' } }}
            />
            <Stack.Screen
              name="Staff"
              component={StaffScreen}
              options={{ headerShown: true, title: 'Staff Management', headerTitleStyle: { fontWeight: 'bold' } }}
            />
            <Stack.Screen
              name="EditProfile"
              component={EditProfileScreen}
              options={{ headerShown: true, title: 'Edit Profile', headerTitleStyle: { fontWeight: 'bold' } }}
            />
            <Stack.Screen
              name="ChangePassword"
              component={ChangePasswordScreen}
              options={{ headerShown: true, title: 'Change Password', headerTitleStyle: { fontWeight: 'bold' } }}
            />
            {/* The replay route only — both first-run paths are handled by
                WalkthroughGate below and never navigate here. */}
            <Stack.Screen
              name="Walkthrough"
              component={WalkthroughScreen}
              options={{ headerShown: true, title: 'How this app works', headerTitleStyle: { fontWeight: 'bold' } }}
            />
          </>
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
    </WalkthroughGate>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  }
});
