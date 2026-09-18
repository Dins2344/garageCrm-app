import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { useAuth } from '../context/AuthContext';
import { useGlobalLoader } from '../context/GlobalLoaderContext';
import { deleteAccount } from '../api/authService';
import ResponsiveScreen from '../components/ResponsiveScreen';
import { Field } from '../components/FormControls';
import { getErrorMessage } from '../utils/errors';
import type { RootStackScreenProps } from '../types/navigation';
import { colors, palette, radius } from '../theme';

type Props = RootStackScreenProps<'DeleteAccount'>;

/**
 * Self-service account deletion, reached from the Delete Account tile on
 * Settings (the tile is all Settings holds — see "Settings is a directory").
 *
 * Two confirmations on purpose: the password, which the server checks, and
 * a final alert, because this is the one action in the app that cannot be
 * undone. What is deleted depends on the role and the copy says so: owners
 * take every branch they own with them, staff lose only their login.
 */
export default function DeleteAccountScreen(_props: Props) {
  const { user, hasRole, logout } = useAuth();
  const { withLoader } = useGlobalLoader();
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | undefined>();
  const isOwner = hasRole('owner');

  const performDelete = async () => {
    try {
      await withLoader(() => deleteAccount(password), 'Deleting account');
      Toast.show({ type: 'success', text1: 'Your account has been deleted' });
      // The user row is gone; local sign-out is what remains.
      await logout();
    } catch (e) {
      setError(getErrorMessage(e, 'Could not delete the account'));
    }
  };

  const confirm = () => {
    if (!password) {
      setError('Enter your password to continue');
      return;
    }
    setError(undefined);
    Alert.alert(
      'Delete your account?',
      isOwner
        ? 'Every branch you own, with all its customers, vehicles, job cards and invoices, will be deleted. This cannot be undone.'
        : 'Your login will be removed. This cannot be undone.',
      [
        { text: 'Keep my account', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: performDelete }
      ]
    );
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <ResponsiveScreen>
        <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.warning} testID="delete-account-warning">
            <Ionicons name="warning-outline" size={22} color={colors.danger} />
            <View style={styles.warningBody}>
              <Text style={styles.warningTitle}>This cannot be undone</Text>
              <Text style={styles.warningText}>
                {isOwner
                  ? 'Every branch you own will be deleted along with its staff logins, customers, vehicles, job cards, invoices and reminders. Download any invoices you need first.'
                  : 'Your login will be removed. The garage keeps its records, including job cards you worked on.'}
              </Text>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.account}>{user?.name}</Text>
            <Text style={styles.accountSub}>{user?.email}</Text>
            <View style={styles.divider} />
            <Field
              label="Enter your password to confirm"
              value={password}
              onChangeText={v => { setPassword(v); if (error) setError(undefined); }}
              placeholder="Your current password"
              secureTextEntry
              autoCapitalize="none"
              textContentType="password"
              error={error}
              required
              testID="delete-account-password"
            />
            <TouchableOpacity
              style={[styles.deleteBtn, !password && styles.deleteBtnDisabled]}
              onPress={confirm}
              disabled={!password}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityState={{ disabled: !password }}
              testID="delete-account-button"
            >
              <Ionicons name="trash-outline" size={18} color={colors.textOnPrimary} />
              <Text style={styles.deleteBtnText}>Delete my account</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </ResponsiveScreen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16 },
  warning: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: colors.dangerSoft, borderWidth: 1, borderColor: colors.danger,
    borderRadius: radius.lg, padding: 14, marginBottom: 16
  },
  warningBody: { flex: 1 },
  warningTitle: { fontSize: 14, fontWeight: '700', color: palette.red700 },
  warningText: { fontSize: 13, color: palette.red700, lineHeight: 18, marginTop: 2 },
  card: {
    backgroundColor: colors.surface, borderRadius: radius.lg, padding: 16,
    shadowColor: colors.shadowAmbient, shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 4
  },
  account: { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  accountSub: { fontSize: 13, color: colors.textMuted, marginTop: 2 },
  divider: { height: 1, backgroundColor: colors.surfaceMuted, marginVertical: 14 },
  deleteBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.danger, borderRadius: radius.md, paddingVertical: 13, marginTop: 4
  },
  deleteBtnDisabled: { opacity: 0.5 },
  deleteBtnText: { fontSize: 15, fontWeight: '700', color: colors.textOnPrimary }
});
