import React, { useState, ComponentProps } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet, KeyboardTypeOptions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type IconName = ComponentProps<typeof Ionicons>['name'];

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

// Shared by SettingsScreen, EditProfileScreen and ChangePasswordScreen — kept
// here (rather than redefined per-screen) so the three stay visually
// identical without copy-pasted style drift.
export function Field({ label, value, onChangeText, placeholder, keyboardType, autoCapitalize, editable = true, secureTextEntry }: FieldProps) {
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

export function PrimaryBtn({ label, icon, onPress, loading }: PrimaryBtnProps) {
  return (
    <TouchableOpacity style={[styles.primaryBtn, loading && { opacity: 0.6 }]} onPress={onPress} disabled={loading} activeOpacity={0.8}>
      {loading ? <ActivityIndicator color="#fff" size="small" /> : (
        <><Ionicons name={icon} size={17} color="#fff" /><Text style={styles.primaryBtnText}>{label}</Text></>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  fieldWrap: { marginBottom: 14 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fdfcfb', borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 16, paddingHorizontal: 12,
  },
  inputDimmed: { opacity: 0.55 },
  inputField: { flex: 1, height: 44, fontSize: 15, color: '#1f2937' },

  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#3b5ff8', borderRadius: 16, paddingVertical: 13, marginTop: 6,
  },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: 'bold' },
});
