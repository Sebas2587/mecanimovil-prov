import api from './api';

export interface ManoObraLinea {
  id?: string;
  nombre: string;
  monto_clp: number;
}

export const MAX_MANO_OBRA_LINEAS = 20;

function montoLineaMo(raw: Record<string, unknown> | ManoObraLinea | null | undefined): number {
  if (!raw) return 0;
  const row = raw as Record<string, unknown>;
  for (const key of ['monto_clp', 'precio_mano_obra_clp', 'precio_clp', 'precio_catalogo_clp']) {
    if (row[key] == null || row[key] === '') continue;
    const n = Math.round(Number(row[key]) || 0);
    if (Number.isFinite(n)) return Math.max(0, n);
  }
  return 0;
}

export function resolverManoObraLineas(c: Pick<CotizacionCanal, 'mano_obra_lineas' | 'mano_obra_clp' | 'servicio_nombre' | 'metadata'>): ManoObraLinea[] {
  const raw = (
    Array.isArray(c.mano_obra_lineas) && c.mano_obra_lineas.length
      ? c.mano_obra_lineas
      : c.metadata?.servicios_lineas
  ) || [];
  const out: ManoObraLinea[] = [];
  if (Array.isArray(raw)) {
    raw.forEach((lin, idx) => {
      if (!lin || typeof lin !== 'object') return;
      const row = lin as Record<string, unknown>;
      const nombre = String(row.nombre || '').trim();
      const monto = montoLineaMo(row);
      if (!nombre && monto <= 0 && !row.id) return;
      out.push({
        id: String(row.id || `mo-${idx + 1}`),
        nombre: nombre || 'Mano de obra',
        monto_clp: monto,
      });
    });
  }
  if (out.length) return out.slice(0, MAX_MANO_OBRA_LINEAS);
  const mo = Math.max(0, Math.round(Number(c.mano_obra_clp) || 0));
  if (mo <= 0) return [];
  const titulo = (c.servicio_nombre || '').trim() || 'Mano de obra';
  return [{ id: 'mo-1', nombre: titulo, monto_clp: mo }];
}

export function sumaManoObraLineas(lineas: ManoObraLinea[]): number {
  return lineas.reduce((acc, lin) => acc + Math.max(0, Math.round(Number(lin.monto_clp) || 0)), 0);
}

export type CertezaPrecio = 'confirmado' | 'asumido' | 'referencial' | 'sin_precio';
export type CompatibilidadPieza = 'verificada' | 'probable' | 'no_verificada';

export interface AlternativaRepuesto {
  etiqueta?: 'economica' | 'equivalente' | 'premium';
  nombre?: string;
  marca_repuesto?: string;
  especificacion?: string;
  precio_clp?: number;
  proveedor_nombre?: string;
  url_producto?: string;
}

export interface LineaPendientePrecio {
  id: string;
  nombre: string;
  certeza?: CertezaPrecio | string;
  especificacion_pendiente?: boolean;
}

export interface RepuestoCotizacion {
  id?: string;
  nombre: string;
  cantidad: number;
  precio_unitario_clp: number;
  precio_referencia_ia?: number;
  /** @deprecated usar fuente_marketplace */
  fuente_repuesto?: string;
  fuente_marketplace?: string;
  marca_repuesto?: string;
  /** Solo visible en app taller; omitido en link público al cliente. */
  tienda_ml?: string;
  /** Proveedor/canal legible (Catálogo del taller, historial, nickname ML, tienda web). */
  proveedor_nombre?: string;
  /** Link al producto/listado web (solo taller; omitido en vista pública). */
  url_producto?: string;
  /** true si el precio no viene del catálogo/historial del taller (revisar antes de enviar). */
  precio_estimado?: boolean;
  /** true si el precio viene de búsqueda web (referencia de mercado, no del taller). */
  precio_referencia_mercado?: boolean;
  precio_iva_incluido?: boolean;
  comentario?: string;
  certeza?: CertezaPrecio | string;
  precio_min_clp?: number;
  precio_max_clp?: number;
  fuentes_n?: number;
  precio_capturado_en?: string;
  proveedor_id?: number | null;
  precio_marketplace_clp?: number;
  factor_mercado?: number;
  categoria?: string;
  especificacion?: string;
  especificacion_pendiente?: boolean;
  familia_sensible?: string;
  codigo_parte?: string;
  compatibilidad?: CompatibilidadPieza | string;
  alternativas?: AlternativaRepuesto[];
}

