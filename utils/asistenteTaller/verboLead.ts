import type { PipelineComercialItem } from '@/services/pipelineComercialService';

export type VerboId =
  | 'cotizar'
  | 'revisar_precios'
  | 'enviar'
  | 'marcar_aceptada'
  | 'contestar'
  | 'agendar'
  | 'empezar'
  | 'confirmar';

export type LeadDecision = {
  id: string;
  verbo: VerboId;
  verboLabel: string;
  quien: string;
  telefono: string;
  auto: string;
  pedido: string;
  folio: string;
  estado: string;
  rank: number;
};

const LABEL: Record<VerboId, string> = {
  cotizar: 'Cotizar',
  revisar_precios: 'Revisar precios',
  enviar: 'Enviar',
  marcar_aceptada: 'Marcar aceptada',
  contestar: 'Contestar',
  agendar: 'Agendar',
  empezar: 'Empezar',
  confirmar: 'Confirmar',
};

const RANK: Record<VerboId, number> = {
  agendar: 1,
  confirmar: 2,
  enviar: 3,
  revisar_precios: 4,
  cotizar: 5,
  marcar_aceptada: 6,
  contestar: 7,
  empezar: 8,
};

const CERRADOS = new Set(['completado', 'rechazado_perdido']);

function estadoDe(verbo: VerboId, item: PipelineComercialItem): string {
  if (item.visto_sin_respuesta) return 'La vio y no contestó';
  if (item.demorado_48h || item.esperando_respuesta_24h) return 'Sin respuesta';
  switch (verbo) {
    case 'cotizar': return 'Sin cotización';
    case 'revisar_precios': return 'Faltan precios';
    case 'enviar': return 'Lista para enviar';
    case 'contestar': return 'Enviada';
    case 'marcar_aceptada': return 'Enviada';
    case 'agendar': return 'Aceptada, sin hora';
    case 'confirmar': return 'Pedido nuevo';
    case 'empezar':
      return item.fecha_agendada && item.estado_normalizado !== 'en_ejecucion'
        ? 'Con hora'
        : 'En el taller';
    default: return '';
  }
}

function quienDe(item: PipelineComercialItem): string {
  const nombre = (item.cliente_nombre || '').trim();
  if (nombre) return nombre;
  const tel = (item.cliente_telefono || '').trim();
  return tel || 'Cliente';
}

function verboDe(item: PipelineComercialItem): VerboId | null {
  if (CERRADOS.has(item.estado_normalizado)) return null;

  if (item.horario_por_confirmar && !item.fecha_agendada) return 'agendar';

  if (
    item.fecha_agendada
    && !item.horario_por_confirmar
    && (item.estado_normalizado === 'aceptado_agendado' || item.estado_normalizado === 'en_ejecucion')
  ) {
    return 'empezar';
  }

  const esOrdenApp = item.tipo_entidad === 'solicitud_publica' || item.tipo_entidad === 'oferta' || item.tipo_entidad === 'orden_directa';
  if (esOrdenApp && item.estado_normalizado === 'nuevo') return 'confirmar';
  if (esOrdenApp && (item.estado_normalizado === 'en_ejecucion' || item.estado_raw === 'pagada' || item.estado_raw === 'pagada_parcialmente')) {
    return 'empezar';
  }

  const esBorrador = item.estado_raw === 'borrador' || item.en_edicion;
  if (esBorrador && item.cotizacion_id) {
    if ((item.pendientes_revision?.length ?? 0) > 0 || item.listo_para_enviar === false) {
      return 'revisar_precios';
    }
    return 'enviar';
  }

  if (item.estado_normalizado === 'cotizacion_enviada' || item.estado_raw === 'enviada') {
    const hayQueCompartir = item.entrega_via === 'link_publico' || item.entrega_via === 'whatsapp_template' || item.es_libre;
    return hayQueCompartir ? 'contestar' : 'marcar_aceptada';
  }

  if (item.estado_normalizado === 'en_ejecucion') return 'empezar';

  if (!item.cotizacion_id && (item.conversation_id || item.estado_normalizado === 'nuevo') && !esOrdenApp) {
    return 'cotizar';
  }

  return null;
}

export function decisionesDePipeline(items: PipelineComercialItem[]): LeadDecision[] {
  const vistos = new Set<string>();
  const out: LeadDecision[] = [];
  for (const item of items) {
    const verbo = verboDe(item);
    if (!verbo) continue;
    const id = item.entidad_id;
    if (!id || vistos.has(id)) continue;
    vistos.add(id);
    out.push({
      id,
      verbo,
      verboLabel: LABEL[verbo],
      quien: quienDe(item),
      telefono: (item.cliente_telefono || '').trim(),
      auto: (item.vehiculo_resumen || '').trim(),
      pedido: (item.servicio_resumen || '').trim(),
      folio: (item.numero_publico || '').trim(),
      estado: estadoDe(verbo, item),
      rank: RANK[verbo],
    });
  }
  out.sort((a, b) => a.rank - b.rank || a.quien.localeCompare(b.quien, 'es'));
  return out.slice(0, 12);
}

export function verboLabel(verbo: VerboId): string {
  return LABEL[verbo];
}
