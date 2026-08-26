import React from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Toast from 'react-native-toast-message';
import { changePassword } from '../api/authService';
import { ControlledField, PrimaryBtn } from '../components/FormControls';
import ResponsiveScreen from '../components/ResponsiveScreen';
import type { RootStackScreenProps } from '../types/navigation';
import { changePasswordSchema, type ChangePasswordFormValues } from '../utils/validation';
import { getErrorMessage } from '../utils/errors';
import { colors, radius } from '../theme';

type Props = RootStackScreenProps<'ChangePassword'>;

const BLANK: ChangePasswordFormValues = { currentPassword: '', newPassword: '', confirmPassword: '' };

export default function ChangePasswordScreen(_props: Props) {
  const {
    control, handleSubmit, reset,
    formState: { isSubmitting },
  } = useForm<ChangePasswordFormValues>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: BLANK,
  });

  const handleSave = async (values: ChangePasswordFormValues) => {
    try {
      await changePassword({ currentPassword: values.currentPassword, newPassword: values.newPassword });
      Toast.show({ type: 'success', text1: 'Password changed!' });
      reset(BLANK);
    } catch (e) {
      // A toast is still right here: a rejected *current* password is a server
      // answer about the request, not a rule this form could have checked.
      Toast.show({ type: 'error', text1: getErrorMessage(e, 'Failed to change password') });
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <ResponsiveScreen>
        <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <ControlledField control={control} name="currentPassword" label="Current Password" placeholder="Current password" secureTextEntry autoCapitalize="none" required />
            <ControlledField control={control} name="newPassword" label="New Password" placeholder="Min. 6 characters" secureTextEntry autoCapitalize="none" required />
            <ControlledField control={control} name="confirmPassword" label="Confirm New Password" placeholder="Re-enter new password" secureTextEntry autoCapitalize="none" required />
            <PrimaryBtn label="Update Password" icon="key-outline" onPress={handleSubmit(handleSave)} loading={isSubmitting} />
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
