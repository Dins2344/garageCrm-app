import React from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Toast from 'react-native-toast-message';
import { useAuth } from '../context/AuthContext';
import { updateProfile } from '../api/authService';
import { Field, ControlledField, PrimaryBtn } from '../components/FormControls';
import ResponsiveScreen from '../components/ResponsiveScreen';
import type { RootStackScreenProps } from '../types/navigation';
import { profileSchema, type ProfileFormValues } from '../utils/validation';
import { getErrorMessage } from '../utils/errors';
import { colors, radius } from '../theme';

type Props = RootStackScreenProps<'EditProfile'>;

export default function EditProfileScreen(_props: Props) {
  const { user, refreshUser } = useAuth();
  const {
    control, handleSubmit,
    formState: { isSubmitting },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user?.name || '', phone: user?.phone || '' },
  });

  const handleSave = async (values: ProfileFormValues) => {
    try {
      await updateProfile({ name: values.name, phone: values.phone });
      await refreshUser();
      Toast.show({ type: 'success', text1: 'Profile updated!' });
    } catch (e) {
      Toast.show({ type: 'error', text1: getErrorMessage(e, 'Failed to update profile') });
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <ResponsiveScreen>
        <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <ControlledField control={control} name="name" label="Full Name" placeholder="Your name" required />
            {/* Read-only, so it stays a plain Field — there is nothing to validate. */}
            <Field label="Email" value={user?.email || ''} placeholder="Email" editable={false} keyboardType="email-address" autoCapitalize="none" />
            <ControlledField control={control} name="phone" label="Phone Number" placeholder="Phone number" keyboardType="phone-pad" autoCapitalize="none" required />
            <PrimaryBtn label="Save Changes" icon="save-outline" onPress={handleSubmit(handleSave)} loading={isSubmitting} />
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
