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
let queuedWebRequest: PlatformAlertRequest | null = null;

export function registerPlatformAlertHost(setter: HostSetter): () => void {
  alertHost = setter;
  if (queuedWebRequest) {
    const next = queuedWebRequest;
    queuedWebRequest = null;
    setter(next);
  }
  return () => {
    if (alertHost === setter) alertHost = null;
  };
}

function emitHost(request: PlatformAlertRequest): boolean {
  if (alertHost) {
    alertHost(request);
    return true;
  }
  // Safari: window.alert/confirm throws `Can't find variable: EmptyRanges`.
  if (Platform.OS === 'web') {
    queuedWebRequest = request;
    return true;
  }
  return false;
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

  if (emitHost({ kind: 'buttons', title, message, buttons: list })) {
    return;
  }

  Alert.alert(title, message, list);
}
