import { useQuery } from '@tanstack/react-query';
import { especialidadesAPI } from '@/services/api';
import equipoTallerService, { type MiembroTaller } from '@/services/equipoTallerService';
import { DASHBOARD_QUERY_STALE_MS } from '@/hooks/useDashboardFinanzas';

export interface EquipoTallerData {
  miembros: MiembroTaller[];
  categorias: Array<{ id: number; nombre: string }>;
}

export function equipoTallerQueryKey() {
  return ['equipo-taller-miembros'] as const;
}

export function useEquipoTallerQuery(enabled = true) {
  const { data, isPending, isFetching, error, refetch } = useQuery({
    queryKey: equipoTallerQueryKey(),
    queryFn: async (): Promise<EquipoTallerData> => {
      const [miembros, categorias] = await Promise.all([
        equipoTallerService.listar(),
        especialidadesAPI.obtenerCategorias().catch(() => []),
      ]);
      return { miembros, categorias };
    },
    enabled,
    staleTime: DASHBOARD_QUERY_STALE_MS,
    placeholderData: (previous) => previous,
  });

  return {
    data,
    miembros: data?.miembros ?? [],
    categorias: data?.categorias ?? [],
    loading: isPending && data == null,
    isRefetching: isFetching && data != null,
    error: error instanceof Error ? error.message : null,
    refresh: refetch,
  };
}
