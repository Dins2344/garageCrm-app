import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { toastConfig } from '../components/toastConfig';
import { useAuth } from '../context/AuthContext';
import { useGarage } from '../context/GarageContext';
import { getGarage, updateGarage, getBranchStaff } from '../api/garageService';
import ResponsiveScreen, { SHEET_MAX_WIDTH } from '../components/ResponsiveScreen';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Field, ControlledField, ControlledPicker, PrimaryBtn } from '../components/FormControls';
import BottomSheetPicker from '../components/BottomSheetPicker';
import { useCountries } from '../hooks/useCountries';
import { DEFAULT_LOCALE, timezoneChoicesFor } from '../utils/locale';
import type { RootStackScreenProps } from '../types/navigation';
import type { Garage, Role, User, ResolvedLocale } from '../types/models';
import {
  branchSchema, garageSettingsSchema,
  type BranchFormValues, type GarageSettingsFormValues, type GarageSettingsFormOutput,
} from '../utils/validation';
import { getErrorMessage } from '../utils/errors';
import { colors, palette, radius } from '../theme';

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
          <View style={styles.cardIcon}><Ionicons name={icon} size={18} color={colors.primary} /></View>
          <Text style={styles.cardTitle}>{title}</Text>
        </View>
        {action}
      </View>
      <View style={styles.cardBody}>{children}</View>
    </View>
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

interface AddBranchModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (data: { name: string; phone: string }) => Promise<void>;
}

// Defined at module scope — see the identical note on StaffScreen's `Field`:
// a component defined inside another component's render body loses focus/text
// on every keystroke because React treats it as a brand-new type each render.
function AddBranchModal({ visible, onClose, onSave }: AddBranchModalProps) {
  // The phone placeholder has to follow the garage's country — a UK owner
  // adding a branch was being shown an Indian 10-digit example.
  const { locale } = useGarage();
  const {
    control, handleSubmit, reset,
    formState: { isSubmitting },
  } = useForm<BranchFormValues>({
    resolver: zodResolver(branchSchema),
    defaultValues: { name: '', phone: '' },
  });

  useEffect(() => {
    if (visible) reset({ name: '', phone: '' });
  }, [visible, reset]);

  const handleSave = async (values: BranchFormValues) => {
    try {
      await onSave({ name: values.name, phone: values.phone });
      onClose();
    } catch (e) {
      Toast.show({ type: 'error', text1: getErrorMessage(e, 'Failed to add branch') });
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={branchModalStyles.overlay}>
        <View style={branchModalStyles.sheet}>
          <View style={branchModalStyles.handle} />
          <View style={branchModalStyles.header}>
            <Text style={branchModalStyles.title}>Add Branch</Text>
            <TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color={colors.textMuted} /></TouchableOpacity>
          </View>
          <ScrollView style={branchModalStyles.body} keyboardShouldPersistTaps="handled">
            <ControlledField control={control} name="name" label="Branch Name" required placeholder="e.g. Downtown Branch" />
            <ControlledField control={control} name="phone" label="Phone" required placeholder={locale.phoneExample} keyboardType="phone-pad" autoCapitalize="none" />
          </ScrollView>
          <View style={branchModalStyles.footer}>
            <TouchableOpacity style={branchModalStyles.cancelBtn} onPress={onClose}>
              <Text style={branchModalStyles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[branchModalStyles.saveBtn, isSubmitting && { opacity: 0.6 }]} onPress={handleSubmit(handleSave)} disabled={isSubmitting}>
              {isSubmitting ? <ActivityIndicator color={colors.textOnPrimary} size="small" /> : <Text style={branchModalStyles.saveBtnText}>Add Branch</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
      {/* Modal-scoped Toast — see StaffModal in StaffScreen.tsx for why this
          is needed (RN's Modal renders above the app-root Toast in App.tsx). */}
      <Toast config={toastConfig} />
    </Modal>
  );
}

const branchModalStyles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%', width: '100%', maxWidth: SHEET_MAX_WIDTH },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginTop: 12 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: colors.surfaceMuted },
  title: { fontSize: 18, fontWeight: 'bold', color: colors.textPrimary },
  body: { padding: 20 },
  footer: { flexDirection: 'row', gap: 12, padding: 20, borderTopWidth: 1, borderTopColor: colors.surfaceMuted },
  cancelBtn: { flex: 1, paddingVertical: 13, borderRadius: radius.md, alignItems: 'center', backgroundColor: colors.surfaceMuted },
  cancelBtnText: { color: colors.textSecondary, fontWeight: '600' },
  saveBtn: { flex: 1, paddingVertical: 13, borderRadius: radius.md, alignItems: 'center', backgroundColor: colors.primary },
  saveBtnText: { color: colors.textOnPrimary, fontWeight: '700' },
});

