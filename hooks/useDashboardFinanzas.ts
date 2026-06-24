import { useQuery } from '@tanstack/react-query';
import creditosService, { type CreditoProveedor } from '@/services/creditosService';
import {
  kpisProveedorService,
  type GananciasTallerResumen,
} from '@/services/kpisProveedorService';
import suscripcionesService, { type SuscripcionProveedor } from '@/services/suscripcionesService';

/** Caché compartida del dashboard: muestra datos previos y refresca en silencio. */
export const DASHBOARD_QUERY_STALE_MS = 3 * 60 * 1000;

export function saldoCreditosQueryKey() {
  return ['proveedor-saldo-creditos'] as const;
}

export function gananciasResumenQueryKey() {
  return ['proveedor-ganancias-resumen'] as const;
}

export function suscripcionProveedorQueryKey() {
  return ['proveedor-suscripcion'] as const;
}

export function useSaldoCreditosQuery(enabled: boolean) {
  const { data, isPending, isFetching, error, refetch } = useQuery({
    queryKey: saldoCreditosQueryKey(),
    queryFn: async (): Promise<CreditoProveedor> => {
      const result = await creditosService.obtenerSaldo();
      if (!result.success || !result.data) {
        throw new Error(result.error ?? 'No se pudo cargar el saldo de créditos');
      }
      return result.data;
    },
    enabled,
    staleTime: DASHBOARD_QUERY_STALE_MS,
    placeholderData: (previous) => previous,
  });

  return {
    data: data ?? null,
    loading: isPending && data == null,
    isRefetching: isFetching && data != null,
    error: error instanceof Error ? error.message : null,
    refresh: refetch,
  };
}

export function useGananciasResumenQuery(enabled: boolean) {
  const { data, isPending, isFetching, error, refetch } = useQuery({
    queryKey: gananciasResumenQueryKey(),
    queryFn: async (): Promise<GananciasTallerResumen> => {
      const result = await kpisProveedorService.obtenerGananciasResumen();
      if (!result.success || !result.data) {
        throw new Error(result.message ?? 'No se pudieron cargar las ganancias');
      }
      return result.data;
    },
    enabled,
    staleTime: DASHBOARD_QUERY_STALE_MS,
    placeholderData: (previous) => previous,
  });

  return {
    data: data ?? null,
    loading: isPending && data == null,
    isRefetching: isFetching && data != null,
    error: error instanceof Error ? error.message : null,
    refresh: refetch,
  };
}

export function useSuscripcionProveedorQuery(enabled: boolean) {
  const { data, isPending, isFetching, error, refetch } = useQuery({
    queryKey: suscripcionProveedorQueryKey(),
    queryFn: async (): Promise<SuscripcionProveedor | null> => {
      const result = await suscripcionesService.obtenerMiSuscripcion();
      if (!result.success) {
        throw new Error(result.error ?? 'No se pudo cargar la suscripción');
      }
      return result.suscripcion ?? null;
    },
    enabled,
    staleTime: DASHBOARD_QUERY_STALE_MS,
    placeholderData: (previous) => previous,
  });

  return {
    data: data ?? null,
    loading: isPending && data === undefined,
    isRefetching: isFetching && data !== undefined,
    error: error instanceof Error ? error.message : null,
    refresh: refetch,
  };
}
