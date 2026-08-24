import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import Toast from 'react-native-toast-message';
import { changePassword } from '../api/authService';
import { Field, PrimaryBtn } from '../components/FormControls';
import ResponsiveScreen from '../components/ResponsiveScreen';
import type { RootStackScreenProps } from '../types/navigation';
import { getErrorMessage } from '../utils/errors';
import { colors, radius } from '../theme';

type Props = RootStackScreenProps<'ChangePassword'>;

export default function ChangePasswordScreen(_props: Props) {
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!currentPwd || !newPwd || !confirmPwd) { Toast.show({ type: 'error', text1: 'Please fill all fields' }); return; }
    if (newPwd.length < 6) { Toast.show({ type: 'error', text1: 'Password must be at least 6 characters' }); return; }
    if (newPwd !== confirmPwd) { Toast.show({ type: 'error', text1: 'Passwords do not match' }); return; }
    setSaving(true);
    try {
      await changePassword({ currentPassword: currentPwd, newPassword: newPwd });
      Toast.show({ type: 'success', text1: 'Password changed!' });
      setCurrentPwd(''); setNewPwd(''); setConfirmPwd('');
    } catch (e) {
      Toast.show({ type: 'error', text1: getErrorMessage(e, 'Failed to change password') });
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <ResponsiveScreen>
        <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <Field label="Current Password" value={currentPwd} onChangeText={setCurrentPwd} placeholder="Current password" secureTextEntry autoCapitalize="none" />
            <Field label="New Password" value={newPwd} onChangeText={setNewPwd} placeholder="Min. 6 characters" secureTextEntry autoCapitalize="none" />
            <Field label="Confirm New Password" value={confirmPwd} onChangeText={setConfirmPwd} placeholder="Re-enter new password" secureTextEntry autoCapitalize="none" />
            <PrimaryBtn label="Update Password" icon="key-outline" onPress={handleSave} loading={saving} />
          </View>
        </ScrollView>
      </ResponsiveScreen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16 },
  card: {
    backgroundColor: colors.surface, borderRadius: radius.lg, padding: 16,
    shadowColor: colors.shadowAmbient, shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 4,
  },
});
