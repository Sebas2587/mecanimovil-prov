import { useQuery, type QueryClient } from '@tanstack/react-query';
import serviceAreasApi, {
  type ServiceArea,
  type ServiceAreaStats,
} from '@/services/serviceAreasApi';
import { DASHBOARD_QUERY_STALE_MS } from '@/hooks/useDashboardFinanzas';

export type ZonasServicioData = {
  areas: ServiceArea[];
  stats: ServiceAreaStats | null;
};

export function zonasServicioQueryKey() {
  return ['zonas-servicio'] as const;
}

export function invalidateZonasServicioQueries(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: zonasServicioQueryKey() });
}

async function fetchZonasServicio(): Promise<ZonasServicioData> {
  const [areas, stats] = await Promise.all([
    serviceAreasApi.getServiceAreas(),
    serviceAreasApi.getServiceAreaStats().catch(() => null),
  ]);
  return { areas, stats };
}

export function useZonasServicioQuery(enabled = true) {
  const { data, isPending, isFetching, error, refetch } = useQuery({
    queryKey: zonasServicioQueryKey(),
    queryFn: fetchZonasServicio,
    enabled,
    staleTime: DASHBOARD_QUERY_STALE_MS,
    placeholderData: (previous) => previous,
  });

  return {
    data: data ?? null,
    areas: data?.areas ?? [],
    stats: data?.stats ?? null,
    loading: isPending && data == null,
    isRefetching: isFetching && data != null,
    error: error instanceof Error ? error.message : null,
    refresh: refetch,
  };
}
