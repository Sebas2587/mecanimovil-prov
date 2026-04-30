import { useCallback, useEffect, useState } from 'react';
import {
  kpisProveedorService,
  type ProveedorKpisResumen,
} from '@/services/kpisProveedorService';

/** Nivel mostrado en el widget según score compuesto (0–100). */
export function targetTierNameForScore(score: number): string {
  if (score >= 90) return 'Elite';
  if (score >= 75) return 'Máster Pro';
  if (score >= 55) return 'Pro';
  return 'En ascenso';
}

type Options = {
  enabled: boolean;
  dias?: number;
};

/**
 * Carga KPIs agregados del proveedor (backend). No afecta app usuarios.
 */
export function useProveedorKpisResumen({ enabled, dias = 30 }: Options) {
  const [data, setData] = useState<ProveedorKpisResumen | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    const result = await kpisProveedorService.obtenerResumen(dias);
    setLoading(false);
    if (result.success && result.data) {
      setData(result.data);
    } else {
      setError(result.message ?? 'Error');
      setData(null);
    }
  }, [enabled, dias]);

  useEffect(() => {
    load();
  }, [load]);

  const progress = data?.score_rendimiento ?? 50;
  const targetTierName = targetTierNameForScore(progress);

  return {
    data,
    loading,
    error,
    refresh: load,
    progress,
    targetTierName,
  };
}
