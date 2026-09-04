import { useQuery } from '@tanstack/react-query';
import cotizacionCanalService, {
  type OpcionRepuesto,
} from '@/services/cotizacionCanalService';

export const OPCIONES_REPUESTO_KEY = 'opciones-repuesto';

export function useOpcionesRepuestoQuery(
  cotizacionId: number | null | undefined,
  repuestoId: string | null | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: [OPCIONES_REPUESTO_KEY, cotizacionId, repuestoId],
    queryFn: () => cotizacionCanalService.opcionesRepuesto(
      Number(cotizacionId),
      String(repuestoId),
    ),
    enabled: Boolean(enabled && cotizacionId && repuestoId),
    staleTime: 60_000,
  });
}

export function opcionesDesdeQuery(
  data: { opciones?: OpcionRepuesto[] } | undefined,
): OpcionRepuesto[] {
  return (data?.opciones || []).filter((o) => o && o.id);
}
