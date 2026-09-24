import { Platform } from 'react-native';
import { router, type Href } from 'expo-router';

/**
 * Navegación atrás con fallback explícito.
 * En web, Expo Router suele ignorar router.back() / history.back(); replace al fallback es fiable.
 */
export function navigateBack(fallback: Href = '/(tabs)' as Href) {
  const canGoBack =
    typeof router.canGoBack === 'function' ? router.canGoBack() : false;

  // En web, canGoBack a veces dice que sí y el stack igual no tiene pantalla previa.
  if (Platform.OS !== 'web' && canGoBack) {
    router.back();
    return;
  }

  router.replace(fallback);
}
