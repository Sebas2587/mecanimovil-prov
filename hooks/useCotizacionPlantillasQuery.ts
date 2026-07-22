import { useQuery, type QueryClient } from '@tanstack/react-query';
import cotizacionCanalService, {
  type CotizacionPlantilla,
} from '@/services/cotizacionCanalService';
import { DASHBOARD_QUERY_STALE_MS } from '@/hooks/useDashboardFinanzas';

export type FiltroPlantillaVehiculo = {
  marca?: string;
  modelo?: string;
  cilindraje?: string;
};

export function cotizacionPlantillasQueryKey(filtro?: FiltroPlantillaVehiculo | null) {
  const marca = filtro?.marca?.trim() || '';
  const modelo = filtro?.modelo?.trim() || '';
  const cilindraje = filtro?.cilindraje?.trim() || '';
  return ['cotizacion-plantillas', marca, modelo, cilindraje] as const;
}

export function invalidateCotizacionPlantillasQueries(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: ['cotizacion-plantillas'] });
}

export function useCotizacionPlantillasQuery(
  filtro?: FiltroPlantillaVehiculo | null,
  enabled = true,
) {
  const filtrando = Boolean(filtro?.marca?.trim() && filtro?.modelo?.trim());
  const queryFiltro = filtrando
    ? {
        marca: filtro!.marca!.trim(),
        modelo: filtro!.modelo!.trim(),
        cilindraje: filtro?.cilindraje?.trim() || undefined,
      }
    : undefined;

  const { data, isPending, isFetching, error, refetch } = useQuery({
    queryKey: cotizacionPlantillasQueryKey(queryFiltro ?? null),
    queryFn: async (): Promise<CotizacionPlantilla[]> => {
      return queryFiltro
        ? cotizacionCanalService.listarPlantillas(queryFiltro)
        : cotizacionCanalService.listarPlantillas();
    },
    enabled,
    staleTime: DASHBOARD_QUERY_STALE_MS,
    placeholderData: (previous) => previous,
  });

  return {
    data: data ?? [],
    plantillas: data ?? [],
    loading: isPending && data == null,
    isRefetching: isFetching && data != null,
    error: error instanceof Error ? error.message : null,
    refresh: refetch,
  };
}
