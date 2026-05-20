import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';

export default function MoreScreen({ navigation }) {
  const { user, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Log Out', style: 'destructive', onPress: logout }
      ]
    );
  };

  const menuItems = [
    {
      title: 'Vehicles',
      subtitle: 'Browse all registered vehicles',
      icon: 'car-outline',
      iconBg: '#eff2ff',
      iconColor: '#3b5ff8',
      onPress: () => navigation.navigate('Vehicles'),
    },
    {
      title: 'Invoices',
      subtitle: 'View billing & invoices',
      icon: 'document-text-outline',
      iconBg: '#fef3c7',
      iconColor: '#f59e0b',
      onPress: () => navigation.navigate('Invoices'),
    },
    {
      title: 'Staff',
      subtitle: 'Manage team members',
      icon: 'people-outline',
      iconBg: '#f0fdf4',
      iconColor: '#10b981',
      onPress: () => navigation.navigate('Staff'),
      roles: ['owner', 'admin'],
    },
    {
      title: 'Inventory',
      subtitle: 'Parts & stock management',
      icon: 'cube-outline',
      iconBg: '#f3f4f6',
      iconColor: '#6b7280',
      disabled: true,
      comingSoon: true,
    },
    {
      title: 'Settings',
      subtitle: 'Profile & preferences',
      icon: 'settings-outline',
      iconBg: '#f3f4f6',
      iconColor: '#6b7280',
      onPress: () => navigation.navigate('Settings'),
    },
  ];

  const getRoleLabel = (role) => {
    const roleMap = {
      owner: 'Owner',
      admin: 'Admin',
      service_advisor: 'Service Advisor',
      mechanic: 'Mechanic',
      receptionist: 'Receptionist',
    };
    return roleMap[role] || role;
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Profile Section */}
      <View style={styles.profileSection}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user?.name?.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.profileInfo}>
          <Text style={styles.name}>{user?.name}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{getRoleLabel(user?.role)}</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.editBtn}
          onPress={() => navigation.navigate('Settings')}
          activeOpacity={0.7}
        >
          <Ionicons name="pencil-outline" size={18} color="#3b5ff8" />
        </TouchableOpacity>
      </View>

      {/* Menu */}
      <View style={styles.menuGroup}>
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.menuItem,
              index === menuItems.length - 1 && styles.lastMenuItem,
              item.disabled && styles.menuItemDisabled,
            ]}
            onPress={item.disabled ? null : item.onPress}
            activeOpacity={item.disabled ? 1 : 0.7}
          >
            <View style={[styles.menuIconContainer, { backgroundColor: item.iconBg }]}>
              <Ionicons name={item.icon} size={22} color={item.iconColor} />
            </View>
            <View style={styles.menuTextGroup}>
              <Text style={[styles.menuTitle, item.disabled && styles.menuTitleDisabled]}>
                {item.title}
              </Text>
              <Text style={styles.menuSubtitle}>{item.subtitle}</Text>
            </View>
            {item.comingSoon ? (
              <View style={styles.comingSoonBadge}>
                <Text style={styles.comingSoonText}>Soon</Text>
              </View>
            ) : (
              <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.8}>
        <Ionicons name="log-out-outline" size={22} color="#ef4444" />
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#3b5ff8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  avatarText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  profileInfo: {
    flex: 1,
  },
  name: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#111827',
  },
  email: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  },
  roleBadge: {
    backgroundColor: '#eff2ff',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 100,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  roleText: {
    color: '#3b5ff8',
    fontSize: 11,
    fontWeight: '700',
  },
  editBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#eff2ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuGroup: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    gap: 12,
  },
  lastMenuItem: {
    borderBottomWidth: 0,
  },
  menuItemDisabled: {
    opacity: 0.6,
  },
  menuIconContainer: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuTextGroup: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    color: '#111827',
    fontWeight: '600',
  },
  menuTitleDisabled: {
    color: '#9ca3af',
  },
  menuSubtitle: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  },
  comingSoonBadge: {
    backgroundColor: '#fef3c7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 100,
  },
  comingSoonText: {
    color: '#d97706',
    fontSize: 11,
    fontWeight: '700',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fee2e2',
    padding: 16,
    borderRadius: 14,
    gap: 8,
  },
  logoutText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
