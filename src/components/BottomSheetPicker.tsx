import React, { useState, ComponentProps } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, TextInput,
  KeyboardAvoidingView, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SHEET_MAX_WIDTH } from './ResponsiveScreen';
import { colors, radius } from '../theme';

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
  const [visible, setVisible] = useState(false);
  const [query, setQuery] = useState('');

  const selected = options.find(o => o.value === selectedValue);

  const filtered = searchable && query
    ? options.filter(o => o.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  const handleSelect = (val: string) => {
    onValueChange(val);
    setVisible(false);
    setQuery('');
  };

  return (
    <View style={styles.wrapper}>
      {label ? (
        <Text style={styles.label}>{label}{required ? ' *' : ''}</Text>
      ) : null}

      <TouchableOpacity
        style={[styles.trigger, disabled && styles.triggerDisabled]}
        onPress={() => !disabled && setVisible(true)}
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

      <Modal visible={visible} transparent animationType="slide" onRequestClose={() => setVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.overlay}>
          <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={() => setVisible(false)} />
          <TouchableOpacity activeOpacity={1} style={styles.sheet} onPress={e => e.stopPropagation()}>
            <View style={styles.handle} />

            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{label || 'Select Option'}</Text>
              <TouchableOpacity onPress={() => { setVisible(false); setQuery(''); }}>
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
          </TouchableOpacity>
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
  overlay: { flex: 1, justifyContent: 'flex-end', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '65%',
    minHeight: 200,
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
