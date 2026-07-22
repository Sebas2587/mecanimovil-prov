import { useQuery, type QueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import creditosService, {
  type CompraCreditos,
  type ConsumoCredito,
  type EstadisticasCreditos,
} from '@/services/creditosService';
import suscripcionesService, {
  type CobroMP,
  type PlanSuscripcion,
  type UsoFeaturesMes,
} from '@/services/suscripcionesService';
import mercadoPagoProveedorService, {
  type CuentaMercadoPagoProveedor,
  type EstadisticasPagosMP,
} from '@/services/mercadoPagoProveedorService';
import {
  DASHBOARD_QUERY_STALE_MS,
  saldoCreditosQueryKey,
  suscripcionProveedorQueryKey,
} from '@/hooks/useDashboardFinanzas';

export { saldoCreditosQueryKey, suscripcionProveedorQueryKey };
export {
  useSaldoCreditosQuery,
  useSuscripcionProveedorQuery,
} from '@/hooks/useDashboardFinanzas';
export { useProveedorKpisResumen } from '@/hooks/useProveedorKpisResumen';

const MP_STATUS_STALE_MS = 60_000;

function authQueryRetry(failureCount: number, error: unknown) {
  const err = error as { response?: { status?: number }; code?: string; name?: string };
  if (err?.code === 'ERR_NO_AUTH' || err?.name === 'CanceledError') return false;
  const status = err?.response?.status;
  if (status === 401 || status === 403 || status === 429) return false;
  return failureCount < 2;
}

function useAuthQueryEnabled(enabled: boolean) {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  return Boolean(enabled && isAuthenticated && !authLoading);
}

// ── Keys ────────────────────────────────────────────────────

export function estadisticasCreditosQueryKey() {
  return ['proveedor-creditos-estadisticas'] as const;
}

export function planesSuscripcionQueryKey() {
  return ['proveedor-suscripcion-planes'] as const;
}

export function cobrosMpHistorialQueryKey() {
  return ['proveedor-suscripcion-cobros-mp'] as const;
}

export function usoFeaturesQueryKey() {
  return ['proveedor-suscripcion-uso-features'] as const;
}

export function historialCreditosQueryKey(limit = 50) {
  return ['proveedor-creditos-historial', limit] as const;
}

export function mpEstadoCuentaQueryKey() {
  return ['proveedor-mp-estado-cuenta'] as const;
}

export function mpEstadisticasPagosQueryKey() {
  return ['proveedor-mp-estadisticas-pagos'] as const;
}

export function mpHistorialPagosQueryKey() {
  return ['proveedor-mp-historial-pagos'] as const;
}

// ── Invalidate helpers ──────────────────────────────────────

export function invalidateCreditosQueries(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: saldoCreditosQueryKey() });
  void queryClient.invalidateQueries({ queryKey: estadisticasCreditosQueryKey() });
  void queryClient.invalidateQueries({ queryKey: ['proveedor-creditos-historial'] });
}

export function invalidateSuscripcionQueries(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: suscripcionProveedorQueryKey() });
  void queryClient.invalidateQueries({ queryKey: planesSuscripcionQueryKey() });
  void queryClient.invalidateQueries({ queryKey: cobrosMpHistorialQueryKey() });
  void queryClient.invalidateQueries({ queryKey: usoFeaturesQueryKey() });
  invalidateCreditosQueries(queryClient);
}

export function invalidateMercadoPagoQueries(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: mpEstadoCuentaQueryKey() });
  void queryClient.invalidateQueries({ queryKey: mpEstadisticasPagosQueryKey() });
  void queryClient.invalidateQueries({ queryKey: mpHistorialPagosQueryKey() });
}

// ── Queries ─────────────────────────────────────────────────

export function useEstadisticasCreditosQuery(enabled = true) {
  const queryEnabled = useAuthQueryEnabled(enabled);
  const { data, isPending, isFetching, error, refetch } = useQuery({
    queryKey: estadisticasCreditosQueryKey(),
    queryFn: async (): Promise<EstadisticasCreditos> => {
      const result = await creditosService.obtenerEstadisticas();
      if (!result.success || !result.data) {
        throw new Error(result.error ?? 'No se pudieron cargar las estadísticas de créditos');
      }
      return result.data;
    },
    enabled: queryEnabled,
    staleTime: DASHBOARD_QUERY_STALE_MS,
    placeholderData: (previous) => previous,
    retry: authQueryRetry,
  });

  return {
    data: data ?? null,
    loading: isPending && data == null,
    isRefetching: isFetching && data != null,
    error: error instanceof Error ? error.message : null,
    refresh: refetch,
  };
}

