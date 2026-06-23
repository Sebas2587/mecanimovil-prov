import { useCallback, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from 'expo-router';
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
    staleTime: 15_000,
    refetchOnMount: 'always',
    placeholderData: (previousData) => previousData,
  });
}

/**
 * Refresca la lista ante WebSocket (nueva solicitud, cambio de oferta/estado, cancelación)
 * y al volver a enfocar la pantalla.
 */
export function useSolicitudesDisponiblesRealtime(options: {
  enabled: boolean;
  refetchOnFocus?: boolean;
}) {
  const { enabled, refetchOnFocus = true } = options;
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

  useFocusEffect(
    useCallback(() => {
      if (enabled && refetchOnFocus) {
        invalidate();
      }
    }, [enabled, refetchOnFocus, invalidate]),
  );
}
