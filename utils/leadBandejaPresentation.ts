import {
  LEAD_CATEGORIA_LABELS,
  type LeadCategoria,
  type PipelineComercialItem,
} from '@/services/pipelineComercialService';

const LEAD_ALTA_INTENCION = new Set<LeadCategoria>([
  'interesado_calificado',
  'listo_agendar',
]);

export type LeadOperativoTag = {
  label: string;
  variant: 'warning' | 'info' | 'neutral' | 'primary' | 'success' | 'error';
};

export function leadCategoriaOf(item: PipelineComercialItem): LeadCategoria {
  return (item.lead_categoria || 'sin_calificar') as LeadCategoria;
}

/** Etiqueta de acción/estado. Una sola; no duplicar con calificación de lead. */
export function cotizacionEstaEnEdicion(item: PipelineComercialItem): boolean {
  if (item.tipo_entidad !== 'cotizacion_canal') return false;
  if (item.estado_raw !== 'borrador') return false;
  return Boolean(item.en_edicion || item.numero_publico);
}

export function leadOperativoTag(
  item: PipelineComercialItem,
  estadoLabel: string,
  estadoVariant: LeadOperativoTag['variant'],
): LeadOperativoTag {
  if (cotizacionEstaEnEdicion(item)) {
    return { label: 'En edición', variant: 'primary' };
  }
  if (item.fecha_agendada && !item.horario_por_confirmar) {
    const hora = item.hora_agendada ? ` ${item.hora_agendada}` : '';
    return { label: `Agendado${hora}`, variant: 'success' };
  }
  if (item.horario_por_confirmar) {
    return { label: 'Confirmar horario', variant: 'warning' };
  }
  if (item.esperando_respuesta_24h || item.demorado_48h) {
    return { label: item.demorado_48h ? 'Sin respuesta +48h' : 'Sin respuesta', variant: 'warning' };
  }
  if (item.visto_sin_respuesta) {
    return { label: 'Visto', variant: 'warning' };
  }
  return { label: estadoLabel, variant: estadoVariant };
}

/**
 * Calificación de lead: solo si aporta (p. ej. subió de curioso a interesado).
 * Se oculta si choca con el estado operativo.
 */
export function shouldShowLeadCategoria(item: PipelineComercialItem): boolean {
  const cat = leadCategoriaOf(item);
  if (cat === 'sin_calificar') return false;
  if (item.horario_por_confirmar) return false;
  if (item.esperando_respuesta_24h || item.demorado_48h) {
    return LEAD_ALTA_INTENCION.has(cat);
  }
  return LEAD_ALTA_INTENCION.has(cat) || cat === 'comparando' || cat === 'sin_presupuesto';
}

export function leadCategoriaLabel(item: PipelineComercialItem): string {
  const cat = leadCategoriaOf(item);
  return LEAD_CATEGORIA_LABELS[cat] || cat;
}

function esSilencioDeAdicional(item: PipelineComercialItem): boolean {
  if (!item.es_cotizacion_adicional) return false;
  return Boolean(
    item.esperando_respuesta_24h
    || item.demorado_48h
    || item.visto_sin_respuesta
    || item.estado_normalizado === 'cotizacion_enviada',
  );
}

export function leadMetaHint(item: PipelineComercialItem): string {
  if (cotizacionEstaEnEdicion(item)) return 'guarda y envía para actualizar el link';
  if (item.horario_por_confirmar) return 'elige día y hora';
  if (esSilencioDeAdicional(item)) {
    return 'trabajo adicional · la visita agendada sigue igual';
  }
  if (item.esperando_respuesta_24h || item.demorado_48h) {
    const cat = leadCategoriaOf(item);
    if (LEAD_ALTA_INTENCION.has(cat)) {
      return 'mostró interés · escribe, marca aceptada o cierra';
    }
    return 'escribe, marca aceptada o cierra el caso';
  }
  if (item.estado_normalizado === 'cotizacion_enviada') {
    if (item.visto_sin_respuesta) return 'abrió el enlace · escribe o cierra';
    return 'la IA recuerda una vez · si no contestan, escribe o cierra';
  }
  return '';
}

export function leadSheetHint(item: PipelineComercialItem): string | null {
  if (item.horario_por_confirmar) {
    return 'Confirma día y hora.';
  }
  if (esSilencioDeAdicional(item)) {
    return 'Es un trabajo adicional. El servicio ya agendado sigue igual. Escribe, márcalo aceptado o cierra solo este trabajo.';
  }
  if (item.esperando_respuesta_24h || item.demorado_48h) {
    const cat = leadCategoriaOf(item);
    if (LEAD_ALTA_INTENCION.has(cat)) {
      return 'Mostró interés. Escribe, marca aceptada o cierra el caso.';
    }
    return 'Escribe, marca aceptada o cierra el caso. La IA solo recuerda una vez.';
  }
  if (item.estado_normalizado === 'cotizacion_enviada') {
    return 'Esperando respuesta. La IA puede recordar una vez; el cierre del caso es tuyo.';
  }
  return null;
}
