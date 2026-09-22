import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../theme';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAYS   = ['Su','Mo','Tu','We','Th','Fr','Sa'];

export interface CalendarModalProps {
  visible: boolean;
  selected: Date | null;
  onSelect: (d: Date) => void;
  onClose: () => void;
  /**
   * Which side of today is greyed out. A delivery date cannot be in the
   * past; an expense date cannot be in the future. Defaults to none.
   */
  disable?: 'past' | 'future' | 'none';
}

/**
 * Pure-JS month calendar in a modal. No native module, so it runs in Expo
 * Go and needs no rebuild; one component so every date in the app is picked
 * the same way.
 */
export default function CalendarModal({ visible, selected, onSelect, onClose, disable = 'none' }: CalendarModalProps) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const initial = selected || today;
  const [viewYear,  setViewYear]  = useState(initial.getFullYear());
  const [viewMonth, setViewMonth] = useState(initial.getMonth());

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  // Build calendar grid
  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  // Pad to full rows
  while (cells.length % 7 !== 0) cells.push(null);

  const isSelected = (d: number | null) => {
    if (!d || !selected) return false;
    return selected.getDate() === d && selected.getMonth() === viewMonth && selected.getFullYear() === viewYear;
  };
  const isDisabled = (d: number | null) => {
    if (!d) return false;
    const dt = new Date(viewYear, viewMonth, d);
    if (disable === 'past') return dt < today;
    if (disable === 'future') return dt > today;
    return false;
  };

  const rows: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={cal.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity style={cal.card} activeOpacity={1}>
          {/* Header */}
          <View style={cal.header}>
            <TouchableOpacity onPress={prevMonth} style={cal.navBtn}>
              <Ionicons name="chevron-back" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
            <Text style={cal.monthTitle}>{MONTHS[viewMonth]} {viewYear}</Text>
            <TouchableOpacity onPress={nextMonth} style={cal.navBtn}>
              <Ionicons name="chevron-forward" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
          {/* Day labels */}
          <View style={cal.dayRow}>
            {DAYS.map(d => <Text key={d} style={cal.dayLabel}>{d}</Text>)}
          </View>
          {/* Weeks */}
          {rows.map((row, ri) => (
            <View key={ri} style={cal.dayRow}>
              {row.map((d, ci) => {
                const sel  = isSelected(d);
                const past = isDisabled(d);
                return (
                  <TouchableOpacity
                    key={ci}
                    style={[cal.cell, sel && cal.cellSelected, (!d || past) && cal.cellDisabled]}
                    onPress={() => {
                      if (!d || past) return;
                      onSelect(new Date(viewYear, viewMonth, d));
                    }}
                    disabled={!d || past}
                  >
                    <Text style={[cal.cellText, sel && cal.cellTextSelected, past && cal.cellTextDisabled]}>
                      {d || ''}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
          {/* Actions */}
          <View style={cal.footer}>
            <TouchableOpacity onPress={onClose} style={cal.cancelBtn}>
              <Text style={cal.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const cal = StyleSheet.create({
  overlay:        { flex: 1, backgroundColor: colors.scrim, justifyContent: 'center', alignItems: 'center' },
  card:           { backgroundColor: colors.surface, borderRadius: radius.xl, padding: 20, width: 320, shadowColor: colors.shadowAmbient, shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 4 },
  header:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  navBtn:         { padding: 6 },
  monthTitle:     { fontSize: 16, fontWeight: '700', color: colors.textPrimary },
  dayRow:         { flexDirection: 'row', marginBottom: 4 },
  dayLabel:       { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '700', color: colors.textFaint, paddingVertical: 4 },
  cell:           { flex: 1, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: radius.lg, margin: 1 },
  cellSelected:   { backgroundColor: colors.primary },
  cellDisabled:   { opacity: 0.3 },
  cellText:       { fontSize: 14, color: colors.textPrimary, fontWeight: '500' },
  cellTextSelected: { color: colors.textOnPrimary, fontWeight: '700' },
  cellTextDisabled:   { color: colors.textFaint },
  footer:         { marginTop: 12, alignItems: 'flex-end' },
  cancelBtn:      { paddingHorizontal: 16, paddingVertical: 8 },
  cancelText:     { fontSize: 14, color: colors.textMuted, fontWeight: '600' },
});
