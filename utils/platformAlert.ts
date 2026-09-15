import { Platform, Alert } from 'react-native';

export type PlatformAlertButton = {
  text: string;
  style?: 'default' | 'cancel' | 'destructive';
  onPress?: () => void;
};

export type PlatformAlertRequest =
  | {
      kind: 'alert';
      title: string;
      message: string;
      onDismiss?: () => void;
    }
  | {
      kind: 'confirm';
      title: string;
      message: string;
      confirmText?: string;
      cancelText?: string;
      onConfirm?: () => void | Promise<void>;
      onCancel?: () => void;
    }
  | {
      kind: 'buttons';
      title: string;
      message: string;
      buttons: PlatformAlertButton[];
      buttonIndex?: number;
    };

type HostSetter = (request: PlatformAlertRequest | null) => void;

let alertHost: HostSetter | null = null;

export function registerPlatformAlertHost(setter: HostSetter): () => void {
  alertHost = setter;
  return () => {
    if (alertHost === setter) alertHost = null;
  };
}

function emitHost(request: PlatformAlertRequest): boolean {
  if (!alertHost) return false;
  alertHost(request);
  return true;
}

function emitWeb(request: PlatformAlertRequest): boolean {
  if (Platform.OS !== 'web') return false;
  return emitHost(request);
}

/** Alert compatible con web (modal institucional) y nativo. */
export function showAlert(title: string, message = '') {
  const t = title ?? '';
  const m = message ?? '';
  if (emitWeb({ kind: 'alert', title: t, message: m })) return;
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
  cancelText?: string;
};

/**
 * Diálogo con Cancelar + acción principal.
 * En web usa modal institucional (Alert.alert no ejecuta onPress en navegador).
 */
export function showConfirm(
  title: string,
  message: string,
  {
    onConfirm,
    onCancel,
    confirmText = 'Aceptar',
    cancelText = 'Cancelar',
  }: ShowConfirmOptions = {},
) {
  const t = title ?? '';
  const m = message ?? '';
  if (
    emitWeb({
      kind: 'confirm',
      title: t,
      message: m,
      confirmText,
      cancelText,
      onConfirm,
      onCancel,
    })
  ) {
    return;
  }
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
    { text: cancelText, style: 'cancel', onPress: onCancel },
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

export type AlertButton = PlatformAlertButton;

/**
 * Alert con varios botones. Usa el modal institucional en web, iOS y Android.
 */
export function showAlertButtons(
  title: string,
  message: string,
  buttons: AlertButton[] = [{ text: 'OK' }],
) {
  const list = Array.isArray(buttons) ? buttons : [{ text: 'OK' }];
  const cancelBtn = list.find((b) => b.style === 'cancel');
  const actionBtns = list.filter((b) => b.style !== 'cancel');

  if (emitHost({ kind: 'buttons', title, message, buttons: list })) {
    return;
  }

  if (Platform.OS === 'web') {
    if (actionBtns.length === 1 && !cancelBtn) {
      if (typeof window !== 'undefined') {
        window.alert([title, message].filter(Boolean).join('\n\n'));
        actionBtns[0].onPress?.();
      }
      return;
    }
    if (actionBtns.length >= 1) {
      const text = [title, message].filter(Boolean).join('\n\n');
      if (typeof window !== 'undefined' && window.confirm(text)) {
        actionBtns[0].onPress?.();
      } else {
        cancelBtn?.onPress?.();
      }
      return;
    }
  }

  Alert.alert(title, message, list);
}
