import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Toast from 'react-native-toast-message';
import { useAuth } from '../context/AuthContext';
import ResponsiveScreen from '../components/ResponsiveScreen';
import VerifyCodeSheet from '../components/VerifyCodeSheet';
import type { RootStackScreenProps } from '../types/navigation';
import type { VerificationChannel } from '../types/models';
import { colors, palette, radius } from '../theme';

type Props = RootStackScreenProps<'ContactVerification'>;

/**
 * Owner-only: confirm the email and phone on the account by entering a code
 * sent to each. Reached from the Verification tile on Settings — the tile is
 * all Settings holds; the feature lives here (see mobile/CLAUDE.md, "Settings
 * is a directory").
 *
 * Everything shown is driven by `user.emailVerifiedAt` / `phoneVerifiedAt`
 * from AuthContext; the flags are the server's, never set locally.
 */
export default function ContactVerificationScreen(_props: Props) {
  const { user, refreshUser } = useAuth();
  const [verifying, setVerifying] = useState<VerificationChannel | null>(null);

  return (
    <ResponsiveScreen>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.intro}>
          A verified email and phone number will be required to upgrade your subscription.
          We send a 6-digit code to each; enter it here to confirm it is yours.
        </Text>

        <View style={styles.card}>
          <VerificationRow
            icon="mail-outline"
            label="Email"
            value={user?.email || ''}
            verifiedAt={user?.emailVerifiedAt}
            onVerify={() => setVerifying('email')}
          />
          <VerificationRow
            icon="call-outline"
            label="Phone"
            value={user?.phone || ''}
            verifiedAt={user?.phoneVerifiedAt}
            onVerify={() => setVerifying('phone')}
            last
          />
        </View>

        <Text style={styles.footnote}>
          Changed your phone number? Update it in Edit Profile first — a new number needs its own code.
        </Text>
      </ScrollView>

      <VerifyCodeSheet
        channel={verifying}
        onClose={() => setVerifying(null)}
        onVerified={async (channel) => {
          setVerifying(null);
          await refreshUser();
          Toast.show({ type: 'success', text1: `Your ${channel === 'email' ? 'email' : 'phone number'} is verified` });
        }}
      />
    </ResponsiveScreen>
  );
}

/** One channel: the address, its state, and the action. */
function VerificationRow({ icon, label, value, verifiedAt, onVerify, last }: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: string;
  verifiedAt?: string | null;
  onVerify: () => void;
  last?: boolean;
}) {
  const verified = !!verifiedAt;
  return (
    <View style={[styles.row, last && { borderBottomWidth: 0 }]}>
      <View style={styles.rowIcon}><Ionicons name={icon} size={18} color={colors.textMuted} /></View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue} numberOfLines={1}>{value || '—'}</Text>
      </View>
      <View style={[styles.badge, verified ? styles.badgeOk : styles.badgePending]}>
        <Text style={[styles.badgeText, verified ? styles.badgeTextOk : styles.badgeTextPending]}>
          {verified ? 'Verified' : 'Not verified'}
        </Text>
      </View>
      {!verified && (
        <TouchableOpacity
          style={styles.verifyBtn}
          onPress={onVerify}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel={`Verify ${label.toLowerCase()}`}
          testID={`verify-${label.toLowerCase()}`}
        >
          <Text style={styles.verifyBtnText}>Verify</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 16 },
  intro: { fontSize: 14, color: colors.textSecondary, lineHeight: 20, marginBottom: 16 },
  card: {
    backgroundColor: colors.surface, borderRadius: radius.lg, paddingHorizontal: 16,
    shadowColor: colors.shadowAmbient, shadowOpacity: 0.08, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 4
  },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.surfaceMuted
  },
  rowIcon: { width: 36, height: 36, borderRadius: radius.lg, backgroundColor: colors.surfaceMuted, justifyContent: 'center', alignItems: 'center' },
  rowLabel: { fontSize: 12, color: colors.textMuted },
  rowValue: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.xs, borderWidth: 1 },
  badgeOk: { backgroundColor: colors.successSoft, borderColor: colors.success },
  badgePending: { backgroundColor: colors.warningSoft, borderColor: colors.warning },
  badgeText: { fontSize: 11, fontWeight: '700' },
  badgeTextOk: { color: palette.emerald700 },
  badgeTextPending: { color: palette.amber800 },
  verifyBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: radius.md, borderWidth: 1, borderColor: colors.borderStrong },
  verifyBtnText: { fontSize: 13, fontWeight: '700', color: colors.textPrimary },
  footnote: { fontSize: 12, color: colors.textFaint, lineHeight: 18, marginTop: 16 }
});
