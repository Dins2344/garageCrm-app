import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import BottomSheet from './BottomSheet';
import { Field, PrimaryBtn } from './FormControls';
import { sendVerificationCode, confirmVerificationCode } from '../api/authService';
import { getErrorMessage } from '../utils/errors';
import type { VerificationChannel, VerificationSendResult } from '../types/models';
import { colors } from '../theme';

interface VerifyCodeSheetProps {
  /** `null` keeps the sheet closed. */
  channel: VerificationChannel | null;
  onClose: () => void;
  /** Called once the server has confirmed; the caller refreshes the user. */
  onVerified: (channel: VerificationChannel) => void;
}

const CHANNEL_LABEL: Record<VerificationChannel, string> = { email: 'email', phone: 'phone number' };

/**
 * The code-entry step of owner verification. Sends the code the moment it
 * opens — the owner asked to verify, there is nothing to confirm first — and
 * keeps a resend countdown that mirrors the server's cooldown so the button
 * never offers something the API would refuse.
 */
export default function VerifyCodeSheet({ channel, onClose, onVerified }: VerifyCodeSheetProps) {
  // The title must survive the closing animation, so the last channel is kept
  // after the caller clears it.
  const [shownChannel, setShownChannel] = useState<VerificationChannel | null>(channel);
  const [sent, setSent] = useState<VerificationSendResult | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [secondsUntilResend, setSecondsUntilResend] = useState(0);

  const send = async (target: VerificationChannel) => {
    setSendError(null);
    setError(null);
    try {
      const res = await sendVerificationCode(target);
      setSent(res.data);
      if (res.data.status === 'already-verified') {
        onVerified(target);
        return;
      }
      setSecondsUntilResend(res.data.resendAfterSeconds);
    } catch (e) {
      setSendError(getErrorMessage(e, 'Could not send the code. Please try again.'));
    }
  };

  // Reset and send whenever a channel is chosen.
  useEffect(() => {
    if (!channel) return;
    setShownChannel(channel);
    setSent(null);
    setCode('');
    setError(null);
    setSecondsUntilResend(0);
    void send(channel);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel]);

  useEffect(() => {
    if (secondsUntilResend <= 0) return;
    const id = setTimeout(() => setSecondsUntilResend(s => s - 1), 1000);
    return () => clearTimeout(id);
  }, [secondsUntilResend]);

  const handleConfirm = async () => {
    if (!channel || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await confirmVerificationCode(channel, code.trim());
      onVerified(channel);
    } catch (e) {
      setError(getErrorMessage(e, 'Could not verify the code. Please try again.'));
    } finally {
      setSubmitting(false);
    }
  };

  const label = shownChannel ? CHANNEL_LABEL[shownChannel] : '';

  return (
    <BottomSheet
      visible={channel !== null}
      onClose={onClose}
      title={`Verify your ${label}`}
      scroll={false}
      bodyStyle={styles.body}
      testID="verify-code-sheet"
    >
      {sendError ? (
        <Text style={styles.errorText} accessibilityRole="alert">{sendError}</Text>
      ) : sent ? (
        <Text style={styles.hint}>
          We sent a 6-digit code to <Text style={styles.hintStrong}>{sent.target}</Text>.
          {' '}It expires in {Math.round(sent.expiresInSeconds / 60)} minutes.
        </Text>
      ) : (
        <Text style={styles.hint}>Sending your code...</Text>
      )}

      <Field
        label="Verification code"
        value={code}
        onChangeText={v => setCode(v.replace(/\D/g, '').slice(0, 6))}
        placeholder="123456"
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        maxLength={6}
        editable={!!sent}
        autoFocus
        error={error ?? undefined}
        testID="verification-code"
      />

      <View style={styles.resendRow}>
        {secondsUntilResend > 0 ? (
          <Text style={styles.resendMuted}>Resend available in {secondsUntilResend}s</Text>
        ) : (
          <TouchableOpacity
            onPress={() => channel && send(channel)}
            disabled={!sent && !sendError}
            testID="verification-resend"
          >
            <Text style={styles.resendLink}>{sendError ? 'Try sending again' : 'Resend code'}</Text>
          </TouchableOpacity>
        )}
      </View>

      {sent && code.length === 6 ? (
        <View testID="verification-confirm">
          <PrimaryBtn label="Verify" icon="shield-checkmark-outline" onPress={handleConfirm} loading={submitting} />
        </View>
      ) : null}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  body: { padding: 20, paddingBottom: 32 },
  hint: { fontSize: 14, color: colors.textSecondary, lineHeight: 20, marginBottom: 16 },
  hintStrong: { fontWeight: '700', color: colors.textPrimary },
  errorText: { fontSize: 14, color: colors.danger, marginBottom: 16 },
  resendRow: { marginBottom: 8, minHeight: 20 },
  resendMuted: { fontSize: 13, color: colors.textFaint },
  resendLink: { fontSize: 13, fontWeight: '600', color: colors.primary }
});
