import { useCallback, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { obtenerSolicitudesDisponibles, type SolicitudPublica } from '@/services/solicitudesService';
import websocketService from '@/app/services/websocketService';

export const SOLICITUDES_DISPONIBLES_QUERY_KEY = ['solicitudes-disponibles'] as const;

export async function fetchSolicitudesDisponiblesQuery(): Promise<SolicitudPublica[]> {
  const result = await obtenerSolicitudesDisponibles();
  if (!result.success) {
    throw new Error(result.error || 'Error al obtener solicitudes disponibles');
  }
  return result.data ?? [];
}

export function useInvalidateSolicitudesDisponibles() {
  const queryClient = useQueryClient();
  return useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: SOLICITUDES_DISPONIBLES_QUERY_KEY });
  }, [queryClient]);
}

export function useSolicitudesDisponiblesQuery(enabled: boolean) {
  return useQuery({
    queryKey: SOLICITUDES_DISPONIBLES_QUERY_KEY,
    queryFn: fetchSolicitudesDisponiblesQuery,
    enabled,
    staleTime: 60_000,
    placeholderData: (previousData) => previousData,
  });
}

/**
 * Refresca la lista ante WebSocket (nueva solicitud, cambio de oferta/estado, cancelación).
 * No invalida al volver al tab: la caché se muestra al instante y el WS mantiene datos frescos.
 */
export function useSolicitudesDisponiblesRealtime(options: { enabled: boolean }) {
  const { enabled } = options;
  const invalidate = useInvalidateSolicitudesDisponibles();

  useEffect(() => {
    if (!enabled) return;

    const unsubNueva = websocketService.onNuevaSolicitud(() => {
      invalidate();
    });
    const unsubLista = websocketService.onOrdenesListRefresh(() => {
      invalidate();
    });
    const unsubCancel = websocketService.onSolicitudCanceladaCliente?.(() => {
      invalidate();
    });

    return () => {
      unsubNueva();
      unsubLista();
      unsubCancel?.();
    };
  }, [enabled, invalidate]);
}
