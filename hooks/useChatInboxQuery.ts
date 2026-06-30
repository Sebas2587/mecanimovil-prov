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
    staleTime: 30_000,
    placeholderData: (previousData) => previousData,
  });
}

export function useInvalidateChatInbox() {
  const queryClient = useQueryClient();
  return useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: CHAT_INBOX_QUERY_KEY });
  }, [queryClient]);
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
