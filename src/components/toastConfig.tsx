import React, { ComponentProps } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ToastConfig, ToastConfigParams } from 'react-native-toast-message';
import { SHEET_MAX_WIDTH } from './ResponsiveScreen';

type IconName = ComponentProps<typeof Ionicons>['name'];

interface Variant {
  accent: string;
  tint: string;
  icon: IconName;
}

// Colours reuse the app's existing semantic palette: primary #3b5ff8,
// success #10b981, danger #ef4444, warning #f59e0b — with the same
// tint-behind-icon treatment used for icon containers elsewhere.
const VARIANTS: Record<string, Variant> = {
  success: { accent: '#10b981', tint: '#ecfdf5', icon: 'checkmark-circle' },
  error:   { accent: '#ef4444', tint: '#fef2f2', icon: 'alert-circle' },
  info:    { accent: '#3b5ff8', tint: '#eff2ff', icon: 'information-circle' },
  warning: { accent: '#f59e0b', tint: '#fffbeb', icon: 'warning' },
};

// Fallback headline when a caller supplied only one string. Deliberately
// neutral — roughly half the error toasts are validation prompts ("Please
// select a customer"), for which a heavier "Something went wrong" would
// read as contradictory.
const DEFAULT_TITLES: Record<string, string> = {
  success: 'Success',
  error: 'Error',
  info: 'Heads up',
  warning: 'Warning',
};

interface ThemedToastProps extends ToastConfigParams<unknown> {
  variant: keyof typeof VARIANTS;
}

function ThemedToast({ text1, text2, variant, hide }: ThemedToastProps) {
  const v = VARIANTS[variant] ?? VARIANTS.info;

  // Most call sites pass a single string. Rather than require all of them to
  // be rewritten, treat a lone string as the *detail* and headline it with the
  // variant's default title — so every toast reads as title + message. Callers
  // that pass both keep full control (text1 = title, text2 = detail).
  const title = text2 ? text1 : DEFAULT_TITLES[variant];
  const message = text2 ?? text1;

  return (
    <View style={styles.card}>
      {/* Colored accent rail — type is readable at a glance. */}
      <View style={[styles.accent, { backgroundColor: v.accent }]} />

      <View style={[styles.iconWrap, { backgroundColor: v.tint }]}>
        <Ionicons name={v.icon} size={20} color={v.accent} />
      </View>

      <View style={styles.textWrap}>
        {title ? (
          // Title stays on one line; the detail below carries the specifics.
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
        ) : null}
        {message ? (
          // Generous line budget so server messages (e.g. "This vehicle
          // already has an open job card (JC-…)") are shown in full rather
          // than being clipped mid-sentence.
          <Text style={styles.message} numberOfLines={4}>{message}</Text>
        ) : null}
      </View>

      <TouchableOpacity
        onPress={() => hide()}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        style={styles.closeBtn}
        accessibilityLabel="Dismiss notification"
      >
        <Ionicons name="close" size={16} color="#9ca3af" />
      </TouchableOpacity>
    </View>
  );
}

/**
 * Themed replacement for react-native-toast-message's default toasts.
 *
 * Must be passed to every <Toast /> instance — the app root plus the
 * modal-scoped ones (RN Modals render above the root toast, so screens with
 * modals mount their own). See App.tsx and the `<Toast config={toastConfig} />`
 * usages in the modal screens.
 */
export const toastConfig: ToastConfig = {
  success: props => <ThemedToast {...props} variant="success" />,
  error: props => <ThemedToast {...props} variant="error" />,
  info: props => <ThemedToast {...props} variant="info" />,
  warning: props => <ThemedToast {...props} variant="warning" />,
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    width: '92%',
    maxWidth: SHEET_MAX_WIDTH,
    minHeight: 60,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#f0f1f7',
    paddingVertical: 12,
    paddingRight: 10,
    overflow: 'hidden',
    // The app's signature indigo elevation, same as cards everywhere else.
    shadowColor: '#6366f1',
    shadowOpacity: 0.18,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  accent: {
    width: 4,
    alignSelf: 'stretch',
    marginRight: 12,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  textWrap: {
    flex: 1,
    paddingRight: 4,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  message: {
    fontSize: 12,
    color: '#6b7280',
    lineHeight: 17,
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
});
