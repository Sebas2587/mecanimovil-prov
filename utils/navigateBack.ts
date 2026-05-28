import { Platform } from 'react-native';
import { router, type Href } from 'expo-router';

/**
 * Navegación atrás con fallback explícito.
 * En web, Expo Router suele ignorar router.back() / history.back(); replace al fallback es fiable.
 */
export function navigateBack(fallback: Href = '/(tabs)' as Href) {
  if (Platform.OS === 'web') {
    router.replace(fallback);
    return;
  }

  const canGoBack =
    typeof router.canGoBack === 'function' ? router.canGoBack() : false;

  if (canGoBack) {
    router.back();
    return;
  }

  router.replace(fallback);
}
