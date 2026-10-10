import React, { useEffect } from 'react';
import { Text, StyleSheet } from 'react-native';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Toast from 'react-native-toast-message';
import BottomSheet, { SheetActions } from './BottomSheet';
import { ControlledField } from './FormControls';
import { requestReasonSchema, type RequestReasonFormValues } from '../utils/validation';
import { getErrorMessage } from '../utils/errors';
import { colors, spacing, type } from '../theme';

interface RequestReasonSheetProps {
  visible: boolean;
  title: string;
  /** What will happen, in a sentence, so staff know someone else decides. */
  description: string;
  onClose: () => void;
  /** Throws to keep the sheet open; the server's message is toasted. */
  onSubmit: (reason: string) => Promise<void>;
  testID?: string;
}

export default function RequestReasonSheet({ visible, title, description, onClose, onSubmit, testID = 'request-reason' }: RequestReasonSheetProps) {
  const { control, handleSubmit, reset, formState: { isSubmitting } } = useForm<RequestReasonFormValues>({
    resolver: zodResolver(requestReasonSchema),
    defaultValues: { reason: '' },
  });

  useEffect(() => {
    if (visible) reset({ reason: '' });
  }, [visible, reset]);

  const submit = async ({ reason }: RequestReasonFormValues) => {
    try {
      await onSubmit(reason);
      onClose();
    } catch (e) {
      Toast.show({ type: 'error', text1: getErrorMessage(e, 'Failed to send request') });
    }
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={title}
      testID={testID}
      footer={
        <SheetActions onCancel={onClose} onConfirm={handleSubmit(submit)} confirmLabel="Send Request" loading={isSubmitting} testID={`${testID}-send`} />
      }
    >
      <Text style={s.description}>{description}</Text>
      <ControlledField control={control} name="reason" label="Reason" placeholder="Why it should be cancelled" required testID={`${testID}-input`} />
    </BottomSheet>
  );
}

const s = StyleSheet.create({
  description: { fontSize: type.body, color: colors.textSecondary, marginBottom: spacing.md },
});