export type CanalCotizacion =
  | 'whatsapp'
  | 'instagram'
  | 'messenger'
  | 'directo'
  | 'canal'
  | string;

export interface CotizacionCanal {
  id: number;
  conversation: number | null;
  es_libre?: boolean;
  cliente_nombre?: string;
  cliente_telefono?: string;
  cliente_display?: string;
  canal?: CanalCotizacion;
  /** Cita creada al aceptar (libre); en adicionales apunta a la cita principal. */
  cita_personal_id?: number | null;
  cita_origen_id?: number | null;
  /** Cita activa con día y hora confirmados. */
  tiene_horario_agendado?: boolean;
  /** Se puede editar ítems (IA o manual) y reenviar; false si ya hay horario. */
  permite_edicion_completa?: boolean;
  token?: string | null;
  numero_publico?: string | null;
  url_publica?: string | null;
  share_url?: string | null;
  visto_en?: string | null;
  estado: 'borrador' | 'enviada' | 'aceptada' | 'rechazada' | 'expirada' | 'cancelada';
  tipo_documento?: 'estimacion' | 'cotizacion' | string;
  tipo_documento_emitido?: string;
  repuestos_confirmados?: number;
  repuestos_total?: number;
  puede_enviar_firme?: boolean;
  lineas_pendientes_precio?: LineaPendientePrecio[];
  total_min_clp?: number;
  total_max_clp?: number;
  modalidad: 'taller' | 'domicilio';
  /** Dirección del cliente cuando modalidad es domicilio. */
  direccion_servicio?: string;
  vehiculo_marca: string;
  vehiculo_modelo: string;
  vehiculo_anio?: number | null;
  vehiculo_patente: string;
  vehiculo_cilindraje: string;
  vehiculo_vin: string;
  tipo_motor: string;
  tipo_motor_label: string;
  aviso_motor: string;
  servicio_nombre: string;
  descripcion_problema: string;
  repuestos: RepuestoCotizacion[];
  mano_obra_lineas?: ManoObraLinea[];
  mano_obra_clp: number;
  entrega_via?: 'app' | 'sesion_meta' | 'whatsapp_template' | 'link_publico' | string | null;
  entrega_pendiente_compartir?: boolean;
  /** Guardó cambios sobre un folio ya emitido; el cliente aún ve la versión anterior. */
  emision_pendiente?: boolean;
  costo_repuestos_clp: number;
  descuento_tipo?: '' | 'monto' | 'porcentaje' | null;
  descuento_alcance?: 'mano_obra' | 'total' | null;
  descuento_valor?: number | null;
  descuento_clp?: number;
  descuento_etiqueta?: string;
  dias_validez?: number;
  total_clp: number;
  duracion_minutos_estimada?: number | null;
  advertencias?: string[];
  notas_internas?: string;
  politicas_cotizacion?: string;
  listo_para_enviar?: boolean;
  pendientes_revision?: string[];
  message_envio?: number | null;
  enviada_en?: string | null;
  aceptada_en?: string | null;
  rechazada_en?: string | null;
  creado_en?: string;
  actualizado_en?: string;
  metadata?: {
    origen?: string;
    sesion_id?: number;
    plantilla_id?: number;
    listo_para_enviar?: boolean;
    pendientes_revision?: string[];
    vehiculo_kilometraje_actual?: number | null;
    vehiculo_fuente?: string;
    patente_enriquecida?: string;
    precio_desde_catalogo?: boolean;
    precio_parcial_catalogo?: boolean;
    valores_estimativos?: boolean;
    /** pendiente | ok | sin_resultados | error — búsqueda web Gemini URL Context */
    busqueda_web_estado?: 'pendiente' | 'ok' | 'sin_resultados' | 'error' | string;
    busqueda_web_en?: string;
    cotizacion_original_id?: number;
    cita_personal_id?: number;
    entrega_canal?: 'app' | 'sesion_meta' | 'whatsapp_template' | 'link_publico' | string;
    entrega_canal_motivo?: string;
    servicios_lineas?: Array<{
      id?: string;
      nombre?: string;
      monto_clp?: number;
      precio_mano_obra_clp?: number;
      precio_clp?: number;
      precio_catalogo_clp?: number;
    }>;
  };
  cotizacion_original_id?: number | null;
  es_cotizacion_adicional?: boolean;
  motivo_servicio_adicional?: string;
  servicio_principal_nombre?: string | null;
  ejecucion_adicional?: 'misma_visita' | 'nueva_fecha' | null;
  fecha_propuesta?: string | null;
  hora_propuesta?: string | null;
}

