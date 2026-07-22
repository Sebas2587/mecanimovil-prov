import { useQuery, type QueryClient } from '@tanstack/react-query';
import { horariosAPI, type HorarioProveedor } from '@/services/api';
import {
  normalizarEstadoAgendaApi,
  parseHorariosApiResponse,
  type EstadoAgendaProveedor,
} from '@/utils/horariosProveedor';
import { DASHBOARD_QUERY_STALE_MS } from '@/hooks/useDashboardFinanzas';

export type HorariosTallerData = {
  horarios: HorarioProveedor[];
  estadoAgenda: EstadoAgendaProveedor | null;
};

export function horariosTallerQueryKey(miembroId: number | null) {
  return ['horarios-taller', miembroId] as const;
}

export function estadoAgendaHorariosQueryKey() {
  return ['horarios-taller-estado-agenda'] as const;
}

export function invalidateHorariosTallerQueries(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: ['horarios-taller'] });
  void queryClient.invalidateQueries({ queryKey: estadoAgendaHorariosQueryKey() });
}

async function fetchHorariosTaller(miembroId: number | null): Promise<HorarioProveedor[]> {
  const raw = await horariosAPI.obtenerMisHorarios(miembroId);
  return parseHorariosApiResponse(raw);
}

async function fetchEstadoAgenda(): Promise<EstadoAgendaProveedor | null> {
  try {
    const estado = await horariosAPI.obtenerEstadoConfiguracion();
    return normalizarEstadoAgendaApi(estado);
  } catch {
    return null;
  }
}

export function useHorariosTallerQuery(miembroId: number | null, enabled = true) {
  const { data, isPending, isFetching, error, refetch } = useQuery({
    queryKey: horariosTallerQueryKey(miembroId),
    queryFn: () => fetchHorariosTaller(miembroId),
    enabled,
    staleTime: DASHBOARD_QUERY_STALE_MS,
    // No conservar horarios de otro mecánico al cambiar la agenda seleccionada
    placeholderData: (previous, previousQuery) => {
      const prevKey = previousQuery?.queryKey;
      if (
        Array.isArray(prevKey) &&
        prevKey[0] === 'horarios-taller' &&
        prevKey[1] === miembroId
      ) {
        return previous;
      }
      return undefined;
    },
  });

  return {
    data: data ?? null,
    horarios: data ?? [],
    loading: isPending && data == null,
    isRefetching: isFetching && data != null,
    error: error instanceof Error ? error.message : null,
    refresh: refetch,
  };
}

export function useEstadoAgendaHorariosQuery(enabled = true) {
  const { data, isPending, isFetching, error, refetch } = useQuery({
    queryKey: estadoAgendaHorariosQueryKey(),
    queryFn: fetchEstadoAgenda,
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
