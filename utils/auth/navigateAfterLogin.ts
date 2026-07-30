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
  // Si la cuenta ya está aprobada por admin o no necesita onboarding, ir a (tabs)
  if (estadoActual.estado_verificacion === 'aprobado' || estadoActual.necesita_onboarding === false) {
    router.replace('/(tabs)' as any);
    return;
  }
  if (estadoActual.necesita_onboarding && !estadoActual.onboarding_completado) {
    router.replace('/(onboarding)/tipo-cuenta');
    return;
  }
  router.replace('/(tabs)' as any);
}
