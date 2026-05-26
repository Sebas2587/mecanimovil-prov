import Constants from 'expo-constants';

const IS_EXPO_GO = Constants.appOwnership === 'expo';

/**
 * Metro usa este archivo en iOS/Android en lugar de PushNotificationSetup.tsx.
 * Debe exportar `PushNotificationSetup` (no solo el listener interno).
 */
export function PushNotificationSetup() {
  if (IS_EXPO_GO) return null;
  const { PushNotificationListeners } =
    require('./pushNotificationListeners') as typeof import('./pushNotificationListeners.native');
  return <PushNotificationListeners />;
}
