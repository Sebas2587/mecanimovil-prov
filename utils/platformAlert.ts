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

export type AlertButton = {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
};

/**
 * Alert con varios botones. En web: confirm para cancel+1 acción;
 * un solo botón OK ejecuta onPress tras el alert.
 */
export function showAlertButtons(
  title: string,
  message: string,
  buttons: AlertButton[] = [{ text: 'OK' }],
) {
  const list = Array.isArray(buttons) ? buttons : [{ text: 'OK' }];
  const cancelBtn = list.find((b) => b.style === 'cancel');
  const actionBtns = list.filter((b) => b.style !== 'cancel');

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    if (actionBtns.length === 1 && (cancelBtn || list.length === 2)) {
      const text = [title, message].filter(Boolean).join('\n\n');
      if (window.confirm(text)) {
        actionBtns[0].onPress?.();
      } else {
        cancelBtn?.onPress?.();
      }
      return;
    }
    if (actionBtns.length === 0) {
      showAlert(title, message);
      list[0]?.onPress?.();
      return;
    }
    showAlert(title, message);
    actionBtns[actionBtns.length - 1].onPress?.();
    return;
  }

  Alert.alert(title, message, list);
}
