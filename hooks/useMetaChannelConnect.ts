import { useCallback, useRef } from 'react';
import { Linking } from 'react-native';
import omnichannelService, { type CanalSlug } from '@/services/omnichannelService';
import { esErrorCuota, mensajeCuotaError } from '@/utils/cuotaError';
import { showAlert } from '@/utils/platformAlert';
import {
  confirmChannelConnectGuards,
  extraerErrorWhatsAppDeApi,
  showWhatsAppConnectAlert,
} from '@/utils/whatsappConnectGuards';

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

export function useMetaChannelConnect(_onComplete: () => void) {
  const connectingRef = useRef<CanalSlug | null>(null);

  const connect = useCallback(async (slug: CanalSlug): Promise<MetaConnectResult> => {
    try {
      connectingRef.current = slug;
      const allowed = await confirmChannelConnectGuards(slug);
      if (!allowed) return 'cancelled';

      const result = await omnichannelService.iniciarConexion(slug);
      if (!result.auth_url) {
        throw new Error('No se recibió URL de autorización');
      }
      const canOpen = await Linking.canOpenURL(result.auth_url);
      if (!canOpen) {
        throw new Error('No se pudo abrir el navegador');
      }
      await Linking.openURL(result.auth_url);
      showAlert(
        slug === 'whatsapp' ? 'Continúa en Facebook' : 'Conectar canal',
        slug === 'whatsapp'
          ? 'Entra con el Facebook administrador del taller y elige WhatsApp Business. Al volver, te diremos si faltó algo.'
          : 'Completa el proceso en Meta y vuelve a la app. El estado se actualizará automáticamente.',
      );
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
  }, []);

  const isConnecting = useCallback((slug: CanalSlug) => connectingRef.current === slug, []);

  return { connect, isConnecting };
}
