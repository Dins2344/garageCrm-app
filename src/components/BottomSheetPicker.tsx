import React, { useState, useEffect, ComponentProps } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, TextInput,
  KeyboardAvoidingView, Platform, Animated, Easing
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SHEET_MAX_WIDTH } from './ResponsiveScreen';
import { colors, radius } from '../theme';

/**
 * Enter is slower than exit on purpose: arriving is the moment that wants to
 * feel unhurried, leaving should get out of the way. Both are well under the
 * ~300ms where a transition starts to feel like waiting.
 */
const ENTER_MS = 240;
const EXIT_MS = 160;

/**
 * How far the sheet travels on entry. Deliberately a short distance rather than
 * the sheet's own height: `Modal`'s built-in `animationType="slide"` moves the
 * whole modal — scrim included — the full height of the screen, so the dim
 * swept up from the bottom edge instead of fading in place. A short rise under
 * a fading scrim reads as the sheet settling rather than being thrown.
 */
const RISE_DISTANCE = 40;

type IconName = ComponentProps<typeof Ionicons>['name'];

export interface PickerOption {
  value: string;
  label: string;
  icon?: IconName;
  color?: string;
}

export interface BottomSheetPickerProps {
  label?: string;
  options: PickerOption[];
  selectedValue?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  searchable?: boolean;
}

/**
 * Reusable bottom-sheet picker that replaces @react-native-picker/picker.
 */
