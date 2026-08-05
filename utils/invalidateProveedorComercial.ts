import type { QueryClient } from '@tanstack/react-query';
import { AGENTE_IA_BORRADORES_KEY, AGENTE_IA_ACTIVIDAD_KEY } from '@/hooks/useAgenteIaQueries';
import { CHAT_INBOX_QUERY_KEY } from '@/hooks/useChatInboxQuery';
import { COTIZACIONES_CANAL_QUERY_KEY } from '@/hooks/useCotizacionesCanalTallerQuery';
import { COTIZACIONES_CANAL_PENDIENTES_KEY } from '@/hooks/useCotizacionesCanalPendientesQuery';
import { PIPELINE_COMERCIAL_QUERY_KEY } from '@/hooks/usePipelineComercialQuery';
import { invalidateProveedorMarketplaceQueries } from '@/utils/invalidateProveedorMarketplace';

const AGENTE_COMERCIAL_PUSH_TYPES = new Set([
  'agente_ia_cotizacion_borrador',
  'agente_ia_cotizacion_enviada',
  'agente_ia_cotizacion_aceptada',
  'agente_ia_cotizacion_rechazada',
  'agente_ia_cita_confirmada',
  'agente_ia_escalamiento',
]);

/** Inbox, Cotizar con IA, pipeline/bandeja y órdenes/citas. */
export function invalidateProveedorComercialQueries(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: CHAT_INBOX_QUERY_KEY });
  void queryClient.invalidateQueries({ queryKey: [COTIZACIONES_CANAL_QUERY_KEY] });
  void queryClient.invalidateQueries({ queryKey: AGENTE_IA_BORRADORES_KEY });
  void queryClient.invalidateQueries({ queryKey: AGENTE_IA_ACTIVIDAD_KEY });
  void queryClient.invalidateQueries({ queryKey: COTIZACIONES_CANAL_PENDIENTES_KEY });
  void queryClient.invalidateQueries({ queryKey: [PIPELINE_COMERCIAL_QUERY_KEY] });
  invalidateProveedorMarketplaceQueries(queryClient);
}

export function maybeInvalidateFromPushData(
  queryClient: QueryClient,
  data: Record<string, unknown> | null | undefined,
) {
  const type = typeof data?.type === 'string' ? data.type : '';
  if (!type) return;
  if (
    AGENTE_COMERCIAL_PUSH_TYPES.has(type)
    || type === 'chat_message'
    || type === 'nuevo_mensaje_chat'
  ) {
    invalidateProveedorComercialQueries(queryClient);
  }
}