export function usePlanesSuscripcionQuery(enabled = true) {
  const queryEnabled = useAuthQueryEnabled(enabled);
  const { data, isPending, isFetching, error, refetch } = useQuery({
    queryKey: planesSuscripcionQueryKey(),
    queryFn: async (): Promise<PlanSuscripcion[]> => {
      const result = await suscripcionesService.obtenerPlanes();
      if (!result.success) {
        throw new Error(result.error ?? 'No se pudieron cargar los planes');
      }
      return result.planes ?? [];
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

export function useCobrosMpHistorialQuery(enabled = true) {
  const queryEnabled = useAuthQueryEnabled(enabled);
  const { data, isPending, isFetching, error, refetch } = useQuery({
    queryKey: cobrosMpHistorialQueryKey(),
    queryFn: async (): Promise<CobroMP[]> => {
      const result = await suscripcionesService.obtenerHistorialCobros();
      if (!result.success) {
        throw new Error(result.error ?? 'No se pudo cargar el historial de cobros');
      }
      return result.cobros ?? [];
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

export function useUsoFeaturesQuery(enabled = true) {
  const queryEnabled = useAuthQueryEnabled(enabled);
  const { data, isPending, isFetching, error, refetch } = useQuery({
    queryKey: usoFeaturesQueryKey(),
    queryFn: async (): Promise<UsoFeaturesMes | null> => {
      const result = await suscripcionesService.obtenerUsoFeatures();
      if (!result.success) {
        throw new Error(result.error ?? 'No se pudo cargar el uso del plan');
      }
      return result.data ?? null;
    },
    enabled: queryEnabled,
    staleTime: DASHBOARD_QUERY_STALE_MS,
    placeholderData: (previous) => previous,
    retry: authQueryRetry,
  });

  return {
    data: data ?? null,
    loading: isPending && data === undefined,
    isRefetching: isFetching && data !== undefined,
    error: error instanceof Error ? error.message : null,
    refresh: refetch,
  };
}

export type HistorialCreditosData = {
  compras: CompraCreditos[];
  consumos: ConsumoCredito[];
};

export function useHistorialCreditosQuery(enabled = true, limit = 50) {
  const queryEnabled = useAuthQueryEnabled(enabled);
  const { data, isPending, isFetching, error, refetch } = useQuery({
    queryKey: historialCreditosQueryKey(limit),
    queryFn: async (): Promise<HistorialCreditosData> => {
      const [comprasResult, consumosResult] = await Promise.all([
        creditosService.obtenerHistorialCompras(limit),
        creditosService.obtenerHistorialConsumos(limit),
      ]);
      if (!comprasResult.success) {
        throw new Error(comprasResult.error ?? 'No se pudo cargar el historial de compras');
      }
      if (!consumosResult.success) {
        throw new Error(consumosResult.error ?? 'No se pudo cargar el historial de consumos');
      }
      return {
        compras: comprasResult.data ?? [],
        consumos: consumosResult.data ?? [],
      };
    },
    enabled: queryEnabled,
    staleTime: DASHBOARD_QUERY_STALE_MS,
    placeholderData: (previous) => previous,
    retry: authQueryRetry,
  });

  return {
    data: data ?? null,
    compras: data?.compras ?? [],
    consumos: data?.consumos ?? [],
    loading: isPending && data == null,
    isRefetching: isFetching && data != null,
    error: error instanceof Error ? error.message : null,
    refresh: refetch,
  };
}

export function useMercadoPagoEstadoCuentaQuery(enabled = true) {
  const queryEnabled = useAuthQueryEnabled(enabled);
  const { data, isPending, isFetching, error, refetch } = useQuery({
    queryKey: mpEstadoCuentaQueryKey(),
    queryFn: async (): Promise<CuentaMercadoPagoProveedor | null> => {
      const result = await mercadoPagoProveedorService.obtenerEstadoCuenta();
      if (!result.success) {
        throw new Error(result.error ?? 'No se pudo cargar el estado de Mercado Pago');
      }
      return result.data ?? null;
    },
    enabled: queryEnabled,
    staleTime: MP_STATUS_STALE_MS,
    placeholderData: (previous) => previous,
    retry: authQueryRetry,
  });

  const conectada = data?.estado === 'conectada';

  return {
    data: data ?? null,
    conectada,
    loading: isPending && data === undefined,
    isRefetching: isFetching && data !== undefined,
    error: error instanceof Error ? error.message : null,
    refresh: refetch,
  };
}

export function useMercadoPagoEstadisticasPagosQuery(enabled = true) {
  const queryEnabled = useAuthQueryEnabled(enabled);
  const { data, isPending, isFetching, error, refetch } = useQuery({
    queryKey: mpEstadisticasPagosQueryKey(),
    queryFn: async (): Promise<EstadisticasPagosMP> => {
      const result = await mercadoPagoProveedorService.obtenerEstadisticasPagos();
      if (!result.success || !result.data) {
        throw new Error(result.error ?? 'No se pudieron cargar las estadísticas de pagos');
      }
      return result.data;
    },
    enabled: queryEnabled,
    staleTime: DASHBOARD_QUERY_STALE_MS,
    placeholderData: (previous) => previous,
    retry: authQueryRetry,
  });

  return {
    data: data ?? null,
    loading: isPending && data == null,
    isRefetching: isFetching && data != null,
    error: error instanceof Error ? error.message : null,
    refresh: refetch,
  };
}
