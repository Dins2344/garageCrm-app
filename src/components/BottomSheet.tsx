import React, { useEffect, useState, type ReactNode } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform,
  Animated, Easing, ActivityIndicator, type DimensionValue, type StyleProp, type ViewStyle
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { toastConfig } from './toastConfig';
import { SHEET_MAX_WIDTH } from './ResponsiveScreen';
import { colors, radius } from '../theme';

/**
 * The one bottom sheet.
 *
 * Every sheet in the app — pickers, add/edit forms, the branch switcher, the
 * payment step, code entry — renders through this shell, so they open, dim
 * and close identically. Before it existed there were eleven hand-rolled
 * copies with three different scrims, two animation styles and one sheet that
 * did not animate at all; the fix made to one of them reached none of the
 * others.
 *
 * What the shell owns:
 *
 * - **The dim fades in place while the sheet rises a short distance.**
 *   `Modal`'s own `animationType="slide"` drags the scrim up with the sheet
 *   from the bottom edge, which is the abruptness this replaced. So the Modal
 *   is `animationType="none"` and the two layers animate separately: the dim
 *   goes 0 -> 1 in opacity, the sheet rises `RISE_DISTANCE` under it.
 * - **Enter slower than exit.** Arriving wants to feel unhurried; leaving
 *   should get out of the way. Both well under the ~300ms where a transition
 *   starts to feel like waiting.
 * - **Two pieces of state, `visible` and `mounted`.** The caller's `visible`
 *   is the animation target; `mounted` keeps the Modal on screen through the
 *   closing animation. One flag cannot do it — flipping it would unmount the
 *   sheet mid-fade and the dim would vanish in one frame.
 * - **A minimum height** so a two-option sheet is not a sliver barely taller
 *   than its own title bar. Proportional, so it holds on a tablet too.
 * - **A modal-scoped Toast.** RN's Modal renders in its own native layer
 *   above the app root, so the root `<Toast/>` would be hidden behind the
 *   sheet; mounting one here makes it the active instance while open.
 */

const ENTER_MS = 240;
const EXIT_MS = 160;
const RISE_DISTANCE = 40;

export interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** Rendered below the body, outside its scroll — usually `SheetActions`. */
  footer?: ReactNode;
  /**
   * The body scrolls by default. Pass `false` when the body manages its own
   * scrolling or must not (a fixed set of buttons, a list with its own
   * FlatList).
   */
  scroll?: boolean;
  /** Overrides the body's default `padding: 20`. */
  bodyStyle?: StyleProp<ViewStyle>;
  maxHeight?: DimensionValue;
  minHeight?: DimensionValue;
  testID?: string;
}

export default function BottomSheet({
  visible, onClose, title, children, footer, scroll = true, bodyStyle,
  maxHeight = '85%', minHeight = '38%', testID = 'bottom-sheet'
}: BottomSheetProps) {
  const [mounted, setMounted] = useState(visible);
  // `useState`, not `useRef().current`: this repo's React Compiler lint rejects
  // reading a ref during render. The lazy initialiser runs once.
  const [anim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (visible) setMounted(true);
  }, [visible]);

  useEffect(() => {
    if (!mounted) return;
    Animated.timing(anim, {
      toValue: visible ? 1 : 0,
      duration: visible ? ENTER_MS : EXIT_MS,
      // Decelerate in, accelerate out — the sheet arrives softly and leaves
      // briskly, which is what makes the dim feel like it settles rather
      // than snaps.
      easing: visible ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver: true
    }).start(({ finished }) => {
      // Only unmount when the exit actually completed. An interrupted run
      // (reopened mid-close) must leave the Modal up.
      if (finished && !visible) setMounted(false);
    });
  }, [visible, mounted, anim]);

  if (!mounted) return null;

  const body = scroll ? (
    <ScrollView
      style={styles.bodyScroll}
      contentContainerStyle={[styles.body, bodyStyle]}
      keyboardShouldPersistTaps="handled"
      nestedScrollEnabled
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[styles.body, bodyStyle]}>{children}</View>
  );

  return (
    <Modal visible={mounted} transparent animationType="none" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.overlay}>
        <Animated.View style={[styles.scrim, { opacity: anim }]} pointerEvents="none" testID={`${testID}-scrim`} />
        <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={onClose} accessibilityLabel="Close" />

        <Animated.View
          testID={testID}
          style={[
            styles.sheet,
            { maxHeight, minHeight },
            {
              opacity: anim,
              transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [RISE_DISTANCE, 0] }) }]
            }
          ]}
        >
          <View style={styles.handle} />
          <View style={styles.header}>
            <Text style={styles.title} numberOfLines={1}>{title}</Text>
            <TouchableOpacity onPress={onClose} accessibilityRole="button" accessibilityLabel="Close">
              <Ionicons name="close" size={24} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
          {body}
          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </Animated.View>
      </KeyboardAvoidingView>
      <Toast config={toastConfig} />
    </Modal>
  );
}

interface SheetActionsProps {
  onCancel: () => void;
  onConfirm: () => void;
  confirmLabel: string;
  cancelLabel?: string;
  loading?: boolean;
  disabled?: boolean;
  /** `danger` for a delete, `success` for a payment; `primary` for a save. */
  tone?: 'primary' | 'success' | 'danger';
  testID?: string;
}

/** The cancel / confirm pair every form sheet ends with. */
export function SheetActions({
  onCancel, onConfirm, confirmLabel, cancelLabel = 'Cancel', loading, disabled, tone = 'primary', testID
}: SheetActionsProps) {
  const inert = loading || disabled;
  return (
    <>
      <TouchableOpacity style={styles.cancelBtn} onPress={onCancel} disabled={loading} accessibilityRole="button">
        <Text style={styles.cancelBtnText}>{cancelLabel}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.confirmBtn, TONE_STYLE[tone], inert && { opacity: 0.6 }]}
        onPress={onConfirm}
        disabled={inert}
        accessibilityRole="button"
        testID={testID}
      >
        {loading
          ? <ActivityIndicator color={colors.textOnPrimary} size="small" />
          : <Text style={styles.confirmBtnText}>{confirmLabel}</Text>}
      </TouchableOpacity>
    </>
  );
}

const TONE_STYLE = {
  primary: { backgroundColor: colors.primary },
  success: { backgroundColor: colors.success },
  danger: { backgroundColor: colors.danger }
} as const;

const styles = StyleSheet.create({
  // The overlay itself is transparent — the dim is a separate absolutely
  // positioned layer so its opacity can be animated without also fading the
  // sheet sitting on top of it.
  overlay: { flex: 1, justifyContent: 'flex-end', alignItems: 'center' },
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.scrim },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    width: '100%',
    maxWidth: SHEET_MAX_WIDTH
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginTop: 12 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12,
    padding: 20, borderBottomWidth: 1, borderBottomColor: colors.surfaceMuted
  },
  title: { flex: 1, fontSize: 17, fontWeight: 'bold', color: colors.textPrimary },
  bodyScroll: { flexShrink: 1 },
  body: { padding: 20 },
  footer: { flexDirection: 'row', gap: 12, padding: 20, borderTopWidth: 1, borderTopColor: colors.surfaceMuted },
  // The pair every form sheet already drew, verbatim, so nothing changes look.
  cancelBtn: { flex: 1, padding: 14, borderRadius: radius.lg, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' },
  cancelBtnText: { fontSize: 15, fontWeight: '600', color: colors.textSecondary },
  confirmBtn: { flex: 1.5, padding: 14, borderRadius: radius.lg, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  confirmBtnText: { fontSize: 15, fontWeight: 'bold', color: colors.textOnPrimary }
});
