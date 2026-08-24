import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import Toast from 'react-native-toast-message';
import { useAuth } from '../context/AuthContext';
import { updateProfile } from '../api/authService';
import { Field, PrimaryBtn } from '../components/FormControls';
import ResponsiveScreen from '../components/ResponsiveScreen';
import type { RootStackScreenProps } from '../types/navigation';
import { getErrorMessage } from '../utils/errors';
import { colors, radius } from '../theme';

type Props = RootStackScreenProps<'EditProfile'>;

export default function EditProfileScreen(_props: Props) {
  const { user, refreshUser } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) { Toast.show({ type: 'error', text1: 'Name cannot be empty' }); return; }
    setSaving(true);
    try {
      await updateProfile({ name: name.trim(), phone: phone.trim() });
      await refreshUser();
      Toast.show({ type: 'success', text1: 'Profile updated!' });
    } catch (e) {
      Toast.show({ type: 'error', text1: getErrorMessage(e, 'Failed to update profile') });
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <ResponsiveScreen>
        <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <Field label="Full Name" value={name} onChangeText={setName} placeholder="Your name" />
            <Field label="Email" value={user?.email || ''} placeholder="Email" editable={false} keyboardType="email-address" autoCapitalize="none" />
            <Field label="Phone Number" value={phone} onChangeText={setPhone} placeholder="Phone number" keyboardType="phone-pad" autoCapitalize="none" />
            <PrimaryBtn label="Save Changes" icon="save-outline" onPress={handleSave} loading={saving} />
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
