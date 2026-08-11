import React from 'react';
import { AuthProvider } from './src/context/AuthContext';
import { GarageProvider } from './src/context/GarageContext';
import AppNavigator from './src/navigation/AppNavigator';
import Toast from 'react-native-toast-message';
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
      <Toast position='bottom' />
    </SafeAreaProvider>
  );
}
