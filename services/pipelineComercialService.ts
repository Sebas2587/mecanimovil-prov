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
  | 'manual'
  | 'directo';

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
  visto_sin_respuesta?: boolean;
  demorado_48h?: boolean;
  horario_por_confirmar?: boolean;
  listo_para_enviar?: boolean;
  pendientes_revision?: string[];
  es_cotizacion_adicional?: boolean;
  lead_categoria?: LeadCategoria;
  lead_score?: number;
  numero_publico?: string | null;
  es_libre?: boolean;
  entrega_via?: string | null;
  en_edicion?: boolean;
}

export type LeadCategoria =
  | 'sin_calificar'
  | 'curioso'
  | 'comparando'
  | 'sin_presupuesto'
  | 'interesado_calificado'
  | 'listo_agendar'
  | 'no_automotriz'
  | 'cerrado_perdido';

export const LEAD_CATEGORIA_LABELS: Record<LeadCategoria, string> = {
  sin_calificar: 'Sin calificar',
  curioso: 'Curioso',
  comparando: 'Comparando',
  sin_presupuesto: 'Sin presupuesto',
  interesado_calificado: 'Calificado',
  listo_agendar: 'Listo agendar',
  no_automotriz: 'No automotriz',
  cerrado_perdido: 'Cerrado / Perdido',
};

export const LEAD_CATEGORIA_VARIANT: Record<
  LeadCategoria,
  'neutral' | 'primary' | 'success' | 'warning' | 'error' | 'info'
> = {
  sin_calificar: 'neutral',
  curioso: 'neutral',
  comparando: 'info',
  sin_presupuesto: 'error',
  interesado_calificado: 'success',
  listo_agendar: 'warning',
  no_automotriz: 'neutral',
  cerrado_perdido: 'neutral',
};

export interface PipelineComercialResponse {
  count: number;
  results: PipelineComercialItem[];
  resumen: Record<EstadoPipelineNormalizado, number>;
  esperando_respuesta_24h_count: number;
  borradores_pendientes_count?: number;
}

export type PrioridadClientePipeline = 'todos' | 'con_accion' | 'cerrados';

export interface PipelineClienteVehiculo {
  key: string;
  resumen: string;
  patente: string;
}

export interface PipelineClienteCaso {
  tipo_entidad: PipelineComercialItem['tipo_entidad'];
  entidad_id: string;
  numero_publico?: string | null;
  servicio_resumen: string;
  monto_clp: number | null;
  estado_normalizado: EstadoPipelineNormalizado;
  estado_raw: string;
  origen: OrigenPipeline | string;
  fecha_referencia: string | null;
  cotizacion_id: number | null;
  cita_id: number | null;
  oferta_id: string | null;
  solicitud_id: string | null;
  orden_id: number | null;
  conversation_id: number | null;
  horario_por_confirmar?: boolean;
  en_edicion?: boolean;
  vehiculo_resumen?: string;
  vehiculo_patente?: string;
}

export interface PipelineClienteVehiculoFicha extends PipelineClienteVehiculo {
  casos: PipelineClienteCaso[];
}

export interface PipelineClienteItem {
  cliente_key: string;
  cliente_nombre: string;
  cliente_telefono: string;
  origenes: string[];
  vehiculos: PipelineClienteVehiculo[];
  casos_count: number;
  enviadas: number;
  aceptadas: number;
  rechazadas: number;
  abiertas: number;
  ultima_actividad: string | null;
  conversation_id?: number | null;
}

export interface PipelineClienteFicha extends Omit<PipelineClienteItem, 'vehiculos'> {
  vehiculos: PipelineClienteVehiculoFicha[];
}

export interface PipelineClientesResponse {
  count: number;
  results: PipelineClienteItem[];
  resumen: {
    todos: number;
    con_accion: number;
    cerrados: number;
  };
}

export interface PipelineComercialParams {
  estado_normalizado?: EstadoPipelineNormalizado;
  origen?: OrigenPipeline;
  esperando_24h?: boolean;
  miembro_taller?: number;
  limite?: number;
  q?: string;
}

export interface PipelineClientesParams {
  origen?: OrigenPipeline;
  prioridad?: PrioridadClientePipeline;
  limite?: number;
  q?: string;
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
  const trimmed = params.q?.trim();
  if (trimmed) search.append('q', trimmed);
  const q = search.toString();
  return q ? `?${q}` : '';
}

function buildClientesQuery(params?: PipelineClientesParams): string {
  if (!params) return '';
  const search = new URLSearchParams();
  if (params.origen) search.append('origen', params.origen);
  if (params.prioridad && params.prioridad !== 'todos') {
    search.append('prioridad', params.prioridad);
  }
  if (params.limite != null) search.append('limite', String(params.limite));
  const trimmed = params.q?.trim();
  if (trimmed) search.append('q', trimmed);
  const q = search.toString();
  return q ? `?${q}` : '';
}

const pipelineComercialService = {
  async listar(params?: PipelineComercialParams): Promise<PipelineComercialResponse> {
    const api = await getAPI();
    const response = await api.get(`${BASE}${buildQuery(params)}`);
    return response.data;
  },
  async listarClientes(params?: PipelineClientesParams): Promise<PipelineClientesResponse> {
    const api = await getAPI();
    const response = await api.get(`${BASE}clientes/${buildClientesQuery(params)}`);
    return response.data;
  },
  async obtenerCliente(clienteKey: string): Promise<PipelineClienteFicha> {
    const api = await getAPI();
    const encoded = encodeURIComponent(clienteKey);
    const response = await api.get(`${BASE}clientes/${encoded}/`);
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
  directo: 'Link libre',
};
