export const WHATSAPP_REPLY_WINDOW_MS = 24 * 60 * 60 * 1000;

export const WHATSAPP_WINDOW_CLOSED_MESSAGE =
  'Ventana de 24 h cerrada. WhatsApp no permite escribir en el chat. Envía la cotización: el cliente abre un link.';

export const WHATSAPP_NO_INBOUND_MESSAGE =
  'El cliente aún no ha escrito por WhatsApp. Envía la cotización con un link.';

export const MESSENGER_WINDOW_CLOSED_MESSAGE =
  'Ventana de 24 h cerrada. Messenger no permite escribir en el chat. Envía la cotización con un link.';

export const MESSENGER_NO_INBOUND_MESSAGE =
  'El cliente aún no ha escrito por Messenger. Envía la cotización con un link.';

export const INSTAGRAM_WINDOW_CLOSED_MESSAGE =
  'Ventana de 24 h cerrada. Instagram no permite escribir en el chat. Envía la cotización con un link.';

export const INSTAGRAM_NO_INBOUND_MESSAGE =
  'El cliente aún no ha escrito por Instagram. Envía la cotización con un link.';

type ReplyWindowMessage = {
  es_proveedor: boolean;
  fecha_envio: string;
};

const META_CHANNELS = new Set(['whatsapp', 'instagram', 'messenger']);

export function getLastInboundTimestamp(
  messages: ReplyWindowMessage[],
): number | null {
  let lastInbound: number | null = null;
  for (const msg of messages) {
    if (msg.es_proveedor) continue;
    const ts = new Date(msg.fecha_envio).getTime();
    if (Number.isNaN(ts)) continue;
    if (lastInbound === null || ts > lastInbound) {
      lastInbound = ts;
    }
  }
  return lastInbound;
}

export function isWhatsAppReplyWindowOpen(
  messages: ReplyWindowMessage[],
  now = Date.now(),
): boolean {
  const lastInbound = getLastInboundTimestamp(messages);
  if (lastInbound === null) return false;
  return now - lastInbound < WHATSAPP_REPLY_WINDOW_MS;
}

function copyForClosedWindow(channel: string, hasInbound: boolean): string {
  if (channel === 'messenger') {
    return hasInbound ? MESSENGER_WINDOW_CLOSED_MESSAGE : MESSENGER_NO_INBOUND_MESSAGE;
  }
  if (channel === 'instagram') {
    return hasInbound ? INSTAGRAM_WINDOW_CLOSED_MESSAGE : INSTAGRAM_NO_INBOUND_MESSAGE;
  }
  return hasInbound ? WHATSAPP_WINDOW_CLOSED_MESSAGE : WHATSAPP_NO_INBOUND_MESSAGE;
}

export function getMetaReplyBlockReason(
  channel: string | null | undefined,
  messages: ReplyWindowMessage[],
  now = Date.now(),
): string | null {
  const slug = (channel || '').toLowerCase();
  if (!META_CHANNELS.has(slug)) return null;
  const lastInbound = getLastInboundTimestamp(messages);
  if (lastInbound === null) return copyForClosedWindow(slug, false);
  if (now - lastInbound >= WHATSAPP_REPLY_WINDOW_MS) {
    return copyForClosedWindow(slug, true);
  }
  return null;
}

export function getWhatsAppReplyBlockReason(
  messages: ReplyWindowMessage[],
  now = Date.now(),
): string | null {
  return getMetaReplyBlockReason('whatsapp', messages, now);
}
