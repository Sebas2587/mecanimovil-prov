import type { Router } from 'expo-router';
import type { EstadoProveedor } from '@/services/api';
import { applyProveedorRoute, resolveProveedorRoute } from './resolveProveedorRoute';

/**
 * Navegación post-login (email o Google) según estado del proveedor.
 * @returns false si no navegó (estado null — el caller debe mostrar error/reintentar)
 */
export function navigateAfterLogin(
  router: Router,
  estadoActual: EstadoProveedor | null | undefined,
): boolean {
  const route = resolveProveedorRoute(estadoActual, { authenticated: true });
  return applyProveedorRoute(router, route);
}
