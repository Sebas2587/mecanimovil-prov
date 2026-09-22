import { useCallback } from 'react';
import { useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import omnichannelService, { type InboxChatItem } from '@/services/omnichannelService';
import { obtenerListaChats } from '@/services/solicitudesService';

export const CHAT_INBOX_QUERY_KEY = ['chat-inbox'] as const;

export async function fetchChatInboxQuery(): Promise<InboxChatItem[]> {
  try {
    return await omnichannelService.obtenerInboxUnificado();
  } catch {
    const legacy = await obtenerListaChats();
    return legacy as InboxChatItem[];
  }
}

export function findInboxItemByConversationId(
  items: InboxChatItem[] | undefined,
  conversationId: string,
): InboxChatItem | undefined {
  if (!items?.length || !conversationId) return undefined;
  return items.find((item) => String(item.conversation_id) === conversationId);
}

export function prefetchChatInbox(queryClient: QueryClient) {
  return queryClient.prefetchQuery({
    queryKey: CHAT_INBOX_QUERY_KEY,
    queryFn: fetchChatInboxQuery,
    staleTime: 30_000,
  });
}

export function useChatInboxQuery(enabled = true) {
  return useQuery({
    queryKey: CHAT_INBOX_QUERY_KEY,
    queryFn: fetchChatInboxQuery,
    enabled,
    staleTime: 15_000,
    refetchInterval: enabled ? 45_000 : false,
    refetchOnWindowFocus: true,
    placeholderData: (previousData) => previousData,
  });
}

export function useInvalidateChatInbox() {
  const queryClient = useQueryClient();
  return useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: CHAT_INBOX_QUERY_KEY });
  }, [queryClient]);
}

type InboxWsPatch = {
  conversation_id?: string;
  oferta_id?: string;
  mensaje_id: string;
  mensaje: string;
  timestamp: string;
  es_proveedor: boolean;
  channel?: string;
  external_contact_name?: string | null;
  external_contact_phone?: string | null;
};

function ultimoDesdeWs(event: InboxWsPatch): InboxChatItem['ultimo_mensaje'] {
  return {
    id: event.mensaje_id || `ws-${event.timestamp}`,
    mensaje: (event.mensaje || '').trim() || 'Mensaje',
    fecha_envio: event.timestamp || new Date().toISOString(),
    es_propio: event.es_proveedor,
    leido: false,
  };
}

/** Mueve el chat al tope o lo crea al instante, sin esperar el inbox completo. */
export function applyChatInboxFromWs(queryClient: QueryClient, event: InboxWsPatch) {
  const conversationId = event.conversation_id ? String(event.conversation_id) : '';
  const ofertaId = event.oferta_id ? String(event.oferta_id) : '';
  if (!conversationId && !ofertaId) return;

  queryClient.setQueryData<InboxChatItem[]>(CHAT_INBOX_QUERY_KEY, (prev) => {
    const list = prev ?? [];
    const index = list.findIndex(
      (item) =>
        (ofertaId && item.oferta_id && String(item.oferta_id) === ofertaId)
        || (conversationId && item.conversation_id && String(item.conversation_id) === conversationId),
    );
    const ultimo = ultimoDesdeWs(event);
    if (index === -1) {
      const created: InboxChatItem = {
        kind: ofertaId && !conversationId ? 'oferta' : 'omnichannel',
        channel: (event.channel || (ofertaId ? 'app' : '')).toLowerCase(),
        conversation_id: conversationId || null,
        oferta_id: ofertaId || null,
        solicitud_id: null,
        otra_persona: {
          nombre: event.external_contact_name?.trim() || 'Cliente',
          telefono: event.external_contact_phone || null,
        },
        ultimo_mensaje: ultimo,
        mensajes_no_leidos: event.es_proveedor ? 0 : 1,
        cliente_sin_responder: !event.es_proveedor,
      };
      return [created, ...list];
    }
    const current = list[index];
    const updated: InboxChatItem = {
      ...current,
      ultimo_mensaje: ultimo,
      mensajes_no_leidos: event.es_proveedor
        ? current.mensajes_no_leidos
        : (current.mensajes_no_leidos || 0) + 1,
      cliente_sin_responder: event.es_proveedor ? current.cliente_sin_responder : true,
    };
    return [updated, ...list.filter((_, i) => i !== index)];
  });
}

export function upsertChatInboxFromWs(
  queryClient: QueryClient,
  rowKey: string,
  patch: Partial<InboxChatItem> & { ultimo_mensaje?: InboxChatItem['ultimo_mensaje'] },
) {
  queryClient.setQueryData<InboxChatItem[]>(CHAT_INBOX_QUERY_KEY, (prev) => {
    if (!prev?.length) return prev;
    const index = prev.findIndex(
      (item) => String(item.oferta_id || item.conversation_id) === rowKey,
    );
    if (index === -1) return prev;
    const current = prev[index];
    const updated: InboxChatItem = {
      ...current,
      ...patch,
      ultimo_mensaje: patch.ultimo_mensaje ?? current.ultimo_mensaje,
      mensajes_no_leidos:
        patch.mensajes_no_leidos ?? current.mensajes_no_leidos,
    };
    return [updated, ...prev.filter((_, i) => i !== index)];
  });
}
