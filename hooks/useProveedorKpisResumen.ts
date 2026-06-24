import { useQuery } from '@tanstack/react-query';
import {
  kpisProveedorService,
  type ProveedorKpisResumen,
} from '@/services/kpisProveedorService';

/** Clave estable para compartir KPIs entre pantallas (misma ventana = misma petición/caché). */
export function proveedorKpisResumenQueryKey(dias: number) {
  const d = Math.min(365, Math.max(1, Math.round(dias)));
  return ['proveedor-kpis-resumen', d] as const;
}

/** Nivel mostrado en el widget según score compuesto (0–100). */
export function targetTierNameForScore(score: number): string {
  if (score === 0) return 'Sin actividad';
  if (score >= 90) return 'Elite';
  if (score >= 75) return 'Máster';
  if (score >= 55) return 'Pro';
  return 'En ascenso';
}

type Options = {
  enabled: boolean;
  dias?: number;
};

/**
 * KPIs agregados del proveedor (backend). Usa React Query para que index y
 * `RendimientoKpisContent` compartan caché y no muestren porcentajes distintos.
 */
export function useProveedorKpisResumen({ enabled, dias = 30 }: Options) {
  const diasClamped = Math.min(365, Math.max(1, Math.round(dias)));

  const { data, isFetching, error, refetch } = useQuery({
    queryKey: proveedorKpisResumenQueryKey(diasClamped),
    queryFn: async (): Promise<ProveedorKpisResumen> => {
      const result = await kpisProveedorService.obtenerResumen(diasClamped);
      if (!result.success || !result.data) {
        throw new Error(result.message ?? 'No se pudieron cargar los KPIs');
      }
      return result.data;
    },
    enabled,
    /** Más corto que el default global (5m) para alinear home y detalle tras actividad. */
    staleTime: 30 * 1000,
  });

  const errorMessage =
    error instanceof Error ? error.message : error != null ? String(error) : null;

  const loading = isFetching;

  const progress = data != null ? data.score_rendimiento : undefined;
  const targetTierName =
    data != null
      ? targetTierNameForScore(data.score_rendimiento)
      : loading
        ? 'Cargando…'
        : errorMessage != null
          ? 'Sin datos'
          : '—';

  const ventanaDiasMostrada = data?.ventana_dias ?? diasClamped;

  return {
    data,
    loading,
    error: errorMessage,
    refresh: refetch,
    progress,
    targetTierName,
    ventanaDiasMostrada,
    hasData: Boolean(data),
  };
}
