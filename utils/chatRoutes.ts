import type { Href } from 'expo-router';

function encodeParam(value: string | number): string {
  return encodeURIComponent(String(value));
}

/** Ruta compatible con export estático web (query param, no segmento dinámico). */
export function omnichannelChatHref(conversationId: string | number): Href {
  return `/chat-omnicanal?conversationId=${encodeParam(conversationId)}` as Href;
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
    return omnichannelChatHref(conversationId);
  }
  if (ofertaId) {
    return ofertaChatHref(ofertaId);
  }
  return null;
}
