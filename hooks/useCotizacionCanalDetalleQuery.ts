import { useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import cotizacionCanalService, {
  type CotizacionCanal,
} from '@/services/cotizacionCanalService';
import { COTIZACIONES_CANAL_QUERY_KEY } from '@/hooks/useCotizacionesCanalTallerQuery';

export const COTIZACION_CANAL_DETALLE_QUERY_KEY = 'cotizacion-canal-detalle';

const POLL_MS = 5_000;
const MAX_POLL_MS = 60_000;

/**
 * Detalle de cotización con poll mientras `enabled` (búsqueda web pendiente en el editor).
 * No se apoya solo en el cache: un segundo cotizar-ítems deja el cache en `ok` y
 * tiene que volver a consultar. Al terminar o a los ~60s, deja de refrescar.
 */
export function useCotizacionCanalDetalleQuery(
  id: number | null | undefined,
  enabled = true,
) {
  const queryClient = useQueryClient();
  const startedAt = useRef<number | null>(null);

  const query = useQuery({
    queryKey: [COTIZACION_CANAL_DETALLE_QUERY_KEY, id],
    queryFn: () => cotizacionCanalService.obtener(Number(id)),
    enabled: Boolean(enabled && id),
    staleTime: 0,
    refetchOnMount: 'always',
    refetchInterval: () => {
      if (!enabled) return false;
      if (startedAt.current == null) startedAt.current = Date.now();
      if (Date.now() - startedAt.current > MAX_POLL_MS) return false;
      return POLL_MS;
    },
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    if (!enabled || !id) {
      startedAt.current = null;
      return;
    }
    if (startedAt.current == null) {
      startedAt.current = Date.now();
    }
    const estado = query.data?.metadata?.busqueda_web_estado;
    if (estado && estado !== 'pendiente') {
      queryClient.invalidateQueries({ queryKey: [COTIZACIONES_CANAL_QUERY_KEY] });
    }
  }, [enabled, id, query.data?.metadata?.busqueda_web_estado, queryClient]);

  return query;
}
