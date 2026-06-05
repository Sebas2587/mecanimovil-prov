import { useCallback, useEffect, useState } from 'react';
import { serviciosAPI } from '@/services/api';
import {
  extraerEspecialidadesDesdeOfertas,
  type EspecialidadTag,
} from '@/utils/extraerEspecialidadesDesdeOfertas';

export function useEspecialidadesDesdeServicios(enabled: boolean) {
  const [especialidades, setEspecialidades] = useState<EspecialidadTag[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!enabled) {
      setEspecialidades([]);
      return;
    }

    setLoading(true);
    try {
      const ofertas = await serviciosAPI.obtenerMisServicios();
      const list = Array.isArray(ofertas) ? ofertas : [];
      setEspecialidades(extraerEspecialidadesDesdeOfertas(list));
    } catch {
      setEspecialidades([]);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { especialidades, loading, refresh };
}
