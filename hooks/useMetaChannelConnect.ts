import { useCallback, useRef } from 'react';
import * as WebBrowser from 'expo-web-browser';
import omnichannelService, {
  type CanalSlug,
  type OpcionesAltaWhatsApp,
} from '@/services/omnichannelService';
import { esErrorCuota, mensajeCuotaError } from '@/utils/cuotaError';
import { showAlert } from '@/utils/platformAlert';
import {
  extraerErrorWhatsAppDeApi,
  showWhatsAppConnectAlert,
} from '@/utils/whatsappConnectGuards';

WebBrowser.maybeCompleteAuthSession();

export type MetaConnectResult = 'ok' | 'fail' | 'cuota' | 'cancelled';

function extractApiError(error: unknown, fallback: string): string {
  if (esErrorCuota(error)) return mensajeCuotaError(error, fallback);
  if (error && typeof error === 'object' && 'response' in error) {
    const data = (error as { response?: { data?: { error?: string; message?: string } } }).response?.data;
    return data?.error || data?.message || fallback;
  }
  if (error instanceof Error) return error.message;
  return fallback;
}

export function useMetaChannelConnect(onComplete: () => void) {
  const connectingRef = useRef<CanalSlug | null>(null);

  const connect = useCallback(async (
    slug: CanalSlug,
    opciones: OpcionesAltaWhatsApp = {},
  ): Promise<MetaConnectResult> => {
    try {
      connectingRef.current = slug;

      const result = await omnichannelService.iniciarConexion(slug, opciones);
      if (!result.auth_url) {
        throw new Error('No se recibió URL de autorización');
      }
      const session = await WebBrowser.openAuthSessionAsync(
        result.auth_url,
        result.embedded?.redirect_uri,
      );
      onComplete();
      if (session.type === 'cancel' || session.type === 'dismiss') {
        return 'cancelled';
      }
      return 'ok';
    } catch (error: unknown) {
      if (esErrorCuota(error)) {
        return 'cuota';
      }
      if (slug === 'whatsapp') {
        const parsed = extraerErrorWhatsAppDeApi(error);
        showWhatsAppConnectAlert(
          parsed.error_code,
          parsed.message || extractApiError(error, 'No se pudo iniciar la conexión.'),
          parsed.instruction,
        );
      } else {
        showAlert('Error', extractApiError(error, 'No se pudo iniciar la conexión.'));
      }
      return 'fail';
    } finally {
      connectingRef.current = null;
    }
  }, [onComplete]);

  const isConnecting = useCallback((slug: CanalSlug) => connectingRef.current === slug, []);

  return { connect, isConnecting };
}
