import React from 'react';
import { AuthProvider } from './src/context/AuthContext';
import { GarageProvider } from './src/context/GarageContext';
import AppNavigator from './src/navigation/AppNavigator';
import Toast from 'react-native-toast-message';
import { toastConfig } from './src/components/toastConfig';
import { TAB_BAR_CLEARANCE } from './src/components/FloatingTabBar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'react-native';

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" />
      <AuthProvider>
        <GarageProvider>
          <AppNavigator />
        </GarageProvider>
      </AuthProvider>
      {/* Lifted clear of the floating dock so toasts never sit behind it. */}
      <Toast position='bottom' config={toastConfig} bottomOffset={TAB_BAR_CLEARANCE} />
    </SafeAreaProvider>
  );
}