interface DeleteBranchModalProps {
  visible: boolean;
  branch: Garage | null;
  otherBranches: Garage[];
  onClose: () => void;
  onConfirm: (payload?: { staffAction?: 'delete' | 'reassign'; reassignToGarageId?: string }) => Promise<void>;
}

// Defined at module scope — see the identical note on AddBranchModal above.
function DeleteBranchModal({ visible, branch, otherBranches, onClose, onConfirm }: DeleteBranchModalProps) {
  const [checking, setChecking] = useState(true);
  const [staff, setStaff] = useState<User[]>([]);
  const [staffChoice, setStaffChoice] = useState<'delete' | 'reassign'>('reassign');
  const [reassignTarget, setReassignTarget] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!visible || !branch) return;
    setChecking(true);
    setStaff([]);
    setStaffChoice('reassign');
    setReassignTarget(otherBranches[0]?._id || '');
    getBranchStaff(branch._id)
      .then(res => setStaff(res.data))
      .catch(() => setStaff([]))
      .finally(() => setChecking(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, branch]);

  if (!branch) return null;

  const handleConfirm = async () => {
    setDeleting(true);
    try {
      if (staff.length === 0) {
        await onConfirm();
      } else if (staffChoice === 'delete') {
        await onConfirm({ staffAction: 'delete' });
      } else {
        if (!reassignTarget) { Toast.show({ type: 'error', text1: 'Please choose a branch to reassign staff to' }); setDeleting(false); return; }
        await onConfirm({ staffAction: 'reassign', reassignToGarageId: reassignTarget });
      }
      onClose();
    } catch (e) {
      Toast.show({ type: 'error', text1: getErrorMessage(e, 'Failed to delete branch') });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={branchModalStyles.overlay}>
        <View style={branchModalStyles.sheet}>
          <View style={branchModalStyles.handle} />
          <View style={branchModalStyles.header}>
            <Text style={branchModalStyles.title} numberOfLines={1}>Delete "{branch.name}"?</Text>
            <TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color={colors.textMuted} /></TouchableOpacity>
          </View>
          <ScrollView style={branchModalStyles.body} keyboardShouldPersistTaps="handled">
            {checking ? (
              <ActivityIndicator color={colors.primary} style={{ paddingVertical: 20 }} />
            ) : staff.length === 0 ? (
              <Text style={deleteBranchStyles.warningText}>
                This will permanently delete this branch and all of its customers, vehicles, job cards,
                invoices, inventory, and reminders. This cannot be undone.
              </Text>
            ) : (
              <>
                <Text style={deleteBranchStyles.warningText}>
                  This branch has {staff.length} staff member{staff.length > 1 ? 's' : ''} assigned
                  ({staff.map(s => s.name).join(', ')}). What should happen to them?
                </Text>
                <TouchableOpacity
                  style={deleteBranchStyles.choiceRow}
                  activeOpacity={0.7}
                  onPress={() => setStaffChoice('reassign')}
                >
                  <Ionicons name={staffChoice === 'reassign' ? 'radio-button-on' : 'radio-button-off'} size={20} color={staffChoice === 'reassign' ? colors.primary : colors.textFaint} />
                  <Text style={deleteBranchStyles.choiceText}>Reassign them to another branch</Text>
                </TouchableOpacity>
                {staffChoice === 'reassign' && (
                  <View style={deleteBranchStyles.targetList}>
                    {otherBranches.map(g => (
                      <TouchableOpacity
                        key={g._id}
                        style={deleteBranchStyles.targetRow}
                        activeOpacity={0.7}
                        onPress={() => setReassignTarget(g._id)}
                      >
                        <Ionicons name={reassignTarget === g._id ? 'checkmark-circle' : 'ellipse-outline'} size={18} color={reassignTarget === g._id ? colors.primary : colors.textFaint} />
                        <Text style={deleteBranchStyles.targetText}>{g.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
                <TouchableOpacity
                  style={deleteBranchStyles.choiceRow}
                  activeOpacity={0.7}
                  onPress={() => setStaffChoice('delete')}
                >
                  <Ionicons name={staffChoice === 'delete' ? 'radio-button-on' : 'radio-button-off'} size={20} color={staffChoice === 'delete' ? colors.primary : colors.textFaint} />
                  <Text style={deleteBranchStyles.choiceText}>Delete their accounts too</Text>
                </TouchableOpacity>
                <Text style={deleteBranchStyles.footnote}>
                  The branch itself and all of its customers, vehicles, job cards, invoices, inventory,
                  and reminders will be permanently deleted either way.
                </Text>
              </>
            )}
          </ScrollView>
          <View style={branchModalStyles.footer}>
            <TouchableOpacity style={branchModalStyles.cancelBtn} onPress={onClose} disabled={deleting}>
              <Text style={branchModalStyles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[deleteBranchStyles.deleteBtn, (checking || deleting) && { opacity: 0.6 }]}
              onPress={handleConfirm}
              disabled={checking || deleting}
            >
              {deleting ? <ActivityIndicator color={colors.textOnPrimary} size="small" /> : <Text style={branchModalStyles.saveBtnText}>Delete Branch</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
      <Toast config={toastConfig} />
    </Modal>
  );
}

const deleteBranchStyles = StyleSheet.create({
  warningText: { fontSize: 14, color: colors.textSecondary, lineHeight: 20, marginBottom: 16 },
  choiceRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderTopWidth: 1, borderTopColor: colors.surfaceMuted },
  choiceText: { fontSize: 14, fontWeight: '600', color: colors.textStrong, flex: 1 },
  targetList: { paddingLeft: 30, gap: 4, marginBottom: 4 },
  targetRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8 },
  targetText: { fontSize: 14, color: colors.textSecondary },
  footnote: { fontSize: 12, color: colors.textFaint, marginTop: 12, borderTopWidth: 1, borderTopColor: colors.surfaceMuted, paddingTop: 12 },
  deleteBtn: { flex: 1, paddingVertical: 13, borderRadius: radius.md, alignItems: 'center', backgroundColor: colors.danger },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function SettingsScreen({ navigation }: Props) {
  const { user, logout, hasRole } = useAuth();
  const { garages, activeGarageId, garagesLoading, switchGarage, addBranch, removeBranch, refreshGarage } = useGarage();
  const [deleteBranchTarget, setDeleteBranchTarget] = useState<Garage | null>(null);
  const canEditGarage = hasRole('owner', 'admin');
  const isOwner = hasRole('owner');
  const [addBranchVisible, setAddBranchVisible] = useState(false);

  // Garage state
  const [garage, setGarage] = useState<Garage | null>(null);
  const [garageLoading, setGarageLoading] = useState(true);
  const [editingGarage, setEditingGarage] = useState(false);
  const { countries } = useCountries();

  /**
   * The postal-code and tax-id rules follow the country **being edited**, not
   * the saved one — otherwise switching to the UK still validates the postcode
   * against India's digits-only rule and `SW1A 1AA` is unenterable.
   *
   * That looks circular — the resolver needs the locale, the locale needs the
   * form's country, the form does not exist yet — but it is not: the resolver
   * is handed the values it is validating, and the country is one of them. So
   * the locale is derived from the payload rather than from render state, with
   * no ref and no second source of truth.
   */
  const localeForCountry = (code: string): ResolvedLocale => {
    const c = countries.find(x => x.code === code);
    return c
      ? {
        ...DEFAULT_LOCALE,
        country: c.code, currency: c.currency,
        taxLabel: c.taxLabel, taxIdLabel: c.taxIdLabel,
        postalLabel: c.postalLabel, postalInputMode: c.postalInputMode,
        phoneExample: c.phoneExample,
      }
      : DEFAULT_LOCALE;
  };

  const {
    control: garageControl,
    handleSubmit: handleGarageSubmit,
    reset: resetGarageForm,
    setValue: setGarageValue,
    formState: { isSubmitting: savingGarage },
  } = useForm<GarageSettingsFormValues, unknown, GarageSettingsFormOutput>({
    // `useForm` re-reads its props every render, so this closure always sees
    // the latest `countries`.
    resolver: (values, ctx, opts) => {
      const code = String((values as { country?: unknown }).country ?? DEFAULT_LOCALE.country);
      return zodResolver(garageSettingsSchema(localeForCountry(code)))(values, ctx, opts);
    },
    defaultValues: {
      name: '', phone: '', email: '', gstNumber: '',
      country: DEFAULT_LOCALE.country,
      settings: { taxRate: '18', laborRatePerHour: '500', timezone: '' },
      address: { street: '', city: '', state: '', pincode: '' },
    },
  });
  // `useWatch`, not the `watch()` returned by useForm: the React Compiler lint
  // rule rejects `watch()` as unmemoizable (react-hooks/incompatible-library).
  // `useWatch` is a real hook and subscribes to the same field.
  const garageCountry = useWatch({ control: garageControl, name: 'country' });

  // Labels follow the country being EDITED, not the saved one, so switching
  // the picker to United Kingdom relabels "GSTIN" to "VAT No." immediately —
  // the owner sees what they're choosing before they commit to it.
  const selectedCountry = countries.find(c => c.code === garageCountry);
  const timezoneOptions = timezoneChoicesFor(garageCountry);
  const needsTimezone = (selectedCountry?.requiresTimezoneChoice ?? false) && timezoneOptions.length > 0;
  const countryOptions = countries.length
    ? countries.map(c => ({ value: c.code, label: c.name }))
    : [{ value: garageCountry, label: garageCountry }];
  // Falls back to the saved locale, then India, so nothing renders blank while
  // the country list is still loading.
  const labels = {
    tax: selectedCountry?.taxLabel ?? garage?.locale?.taxLabel ?? DEFAULT_LOCALE.taxLabel,
    taxId: selectedCountry?.taxIdLabel ?? garage?.locale?.taxIdLabel ?? DEFAULT_LOCALE.taxIdLabel,
    postal: selectedCountry?.postalLabel ?? garage?.locale?.postalLabel ?? DEFAULT_LOCALE.postalLabel,
    postalInputMode: selectedCountry?.postalInputMode ?? garage?.locale?.postalInputMode ?? DEFAULT_LOCALE.postalInputMode,
    currency: selectedCountry?.currency ?? garage?.locale?.currency ?? DEFAULT_LOCALE.currency,
    phoneExample: selectedCountry?.phoneExample ?? garage?.locale?.phoneExample ?? DEFAULT_LOCALE.phoneExample,
  };

  const populateGarageForm = (g: Garage) => {
    resetGarageForm({
      name: g.name || '',
      phone: g.phone || '',
      email: g.email || '',
      gstNumber: g.gstNumber || '',
      // Garages created before country support have no `country` key at all;
      // the server resolves them to India, so the form must show the same.
      country: g.country || g.locale?.country || DEFAULT_LOCALE.country,
      settings: {
        taxRate: String(g.settings?.taxRate ?? 18),
        laborRatePerHour: String(g.settings?.laborRatePerHour ?? 500),
        timezone: g.settings?.timezone || '',
      },
      address: {
        street: g.address?.street || '',
        city: g.address?.city || '',
        state: g.address?.state || '',
        pincode: g.address?.pincode || '',
      },
    });
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
  }, [activeGarageId]);

  const handleSaveGarage = async (values: GarageSettingsFormOutput) => {
    try {
      const { data } = await updateGarage({
        name: values.name,
        phone: values.phone,
        email: values.email || '',
        gstNumber: values.gstNumber || '',
        country: values.country,
        address: {
          street: values.address.street || '',
          city: values.address.city || '',
          state: values.address.state || '',
          pincode: values.address.pincode || '',
        },
        // Send only the settings this form actually edits. The API merges
        // partial `settings` (dotted-path $set), so omitted keys are preserved.
        // Resending them was also silently destructive: `serviceReminderDays`
        // fell back to 7 here while the real default is 180.
        settings: {
          taxRate: values.settings.taxRate,
          laborRatePerHour: values.settings.laborRatePerHour,
          // '' clears the override so the country table applies. Only
          // multi-zone countries ever set it.
          timezone: needsTimezone ? (values.settings.timezone || '') : '',
        },
      });
      setGarage(data);
      setEditingGarage(false);
      // The whole app formats money and dates from context locale, so a
      // country change has to propagate beyond this screen.
      await refreshGarage().catch(() => {});
      Toast.show({ type: 'success', text1: 'Garage info updated!' });
    } catch (e) {
      Toast.show({ type: 'error', text1: getErrorMessage(e, 'Failed to update garage') });
    }
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
            <Ionicons name="business-outline" size={12} color={colors.primary} />
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
              <Ionicons name={editingGarage ? 'close-outline' : 'pencil-outline'} size={16} color={colors.primary} />
              <Text style={styles.editToggleText}>{editingGarage ? 'Cancel' : 'Edit'}</Text>
            </TouchableOpacity>
          ) : null}
        >
          {garageLoading ? (
            <ActivityIndicator color={colors.primary} style={{ paddingVertical: 20 }} />
          ) : editingGarage ? (
            <>
              <ControlledField control={garageControl} name="name" label="Garage Name" required placeholder="Your garage name" />
              <ControlledField control={garageControl} name="phone" label="Phone" required placeholder={labels.phoneExample} keyboardType="phone-pad" autoCapitalize="none" />
              <ControlledField control={garageControl} name="email" label="Email" placeholder="Garage email address" keyboardType="email-address" autoCapitalize="none" />
              <ControlledPicker
                control={garageControl}
                name="country"
                label="Country"
                searchable
                options={countryOptions}
                // Clear any zone picked for the previous country — a US zone on
                // a garage that just moved to Australia is worse than none.
                onAfterChange={() => setGarageValue('settings.timezone', '')}
              />
              {needsTimezone && (
                <ControlledPicker
                  control={garageControl}
                  name="settings.timezone"
                  label="Timezone"
                  options={timezoneOptions.map(tz => ({ value: tz.value, label: tz.label }))}
                  placeholder="Select a timezone"
                />
              )}
              <ControlledField control={garageControl} name="gstNumber" label={labels.taxId} placeholder={`Your ${labels.taxId}`} autoCapitalize="characters" />
              <View style={styles.row}>
                <View style={{ flex: 1 }}><ControlledField control={garageControl} name="settings.taxRate" label={`${labels.tax} Rate (%)`} placeholder="0" keyboardType="numeric" autoCapitalize="none" /></View>
                <View style={{ width: 12 }} />
                <View style={{ flex: 1 }}><ControlledField control={garageControl} name="settings.laborRatePerHour" label={`Labor Rate (${labels.currency}/hr)`} placeholder="0" keyboardType="numeric" autoCapitalize="none" /></View>
              </View>
              <Text style={styles.subLabel}>Address</Text>
              <ControlledField control={garageControl} name="address.street" label="Street" placeholder="Street / Area" />
              <View style={styles.row}>
                <View style={{ flex: 1 }}><ControlledField control={garageControl} name="address.city" label="City" placeholder="City" /></View>
                <View style={{ width: 12 }} />
                <View style={{ flex: 1 }}><ControlledField control={garageControl} name="address.state" label="State" placeholder="State" /></View>
              </View>
              {/* keyboardType follows the country: a numeric keypad makes UK
                  "SW1A 1AA" and Canadian "K1A 0B1" literally unenterable. */}
              <ControlledField
                control={garageControl}
                name="address.pincode"
                label={labels.postal}
                placeholder={labels.postal}
                keyboardType={labels.postalInputMode === 'numeric' ? 'numeric' : 'default'}
                autoCapitalize="characters"
              />
              <PrimaryBtn label="Save Garage Info" icon="save-outline" onPress={handleGarageSubmit(handleSaveGarage)} loading={savingGarage} />
            </>
          ) : (
            <>
              <InfoRow label="Garage Name" value={garage?.name} />
              <InfoRow label="Phone" value={garage?.phone} />
              <InfoRow label="Email" value={garage?.email} />
              <InfoRow label="Country" value={selectedCountry?.name ?? garage?.locale?.country} />
              <InfoRow label={labels.taxId} value={garage?.gstNumber} />
              <InfoRow label={`${labels.tax} Rate`} value={`${garage?.settings?.taxRate ?? 0}%`} />
              <InfoRow label="Labor Rate" value={`${labels.currency} ${garage?.settings?.laborRatePerHour ?? 0}/hr`} />
              <InfoRow label="Address" value={[garage?.address?.street, garage?.address?.city, garage?.address?.state, garage?.address?.pincode].filter(Boolean).join(', ')} last />
            </>
          )}
        </SectionCard>

        {/* ── MY BRANCHES (owners only) ── */}
        {isOwner && (
          <SectionCard title="My Branches" icon="git-branch-outline">
            {garagesLoading ? (
              <ActivityIndicator color={colors.primary} style={{ paddingVertical: 20 }} />
            ) : garages.map(g => (
              <View key={g._id} style={styles.branchRow}>
                <TouchableOpacity
                  style={styles.branchRowLeft}
                  activeOpacity={0.7}
                  onPress={() => switchGarage(g._id)}
                >
                  <Ionicons
                    name={g._id === activeGarageId ? 'radio-button-on' : 'radio-button-off'}
                    size={20}
                    color={g._id === activeGarageId ? colors.primary : colors.textFaint}
                  />
                  <Text style={styles.branchRowText}>{g.name}</Text>
                  {g._id === activeGarageId && <Text style={styles.branchActiveLabel}>Active</Text>}
                </TouchableOpacity>
                {garages.length > 1 && (
                  <TouchableOpacity onPress={() => setDeleteBranchTarget(g)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="trash-outline" size={18} color={colors.danger} />
                  </TouchableOpacity>
                )}
              </View>
            ))}
            <TouchableOpacity style={styles.addBranchRow} onPress={() => setAddBranchVisible(true)}>
              <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
              <Text style={styles.addBranchRowText}>Add Branch</Text>
            </TouchableOpacity>
          </SectionCard>
        )}

        {/* ── STAFF MANAGEMENT SHORTCUT ── */}
        <TouchableOpacity style={styles.staffShortcut} activeOpacity={0.8} onPress={() => navigation.navigate('Staff')}>
          <View style={styles.staffShortcutLeft}>
            <View style={styles.staffShortcutIcon}><Ionicons name="people-outline" size={22} color={colors.primary} /></View>
            <View>
              <Text style={styles.staffShortcutTitle}>Staff Management</Text>
              <Text style={styles.staffShortcutSub}>Add, edit and manage your team</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.borderStrong} />
        </TouchableOpacity>

        {/* ── MY PROFILE SHORTCUT ── */}
        <TouchableOpacity style={styles.staffShortcut} activeOpacity={0.8} onPress={() => navigation.navigate('EditProfile')}>
          <View style={styles.staffShortcutLeft}>
            <View style={styles.staffShortcutIcon}><Ionicons name="person-outline" size={22} color={colors.primary} /></View>
            <View>
              <Text style={styles.staffShortcutTitle}>Edit My Profile</Text>
              <Text style={styles.staffShortcutSub}>Update your name and phone number</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.borderStrong} />
        </TouchableOpacity>

        {/* ── CHANGE PASSWORD SHORTCUT ── */}
        <TouchableOpacity style={styles.staffShortcut} activeOpacity={0.8} onPress={() => navigation.navigate('ChangePassword')}>
          <View style={styles.staffShortcutLeft}>
            <View style={styles.staffShortcutIcon}><Ionicons name="lock-closed-outline" size={22} color={colors.primary} /></View>
            <View>
              <Text style={styles.staffShortcutTitle}>Change Password</Text>
              <Text style={styles.staffShortcutSub}>Update your account password</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.borderStrong} />
        </TouchableOpacity>

        {/* ── APP INFO ── */}
        {/* <SectionCard title="App Info" icon="information-circle-outline">
          <InfoRow label="App" value="GaragePulse" />
          <InfoRow label="Version" value="1.0.0" />
          <InfoRow label="Platform" value={Platform.OS === 'ios' ? 'iOS' : 'Android'} last />
        </SectionCard> */}

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
          <Ionicons name="log-out-outline" size={20} color={colors.danger} />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
      </ResponsiveScreen>

      <AddBranchModal
        visible={addBranchVisible}
        onClose={() => setAddBranchVisible(false)}
        onSave={async (data) => {
          await addBranch(data);
          Toast.show({ type: 'success', text1: 'Branch added!' });
        }}
      />
      <DeleteBranchModal
        visible={!!deleteBranchTarget}
        branch={deleteBranchTarget}
        otherBranches={garages.filter(g => g._id !== deleteBranchTarget?._id)}
        onClose={() => setDeleteBranchTarget(null)}
        onConfirm={async (payload) => {
          if (!deleteBranchTarget) return;
          await removeBranch(deleteBranchTarget._id, payload);
          Toast.show({ type: 'success', text1: `Branch "${deleteBranchTarget.name}" deleted` });
        }}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16 },

  // Hero
  profileHero: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: colors.primary, borderRadius: radius.lg, padding: 20, marginBottom: 16,
    shadowColor: colors.primary, shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 5,
  },
  heroAvatar: {
    width: 56, height: 56, borderRadius: radius.xxl,
    backgroundColor: 'rgba(255,255,255,0.22)', justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.35)',
  },
  heroAvatarText: { color: colors.textOnPrimary, fontSize: 24, fontWeight: 'bold' },
  heroName: { fontSize: 17, fontWeight: 'bold', color: colors.textOnPrimary },
  heroEmail: { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  heroRoleBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: radius.pill, alignSelf: 'flex-start', marginTop: 5,
  },
  heroRoleText: { color: colors.textOnPrimary, fontSize: 11, fontWeight: '600' },
  garageChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.surface, paddingHorizontal: 8, paddingVertical: 5,
    borderRadius: radius.lg, maxWidth: 90,
  },
  garageChipText: { fontSize: 10, fontWeight: '700', color: colors.primary },

  // Card
  card: {
    backgroundColor: colors.surface, borderRadius: radius.lg, marginBottom: 16,
    shadowColor: colors.shadowAmbient, shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 4,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.surfaceMuted,
  },
  cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cardIcon: { width: 32, height: 32, borderRadius: radius.lg, backgroundColor: colors.primarySoft, justifyContent: 'center', alignItems: 'center' },
  cardTitle: { fontSize: 15, fontWeight: 'bold', color: colors.textPrimary },
  cardBody: { padding: 16 },

  editToggleBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.lg, backgroundColor: colors.primarySoft },
  editToggleText: { fontSize: 13, fontWeight: '600', color: colors.primary },

  // Branches
  branchRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.surfaceMuted,
  },
  branchRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  branchRowText: { fontSize: 15, color: colors.textPrimary, fontWeight: '500' },
  branchActiveLabel: { fontSize: 12, fontWeight: '600', color: colors.primary },
  addBranchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12 },
  addBranchRowText: { fontSize: 15, fontWeight: '600', color: colors.primary },

  // Staff shortcut
  staffShortcut: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.surface, borderRadius: radius.lg, padding: 16, marginBottom: 16,
    shadowColor: colors.shadowAmbient, shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 4,
  },
  staffShortcutLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  staffShortcutIcon: { width: 44, height: 44, borderRadius: radius.lg, backgroundColor: colors.primarySoft, justifyContent: 'center', alignItems: 'center' },
  staffShortcutTitle: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
  staffShortcutSub: { fontSize: 12, color: colors.textFaint, marginTop: 2 },

  // Form
  row: { flexDirection: 'row' },
  subLabel: { fontSize: 13, fontWeight: '700', color: colors.textMuted, marginBottom: 8, marginTop: 4 },

  // Info display rows
  infoRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: colors.surfaceSunken,
  },
  infoLabel: { fontSize: 14, color: colors.textMuted },
  infoValue: { fontSize: 14, fontWeight: '600', color: colors.textPrimary, textAlign: 'right', flex: 1, marginLeft: 12 },

  // Logout
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: palette.red100, borderRadius: radius.lg, padding: 16, marginTop: 4,
  },
  logoutText: { color: colors.danger, fontSize: 16, fontWeight: 'bold' },
});
