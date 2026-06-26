import type { Router } from 'expo-router';
import type { QueryClient } from '@tanstack/react-query';
import { prefetchSolicitudDetalle } from '@/hooks/useSolicitudDetalleQuery';
import { openOfertaDetalle } from '@/utils/navigateProveedorDetalle';

export type PushNotificationData = Record<string, unknown>;

function pickSolicitudId(data: PushNotificationData): string | null {
  const raw = data.solicitud_id ?? data.solicitudId;
  if (raw == null) return null;
  const id = String(raw).trim();
  return id.length > 0 ? id : null;
}

function pickOfertaId(data: PushNotificationData): string | null {
  const raw = data.oferta_id ?? data.ofertaId;
  if (raw == null) return null;
  const id = String(raw).trim();
  return id.length > 0 ? id : null;
}

/**
 * Navega según el payload `data` de una push Expo (tap o cold start).
 */
export function navigateByPushNotification(
  router: Router,
  data: PushNotificationData | null | undefined,
  queryClient?: QueryClient,
): boolean {
  if (!data || typeof data !== 'object') return false;

  const type = typeof data.type === 'string' ? data.type : '';
  const solicitudId = pickSolicitudId(data);
  const ofertaId = pickOfertaId(data);

  switch (type) {
    case 'nueva_solicitud':
    case 'catalog_assignment':
      if (solicitudId) {
        if (queryClient) void prefetchSolicitudDetalle(queryClient, solicitudId);
        router.push(`/solicitud-detalle/${solicitudId}`);
        return true;
      }
      router.push('/solicitudes-disponibles');
      return true;

    case 'chat_message':
    case 'nuevo_mensaje_chat':
      if (ofertaId) {
        router.push(`/chat-oferta/${ofertaId}`);
        return true;
      }
      if (solicitudId) {
        if (queryClient) void prefetchSolicitudDetalle(queryClient, solicitudId);
        router.push(`/solicitud-detalle/${solicitudId}`);
        return true;
      }
      router.push('/(tabs)/chats');
      return true;

    case 'new_offer':
    case 'nueva_oferta':
    case 'solicitud_adjudicada':
    case 'recordatorio_pago':
    case 'cambio_estado':
    case 'pago_expirado':
    case 'solicitud_cancelada_cliente':
      if (solicitudId) {
        if (queryClient) void prefetchSolicitudDetalle(queryClient, solicitudId);
        router.push(`/solicitud-detalle/${solicitudId}`);
        return true;
      }
      if (ofertaId) {
        if (queryClient) {
          openOfertaDetalle(router, queryClient, ofertaId);
        } else {
          router.push(`/oferta-detalle/${ofertaId}`);
        }
        return true;
      }
      break;

    case 'suscripcion_por_vencer':
    case 'suscripcion_vencida':
    case 'suscripcion_pago_fallido':
    case 'creditos_agotados':
      router.push('/creditos');
      return true;

    default:
      break;
  }

  router.push('/notificaciones');
  return true;
}
