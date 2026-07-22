import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import mercadoPagoProveedorService, {
  type PagoRecibido,
} from '@/services/mercadoPagoProveedorService';
import { DASHBOARD_QUERY_STALE_MS } from '@/hooks/useDashboardFinanzas';
import {
  invalidateMercadoPagoQueries,
  mpEstadoCuentaQueryKey,
  mpEstadisticasPagosQueryKey,
  mpHistorialPagosQueryKey,
  useMercadoPagoEstadoCuentaQuery,
  useMercadoPagoEstadisticasPagosQuery,
} from '@/hooks/useCreditosQueries';

export {
  mpEstadoCuentaQueryKey,
  mpEstadisticasPagosQueryKey,
  mpHistorialPagosQueryKey,
  invalidateMercadoPagoQueries,
  useMercadoPagoEstadoCuentaQuery,
  useMercadoPagoEstadisticasPagosQuery,
};

function authQueryRetry(failureCount: number, error: unknown) {
  const err = error as { response?: { status?: number }; code?: string; name?: string };
  if (err?.code === 'ERR_NO_AUTH' || err?.name === 'CanceledError') return false;
  const status = err?.response?.status;
  if (status === 401 || status === 403 || status === 429) return false;
  return failureCount < 2;
}

export function useMercadoPagoHistorialPagosQuery(enabled = true) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const queryEnabled = Boolean(enabled && isAuthenticated && !authLoading);
  const { data, isPending, isFetching, error, refetch } = useQuery({
    queryKey: mpHistorialPagosQueryKey(),
    queryFn: async (): Promise<PagoRecibido[]> => {
      const result = await mercadoPagoProveedorService.obtenerHistorialPagos();
      if (!result.success) {
        throw new Error(result.error ?? 'No se pudo cargar el historial de pagos');
      }
      return result.data?.historial ?? [];
    },
    enabled: queryEnabled,
    staleTime: DASHBOARD_QUERY_STALE_MS,
    placeholderData: (previous) => previous,
    retry: authQueryRetry,
  });

  return {
    data: data ?? [],
    loading: isPending && data == null,
    isRefetching: isFetching && data != null,
    error: error instanceof Error ? error.message : null,
    refresh: refetch,
  };
}

/**
 * Composición para la pantalla de configuración MP:
 * estado (60s) + estadísticas e historial (3m) cuando está conectada.
 */
export function useMercadoPagoCuentaQuery(enabled = true) {
  const queryClient = useQueryClient();
  const estadoQuery = useMercadoPagoEstadoCuentaQuery(enabled);
  const conectada = estadoQuery.conectada;
  const statsQuery = useMercadoPagoEstadisticasPagosQuery(enabled && conectada);
  const historialQuery = useMercadoPagoHistorialPagosQuery(enabled && conectada);

  const isRefetching =
    estadoQuery.isRefetching ||
    statsQuery.isRefetching ||
    historialQuery.isRefetching;

  const refresh = useCallback(async () => {
    await Promise.all([
      estadoQuery.refresh(),
      ...(conectada ? [statsQuery.refresh(), historialQuery.refresh()] : []),
    ]);
  }, [conectada, estadoQuery, historialQuery, statsQuery]);

  const invalidate = useCallback(() => {
    invalidateMercadoPagoQueries(queryClient);
  }, [queryClient]);

  return {
    cuenta: estadoQuery.data,
    estadisticas: conectada ? statsQuery.data : null,
    historialPagos: conectada ? historialQuery.data : [],
    conectada,
    loading:
      estadoQuery.loading ||
      (conectada && (statsQuery.loading || historialQuery.loading)),
    isRefetching,
    error: estadoQuery.error ?? statsQuery.error ?? historialQuery.error,
    refresh,
    invalidate,
  };
}
