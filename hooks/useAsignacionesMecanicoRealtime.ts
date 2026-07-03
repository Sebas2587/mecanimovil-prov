import { useCallback, useEffect } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import websocketService from '@/services/websocketService';
import { invalidateAsignacionesMecanicoQueries } from '@/utils/invalidateAsignacionesMecanico';

const POLL_MS = 45_000;

/**
 * Mantiene la lista de asignaciones del mecánico al día vía WebSocket, push y polling ligero.
 */
export function useAsignacionesMecanicoRealtime(miembroId: number | null | undefined) {
  const queryClient = useQueryClient();

  const refrescarAsignaciones = useCallback(() => {
    invalidateAsignacionesMecanicoQueries(queryClient);
  }, [queryClient]);

  useEffect(() => {
    if (!miembroId) return;

    const unsubOrdenes = websocketService.onOrdenesListRefresh(refrescarAsignaciones);
    const unsubAsignacion = websocketService.onAsignacionMecanico(refrescarAsignaciones);
    const unsubCerrado = websocketService.onServicioCerradoPorCliente(refrescarAsignaciones);

    let pollTimer: ReturnType<typeof setInterval> | null = null;

    const iniciarPoll = () => {
      if (pollTimer) return;
      pollTimer = setInterval(refrescarAsignaciones, POLL_MS);
    };

    const detenerPoll = () => {
      if (!pollTimer) return;
      clearInterval(pollTimer);
      pollTimer = null;
    };

    const onAppState = (state: AppStateStatus) => {
      if (state === 'active') {
        refrescarAsignaciones();
        iniciarPoll();
      } else {
        detenerPoll();
      }
    };

    refrescarAsignaciones();
    iniciarPoll();
    const appSub = AppState.addEventListener('change', onAppState);

    return () => {
      unsubOrdenes();
      unsubAsignacion();
      unsubCerrado();
      detenerPoll();
      appSub.remove();
    };
  }, [miembroId, refrescarAsignaciones]);

  return refrescarAsignaciones;
}
