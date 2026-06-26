import type { QueryClient } from '@tanstack/react-query';
import { SOLICITUDES_DISPONIBLES_QUERY_KEY } from '@/hooks/useSolicitudesDisponiblesQuery';
import { invalidateDashboardFinanzasQueries } from '@/hooks/useDashboardFinanzas';

/** Invalida caches de órdenes, ofertas, agenda, solicitudes, KPIs y finanzas del dashboard. */
export function invalidateProveedorMarketplaceQueries(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: ['ordenes-proveedor'] });
  void queryClient.invalidateQueries({ queryKey: ['ofertas-proveedor'] });
  void queryClient.invalidateQueries({ queryKey: ['citas-agenda-proveedor'] });
  void queryClient.invalidateQueries({ queryKey: ['citas-activas-proveedor'] });
  void queryClient.invalidateQueries({ queryKey: SOLICITUDES_DISPONIBLES_QUERY_KEY });
  void queryClient.invalidateQueries({ queryKey: ['proveedor-kpis-resumen'] });
  void queryClient.invalidateQueries({ queryKey: ['rendimiento-equipo-detallado'] });
  void queryClient.invalidateQueries({ queryKey: ['solicitud-detalle'] });
  void queryClient.invalidateQueries({ queryKey: ['cita-personal'] });
  invalidateDashboardFinanzasQueries(queryClient);
}
