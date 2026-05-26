import { Platform } from 'react-native';

/** Web y fallback: push nativo no aplica. */
export function PushNotificationSetup() {
  if (Platform.OS === 'web') return null;
  return null;
}