export interface CotizacionPlantilla {
  id: number;
  titulo: string;
  snapshot: Record<string, unknown>;
  vehiculo_marca?: string;
  vehiculo_modelo?: string;
  vehiculo_cilindraje?: string;
  /** true si la plantilla la generó el aprendizaje del agente al enviar. */
  aprendizaje_auto?: boolean;
  servicio_nombre?: string;
  uso_count: number;
  creado_en: string;
  actualizado_en: string;
}

export interface GenerarCotizacionIaPayload {
  conversation_id?: number | null;
  cliente_nombre?: string;
  cliente_telefono?: string;
  servicio_nombre?: string;
  descripcion_problema?: string;
  modalidad?: 'taller' | 'domicilio';
  direccion_servicio?: string;
  vehiculo?: Record<string, unknown>;
  plantilla_id?: number;
}

export interface CrearCotizacionAdicionalPayload {
  cita_id: number;
  cotizacion_original_id: number;
  motivo_servicio_adicional: string;
  modo: 'catalogo' | 'ia';
  servicios_catalogo?: Array<{ oferta_servicio_id: number; cantidad?: number }>;
  servicio_nombre?: string;
  descripcion_problema?: string;
  ejecucion_adicional?: 'misma_visita' | 'nueva_fecha';
  fecha_propuesta?: string | null;
  hora_propuesta?: string | null;
}

export interface GenerarCotizacionIaResponse {
  disponible: boolean;
  cotizacion?: CotizacionCanal;
  error?: string | null;
  latencia_ms?: number;
  desde_plantilla?: boolean;
}

export function cotizacionPermiteEdicionCompleta(c: CotizacionCanal): boolean {
  if (typeof c.permite_edicion_completa === 'boolean') return c.permite_edicion_completa;
  if (c.es_cotizacion_adicional) return c.estado === 'borrador';
  if (c.tiene_horario_agendado) return false;
  return c.estado === 'borrador' || c.estado === 'enviada' || c.estado === 'aceptada';
}

/** Primer envío: solo borrador. No reutilizar edición completa para mostrar el CTA. */
export function cotizacionPermiteEnviar(c: CotizacionCanal): boolean {
  return c.estado === 'borrador' || Boolean(c.emision_pendiente);
}

export function cotizacionEsActualizacion(c: Pick<CotizacionCanal, 'numero_publico' | 'emision_pendiente'> | null | undefined): boolean {
  return Boolean(c?.numero_publico || c?.emision_pendiente);
}

export type VistaPreviaPublica = {
  numero_publico?: string | null;
  servicio_nombre?: string;
  descripcion_problema?: string;
  notas_cotizacion?: string;
  politicas_cotizacion?: string;
  fecha_expiracion_publica?: string | null;
  cliente?: { nombre?: string; telefono?: string; direccion?: string } | null;
  cliente_nombre?: string;
  taller?: { nombre?: string; telefono?: string; direccion?: string } | null;
  vehiculo_marca?: string;
  vehiculo_modelo?: string;
  vehiculo_anio?: number | string | null;
  vehiculo_patente?: string;
  modalidad?: string;
  mano_obra_lineas?: Array<{ id?: string; nombre?: string; monto_clp?: number }>;
  mano_obra_clp?: number;
  repuestos?: Array<{
    nombre?: string;
    cantidad?: number;
    precio_unitario_clp?: number;
  }>;
  costo_repuestos_clp?: number;
  descuento_clp?: number;
  descuento_etiqueta?: string;
  total_clp?: number;
  es_trabajo_adicional?: boolean;
};

