import { router } from 'expo-router';
import type { PipelineClienteCaso } from '@/services/pipelineComercialService';

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
