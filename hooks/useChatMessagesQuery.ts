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

export type ChatAgenda = {
  citaId: number;
  fecha: string;
  hora: string;
};

export type ChatThreadPayload = {
  mensajes: ChatThreadRow[];
  cotizacionAceptadaId?: number;
  cotizacionEnviadaId?: number;
  /** Cotización enviada que todavía se puede cerrar (principal o adicional). */
  cotizacionCerrableId?: number;
  agenda?: ChatAgenda;
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
      let cotizacionEnviadaId: number | undefined;
      let cotizacionCerrableId: number | undefined;
      let agenda: ChatAgenda | undefined;
      try {
        const cotizaciones = await cotizacionCanalService.listarPorConversacion(
          parseInt(conversationId, 10),
        );
        const principales = cotizaciones.filter((c) => !c.es_cotizacion_adicional);
        const agendada = principales.find((c) => c.tiene_horario_agendado && c.cita_personal_id);
        if (agendada?.cita_personal_id && agendada.fecha_agendada) {
          agenda = {
            citaId: agendada.cita_personal_id,
            fecha: agendada.fecha_agendada,
            hora: agendada.hora_agendada || '',
          };
        }
        const aceptadaSinHorario = principales.find(
          (c) => c.estado === 'aceptada' && !c.tiene_horario_agendado,
        );
        cotizacionAceptadaId = agenda ? undefined : aceptadaSinHorario?.id;
        const enviadas = cotizaciones
          .filter((c) => c.estado === 'enviada')
          .sort((a, b) => b.id - a.id);
        cotizacionEnviadaId = enviadas[0]?.id;
        const cerrable = cotizaciones.find((c) => c.estado === 'enviada')
          || cotizaciones.find((c) => (
            c.estado === 'aceptada' && (c.es_cotizacion_adicional || !c.tiene_horario_agendado)
          ));
        cotizacionCerrableId = cerrable?.id;
      } catch {
        cotizacionAceptadaId = undefined;
        cotizacionEnviadaId = undefined;
        cotizacionCerrableId = undefined;
        agenda = undefined;
      }
      return { mensajes, cotizacionAceptadaId, cotizacionEnviadaId, cotizacionCerrableId, agenda };
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
