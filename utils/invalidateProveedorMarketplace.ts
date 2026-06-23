import type { QueryClient } from '@tanstack/react-query';
import { SOLICITUDES_DISPONIBLES_QUERY_KEY } from '@/hooks/useSolicitudesDisponiblesQuery';

/** Invalida caches de órdenes, ofertas, agenda, solicitudes y KPIs de rendimiento. */
export function invalidateProveedorMarketplaceQueries(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: ['ordenes-proveedor'] });
  void queryClient.invalidateQueries({ queryKey: ['ofertas-proveedor'] });
  void queryClient.invalidateQueries({ queryKey: ['citas-agenda-proveedor'] });
  void queryClient.invalidateQueries({ queryKey: ['citas-activas-proveedor'] });
  void queryClient.invalidateQueries({ queryKey: SOLICITUDES_DISPONIBLES_QUERY_KEY });
  void queryClient.invalidateQueries({ queryKey: ['proveedor-kpis-resumen'] });
  void queryClient.invalidateQueries({ queryKey: ['rendimiento-equipo-detallado'] });
}
