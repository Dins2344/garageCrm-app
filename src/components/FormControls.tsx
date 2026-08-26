import React, { useState, ComponentProps } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, StyleSheet, KeyboardTypeOptions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useController, type Control, type FieldValues, type FieldPath } from 'react-hook-form';
import BottomSheetPicker, { type BottomSheetPickerProps } from './BottomSheetPicker';
import { colors, radius } from '../theme';

type IconName = ComponentProps<typeof Ionicons>['name'];

interface FieldProps {
  label: string;
  value: string;
  onChangeText?: (v: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  editable?: boolean;
  secureTextEntry?: boolean;
  /** Message from the field's schema rule. Its presence is what marks the field invalid. */
  error?: string;
  required?: boolean;
}

// Shared by SettingsScreen, EditProfileScreen and ChangePasswordScreen — kept
// here (rather than redefined per-screen) so the three stay visually
// identical without copy-pasted style drift.
export function Field({ label, value, onChangeText, onBlur, placeholder, keyboardType, autoCapitalize, editable = true, secureTextEntry, error, required }: FieldProps) {
  const [show, setShow] = useState(false);
  const isPwd = secureTextEntry !== undefined;
  return (
    <View style={styles.fieldWrap}>
      <Text style={styles.fieldLabel}>{label}{required ? ' *' : ''}</Text>
      <View style={[styles.inputRow, !editable && styles.inputDimmed, !!error && styles.inputRowError]}>
        <TextInput
          style={styles.inputField}
          /* The <Text> label is not associated with the input on RN, so without
             this a screen reader announces an unlabelled edit box — and tests
             are pushed onto the placeholder, which follows the garage country
             and therefore changes per tenant. */
          accessibilityLabel={label}
          value={value}
          onChangeText={onChangeText}
          onBlur={onBlur}
          placeholder={placeholder}
          placeholderTextColor={colors.textFaint}
          keyboardType={keyboardType || 'default'}
          autoCapitalize={autoCapitalize || 'sentences'}
          editable={editable}
          secureTextEntry={isPwd ? !show : false}
        />
        {isPwd && (
          <TouchableOpacity onPress={() => setShow(s => !s)} style={{ padding: 4 }}>
            <Ionicons name={show ? 'eye-off-outline' : 'eye-outline'} size={20} color={colors.textFaint} />
          </TouchableOpacity>
        )}
      </View>
      {/* The border alone is not enough: a red outline says "wrong" without
          saying what, and a colour-blind user may not see it change at all. */}
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

interface ControlledFieldProps<T extends FieldValues> extends Omit<FieldProps, 'value' | 'onChangeText' | 'onBlur' | 'error'> {
  control: Control<T>;
  name: FieldPath<T>;
}

/**
 * `Field` bound to a react-hook-form field.
 *
 * **React Native needs this; the web app does not.** `register()` works by
 * attaching a DOM ref and listening for native `change`/`blur` events, and a
 * `TextInput` has neither — spreading `register('name')` onto one compiles and
 * then silently never updates the form. `useController` subscribes properly,
 * which is why every field on this side goes through here.
 *
 * Values are coerced to a string on the way in: schemas that use `z.coerce`
 * hold the string the input produces, but a `defaultValue` of `undefined`
 * would otherwise flip the `TextInput` from controlled to uncontrolled
 * mid-edit.
 */
export function ControlledField<T extends FieldValues>({ control, name, ...rest }: ControlledFieldProps<T>) {
  const { field, fieldState } = useController({ control, name });
  return (
    <Field
      {...rest}
      value={field.value == null ? '' : String(field.value)}
      onChangeText={field.onChange}
      onBlur={field.onBlur}
      error={fieldState.error?.message}
    />
  );
}

interface ControlledPickerProps<T extends FieldValues> extends Omit<BottomSheetPickerProps, 'selectedValue' | 'onValueChange'> {
  control: Control<T>;
  name: FieldPath<T>;
  /** Runs after the field is updated — for side effects on another field. */
  onAfterChange?: (value: string) => void;
}

/**
 * `BottomSheetPicker` bound to a react-hook-form field, with the field's error
 * rendered under it.
 *
 * The picker owns its own sheet and has no text input, so there is nothing for
 * `register` to attach to here either — the binding is the same
 * `useController` one the text fields use.
 */
export function ControlledPicker<T extends FieldValues>({ control, name, onAfterChange, ...rest }: ControlledPickerProps<T>) {
  const { field, fieldState } = useController({ control, name });
  return (
    <View>
      <BottomSheetPicker
        {...rest}
        selectedValue={field.value == null ? undefined : String(field.value)}
        onValueChange={v => { field.onChange(v); onAfterChange?.(v); }}
      />
      {fieldState.error ? <Text style={styles.pickerError}>{fieldState.error.message}</Text> : null}
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
      {loading ? <ActivityIndicator color={colors.textOnPrimary} size="small" /> : (
        <><Ionicons name={icon} size={17} color={colors.textOnPrimary} /><Text style={styles.primaryBtnText}>{label}</Text></>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  fieldWrap: { marginBottom: 14 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 6 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.background, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: radius.lg, paddingHorizontal: 12,
  },
  inputRowError: { borderColor: colors.danger },
  inputDimmed: { opacity: 0.55 },
  inputField: { flex: 1, height: 44, fontSize: 15, color: colors.textStrong },
  fieldError: { fontSize: 12, color: colors.danger, marginTop: 5 },
  // The picker carries its own bottom margin, so this sits tighter than fieldError.
  pickerError: { fontSize: 12, color: colors.danger, marginTop: -8, marginBottom: 10 },

  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: colors.primary, borderRadius: radius.lg, paddingVertical: 13, marginTop: 6,
  },
  primaryBtnText: { color: colors.textOnPrimary, fontSize: 15, fontWeight: 'bold' },
});
