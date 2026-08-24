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
export function leadOperativoTag(
  item: PipelineComercialItem,
  estadoLabel: string,
  estadoVariant: LeadOperativoTag['variant'],
): LeadOperativoTag {
  if (item.en_edicion || (item.tipo_entidad === 'cotizacion_canal' && item.estado_raw === 'borrador' && item.numero_publico)) {
    return { label: 'En edición', variant: 'primary' };
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

export function leadMetaHint(item: PipelineComercialItem): string {
  if (item.horario_por_confirmar) return 'elige día y hora';
  if (item.esperando_respuesta_24h || item.demorado_48h) {
    const cat = leadCategoriaOf(item);
    if (LEAD_ALTA_INTENCION.has(cat)) {
      return 'mostró interés · abre la cotización o cierra el caso';
    }
    return 'abre la cotización o cierra el caso';
  }
  return '';
}

export function leadSheetHint(item: PipelineComercialItem): string | null {
  if (item.horario_por_confirmar) {
    return 'Confirma día y hora.';
  }
  if (item.esperando_respuesta_24h || item.demorado_48h) {
    const cat = leadCategoriaOf(item);
    if (LEAD_ALTA_INTENCION.has(cat)) {
      return 'Mostró interés. Abre la cotización o cierra el caso.';
    }
    return 'Abre la cotización o cierra el caso.';
  }
  return null;
}
