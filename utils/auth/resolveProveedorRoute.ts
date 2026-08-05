import type { Router } from 'expo-router';
import type { EstadoProveedor } from '@/services/api';

export type ProveedorRouteHref =
  | '/(tabs)'
  | '/(onboarding)/tipo-cuenta'
  | '/(onboarding)/informacion-basica'
  | '/(auth)/login';

export type ProveedorRoute =
  | { kind: 'retry' }
  | { kind: 'stay' }
  | { kind: 'href'; href: ProveedorRouteHref };

/**
 * Resuelve la ruta canónica según estado del proveedor.
 * Única fuente de verdad para post-login y gates de navegación.
 */
export function resolveProveedorRoute(
  estado: EstadoProveedor | null | undefined,
  options?: { authenticated?: boolean },
): ProveedorRoute {
  if (options?.authenticated === false) {
    return { kind: 'href', href: '/(auth)/login' };
  }

  if (estado == null) {
    return { kind: 'retry' };
  }

  if (estado.estado_verificacion === 'aprobado') {
    return { kind: 'href', href: '/(tabs)' };
  }

  if (estado.onboarding_completado) {
    return { kind: 'href', href: '/(tabs)' };
  }

  if (estado.necesita_onboarding === false) {
    return { kind: 'href', href: '/(tabs)' };
  }

  if (!estado.tiene_perfil) {
    return { kind: 'href', href: '/(onboarding)/tipo-cuenta' };
  }

  if (estado.onboarding_iniciado) {
    return { kind: 'href', href: '/(onboarding)/informacion-basica' };
  }

  if (estado.necesita_onboarding !== false && !estado.onboarding_completado) {
    return { kind: 'href', href: '/(onboarding)/tipo-cuenta' };
  }

  return { kind: 'href', href: '/(tabs)' };
}

/** true si el usuario no debería ver la pantalla tipo-cuenta (registro inicial). */
export function shouldSkipTipoCuenta(estado: EstadoProveedor | null | undefined): boolean {
  if (!estado) return false;
  if (estado.estado_verificacion === 'aprobado') return true;
  if (estado.onboarding_completado) return true;
  if (estado.necesita_onboarding === false) return true;
  if (estado.tiene_perfil && estado.onboarding_iniciado) return true;
  return false;
}

/** Aplica la ruta resuelta. @returns false si no navegó (retry/stay). */
export function applyProveedorRoute(router: Router, route: ProveedorRoute): boolean {
  if (route.kind === 'retry' || route.kind === 'stay') {
    return false;
  }
  router.replace(route.href as any);
  return true;
}
