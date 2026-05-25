import type { Router } from 'expo-router';
import type { EstadoProveedor } from '@/services/api';

/**
 * Navegación post-login (email o Google) según estado del proveedor.
 */
export function navigateAfterLogin(
  router: Router,
  estadoActual: EstadoProveedor | null | undefined,
) {
  if (!estadoActual || !estadoActual.tiene_perfil) {
    router.replace('/(onboarding)/tipo-cuenta');
    return;
  }
  if (estadoActual.onboarding_iniciado && !estadoActual.onboarding_completado) {
    router.replace('/(onboarding)/tipo-cuenta');
    return;
  }
  router.replace('/(tabs)' as any);
}