export default function BottomSheetPicker({
  label, options, selectedValue, onValueChange,
  placeholder = 'Select...', required, disabled, searchable
}: BottomSheetPickerProps) {
  // Two pieces of state, not one. `open` is the animation target; `mounted`
  // keeps the Modal on screen through the closing animation, which a single
  // flag cannot do — flipping it would unmount the sheet mid-fade and the
  // dim would vanish in one frame.
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [query, setQuery] = useState('');

  // `useState`, not `useRef().current`: this repo's React Compiler lint rejects
  // reading a ref during render (`react-hooks/refs`). The lazy initialiser runs
  // once, so the Animated.Value is still created a single time.
  const [anim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!mounted) return;
    Animated.timing(anim, {
      toValue: open ? 1 : 0,
      duration: open ? ENTER_MS : EXIT_MS,
      // Decelerate in, accelerate out — the sheet arrives softly and leaves
      // briskly, which is what makes the dim feel like it settles rather than
      // snaps.
      easing: open ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(({ finished }) => {
      // Only unmount when the exit actually completed. An interrupted run
      // (reopened mid-close) must leave the Modal up.
      if (finished && !open) setMounted(false);
    });
  }, [open, mounted, anim]);

  const openSheet = () => {
    // Both set here rather than in an effect, so the Modal mounts and the
    // animation starts in the same commit and there is no unfaded first frame.
    setMounted(true);
    setOpen(true);
  };

  const closeSheet = () => {
    setOpen(false);
    setQuery('');
  };

  const selected = options.find(o => o.value === selectedValue);

  const filtered = searchable && query
    ? options.filter(o => o.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  const handleSelect = (val: string) => {
    onValueChange(val);
    closeSheet();
  };

  return (
    <View style={styles.wrapper}>
      {label ? (
        <Text style={styles.label}>{label}{required ? ' *' : ''}</Text>
      ) : null}

      <TouchableOpacity
        style={[styles.trigger, disabled && styles.triggerDisabled]}
        onPress={() => !disabled && openSheet()}
        activeOpacity={0.7}
      >
        {selected?.icon ? (
          <View style={[styles.optIcon, { backgroundColor: (selected.color || colors.primary) + '18' }]}>
            <Ionicons name={selected.icon} size={16} color={selected.color || colors.primary} />
          </View>
        ) : null}

        {selected?.color && !selected.icon ? (
          <View style={[styles.dot, { backgroundColor: selected.color }]} />
        ) : null}

        <Text style={[styles.triggerText, !selected && styles.placeholder]} numberOfLines={1}>
          {selected ? selected.label : placeholder}
        </Text>

        <Ionicons name="chevron-down" size={18} color={colors.textFaint} />
      </TouchableOpacity>

      {/* animationType="none": the scrim and the sheet are animated separately
          below. Modal's own "slide" moves both together, which drags the dim up
          from the bottom edge — the abrupt part being asked about here. */}
      <Modal visible={mounted} transparent animationType="none" onRequestClose={closeSheet}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.overlay}>
          <Animated.View
            style={[styles.scrim, { opacity: anim }]}
            pointerEvents="none"
            testID="bottom-sheet-scrim"
          />
          <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={closeSheet} />

          <Animated.View
            testID="bottom-sheet"
            style={[
              styles.sheet,
              {
                opacity: anim,
                transform: [{
                  translateY: anim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [RISE_DISTANCE, 0],
                  }),
                }],
              },
            ]}
          >
            <View style={styles.handle} />

            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{label || 'Select Option'}</Text>
              <TouchableOpacity onPress={closeSheet}>
                <Ionicons name="close" size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {searchable ? (
              <View style={styles.searchRow}>
                <Ionicons name="search" size={16} color={colors.textFaint} />
                <TextInput
                  style={styles.searchInput}
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Search..."
                  placeholderTextColor={colors.textFaint}
                  autoFocus
                />
              </View>
            ) : null}

            <ScrollView
              style={styles.list}
              contentContainerStyle={{ paddingBottom: 40 }}
              keyboardShouldPersistTaps="handled"
            >
              {filtered.map(opt => {
                const isSelected = opt.value === selectedValue;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.option, isSelected && styles.optionSelected]}
                    onPress={() => handleSelect(opt.value)}
                    activeOpacity={0.6}
                  >
                    {opt.icon ? (
                      <View style={[styles.optIcon, { backgroundColor: (opt.color || colors.primary) + '18' }]}>
                        <Ionicons name={opt.icon} size={16} color={opt.color || colors.primary} />
                      </View>
                    ) : opt.color ? (
                      <View style={[styles.dot, { backgroundColor: opt.color }]} />
                    ) : null}

                    <Text style={[styles.optLabel, isSelected && styles.optLabelSelected]}>
                      {opt.label}
                    </Text>

                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                    )}
                  </TouchableOpacity>
                );
              })}
              {filtered.length === 0 && (
                <Text style={styles.emptyText}>No options found</Text>
              )}
            </ScrollView>
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: 2 },
  label: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginBottom: 6 },

  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSunken,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 14,
    height: 48,
    gap: 10,
  },
  triggerDisabled: { opacity: 0.5 },
  triggerText: { flex: 1, fontSize: 15, color: colors.textStrong, fontWeight: '500' },
  placeholder: { color: colors.textFaint, fontWeight: '400' },

  dot: { width: 10, height: 10, borderRadius: 5 },
  optIcon: { width: 30, height: 30, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },

  // Sheet
  //
  // The overlay itself is transparent — the dim is a separate absolutely
  // positioned layer so its opacity can be animated without also fading the
  // sheet sitting on top of it.
  overlay: { flex: 1, justifyContent: 'flex-end', alignItems: 'center' },
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.scrim },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.xxl,
    borderTopRightRadius: radius.xxl,
    maxHeight: '65%',
    /**
     * Proportional, not the old flat 200px.
     *
     * 200 left roughly 120px for the list once the handle and header had taken
     * their share — about two rows. A picker with two or three options rendered
     * a panel barely taller than its own title bar, which read as a rendering
     * glitch rather than a sheet. A share of the screen keeps the proportion
     * right on a small phone and a tablet alike, where a pixel value cannot.
     *
     * Below `maxHeight` by a wide margin, so a long list still governs its own
     * height and the two never fight.
     */
    minHeight: '38%',
    width: '100%',
    maxWidth: SHEET_MAX_WIDTH,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: colors.border, alignSelf: 'center', marginTop: 12,
  },
  sheetHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 20, borderBottomWidth: 1, borderBottomColor: colors.surfaceMuted,
  },
  sheetTitle: { fontSize: 17, fontWeight: 'bold', color: colors.textPrimary },

  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    margin: 16, backgroundColor: colors.surfaceSunken,
    borderWidth: 1, borderColor: colors.borderStrong, borderRadius: radius.sm,
    paddingHorizontal: 12, height: 44,
  },
  searchInput: { flex: 1, fontSize: 15, color: colors.textStrong },

  list: { paddingHorizontal: 8 },
  option: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 14, paddingHorizontal: 12,
    borderRadius: radius.sm, marginVertical: 1,
  },
  optionSelected: { backgroundColor: colors.primarySoftAlt },
  optLabel: { flex: 1, fontSize: 15, color: colors.textSecondary, fontWeight: '500' },
  optLabelSelected: { color: colors.primary, fontWeight: '700' },
  emptyText: { textAlign: 'center', color: colors.textFaint, marginTop: 32, fontSize: 14 },
});
