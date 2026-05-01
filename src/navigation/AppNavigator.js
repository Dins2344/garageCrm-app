import React from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';

import LoginScreen from '../screens/LoginScreen';
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

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Dashboard') {
            iconName = focused ? 'grid' : 'grid-outline';
          } else if (route.name === 'JobCards') {
            iconName = focused ? 'clipboard' : 'clipboard-outline';
          } else if (route.name === 'Customers') {
            iconName = focused ? 'people' : 'people-outline';
          } else if (route.name === 'More') {
            iconName = focused ? 'menu' : 'menu-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#3b5ff8',
        tabBarInactiveTintColor: 'gray',
        headerTitleStyle: { fontWeight: 'bold' },
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="JobCards" component={JobCardsScreen} options={{ title: 'Job Cards' }} />
      <Tab.Screen name="Customers" component={CustomersScreen} />
      <Tab.Screen name="More" component={MoreScreen} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
         <ActivityIndicator size="large" color="#3b5ff8" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen name="JobCardDetail" component={JobCardDetailScreen} />
            <Stack.Screen name="CreateJobCard" component={CreateJobCardScreen} />
            <Stack.Screen
              name="Vehicles"
              component={VehiclesScreen}
              options={{ headerShown: true, title: 'Vehicles', headerTitleStyle: { fontWeight: 'bold' } }}
            />
            <Stack.Screen
              name="VehicleDetail"
              component={VehicleDetailScreen}
              options={{ headerShown: true, title: 'Vehicle Details', headerTitleStyle: { fontWeight: 'bold' } }}
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
          </>
        ) : (
          <Stack.Screen name="Login" component={LoginScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  }
});