export function calcularDescuentoCotizacion(opts: {
  costoRepuestos: number;
  manoObra: number;
  tipo?: CotizacionCanal['descuento_tipo'];
  alcance?: CotizacionCanal['descuento_alcance'];
  valor?: number | null;
}): { descuentoClp: number; total: number; etiqueta: string } {
  const costoRep = Math.max(0, Math.round(opts.costoRepuestos || 0));
  const mo = Math.max(0, Math.round(opts.manoObra || 0));
  const bruto = costoRep + mo;
  const tipo = (opts.tipo || '').trim();
  if (tipo !== 'monto' && tipo !== 'porcentaje') {
    return { descuentoClp: 0, total: bruto, etiqueta: '' };
  }
  const alcance = opts.alcance === 'total' ? 'total' : 'mano_obra';
  const base = alcance === 'mano_obra' ? mo : bruto;
  let desc = 0;
  if (tipo === 'porcentaje') {
    const pct = Math.min(100, Math.max(0, Number(opts.valor) || 0));
    desc = Math.round(base * pct / 100);
  } else {
    desc = Math.max(0, Math.round(Number(opts.valor) || 0));
  }
  desc = Math.min(desc, base);
  const alcanceTxt = alcance === 'total' ? 'total' : 'mano de obra';
  const etiqueta = tipo === 'porcentaje'
    ? `Descuento ${Number(opts.valor) || 0}% sobre ${alcanceTxt}`
    : `Descuento $${desc.toLocaleString('es-CL')} sobre ${alcanceTxt}`;
  return { descuentoClp: desc, total: Math.max(0, bruto - desc), etiqueta };
}

export function clampDiasValidez(value?: number | string | null): number {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return 30;
  return Math.min(90, Math.max(1, n));
}

export function errorEnvioFirme(err: unknown): {
  message: string;
  pendientes: LineaPendientePrecio[];
} | null {
  const resp = (err as { response?: { status?: number; data?: Record<string, unknown> } })?.response;
  if (!resp?.data || typeof resp.data !== 'object') return null;
  const raw = resp.data.lineas_pendientes ?? resp.data.lineas_pendientes_precio;
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const titleRaw = resp.data.error;
  const message = typeof titleRaw === 'string'
    ? titleRaw
    : Array.isArray(titleRaw) && typeof titleRaw[0] === 'string'
      ? titleRaw[0]
      : 'Faltan precios por confirmar';
  return { message, pendientes: raw as LineaPendientePrecio[] };
}

function sanitizarRepuestoEdicion(rep: RepuestoCotizacion): RepuestoCotizacion {
  const {
    precio_estimado: _estimado,
    precio_referencia_mercado: _mercado,
    ...rest
  } = rep;
  return rest;
}

export function payloadEdicionCotizacion(c: CotizacionCanal): Partial<CotizacionCanal> {
  const lineasMo = resolverManoObraLineas(c);
  const patch: Partial<CotizacionCanal> = {
    servicio_nombre: c.servicio_nombre,
    descripcion_problema: c.descripcion_problema,
    modalidad: c.modalidad,
    direccion_servicio: c.direccion_servicio,
    cliente_nombre: c.cliente_nombre,
    cliente_telefono: c.cliente_telefono,
    repuestos: (c.repuestos ?? []).map(sanitizarRepuestoEdicion),
    mano_obra_lineas: lineasMo,
    mano_obra_clp: sumaManoObraLineas(lineasMo),
    descuento_tipo: c.descuento_tipo || '',
    descuento_alcance: c.descuento_alcance || 'mano_obra',
    descuento_valor: c.descuento_valor ?? 0,
    notas_internas: c.notas_internas,
    politicas_cotizacion: c.politicas_cotizacion,
    dias_validez: clampDiasValidez(c.dias_validez),
    duracion_minutos_estimada: c.duracion_minutos_estimada,
  };
  if (c.es_cotizacion_adicional) {
    const modo = c.ejecucion_adicional || 'misma_visita';
    patch.ejecucion_adicional = modo;
    patch.fecha_propuesta = modo === 'nueva_fecha' ? (c.fecha_propuesta || null) : null;
    patch.hora_propuesta = modo === 'nueva_fecha' ? (c.hora_propuesta || null) : null;
  }
  return patch;
}

/** Conserva nombres enviados al taller si la respuesta del PATCH llega desfasada. */
export function fusionarRepuestosEnviados(
  enviados: RepuestoCotizacion[] | undefined,
  guardados: RepuestoCotizacion[] | undefined,
): RepuestoCotizacion[] {
  const sent = enviados ?? [];
  const saved = guardados ?? [];
  return saved.map((r, i) => {
    const src = r.id ? sent.find((x) => x.id === r.id) : sent[i];
    const nombreEnviado = (src?.nombre || '').trim();
    if (nombreEnviado && nombreEnviado !== (r.nombre || '').trim()) {
      return { ...r, nombre: nombreEnviado };
    }
    return r;
  });
}

