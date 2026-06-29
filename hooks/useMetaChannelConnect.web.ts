import { useCallback, useRef } from 'react';
import { Alert } from 'react-native';
import omnichannelService, { type CanalSlug } from '@/services/omnichannelService';
import {
  launchEmbeddedSignup,
  listenEmbeddedSignupSession,
  loadFacebookSdk,
  openOAuthPopup,
  type MetaEmbeddedSession,
} from '@/utils/metaFacebookSdk.web';

function extractApiError(error: unknown, fallback: string): string {
  if (error && typeof error === 'object' && 'response' in error) {
    const data = (error as { response?: { data?: { error?: string; message?: string } } }).response?.data;
    return data?.error || data?.message || fallback;
  }
  if (error instanceof Error) return error.message;
  return fallback;
}

export function useMetaChannelConnect(onComplete: () => void) {
  const connectingRef = useRef<CanalSlug | null>(null);

  const connectEmbedded = useCallback(
    async (slug: CanalSlug) => {
      const start = await omnichannelService.iniciarConexion(slug);
      const embedded = start.embedded;
      const sessionRef: MetaEmbeddedSession = {};
      let removeListener: (() => void) | null = null;

      try {
        if (embedded?.enabled && embedded.config_id && embedded.app_id) {
          removeListener = listenEmbeddedSignupSession((session) => {
            Object.assign(sessionRef, session);
          });
          await loadFacebookSdk(embedded.app_id, embedded.graph_version || 'v21.0');
          const { code } = await launchEmbeddedSignup({
            configId: embedded.config_id,
            channel: slug,
          });
          const completion = await omnichannelService.completarConexion({
            connection_id: start.connection_id,
            code,
            phone_number_id: sessionRef.phone_number_id,
            waba_id: sessionRef.waba_id,
            business_id: sessionRef.business_id,
            shared_waba_ids: sessionRef.waba_ids,
          });
          if (completion.success) {
            Alert.alert('Listo', completion.message || 'Canal conectado correctamente.');
          } else if (completion.needs_phone_number_id) {
            Alert.alert(
              'Casi listo',
              completion.message || 'Autorización recibida. Completa el Phone Number ID en la app si se solicita.',
            );
          } else {
            Alert.alert('No se pudo conectar', completion.message || 'Intenta de nuevo.');
          }
          return true;
        }

        if (!start.auth_url) {
          throw new Error('Meta no está configurado para conexión embebida');
        }
        await openOAuthPopup(start.auth_url);
        return true;
      } catch (error: unknown) {
        if (error instanceof Error && error.message === 'cancelled') {
          return false;
        }
        if (error instanceof Error && error.message === 'popup_blocked') {
          Alert.alert(
            'Ventana bloqueada',
            'Permite ventanas emergentes para conectar con Meta o usa la app móvil.',
          );
          return false;
        }
        Alert.alert('Error', extractApiError(error, 'No se pudo conectar con Meta.'));
        return false;
      } finally {
        removeListener?.();
        onComplete();
      }
    },
    [onComplete],
  );

  const connect = useCallback(
    async (slug: CanalSlug) => {
      connectingRef.current = slug;
      try {
        return await connectEmbedded(slug);
      } finally {
        connectingRef.current = null;
      }
    },
    [connectEmbedded],
  );

  const isConnecting = useCallback((slug: CanalSlug) => connectingRef.current === slug, []);

  return { connect, isConnecting };
}
