import { Platform, Alert } from 'react-native';

/** Alert compatible con web (window.alert) y nativo. */
export function showAlert(title: string, message = '') {
  const t = title ?? '';
  const m = message ?? '';
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    window.alert(m ? `${t}\n\n${m}` : t);
    return;
  }
  Alert.alert(t, m);
}
