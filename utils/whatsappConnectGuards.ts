import { showAlert, showAlertButtons } from '@/utils/platformAlert';
import type { CanalSlug } from '@/services/omnichannelService';

export type WhatsAppConnectErrorCode =
  | 'facebook_sin_negocio'
  | 'sin_whatsapp_business'
  | 'sin_numero_whatsapp'
  | 'sin_permisos_admin'
  | 'codigo_expirado'
  | 'cancelado'
  | 'generico';

export const WHATSAPP_CONNECT_PRECHECK_TITLE = 'Antes de conectar WhatsApp';

export const WHATSAPP_CONNECT_PRECHECK_BODY = [
  'No todos los números sirven: WhatsApp personal no se puede conectar.',
  '',
  'Confirma esto antes de iniciar sesión en Facebook:',
  '• Entras con el Facebook administrador del taller (Meta Business Suite), no un Facebook personal.',
  '• El número es WhatsApp Business, vinculado a ese Facebook.',
].join('\n');

const ERROR_TITLES: Record<WhatsAppConnectErrorCode, string> = {
  facebook_sin_negocio: 'Facebook incorrecto',
  sin_whatsapp_business: 'Falta WhatsApp Business',
  sin_numero_whatsapp: 'Sin número de WhatsApp Business',
  sin_permisos_admin: 'Sin permiso de administrador',
  codigo_expirado: 'La autorización expiró',
  cancelado: 'Conexión cancelada',
  generico: 'No se pudo conectar WhatsApp',
};

const ERROR_FALLBACK: Record<WhatsAppConnectErrorCode, string> = {
  facebook_sin_negocio:
    'La cuenta de Facebook con la que entraste no administra un negocio en Meta. Usa el Facebook dueño del taller, no un Facebook personal.',
  sin_whatsapp_business:
    'Este Facebook no tiene un WhatsApp Business asociado. Un número de WhatsApp personal no se puede conectar.',
  sin_numero_whatsapp:
    'Encontramos una cuenta WhatsApp Business, pero no un número listo para conectar.',
  sin_permisos_admin:
    'Tu usuario de Facebook no es administrador de WhatsApp Business del taller.',
  codigo_expirado: 'La autorización expiró o ya fue usada. Pulsa Conectar otra vez.',
  cancelado: 'Cancelaste la conexión. Cuando quieras, pulsa Conectar de nuevo.',
  generico: 'No pudimos vincular tu WhatsApp. Pulsa Conectar e intenta de nuevo.',
};

export function inferWhatsAppErrorCode(message?: string | null): WhatsAppConnectErrorCode | null {
  const raw = (message || '').toLowerCase();
  if (!raw) return null;
  if (raw.includes('facebook personal') || raw.includes('no administra un negocio')) {
    return 'facebook_sin_negocio';
  }
  if (raw.includes('whatsapp personal') || raw.includes('no tiene un whatsapp business')) {
    return 'sin_whatsapp_business';
  }
  if (raw.includes('número listo') || raw.includes('numero listo')) {
    return 'sin_numero_whatsapp';
  }
  if (raw.includes('no es administrador') || raw.includes('permiso de administrador')) {
    return 'sin_permisos_admin';
  }
  if (raw.includes('expiró') || raw.includes('expiro') || raw.includes('ya fue usada')) {
    return 'codigo_expirado';
  }
  return null;
}

export function whatsappConnectAlert(
  errorCode?: string | null,
  message?: string | null,
  instruction?: string | null,
): { title: string; body: string } {
  const inferred = inferWhatsAppErrorCode(message);
  const code = (
    errorCode && errorCode in ERROR_TITLES
      ? errorCode
      : inferred || 'generico'
  ) as WhatsAppConnectErrorCode;
  const title = ERROR_TITLES[code];
  const body = [message || ERROR_FALLBACK[code], instruction].filter(Boolean).join('\n\n');
  return { title, body };
}

export function extraerErrorWhatsAppDeApi(error: unknown): {
  error_code?: string;
  message?: string;
  instruction?: string;
} {
  if (!error || typeof error !== 'object') return {};
  const data = (error as { response?: { data?: Record<string, unknown> } }).response?.data;
  if (!data || typeof data !== 'object') return {};
  return {
    error_code: typeof data.error_code === 'string' ? data.error_code : undefined,
    message: typeof data.message === 'string'
      ? data.message
      : typeof data.error === 'string'
        ? data.error
        : undefined,
    instruction: typeof data.instruction === 'string' ? data.instruction : undefined,
  };
}

export function showWhatsAppConnectAlert(
  errorCode?: string | null,
  message?: string | null,
  instruction?: string | null,
) {
  const ui = whatsappConnectAlert(errorCode, message, instruction);
  showAlert(ui.title, ui.body);
}

export function confirmWhatsAppConnectGuards(): Promise<boolean> {
  return new Promise((resolve) => {
    showAlertButtons(WHATSAPP_CONNECT_PRECHECK_TITLE, WHATSAPP_CONNECT_PRECHECK_BODY, [
      { text: 'Cancelar', style: 'cancel', onPress: () => resolve(false) },
      { text: 'Continuar', onPress: () => resolve(true) },
    ]);
  });
}

export async function confirmChannelConnectGuards(slug: CanalSlug): Promise<boolean> {
  if (slug !== 'whatsapp') return true;
  return confirmWhatsAppConnectGuards();
}
