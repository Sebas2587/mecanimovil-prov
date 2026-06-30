import type { Href } from 'expo-router';

function encodeParam(value: string | number): string {
  return encodeURIComponent(String(value));
}

export type OmnichannelChatMeta = {
  channel?: string | null;
  name?: string | null;
  phone?: string | null;
  solicitudId?: string | null;
};

/** Ruta compatible con export estático web (query param, no segmento dinámico). */
export function omnichannelChatHref(
  conversationId: string | number,
  meta?: OmnichannelChatMeta,
): Href {
  const params = new URLSearchParams();
  params.set('conversationId', String(conversationId));
  if (meta?.channel) params.set('channel', String(meta.channel));
  if (meta?.name) params.set('name', String(meta.name));
  if (meta?.phone) params.set('phone', String(meta.phone));
  if (meta?.solicitudId) params.set('solicitudId', String(meta.solicitudId));
  return `/chat-omnicanal?${params.toString()}` as Href;
}

export function ofertaChatHref(ofertaId: string | number): Href {
  return `/chat-oferta?ofertaId=${encodeParam(ofertaId)}` as Href;
}

export function resolveChatHref(item: {
  conversation_id?: string | null;
  oferta_id?: string | null;
  kind?: string;
  channel?: string;
}): Href | null {
  const conversationId = item.conversation_id ? String(item.conversation_id) : '';
  const ofertaId = item.oferta_id ? String(item.oferta_id) : '';
  const isOmnichannel =
    item.kind === 'omnichannel'
    || (conversationId && !ofertaId)
    || (conversationId && item.channel && item.channel !== 'app');

  if (isOmnichannel && conversationId) {
    return omnichannelChatHref(conversationId, {
      channel: item.channel,
      name: item.otra_persona?.nombre,
      phone: item.otra_persona?.telefono ?? undefined,
      solicitudId: item.solicitud_id ?? undefined,
    });
  }
  if (ofertaId) {
    return ofertaChatHref(ofertaId);
  }
  return null;
}
