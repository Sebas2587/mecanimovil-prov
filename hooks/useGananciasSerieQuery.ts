import { useQuery } from '@tanstack/react-query';
import {
  kpisProveedorService,
  type GananciasSerieGranularidad,
  type GananciasSerieMetrica,
  type GananciasTallerSerie,
} from '@/services/kpisProveedorService';
import { DASHBOARD_QUERY_STALE_MS } from '@/hooks/useDashboardFinanzas';

export function gananciasSerieQueryKey(
  granularidad: GananciasSerieGranularidad,
  mecanicoId?: number | null,
  metrica: GananciasSerieMetrica = 'ingresos',
  dias?: number | null,
) {
  return [
    'proveedor-ganancias-serie',
    granularidad,
    mecanicoId ?? null,
    metrica,
    dias ?? null,
  ] as const;
}

export function useGananciasSerieQuery(
  granularidad: GananciasSerieGranularidad,
  options?: {
    mecanicoId?: number | null;
    enabled?: boolean;
    metrica?: GananciasSerieMetrica;
    dias?: number | null;
  },
) {
  const mecanicoId = options?.mecanicoId ?? null;
  const enabled = options?.enabled ?? true;
  const metrica = options?.metrica ?? 'ingresos';
  const dias = options?.dias ?? null;

  const { data, isPending, isFetching, error, refetch } = useQuery({
    queryKey: gananciasSerieQueryKey(granularidad, mecanicoId, metrica, dias),
    queryFn: async (): Promise<GananciasTallerSerie> => {
      const result = await kpisProveedorService.obtenerGananciasSerie(
        granularidad,
        mecanicoId,
        { metrica, dias },
      );
      if (!result.success || !result.data) {
        throw new Error(result.message ?? 'No se pudo cargar la serie de ganancias');
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
