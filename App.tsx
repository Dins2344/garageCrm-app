import React from 'react';
import UpdateGate from './src/components/UpdateGate';
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
      {/* Outermost gate on purpose — see the docblock in UpdateGate. While a
          mandatory update is showing, nothing below here mounts: no session
          check, no idle timer, no garage fetch. */}
      <UpdateGate>
        <AuthProvider>
          <GarageProvider>
            <AppNavigator />
          </GarageProvider>
        </AuthProvider>
      </UpdateGate>
      {/* Lifted clear of the floating dock so toasts never sit behind it. */}
      <Toast position='bottom' config={toastConfig} bottomOffset={TAB_BAR_CLEARANCE} />
    </SafeAreaProvider>
  );
}
