import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from 'expo-router';
import equipoTallerService, { type MecanicoKpis } from '@/services/equipoTallerService';

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
  const queryClient = useQueryClient();

  const { data, isFetching, error, refetch } = useQuery({
    queryKey: rendimientoEquipoDetalladoQueryKey(diasClamped),
    queryFn: async (): Promise<MecanicoKpis[]> => {
      return equipoTallerService.rendimientoDetallado({ dias: diasClamped });
    },
    enabled,
    staleTime: 30 * 1000,
  });

  useFocusEffect(
    useCallback(() => {
      if (!enabled) return;
      void queryClient.invalidateQueries({
        queryKey: rendimientoEquipoDetalladoQueryKey(diasClamped),
      });
    }, [enabled, diasClamped, queryClient]),
  );

  const errorMessage =
    error instanceof Error ? error.message : error != null ? String(error) : null;

  return {
    data: data ?? [],
    loading: isFetching,
    error: errorMessage,
    refresh: refetch,
  };
}
