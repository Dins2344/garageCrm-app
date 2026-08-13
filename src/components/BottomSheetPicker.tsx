import React, { useState, ComponentProps } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, TextInput,
  KeyboardAvoidingView, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SHEET_MAX_WIDTH } from './ResponsiveScreen';

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
          <View style={[styles.optIcon, { backgroundColor: (selected.color || '#3b5ff8') + '18' }]}>
            <Ionicons name={selected.icon} size={16} color={selected.color || '#3b5ff8'} />
          </View>
        ) : null}

        {selected?.color && !selected.icon ? (
          <View style={[styles.dot, { backgroundColor: selected.color }]} />
        ) : null}

        <Text style={[styles.triggerText, !selected && styles.placeholder]} numberOfLines={1}>
          {selected ? selected.label : placeholder}
        </Text>

        <Ionicons name="chevron-down" size={18} color="#9ca3af" />
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="slide" onRequestClose={() => setVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.overlay}>
          <TouchableOpacity style={StyleSheet.absoluteFillObject} activeOpacity={1} onPress={() => setVisible(false)} />
          <TouchableOpacity activeOpacity={1} style={styles.sheet} onPress={e => e.stopPropagation()}>
            <View style={styles.handle} />

            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{label || 'Select Option'}</Text>
              <TouchableOpacity onPress={() => { setVisible(false); setQuery(''); }}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            {searchable ? (
              <View style={styles.searchRow}>
                <Ionicons name="search" size={16} color="#9ca3af" />
                <TextInput
                  style={styles.searchInput}
                  value={query}
                  onChangeText={setQuery}
                  placeholder="Search..."
                  placeholderTextColor="#9ca3af"
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
                      <View style={[styles.optIcon, { backgroundColor: (opt.color || '#3b5ff8') + '18' }]}>
                        <Ionicons name={opt.icon} size={16} color={opt.color || '#3b5ff8'} />
                      </View>
                    ) : opt.color ? (
                      <View style={[styles.dot, { backgroundColor: opt.color }]} />
                    ) : null}

                    <Text style={[styles.optLabel, isSelected && styles.optLabelSelected]}>
                      {opt.label}
                    </Text>

                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={20} color="#3b5ff8" />
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
  label: { fontSize: 13, fontWeight: '600', color: '#374151', marginBottom: 6 },

  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    paddingHorizontal: 14,
    height: 48,
    gap: 10,
  },
  triggerDisabled: { opacity: 0.5 },
  triggerText: { flex: 1, fontSize: 15, color: '#1f2937', fontWeight: '500' },
  placeholder: { color: '#9ca3af', fontWeight: '400' },

  dot: { width: 10, height: 10, borderRadius: 5 },
  optIcon: { width: 30, height: 30, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },

  // Sheet
  overlay: { flex: 1, justifyContent: 'flex-end', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '65%',
    minHeight: 200,
    width: '100%',
    maxWidth: SHEET_MAX_WIDTH,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: '#e5e7eb', alignSelf: 'center', marginTop: 12,
  },
  sheetHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 20, borderBottomWidth: 1, borderBottomColor: '#f3f4f6',
  },
  sheetTitle: { fontSize: 17, fontWeight: 'bold', color: '#111827' },

  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    margin: 16, backgroundColor: '#f9fafb',
    borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 10,
    paddingHorizontal: 12, height: 44,
  },
  searchInput: { flex: 1, fontSize: 15, color: '#1f2937' },

  list: { paddingHorizontal: 8 },
  option: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 14, paddingHorizontal: 12,
    borderRadius: 10, marginVertical: 1,
  },
  optionSelected: { backgroundColor: '#eef2ff' },
  optLabel: { flex: 1, fontSize: 15, color: '#374151', fontWeight: '500' },
  optLabelSelected: { color: '#3b5ff8', fontWeight: '700' },
  emptyText: { textAlign: 'center', color: '#9ca3af', marginTop: 32, fontSize: 14 },
});
