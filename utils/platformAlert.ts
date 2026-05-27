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

type ShowConfirmOptions = {
  onConfirm?: () => void | Promise<void>;
  onCancel?: () => void;
  confirmText?: string;
};

/**
 * Diálogo con Cancelar + acción principal.
 * En web usa window.confirm (Alert.alert no ejecuta onPress en navegador).
 */
export function showConfirm(
  title: string,
  message: string,
  { onConfirm, onCancel, confirmText = 'Aceptar' }: ShowConfirmOptions = {},
) {
  const t = title ?? '';
  const m = message ?? '';
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const text = m ? `${t}\n\n${m}` : t;
    if (window.confirm(text)) {
      Promise.resolve(onConfirm?.()).catch((e) => {
        if (__DEV__) console.error(e);
      });
    } else {
      onCancel?.();
    }
    return;
  }
  Alert.alert(t, m, [
    { text: 'Cancelar', style: 'cancel', onPress: onCancel },
    {
      text: confirmText,
      style: 'destructive',
      onPress: () =>
        Promise.resolve(onConfirm?.()).catch((e) => {
          if (__DEV__) console.error(e);
        }),
    },
  ]);
}
