import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, KeyboardTypeOptions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { useAuth } from '../context/AuthContext';
import { updateProfile, changePassword } from '../api/authService';
import { getGarage, updateGarage } from '../api/garageService';
import ResponsiveScreen from '../components/ResponsiveScreen';
import type { RootStackScreenProps } from '../types/navigation';
import type { Garage, Role } from '../types/models';
import { getErrorMessage } from '../utils/errors';

type Props = RootStackScreenProps<'Settings'>;
type IconName = React.ComponentProps<typeof Ionicons>['name'];

// ─── Reusable sub-components ──────────────────────────────────────────────────

interface SectionCardProps {
  title: string;
  icon: IconName;
  children: React.ReactNode;
  action?: React.ReactNode;
}

function SectionCard({ title, icon, children, action }: SectionCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <View style={styles.cardIcon}><Ionicons name={icon} size={18} color="#3b5ff8" /></View>
          <Text style={styles.cardTitle}>{title}</Text>
        </View>
        {action}
      </View>
      <View style={styles.cardBody}>{children}</View>
    </View>
  );
}

interface FieldProps {
  label: string;
  value: string;
  onChangeText?: (v: string) => void;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  editable?: boolean;
  secureTextEntry?: boolean;
}

function Field({ label, value, onChangeText, placeholder, keyboardType, autoCapitalize, editable = true, secureTextEntry }: FieldProps) {
  const [show, setShow] = useState(false);
  const isPwd = secureTextEntry !== undefined;
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={[styles.inputRow, !editable && styles.inputDimmed]}>
        <TextInput
          style={styles.inputField}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#9ca3af"
          keyboardType={keyboardType || 'default'}
          autoCapitalize={autoCapitalize || 'sentences'}
          editable={editable}
          secureTextEntry={isPwd ? !show : false}
        />
        {isPwd && (
          <TouchableOpacity onPress={() => setShow(s => !s)} style={{ padding: 4 }}>
            <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={20} color="#9ca3af" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

interface PrimaryBtnProps {
  label: string;
  icon: IconName;
  onPress: () => void;
  loading?: boolean;
}

function PrimaryBtn({ label, icon, onPress, loading }: PrimaryBtnProps) {
  return (
    <TouchableOpacity style={[styles.primaryBtn, loading && { opacity: 0.6 }]} onPress={onPress} disabled={loading} activeOpacity={0.8}>
      {loading ? <ActivityIndicator color="#fff" size="small" /> : (
        <><Ionicons name={icon} size={17} color="#fff" /><Text style={styles.primaryBtnText}>{label}</Text></>
      )}
    </TouchableOpacity>
  );
}

interface InfoRowProps {
  label: string;
  value?: string | null;
  last?: boolean;
}

function InfoRow({ label, value, last }: InfoRowProps) {
  return (
    <View style={[styles.infoRow, last && { borderBottomWidth: 0 }]}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value || '—'}</Text>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function SettingsScreen({ navigation }: Props) {
  const { user, logout, hasRole } = useAuth();
  const canEditGarage = hasRole('owner', 'admin');

  // Garage state
  const [garage, setGarage] = useState<Garage | null>(null);
  const [garageLoading, setGarageLoading] = useState(true);
  const [editingGarage, setEditingGarage] = useState(false);
  const [garageName, setGarageName] = useState('');
  const [garagePhone, setGaragePhone] = useState('');
  const [garageEmail, setGarageEmail] = useState('');
  const [garageGst, setGarageGst] = useState('');
  const [garageTax, setGarageTax] = useState('');
  const [garageLabor, setGarageLabor] = useState('');
  const [garageStreet, setGarageStreet] = useState('');
  const [garageCity, setGarageCity] = useState('');
  const [garageState, setGarageState] = useState('');
  const [garagePincode, setGaragePincode] = useState('');
  const [savingGarage, setSavingGarage] = useState(false);

  // Profile state
  const [profileName, setProfileName] = useState(user?.name || '');
  const [profilePhone, setProfilePhone] = useState(user?.phone || '');
  const [savingProfile, setSavingProfile] = useState(false);

  // Password state
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [savingPwd, setSavingPwd] = useState(false);

  const populateGarageForm = (g: Garage) => {
    setGarageName(g.name || '');
    setGaragePhone(g.phone || '');
    setGarageEmail(g.email || '');
    setGarageGst(g.gstNumber || '');
    setGarageTax(String(g.settings?.taxRate ?? 18));
    setGarageLabor(String(g.settings?.laborRatePerHour ?? 500));
    setGarageStreet(g.address?.street || '');
    setGarageCity(g.address?.city || '');
    setGarageState(g.address?.state || '');
    setGaragePincode(g.address?.pincode || '');
  };

  const fetchGarage = async () => {
    try {
      const { data } = await getGarage();
      setGarage(data);
      populateGarageForm(data);
    } catch { /* non-critical */ }
    finally { setGarageLoading(false); }
  };

  useEffect(() => {
    fetchGarage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSaveGarage = async () => {
    if (!garageName.trim()) { Toast.show({ type: 'error', text1: 'Garage name is required' }); return; }
    setSavingGarage(true);
    try {
      const { data } = await updateGarage({
        name: garageName.trim(),
        phone: garagePhone.trim(),
        email: garageEmail.trim(),
        gstNumber: garageGst.trim(),
        address: { street: garageStreet, city: garageCity, state: garageState, pincode: garagePincode },
        settings: {
          taxRate: Number(garageTax) || 18,
          laborRatePerHour: Number(garageLabor) || 500,
          currency: garage?.settings?.currency ?? 'INR',
          serviceReminderDays: garage?.settings?.serviceReminderDays ?? 7,
        },
      });
      setGarage(data);
      setEditingGarage(false);
      Toast.show({ type: 'success', text1: 'Garage info updated!' });
    } catch (e) {
      Toast.show({ type: 'error', text1: getErrorMessage(e, 'Failed to update garage') });
    } finally { setSavingGarage(false); }
  };

  const handleSaveProfile = async () => {
    if (!profileName.trim()) { Toast.show({ type: 'error', text1: 'Name cannot be empty' }); return; }
    setSavingProfile(true);
    try {
      await updateProfile({ name: profileName.trim(), phone: profilePhone.trim() });
      Toast.show({ type: 'success', text1: 'Profile updated!' });
    } catch (e) {
      Toast.show({ type: 'error', text1: getErrorMessage(e, 'Failed to update profile') });
    } finally { setSavingProfile(false); }
  };

  const handleChangePassword = async () => {
    if (!currentPwd || !newPwd || !confirmPwd) { Toast.show({ type: 'error', text1: 'Please fill all fields' }); return; }
    if (newPwd.length < 6) { Toast.show({ type: 'error', text1: 'Password must be at least 6 characters' }); return; }
    if (newPwd !== confirmPwd) { Toast.show({ type: 'error', text1: 'Passwords do not match' }); return; }
    setSavingPwd(true);
    try {
      await changePassword({ currentPassword: currentPwd, newPassword: newPwd });
      Toast.show({ type: 'success', text1: 'Password changed!' });
      setCurrentPwd(''); setNewPwd(''); setConfirmPwd('');
    } catch (e) {
      Toast.show({ type: 'error', text1: getErrorMessage(e, 'Failed to change password') });
    } finally { setSavingPwd(false); }
  };

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log Out', style: 'destructive', onPress: logout }
    ]);
  };

  const ROLE_LABEL: Record<Role, string> = { owner: 'Owner', admin: 'Admin', service_advisor: 'Service Advisor', mechanic: 'Mechanic', receptionist: 'Receptionist' };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <ResponsiveScreen>
      <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

        {/* Profile Hero */}
        <View style={styles.profileHero}>
          <View style={styles.heroAvatar}>
            <Text style={styles.heroAvatarText}>{user?.name?.charAt(0)?.toUpperCase() || '?'}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroName}>{user?.name}</Text>
            <Text style={styles.heroEmail}>{user?.email}</Text>
            <View style={styles.heroRoleBadge}>
              <Text style={styles.heroRoleText}>{(user?.role && ROLE_LABEL[user.role]) || user?.role}</Text>
            </View>
          </View>
          <View style={styles.garageChip}>
            <Ionicons name="business-outline" size={12} color="#3b5ff8" />
            <Text style={styles.garageChipText} numberOfLines={1}>{garage?.name || '...'}</Text>
          </View>
        </View>

        {/* ── GARAGE INFORMATION ── */}
        <SectionCard
          title="Garage Information"
          icon="business-outline"
          action={canEditGarage ? (
            <TouchableOpacity style={styles.editToggleBtn} onPress={() => {
              if (editingGarage && garage) { populateGarageForm(garage); }
              setEditingGarage(e => !e);
            }}>
              <Ionicons name={editingGarage ? 'close-outline' : 'pencil-outline'} size={16} color="#3b5ff8" />
              <Text style={styles.editToggleText}>{editingGarage ? 'Cancel' : 'Edit'}</Text>
            </TouchableOpacity>
          ) : null}
        >
          {garageLoading ? (
            <ActivityIndicator color="#3b5ff8" style={{ paddingVertical: 20 }} />
          ) : editingGarage ? (
            <>
              <Field label="Garage Name *" value={garageName} onChangeText={setGarageName} placeholder="Your garage name" />
              <Field label="Phone" value={garagePhone} onChangeText={setGaragePhone} placeholder="Garage contact number" keyboardType="phone-pad" autoCapitalize="none" />
              <Field label="Email" value={garageEmail} onChangeText={setGarageEmail} placeholder="Garage email address" keyboardType="email-address" autoCapitalize="none" />
              <Field label="GST Number" value={garageGst} onChangeText={setGarageGst} placeholder="15-digit GST number" autoCapitalize="characters" />
              <View style={styles.row}>
                <View style={{ flex: 1 }}><Field label="Tax Rate (%)" value={garageTax} onChangeText={setGarageTax} placeholder="18" keyboardType="numeric" autoCapitalize="none" /></View>
                <View style={{ width: 12 }} />
                <View style={{ flex: 1 }}><Field label="Labor Rate (₹/hr)" value={garageLabor} onChangeText={setGarageLabor} placeholder="500" keyboardType="numeric" autoCapitalize="none" /></View>
              </View>
              <Text style={styles.subLabel}>Address</Text>
              <Field label="Street" value={garageStreet} onChangeText={setGarageStreet} placeholder="Street / Area" />
              <View style={styles.row}>
                <View style={{ flex: 1 }}><Field label="City" value={garageCity} onChangeText={setGarageCity} placeholder="City" /></View>
                <View style={{ width: 12 }} />
                <View style={{ flex: 1 }}><Field label="State" value={garageState} onChangeText={setGarageState} placeholder="State" /></View>
              </View>
              <Field label="Pincode" value={garagePincode} onChangeText={setGaragePincode} placeholder="6-digit pincode" keyboardType="numeric" autoCapitalize="none" />
              <PrimaryBtn label="Save Garage Info" icon="save-outline" onPress={handleSaveGarage} loading={savingGarage} />
            </>
          ) : (
            <>
              <InfoRow label="Garage Name" value={garage?.name} />
              <InfoRow label="Phone" value={garage?.phone} />
              <InfoRow label="Email" value={garage?.email} />
              <InfoRow label="GST Number" value={garage?.gstNumber} />
              <InfoRow label="Tax Rate" value={garage?.settings?.taxRate ? `${garage.settings.taxRate}%` : null} />
              <InfoRow label="Labor Rate" value={garage?.settings?.laborRatePerHour ? `₹${garage.settings.laborRatePerHour}/hr` : null} />
              <InfoRow label="Address" value={[garage?.address?.street, garage?.address?.city, garage?.address?.state, garage?.address?.pincode].filter(Boolean).join(', ')} last />
            </>
          )}
        </SectionCard>

        {/* ── STAFF MANAGEMENT SHORTCUT ── */}
        <TouchableOpacity style={styles.staffShortcut} activeOpacity={0.8} onPress={() => navigation.navigate('Staff')}>
          <View style={styles.staffShortcutLeft}>
            <View style={styles.staffShortcutIcon}><Ionicons name="people-outline" size={22} color="#3b5ff8" /></View>
            <View>
              <Text style={styles.staffShortcutTitle}>Staff Management</Text>
              <Text style={styles.staffShortcutSub}>Add, edit and manage your team</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#d1d5db" />
        </TouchableOpacity>

        {/* ── MY PROFILE ── */}
        <SectionCard title="Edit My Profile" icon="person-outline">
          <Field label="Full Name" value={profileName} onChangeText={setProfileName} placeholder="Your name" />
          <Field label="Email" value={user?.email || ''} placeholder="Email" editable={false} keyboardType="email-address" autoCapitalize="none" />
          <Field label="Phone Number" value={profilePhone} onChangeText={setProfilePhone} placeholder="Phone number" keyboardType="phone-pad" autoCapitalize="none" />
          <PrimaryBtn label="Save Changes" icon="save-outline" onPress={handleSaveProfile} loading={savingProfile} />
        </SectionCard>

        {/* ── CHANGE PASSWORD ── */}
        <SectionCard title="Change Password" icon="lock-closed-outline">
          <Field label="Current Password" value={currentPwd} onChangeText={setCurrentPwd} placeholder="Current password" secureTextEntry autoCapitalize="none" />
          <Field label="New Password" value={newPwd} onChangeText={setNewPwd} placeholder="Min. 6 characters" secureTextEntry autoCapitalize="none" />
          <Field label="Confirm New Password" value={confirmPwd} onChangeText={setConfirmPwd} placeholder="Re-enter new password" secureTextEntry autoCapitalize="none" />
          <PrimaryBtn label="Update Password" icon="key-outline" onPress={handleChangePassword} loading={savingPwd} />
        </SectionCard>

        {/* ── APP INFO ── */}
        <SectionCard title="App Info" icon="information-circle-outline">
          <InfoRow label="App" value="GaragePulse" />
          <InfoRow label="Version" value="1.0.0" />
          <InfoRow label="Platform" value={Platform.OS === 'ios' ? 'iOS' : 'Android'} last />
        </SectionCard>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={20} color="#ef4444" />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
      </ResponsiveScreen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fdfcfb' },
  content: { padding: 16 },

  // Hero
  profileHero: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#3b5ff8', borderRadius: 16, padding: 20, marginBottom: 16,
    shadowColor: '#3b5ff8', shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 5,
  },
  heroAvatar: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.22)', justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.35)',
  },
  heroAvatarText: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  heroName: { fontSize: 17, fontWeight: 'bold', color: '#fff' },
  heroEmail: { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  heroRoleBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 160, alignSelf: 'flex-start', marginTop: 5,
  },
  heroRoleText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  garageChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#fff', paddingHorizontal: 8, paddingVertical: 5,
    borderRadius: 16, maxWidth: 90,
  },
  garageChipText: { fontSize: 10, fontWeight: '700', color: '#3b5ff8' },

  // Card
  card: {
    backgroundColor: '#fff', borderRadius: 16, marginBottom: 16,
    shadowColor: '#6366f1', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 4,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#eff2ff', justifyContent: 'center', alignItems: 'center' },
  cardTitle: { fontSize: 15, fontWeight: 'bold', color: '#111827' },
  cardBody: { padding: 16 },

  editToggleBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 16, backgroundColor: '#eff2ff' },
  editToggleText: { fontSize: 13, fontWeight: '600', color: '#3b5ff8' },

  // Staff shortcut
  staffShortcut: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16,
    shadowColor: '#6366f1', shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 4,
  },
  staffShortcutLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  staffShortcutIcon: { width: 44, height: 44, borderRadius: 16, backgroundColor: '#eff2ff', justifyContent: 'center', alignItems: 'center' },
  staffShortcutTitle: { fontSize: 15, fontWeight: '600', color: '#111827' },
  staffShortcutSub: { fontSize: 12, color: '#9ca3af', marginTop: 2 },

  // Form
  fieldWrap: { marginBottom: 14 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fdfcfb', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 16, paddingHorizontal: 12,
  },
  inputDimmed: { opacity: 0.55 },
  inputField: { flex: 1, height: 44, fontSize: 15, color: '#1f2937' },
  row: { flexDirection: 'row' },
  subLabel: { fontSize: 13, fontWeight: '700', color: '#6b7280', marginBottom: 8, marginTop: 4 },

  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#3b5ff8', borderRadius: 16, paddingVertical: 13, marginTop: 6,
  },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },

  // Info display rows
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: '#f9fafb',
  },
  infoLabel: { fontSize: 14, color: '#6b7280' },
  infoValue: { fontSize: 14, fontWeight: '600', color: '#111827', textAlign: 'right', flex: 1, marginLeft: 12 },

  // Logout
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#fee2e2', borderRadius: 16, padding: 16, marginTop: 4,
  },
  logoutText: { color: '#ef4444', fontSize: 16, fontWeight: 'bold' },
});
