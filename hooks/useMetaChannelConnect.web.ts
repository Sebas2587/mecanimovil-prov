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
import {
  confirmChannelConnectGuards,
  extraerErrorWhatsAppDeApi,
  showWhatsAppConnectAlert,
} from '@/utils/whatsappConnectGuards';
import { showAlert } from '@/utils/platformAlert';

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
      const allowed = await confirmChannelConnectGuards(slug);
      if (!allowed) return false;

      const sessionRef: MetaEmbeddedSession = {};
      let removeListener: (() => void) | null = null;
      let signupFailed = false;

      try {
        const start = await omnichannelService.iniciarConexion(slug);
        const embedded = start.embedded;
        const useEmbeddedSdk =
          slug === 'whatsapp' && embedded?.enabled && embedded.config_id && embedded.app_id;

        if (useEmbeddedSdk) {
          removeListener = listenEmbeddedSignupSession((event) => {
            if (event.kind === 'session') {
              Object.assign(sessionRef, event.data);
              return;
            }
            if (event.kind === 'cancel') {
              signupFailed = true;
              showWhatsAppConnectAlert('cancelado');
              return;
            }
            signupFailed = true;
            const errMsg = event.data.error_message
              ? String(event.data.error_message)
              : undefined;
            showWhatsAppConnectAlert(
              inferEmbeddedErrorCode(errMsg),
              errMsg,
            );
          });
          await loadFacebookSdk(embedded.app_id, embedded.graph_version || 'v21.0');
          const { code } = await launchEmbeddedSignup({
            configId: embedded.config_id,
            channel: slug,
          });
          if (signupFailed) return false;
          try {
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
            } else if (slug === 'whatsapp') {
              showWhatsAppConnectAlert(
                completion.error_code,
                completion.message,
                completion.instruction,
              );
            } else {
              Alert.alert(
                'No se pudo conectar',
                completion.message || 'Pulsa Conectar e intenta de nuevo.',
              );
            }
          } catch (completeError: unknown) {
            if (slug === 'whatsapp') {
              const parsed = extraerErrorWhatsAppDeApi(completeError);
              showWhatsAppConnectAlert(parsed.error_code, parsed.message, parsed.instruction);
            } else {
              Alert.alert('Error', extractApiError(completeError, 'No se pudo conectar con Meta.'));
            }
          }
          return true;
        }

        if (!start.auth_url) {
          throw new Error('Meta no está configurado para conexión embebida');
        }
        const popupResult = await openOAuthPopup(start.auth_url);
        if (popupResult.success === false) {
          if (slug === 'whatsapp') {
            showWhatsAppConnectAlert(
              popupResult.error_code,
              popupResult.message,
              popupResult.instruction,
            );
          } else {
            Alert.alert(
              'No se pudo conectar',
              popupResult.message || 'Pulsa Conectar e intenta de nuevo.',
            );
          }
          return false;
        }
        return true;
      } catch (error: unknown) {
        if (error instanceof Error && error.message === 'cancelled') {
          if (slug === 'whatsapp' && !signupFailed) {
            showWhatsAppConnectAlert('cancelado');
          }
          return false;
        }
        if (error instanceof Error && error.message === 'facebook_sin_codigo') {
          if (!signupFailed) showWhatsAppConnectAlert('facebook_sin_negocio');
          return false;
        }
        if (error instanceof Error && error.message === 'popup_blocked') {
          showAlert(
            'Ventana bloqueada',
            'Permite ventanas emergentes para conectar con Meta o usa la app móvil.',
          );
          return false;
        }
        if (slug === 'whatsapp') {
          const parsed = extraerErrorWhatsAppDeApi(error);
          showWhatsAppConnectAlert(parsed.error_code, parsed.message || extractApiError(error, ''), parsed.instruction);
        } else {
          Alert.alert('Error', extractApiError(error, 'No se pudo conectar con Meta.'));
        }
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

function inferEmbeddedErrorCode(message?: string) {
  const raw = (message || '').toLowerCase();
  if (raw.includes('permission') || raw.includes('admin')) return 'sin_permisos_admin';
  if (raw.includes('whatsapp')) return 'sin_whatsapp_business';
  return 'generico';
}
