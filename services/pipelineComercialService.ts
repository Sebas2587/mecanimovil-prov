import { getAPI } from './api';

export type EstadoPipelineNormalizado =
  | 'nuevo'
  | 'cotizacion_enviada'
  | 'en_negociacion'
  | 'aceptado_agendado'
  | 'rechazado_perdido'
  | 'en_ejecucion'
  | 'completado';

export type OrigenPipeline =
  | 'marketplace'
  | 'catalogo'
  | 'whatsapp'
  | 'instagram'
  | 'messenger'
  | 'canal'
  | 'manual';

export interface PipelineComercialItem {
  tipo_entidad: 'oferta' | 'cotizacion_canal' | 'cita_personal' | 'orden_directa' | 'solicitud_publica';
  entidad_id: string;
  origen: OrigenPipeline | string;
  estado_normalizado: EstadoPipelineNormalizado;
  estado_raw: string;
  cliente_nombre: string;
  cliente_telefono: string;
  vehiculo_resumen: string;
  servicio_resumen: string;
  monto_clp: number | null;
  fecha_referencia: string | null;
  fecha_limite_respuesta: string | null;
  tiempo_en_estado_horas: number | null;
  esperando_respuesta_24h: boolean;
  conversation_id: number | null;
  solicitud_id: string | null;
  oferta_id: string | null;
  orden_id: number | null;
  cita_id: number | null;
  cotizacion_id: number | null;
  miembro_taller_id: number | null;
  miembro_taller_nombre: string | null;
  template_generado_por_ia?: boolean;
}

export interface PipelineComercialResponse {
  count: number;
  results: PipelineComercialItem[];
  resumen: Record<EstadoPipelineNormalizado, number>;
  esperando_respuesta_24h_count: number;
}

export interface PipelineComercialParams {
  estado_normalizado?: EstadoPipelineNormalizado;
  origen?: OrigenPipeline;
  esperando_24h?: boolean;
  miembro_taller?: number;
  limite?: number;
}

const BASE = '/ordenes/pipeline-comercial/';

function buildQuery(params?: PipelineComercialParams): string {
  if (!params) return '';
  const search = new URLSearchParams();
  if (params.estado_normalizado) search.append('estado_normalizado', params.estado_normalizado);
  if (params.origen) search.append('origen', params.origen);
  if (params.esperando_24h) search.append('esperando_24h', 'true');
  if (params.miembro_taller != null) search.append('miembro_taller', String(params.miembro_taller));
  if (params.limite != null) search.append('limite', String(params.limite));
  const q = search.toString();
  return q ? `?${q}` : '';
}

const pipelineComercialService = {
  async listar(params?: PipelineComercialParams): Promise<PipelineComercialResponse> {
    const api = await getAPI();
    const response = await api.get(`${BASE}${buildQuery(params)}`);
    return response.data;
  },
};

export default pipelineComercialService;

export const ESTADO_PIPELINE_LABELS: Record<EstadoPipelineNormalizado, string> = {
  nuevo: 'Nuevo',
  cotizacion_enviada: 'Esperando respuesta',
  en_negociacion: 'En negociación',
  aceptado_agendado: 'Agendado',
  rechazado_perdido: 'Perdido',
  en_ejecucion: 'En ejecución',
  completado: 'Completado',
};

export const ORIGEN_PIPELINE_LABELS: Record<string, string> = {
  marketplace: 'Mecanimovil',
  catalogo: 'Catálogo',
  whatsapp: 'WhatsApp',
  instagram: 'Instagram',
  messenger: 'Messenger',
  canal: 'Canal',
  manual: 'Personal',
};
