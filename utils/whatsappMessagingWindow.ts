export const WHATSAPP_REPLY_WINDOW_MS = 24 * 60 * 60 * 1000;

export const WHATSAPP_WINDOW_CLOSED_MESSAGE =
  'Ventana de 24 h cerrada. Espera a que el cliente escriba.';

export const WHATSAPP_NO_INBOUND_MESSAGE =
  'El cliente aún no ha escrito por WhatsApp.';

type ReplyWindowMessage = {
  es_proveedor: boolean;
  fecha_envio: string;
};

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

export function getWhatsAppReplyBlockReason(
  messages: ReplyWindowMessage[],
  now = Date.now(),
): string | null {
  const lastInbound = getLastInboundTimestamp(messages);
  if (lastInbound === null) return WHATSAPP_NO_INBOUND_MESSAGE;
  if (now - lastInbound >= WHATSAPP_REPLY_WINDOW_MS) {
    return WHATSAPP_WINDOW_CLOSED_MESSAGE;
  }
  return null;
}
