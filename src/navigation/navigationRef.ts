import { createNavigationContainerRef } from '@react-navigation/native';
import type { RootStackParamList } from '../types/navigation';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

let pendingRequestId: string | null = null;

/** Opens a change request now, or as soon as the navigator is ready (a cold start from a tapped push). */
export const openChangeRequest = (id: string): void => {
  if (navigationRef.isReady()) navigationRef.navigate('ChangeRequestDetail', { id });
  else pendingRequestId = id;
};

/** NavigationContainer's onReady. */
export const flushPendingNavigation = (): void => {
  if (!pendingRequestId || !navigationRef.isReady()) return;
  const id = pendingRequestId;
  pendingRequestId = null;
  navigationRef.navigate('ChangeRequestDetail', { id });
};
