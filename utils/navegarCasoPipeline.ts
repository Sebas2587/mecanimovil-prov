import { router } from 'expo-router';
import type {
  PipelineClienteCaso,
  PipelineComercialItem,
} from '@/services/pipelineComercialService';
import { omnichannelChatHref } from '@/utils/chatRoutes';

export function navegarCasoPipeline(caso: PipelineClienteCaso) {
  if (caso.horario_por_confirmar && caso.cita_id) {
    router.push(`/cita-agenda-personal/${caso.cita_id}`);
    return;
  }
  if (caso.tipo_entidad === 'cotizacion_canal' && caso.cotizacion_id) {
    router.push(`/cotizacion-canal/${caso.cotizacion_id}`);
    return;
  }
  if (caso.solicitud_id) {
    router.push(`/solicitud-detalle/${caso.solicitud_id}`);
    return;
  }
  if (caso.oferta_id) {
    router.push(`/oferta-detalle/${caso.oferta_id}`);
    return;
  }
  if (caso.cita_id) {
    router.push(`/cita-agenda-personal/${caso.cita_id}`);
    return;
  }
  if (caso.orden_id) {
    router.push(`/orden-detalle/${caso.orden_id}`);
  }
}

/**
 * Destino de “Requiere tu atención”: el folio, no el chat.
 * Sin respuesta +48h se gestiona en la cotización (cerrar / aceptar / compartir).
 */
export function navegarAtencionHoy(item: PipelineComercialItem) {
  if (item.horario_por_confirmar && item.cita_id) {
    router.push(`/cita-agenda-personal/${item.cita_id}`);
    return;
  }
  if (item.cotizacion_id) {
    router.push(`/cotizacion-canal/${item.cotizacion_id}`);
    return;
  }
  if (item.solicitud_id) {
    router.push(`/solicitud-detalle/${item.solicitud_id}`);
    return;
  }
  if (item.oferta_id) {
    router.push(`/oferta-detalle/${item.oferta_id}`);
    return;
  }
  if (item.cita_id) {
    router.push(`/cita-agenda-personal/${item.cita_id}`);
    return;
  }
  if (item.conversation_id) {
    router.push(omnichannelChatHref(item.conversation_id));
    return;
  }
  router.push('/(tabs)/bandeja?filtro=esperando_24h');
}