export function adicionalRequiereFecha(c: CotizacionCanal): boolean {
  return Boolean(
    c.es_cotizacion_adicional
    && c.ejecucion_adicional === 'nueva_fecha'
    && (!c.fecha_propuesta || !c.hora_propuesta)
  );
}

class CotizacionCanalService {
  async generarIa(payload: GenerarCotizacionIaPayload): Promise<GenerarCotizacionIaResponse> {
    const response = await api.post('/ordenes/cotizaciones-canal/generar-ia/', payload, {
      timeout: 60000,
    });
    return response.data as GenerarCotizacionIaResponse;
  }

  async crearBorrador(payload: GenerarCotizacionIaPayload): Promise<{ cotizacion: CotizacionCanal }> {
    const response = await api.post('/ordenes/cotizaciones-canal/crear-borrador/', payload);
    return response.data as { cotizacion: CotizacionCanal };
  }

  async crearAdicional(payload: CrearCotizacionAdicionalPayload): Promise<{ cotizacion: CotizacionCanal }> {
    const response = await api.post('/ordenes/cotizaciones-canal/crear-adicional/', payload);
    return response.data as { cotizacion: CotizacionCanal };
  }

  async cotizarItems(
    id: number,
    payload: { nombres?: string[]; repuestos?: RepuestoCotizacion[] },
  ): Promise<{ cotizacion: CotizacionCanal; agregados: string[]; busqueda_web: boolean }> {
    const response = await api.post(`/ordenes/cotizaciones-canal/${id}/cotizar-items/`, payload, {
      timeout: 45000,
    });
    return response.data as {
      cotizacion: CotizacionCanal;
      agregados: string[];
      busqueda_web: boolean;
    };
  }

  async actualizar(id: number, patch: Partial<CotizacionCanal>): Promise<CotizacionCanal> {
    const response = await api.patch(`/ordenes/cotizaciones-canal/${id}/`, patch);
    return response.data as CotizacionCanal;
  }

  async vistaPrevia(id: number): Promise<VistaPreviaPublica> {
    const response = await api.get(`/ordenes/cotizaciones-canal/${id}/vista-previa/`);
    return response.data as VistaPreviaPublica;
  }

  async reabrir(id: number): Promise<CotizacionCanal> {
    const response = await api.post(`/ordenes/cotizaciones-canal/${id}/reabrir/`);
    return response.data as CotizacionCanal;
  }

  async confirmarPrecioRepuesto(
    id: number,
    payload: {
      repuesto_id: string;
      precio_clp: number;
      proveedor_id?: number | null;
      proveedor_nombre?: string;
      especificacion?: string;
      guardar_en_mis_precios?: boolean;
    },
  ): Promise<{ cotizacion: CotizacionCanal }> {
    const response = await api.post(
      `/ordenes/cotizaciones-canal/${id}/confirmar-precio-repuesto/`,
      payload,
    );
    return response.data as { cotizacion: CotizacionCanal };
  }

  async asumirPrecioRepuesto(
    id: number,
    repuestoIds?: string[],
  ): Promise<{ cotizacion: CotizacionCanal }> {
    const response = await api.post(
      `/ordenes/cotizaciones-canal/${id}/asumir-precio-repuesto/`,
      { repuesto_id: repuestoIds || [] },
    );
    return response.data as { cotizacion: CotizacionCanal };
  }

  async definirEspecificacion(
    id: number,
    payload: { repuesto_id: string; especificacion: string },
  ): Promise<{ cotizacion: CotizacionCanal }> {
    const response = await api.post(
      `/ordenes/cotizaciones-canal/${id}/definir-especificacion/`,
      payload,
    );
    return response.data as { cotizacion: CotizacionCanal };
  }

  async registrarCompraRepuestos(
    id: number,
    items: Array<{
      repuesto_id: string;
      precio_clp: number;
      proveedor_id?: number | null;
      proveedor_nombre?: string;
    }>,
  ): Promise<{ ok: boolean; creados: number }> {
    const response = await api.post(
      `/ordenes/cotizaciones-canal/${id}/registrar-compra-repuestos/`,
      { items },
    );
    return response.data as { ok: boolean; creados: number };
  }

