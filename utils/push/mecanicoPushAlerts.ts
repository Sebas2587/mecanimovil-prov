import type { Alerta, TipoAlerta } from '@/context/AlertsContext';
import type { PushNotificationData } from '@/utils/push/navigateByPushNotification';

export const TIPOS_ALERTA_MECANICO: TipoAlerta[] = [
  'orden_asignada_mecanico',
  'checklist_pendiente',
];

export const TIPOS_ALERTA_TALLER: TipoAlerta[] = [
  'mercado_pago_no_configurado',
  'zonas_cobertura_no_configuradas',
  'creditos_bajos',
  'pago_expirado',
  'suscripcion_por_vencer',
  'suscripcion_vencida',
  'suscripcion_pago_fallido',
  'creditos_agotados',
];

function pickOrdenId(data: PushNotificationData): string | null {
  const raw = data.orden_id ?? data.order_id ?? data.ordenId;
  if (raw == null) return null;
  const id = String(raw).trim();
  return id.length > 0 ? id : null;
}

function pickSolicitudId(data: PushNotificationData): string | null {
  const raw = data.solicitud_id ?? data.solicitudId;
  if (raw == null) return null;
  const id = String(raw).trim();
  return id.length > 0 ? id : null;
}

export function alertaDesdePushMecanico(
  data: PushNotificationData,
): Omit<Alerta, 'id' | 'fecha' | 'leida'> | null {
  const type = typeof data.type === 'string' ? data.type : '';
  const ordenId = pickOrdenId(data);
  const solicitudId = pickSolicitudId(data);
  const tituloPush = typeof data.title === 'string' ? data.title : '';
  const mensajePush =
    typeof data.body === 'string'
      ? data.body
      : typeof data.message === 'string'
        ? data.message
        : '';

  if (type === 'orden_asignada_mecanico') {
    return {
      tipo: 'orden_asignada_mecanico',
      titulo: tituloPush || 'Nueva orden asignada',
      mensaje: mensajePush || 'El taller te asignó un servicio.',
      accion: ordenId
        ? { texto: 'Ver orden', ruta: `/orden-detalle/${ordenId}` }
        : solicitudId
          ? { texto: 'Ver solicitud', ruta: `/solicitud-detalle/${solicitudId}` }
          : undefined,
      prioridad: 'alta',
    };
  }

  if (type === 'checklist_pendiente') {
    return {
      tipo: 'checklist_pendiente',
      titulo: tituloPush || 'Checklist pendiente',
      mensaje: mensajePush || 'Tienes un checklist por completar en tu orden asignada.',
      accion: ordenId
        ? { texto: 'Abrir orden', ruta: `/orden-detalle/${ordenId}` }
        : solicitudId
          ? { texto: 'Ver solicitud', ruta: `/solicitud-detalle/${solicitudId}` }
          : undefined,
      prioridad: 'alta',
    };
  }

  return null;
}

export function esTipoAlertaMecanico(tipo: TipoAlerta): boolean {
  return TIPOS_ALERTA_MECANICO.includes(tipo);
}
