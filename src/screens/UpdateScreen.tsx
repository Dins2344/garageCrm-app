import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, BackHandler } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PrimaryBtn } from '../components/FormControls';
import { openStoreListing } from '../utils/store';
import { APP_VERSION } from '../utils/appVersion';
import type { AppUpdateDecision } from '../api/updateService';
import { colors, radius, spacing, type } from '../theme';

interface UpdateScreenProps {
  decision: AppUpdateDecision;
  /** Blocking. When true there is no way past this screen inside the app. */
  mandatory?: boolean;
  /** "Later". Present only when not mandatory. */
  onLater?: () => void;
}

const FALLBACK_BLOCKING = 'This version is no longer supported. Please update to carry on.';
const FALLBACK_OPTIONAL = 'A new version of GaragePulse is available.';

/**
 * The update prompt, blocking or not.
 *
 * One component with a `mandatory` flag rather than a screen plus a modal:
 * `FeatureCarousel` already establishes "a full-screen takeover returned in
 * place of `children`" as this app's idiom, and there is no generic Modal
 * component to reuse — every `Modal` in the app is a dismissible bottom sheet.
 *
 * Rendered outside `NavigationContainer`, so there is no header and no insets;
 * it applies them itself, as `FeatureCarousel` does.
 */
export default function UpdateScreen({ decision, mandatory = false, onLater }: UpdateScreenProps) {
  const insets = useSafeAreaInsets();

  /**
   * Android back. Two opposite behaviours in adjacent code, so both are spelt
   * out:
   *
   * - mandatory: swallow it. Returning `true` stops the OS acting, which is
   *   the whole point of a blocking screen.
   * - optional: back means "Later".
   *
   * Either way this only intercepts the back *button*. Home and the app
   * switcher still work, and they must — the user has to be able to leave in
   * order to reach the Play Store.
   */
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (mandatory) return true;
      if (onLater) { onLater(); return true; }
      return false;
    });
    return () => sub.remove();
  }, [mandatory, onLater]);

  const message = decision.message || (mandatory ? FALLBACK_BLOCKING : FALLBACK_OPTIONAL);

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.body}>
        <View style={styles.iconDisc}>
          <Ionicons
            name={mandatory ? 'alert-circle-outline' : 'cloud-download-outline'}
            size={40}
            color={mandatory ? colors.warning : colors.primary}
          />
        </View>

        <Text style={styles.title}>
          {mandatory ? 'Update required' : 'Update available'}
        </Text>
        <Text style={styles.message}>{message}</Text>

        {/* Kept on screen deliberately: if the store link fails, these are what
            let someone find the right app by hand. */}
        {APP_VERSION && decision.latestVersion ? (
          <Text style={styles.versions}>
            You have {APP_VERSION}. The current version is {decision.latestVersion}.
          </Text>
        ) : null}
      </View>

      <View style={styles.footer}>
        <PrimaryBtn label="Update now" icon="download-outline" onPress={openStoreListing} />
        {!mandatory && onLater ? (
          // Hand-rolled rather than a SecondaryBtn, matching FeatureCarousel's
          // Skip. NOTE: that makes this the second hand-rolled text button in
          // the app — a third is the point at which one should be extracted.
          <TouchableOpacity onPress={onLater} hitSlop={10} testID="update-later" style={styles.later}>
            <Text style={styles.laterText}>Later</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl },
  iconDisc: {
    width: 92, height: 92, borderRadius: radius.xxl,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xxl,
  },
  title: {
    fontSize: type.display, fontWeight: 'bold', color: colors.textPrimary,
    textAlign: 'center', marginBottom: spacing.md,
  },
  message: {
    fontSize: type.bodyLarge, color: colors.textSecondary,
    textAlign: 'center', lineHeight: 22, marginBottom: spacing.lg,
  },
  versions: { fontSize: type.small, color: colors.textMuted, textAlign: 'center' },

  footer: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xl },
  later: { alignItems: 'center', paddingVertical: spacing.md, marginTop: spacing.xs },
  laterText: { fontSize: type.body, fontWeight: '600', color: colors.textMuted },
});
