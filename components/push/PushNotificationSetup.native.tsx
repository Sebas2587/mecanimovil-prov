import React, { useEffect } from 'react';
import Constants from 'expo-constants';
import NotificationService from '@/services/push/notificationService';

const IS_EXPO_GO = Constants.appOwnership === 'expo';

/**
 * Metro usa este archivo en iOS/Android en lugar de PushNotificationSetup.tsx.
 * Debe exportar `PushNotificationSetup` (no solo el listener interno).
 */
export function PushNotificationSetup() {
  useEffect(() => {
    if (IS_EXPO_GO) return;
    void NotificationService.ensureInitialized();
  }, []);

  if (IS_EXPO_GO) return null;
  const { PushNotificationListeners } =
    require('./pushNotificationListeners') as typeof import('./pushNotificationListeners.native');
  return <PushNotificationListeners />;
}
