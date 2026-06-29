import { useCallback, useRef } from 'react';
import { Alert, Linking } from 'react-native';
import omnichannelService, { type CanalSlug } from '@/services/omnichannelService';

function extractApiError(error: unknown, fallback: string): string {
  if (error && typeof error === 'object' && 'response' in error) {
    const data = (error as { response?: { data?: { error?: string; message?: string } } }).response?.data;
    return data?.error || data?.message || fallback;
  }
  if (error instanceof Error) return error.message;
  return fallback;
}

export function useMetaChannelConnect(_onComplete: () => void) {
  const connectingRef = useRef<CanalSlug | null>(null);

  const connect = useCallback(async (slug: CanalSlug) => {
    try {
      connectingRef.current = slug;
      const result = await omnichannelService.iniciarConexion(slug);
      if (!result.auth_url) {
        throw new Error('No se recibió URL de autorización');
      }
      const canOpen = await Linking.canOpenURL(result.auth_url);
      if (!canOpen) {
        throw new Error('No se pudo abrir el navegador');
      }
      await Linking.openURL(result.auth_url);
      Alert.alert(
        'Conectar canal',
        slug === 'whatsapp'
          ? 'Completa el proceso en Meta con tu cuenta WhatsApp Business y vuelve a la app.'
          : 'Completa el proceso en Meta y vuelve a la app. El estado se actualizará automáticamente.',
      );
      return true;
    } catch (error: unknown) {
      Alert.alert('Error', extractApiError(error, 'No se pudo iniciar la conexión.'));
      return false;
    } finally {
      connectingRef.current = null;
    }
  }, []);

  const isConnecting = useCallback((slug: CanalSlug) => connectingRef.current === slug, []);

  return { connect, isConnecting };
}
