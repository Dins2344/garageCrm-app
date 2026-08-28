import React, { ComponentProps } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { openWebApp } from '../utils/webApp';
import ResponsiveScreen from '../components/ResponsiveScreen';
import { TAB_BAR_CLEARANCE } from '../components/FloatingTabBar';
import type { MainTabScreenProps } from '../types/navigation';
import type { Role } from '../types/models';
import { colors, palette, radius } from '../theme';

type Props = MainTabScreenProps<'More'>;
type IconName = ComponentProps<typeof Ionicons>['name'];

interface MenuItem {
  title: string;
  subtitle: string;
  icon: IconName;
  iconBg: string;
  iconColor: string;
  onPress?: () => void;
  roles?: Role[];
  disabled?: boolean;
  comingSoon?: boolean;
}

export default function MoreScreen({ navigation }: Props) {
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

  const menuItems: MenuItem[] = [
    {
      title: 'Customers',
      subtitle: 'View and manage your customers',
      icon: 'person-outline',
      iconBg: colors.warningSoft,
      iconColor: colors.warning,
      onPress: () => navigation.navigate('Customers'),
      roles: ['owner', 'admin', 'service_advisor', 'receptionist'],
    },
    {
      title: 'Invoices',
      subtitle: 'View billing & invoices',
      icon: 'document-text-outline',
      iconBg: palette.amber100,
      iconColor: colors.warning,
      onPress: () => navigation.navigate('Invoices'),
    },
    {
      title: 'Staff',
      subtitle: 'Manage team members',
      icon: 'people-outline',
      iconBg: palette.green50,
      iconColor: colors.success,
      onPress: () => navigation.navigate('Staff'),
      roles: ['owner', 'admin'],
    },
    {
      title: 'Inventory',
      subtitle: 'Parts & stock management',
      icon: 'cube-outline',
      iconBg: colors.surfaceMuted,
      iconColor: colors.textMuted,
      disabled: true,
      comingSoon: true,
    },
    {
      title: 'Settings',
      subtitle: 'Profile & preferences',
      icon: 'settings-outline',
      iconBg: colors.surfaceMuted,
      iconColor: colors.textMuted,
      onPress: () => navigation.navigate('Settings'),
    },
    {
      // No `roles`: everyone can replay it, and the deck filters itself to
      // what the viewer's role can actually reach.
      title: 'How this app works',
      subtitle: 'Replay the quick tour',
      icon: 'help-circle-outline',
      iconBg: colors.primarySoft,
      iconColor: colors.primary,
      onPress: () => navigation.navigate('Walkthrough'),
    },
    {
      title: 'Web App',
      subtitle: 'Open the full app in your browser',
      icon: 'globe-outline',
      iconBg: colors.infoSoft,
      iconColor: colors.info,
      onPress: openWebApp,
    },
  ];

  const ROLE_LABEL: Record<Role, string> = {
    owner: 'Owner',
    admin: 'Admin',
    service_advisor: 'Service Advisor',
    mechanic: 'Mechanic',
    receptionist: 'Receptionist',
  };
  const getRoleLabel = (role?: Role) => (role && ROLE_LABEL[role]) || role || '';

  const visibleMenuItems = menuItems.filter(item => !item.roles || (user && item.roles.includes(user.role)));

  return (
    <ResponsiveScreen>
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
          <Ionicons name="pencil-outline" size={18} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Menu */}
      <View style={styles.menuGroup}>
        {visibleMenuItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.menuItem,
              index === visibleMenuItems.length - 1 && styles.lastMenuItem,
              item.disabled && styles.menuItemDisabled,
            ]}
            onPress={item.disabled ? undefined : item.onPress}
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
              <Ionicons name="chevron-forward" size={20} color={colors.borderStrong} />
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Logout */}
      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.8}>
        <Ionicons name="log-out-outline" size={22} color={colors.danger} />
        <Text style={styles.logoutText}>Log Out</Text>
      </TouchableOpacity>
    </ScrollView>
    </ResponsiveScreen>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 16,
    // Extra clearance for the floating dock tab bar.
    paddingBottom: TAB_BAR_CLEARANCE + 20,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    padding: 20,
    borderRadius: radius.lg,
    marginBottom: 20,
    shadowColor: colors.shadowAmbient, shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 4,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: radius.xxl,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  avatarText: {
    color: colors.textOnPrimary,
    fontSize: 24,
    fontWeight: 'bold',
  },
  profileInfo: {
    flex: 1,
  },
  name: {
    fontSize: 17,
    fontWeight: 'bold',
    color: colors.textPrimary,
  },
  email: {
    fontSize: 12,
    color: colors.textFaint,
    marginTop: 2,
  },
  roleBadge: {
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  roleText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '700',
  },
  editBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.lg,
    backgroundColor: colors.primarySoft,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuGroup: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: colors.shadowAmbient, shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 4,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceMuted,
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
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuTextGroup: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  menuTitleDisabled: {
    color: colors.textFaint,
  },
  menuSubtitle: {
    fontSize: 12,
    color: colors.textFaint,
    marginTop: 2,
  },
  comingSoonBadge: {
    backgroundColor: palette.amber100,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
  },
  comingSoonText: {
    color: palette.amber600,
    fontSize: 11,
    fontWeight: '700',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: palette.red100,
    padding: 16,
    borderRadius: radius.lg,
    gap: 8,
  },
  logoutText: {
    color: colors.danger,
    fontSize: 16,
    fontWeight: 'bold',
  },
});