  async enviar(id: number, tipoDocumento?: 'estimacion' | 'cotizacion'): Promise<{
    cotizacion: CotizacionCanal;
    message_id: number | null;
    share_url?: string | null;
    entrega_via?: 'app' | 'sesion_meta' | 'whatsapp_template' | 'link_publico' | string;
    entrega_mensaje?: string | null;
  }> {
    const response = await api.post(
      `/ordenes/cotizaciones-canal/${id}/enviar/`,
      tipoDocumento ? { tipo_documento: tipoDocumento } : {},
    );
    return response.data as {
      cotizacion: CotizacionCanal;
      message_id: number | null;
      share_url?: string | null;
      entrega_via?: 'app' | 'sesion_meta' | 'whatsapp_template' | 'link_publico' | string;
      entrega_mensaje?: string | null;
    };
  }

  async cancelar(id: number): Promise<CotizacionCanal> {
    const response = await api.post(`/ordenes/cotizaciones-canal/${id}/cancelar/`);
    return response.data as CotizacionCanal;
  }

  async marcarAceptada(id: number): Promise<CotizacionCanal> {
    const response = await api.post(`/ordenes/cotizaciones-canal/${id}/marcar-aceptada/`);
    return response.data as CotizacionCanal;
  }

  async marcarPerdida(id: number): Promise<CotizacionCanal> {
    const response = await api.post(`/ordenes/cotizaciones-canal/${id}/marcar-perdida/`);
    return response.data as CotizacionCanal;
  }

  async listar(params?: { page?: number; page_size?: number }): Promise<CotizacionCanal[]> {
    const search = new URLSearchParams();
    if (params?.page != null) search.set('page', String(params.page));
    if (params?.page_size != null) search.set('page_size', String(params.page_size));
    const qs = search.toString();
    const url = qs ? `/ordenes/cotizaciones-canal/?${qs}` : '/ordenes/cotizaciones-canal/';
    const response = await api.get(url);
    const data = response.data as CotizacionCanal[] | { results?: CotizacionCanal[] };
    return Array.isArray(data) ? data : data?.results ?? [];
  }

  async listarPorConversacion(conversationId: number): Promise<CotizacionCanal[]> {
    const response = await api.get(`/ordenes/cotizaciones-canal/por-conversacion/${conversationId}/`);
    const data = response.data as CotizacionCanal[] | { results?: CotizacionCanal[] };
    return Array.isArray(data) ? data : data?.results ?? [];
  }

  async obtener(id: number): Promise<CotizacionCanal> {
    const response = await api.get(`/ordenes/cotizaciones-canal/${id}/`);
    return response.data as CotizacionCanal;
  }

  async listarPlantillas(filtro?: {
    marca?: string;
    modelo?: string;
    cilindraje?: string;
  }): Promise<CotizacionPlantilla[]> {
    const params = new URLSearchParams();
    if (filtro?.marca?.trim()) params.set('marca', filtro.marca.trim());
    if (filtro?.modelo?.trim()) params.set('modelo', filtro.modelo.trim());
    if (filtro?.cilindraje?.trim()) params.set('cilindraje', filtro.cilindraje.trim());
    const qs = params.toString();
    const url = qs
      ? `/ordenes/cotizaciones-canal-plantillas/?${qs}`
      : '/ordenes/cotizaciones-canal-plantillas/';
    const response = await api.get(url);
    const data = response.data as CotizacionPlantilla[] | { results?: CotizacionPlantilla[] };
    if (Array.isArray(data)) return data;
    return data?.results ?? [];
  }

  async guardarPlantilla(payload: {
    titulo: string;
    cotizacion_id?: number;
    snapshot?: Record<string, unknown>;
  }): Promise<CotizacionPlantilla> {
    const response = await api.post('/ordenes/cotizaciones-canal-plantillas/', payload);
    return response.data as CotizacionPlantilla;
  }

  async eliminarPlantilla(id: number): Promise<void> {
    await api.delete(`/ordenes/cotizaciones-canal-plantillas/${id}/`);
  }
}

const cotizacionCanalService = new CotizacionCanalService();
export default cotizacionCanalService;
