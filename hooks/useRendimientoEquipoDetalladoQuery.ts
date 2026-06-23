import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useFocusEffect } from 'expo-router';
import equipoTallerService, { type MecanicoKpis } from '@/services/equipoTallerService';

export function rendimientoEquipoDetalladoQueryKey(dias: number) {
  const d = Math.min(365, Math.max(1, Math.round(dias)));
  return ['rendimiento-equipo-detallado', d] as const;
}

function rangoFechas(dias: number): { desde: string; hasta: string } {
  const hasta = new Date();
  const desde = new Date();
  desde.setDate(desde.getDate() - dias);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { desde: fmt(desde), hasta: fmt(hasta) };
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
      const { desde, hasta } = rangoFechas(diasClamped);
      return equipoTallerService.rendimientoDetallado({ desde, hasta, dias: diasClamped });
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
