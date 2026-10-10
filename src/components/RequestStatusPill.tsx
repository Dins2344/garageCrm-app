import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { requestStatusLabel } from '../utils/changeRequests';
import { colors, radius, spacing, type } from '../theme';

const TONES: Record<string, { fg: string; bg: string }> = {
  pending: { fg: colors.warning, bg: colors.warningSoft },
  approved: { fg: colors.success, bg: colors.successSoft },
  rejected: { fg: colors.danger, bg: colors.dangerSoft },
  withdrawn: { fg: colors.textMuted, bg: colors.surfaceMuted },
};

/** The list and the detail screen show a request's status the same way. */
export default function RequestStatusPill({ status }: { status: string }) {
  const tone = TONES[status] ?? TONES.withdrawn;
  return (
    <View style={[s.pill, { backgroundColor: tone.bg }]}>
      <Text style={[s.text, { color: tone.fg }]}>{requestStatusLabel(status)}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  pill: { alignSelf: 'flex-start', paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.sm },
  text: { fontSize: type.small, fontWeight: '700' },
});
