import { useQuery } from '@tanstack/react-query';
import equipoTallerService, { type MecanicoKpis } from '@/services/equipoTallerService';
import { DASHBOARD_QUERY_STALE_MS } from '@/hooks/useDashboardFinanzas';

export function rendimientoEquipoDetalladoQueryKey(dias: number) {
  const d = Math.min(365, Math.max(1, Math.round(dias)));
  return ['rendimiento-equipo-detallado', d] as const;
}

type Options = {
  enabled?: boolean;
  dias?: number;
};

export function useRendimientoEquipoDetalladoQuery({ enabled = true, dias = 30 }: Options = {}) {
  const diasClamped = Math.min(365, Math.max(1, Math.round(dias)));

  const { data, isPending, isFetching, error, refetch } = useQuery({
    queryKey: rendimientoEquipoDetalladoQueryKey(diasClamped),
    queryFn: async (): Promise<MecanicoKpis[]> => {
      return equipoTallerService.rendimientoDetallado({ dias: diasClamped });
    },
    enabled,
    staleTime: DASHBOARD_QUERY_STALE_MS,
    placeholderData: (previous) => previous,
  });

  const errorMessage =
    error instanceof Error ? error.message : error != null ? String(error) : null;

  return {
    data: data ?? [],
    loading: isPending && data == null,
    isRefetching: isFetching && data != null,
    error: errorMessage,
    refresh: refetch,
  };
}
