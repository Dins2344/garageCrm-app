import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import Toast from 'react-native-toast-message';
import { removeSampleData } from '../api/garageService';
import { getErrorMessage } from '../utils/errors';

/**
 * Confirm-then-clear for the seeded demo rows.
 *
 * A hook rather than logic inside `SampleDataBanner`, because two places offer
 * this action — the banner on Home and the row in Settings — and the confirm
 * wording is the part that must not drift between them. It is the only place
 * that promises "anything you have added yourself is kept", and that promise
 * has to match what the server actually does.
 */
export function useRemoveSampleData(onRemoved: () => void) {
  const [removing, setRemoving] = useState(false);

  const doRemove = useCallback(async () => {
    setRemoving(true);
    try {
      await removeSampleData();
      Toast.show({ type: 'success', text1: 'Sample data removed' });
      onRemoved();
    } catch (error) {
      // A server answer, not a field error — a toast is the right shape here.
      Toast.show({
        type: 'error',
        text1: 'Could not remove sample data',
        text2: getErrorMessage(error, 'Please try again.')
      });
    } finally {
      setRemoving(false);
    }
  }, [onRemoved]);

  const confirmAndRemove = useCallback(() => {
    Alert.alert(
      'Remove sample data?',
      'This deletes the example customers, vehicles, job cards and invoice that came with your garage. Anything you have added yourself is kept.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: doRemove }
      ]
    );
  }, [doRemove]);

  return { removing, confirmAndRemove };
}
