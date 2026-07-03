import type { QueryClient } from '@tanstack/react-query';

export const ASIGNACIONES_MECANICO_QUERY_KEY = 'asignaciones-mecanico';

/** Invalida la lista de órdenes/citas del mecánico en home y pantallas relacionadas. */
export function invalidateAsignacionesMecanicoQueries(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: [ASIGNACIONES_MECANICO_QUERY_KEY] });
}
