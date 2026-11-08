import { useQuery } from '@tanstack/react-query';
import {
  kpisProveedorService,
  type ProveedorKpisResumen,
} from '@/services/kpisProveedorService';
import { DASHBOARD_QUERY_STALE_MS } from '@/hooks/useDashboardFinanzas';

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

  const { data, isPending, isFetching, error, refetch } = useQuery({
    queryKey: proveedorKpisResumenQueryKey(diasClamped),
    queryFn: async (): Promise<ProveedorKpisResumen> => {
      const result = await kpisProveedorService.obtenerResumen(diasClamped);
      if (!result.success || !result.data) {
        throw new Error(result.message ?? 'No se pudieron cargar los KPIs');
      }
      return result.data;
    },
    enabled,
    staleTime: DASHBOARD_QUERY_STALE_MS,
    placeholderData: (previous) => previous,
  });

  const errorMessage =
    error instanceof Error ? error.message : error != null ? String(error) : null;

  /** Solo carga inicial sin caché; refetch en background no bloquea la UI. */
  const loading = isPending && data == null;
  const isRefetching = isFetching && data != null;

  const scorePresente = data != null && Number.isFinite(Number(data.score_rendimiento))
    ? Number(data.score_rendimiento)
    : null;
  const progress = scorePresente ?? undefined;
  const targetTierName =
    data != null
      ? (scorePresente == null ? '—' : targetTierNameForScore(scorePresente))
      : loading
        ? 'Cargando…'
        : errorMessage != null
          ? 'Sin datos'
          : '—';

  const ventanaDiasInformada = Number.isFinite(Number(data?.ventana_dias))
    ? Number(data?.ventana_dias)
    : null;

  return {
    data,
    loading,
    isRefetching,
    error: errorMessage,
    refresh: refetch,
    progress,
    targetTierName,
    ventanaDiasInformada,
    ventanaSolicitada: diasClamped,
    hasData: Boolean(data),
  };
}
