import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import chatService from '@/services/chatService';
import cotizacionCanalService from '@/services/cotizacionCanalService';

export const CHAT_MESSAGES_QUERY_KEY = 'chat-messages';

export type ChatThreadRow = {
  id: string;
  mensaje: string;
  es_proveedor: boolean;
  fecha_envio: string;
  enviado_por_nombre: string;
  archivo_adjunto: string | null;
  attachment_mime?: string | null;
  attachment_name?: string | null;
  channel_metadata?: Record<string, unknown>;
};

export type ChatThreadPayload = {
  mensajes: ChatThreadRow[];
  cotizacionAceptadaId?: number;
};

export function chatMessagesQueryKey(conversationId: string) {
  return [CHAT_MESSAGES_QUERY_KEY, conversationId] as const;
}

export function mergeChatThreadRow(
  prev: ChatThreadRow[],
  row: ChatThreadRow,
): ChatThreadRow[] {
  const idx = prev.findIndex((m) => String(m.id) === String(row.id));
  if (idx < 0) return [...prev, row];
  return prev.map((m, i) => {
    if (i !== idx) return m;
    const merged: ChatThreadRow = { ...m, ...row };
    if (!row.archivo_adjunto && m.archivo_adjunto) {
      merged.archivo_adjunto = m.archivo_adjunto;
      merged.attachment_mime = row.attachment_mime || m.attachment_mime;
      merged.attachment_name = row.attachment_name || m.attachment_name;
    }
    if (!row.channel_metadata && m.channel_metadata) {
      merged.channel_metadata = m.channel_metadata;
    }
    return merged;
  });
}

export function useChatMessagesQuery(
  conversationId: string,
  mapApiMessage: (row: Record<string, unknown>) => ChatThreadRow,
) {
  return useQuery({
    queryKey: chatMessagesQueryKey(conversationId),
    queryFn: async (): Promise<ChatThreadPayload> => {
      const rows = await chatService.getMessages(conversationId);
      const mensajes = (rows as Record<string, unknown>[]).map(mapApiMessage);
      let cotizacionAceptadaId: number | undefined;
      try {
        const cotizaciones = await cotizacionCanalService.listarPorConversacion(
          parseInt(conversationId, 10),
        );
        cotizacionAceptadaId = cotizaciones.find((c) => c.estado === 'aceptada')?.id;
      } catch {
        cotizacionAceptadaId = undefined;
      }
      return { mensajes, cotizacionAceptadaId };
    },
    enabled: Boolean(conversationId),
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    placeholderData: (previousData) => previousData,
  });
}

export function useChatThreadCache(conversationId: string) {
  const queryClient = useQueryClient();
  const key = chatMessagesQueryKey(conversationId);

  const patch = useCallback(
    (updater: (prev: ChatThreadPayload) => ChatThreadPayload) => {
      queryClient.setQueryData<ChatThreadPayload>(key, (current) =>
        updater(current ?? { mensajes: [] }),
      );
    },
    [queryClient, conversationId],
  );

  const upsertRow = useCallback(
    (row: ChatThreadRow) => {
      patch((prev) => ({
        ...prev,
        mensajes: mergeChatThreadRow(prev.mensajes, row),
      }));
    },
    [patch],
  );

  const replaceMensajes = useCallback(
    (updater: (prev: ChatThreadRow[]) => ChatThreadRow[]) => {
      patch((prev) => ({
        ...prev,
        mensajes: updater(prev.mensajes),
      }));
    },
    [patch],
  );

  const refetchSilent = useCallback(() => {
    return queryClient.invalidateQueries({ queryKey: key });
  }, [queryClient, conversationId]);

  return { upsertRow, replaceMensajes, refetchSilent };
}
