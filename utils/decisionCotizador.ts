/**
 * Contrato mínimo que la app lee y escribe hasta que el backend
 * publique campos de primera clase. Si un campo no viene, la línea
 * se trata como pedida y se cobra.
 *
 * repuestos[]:
 *   origen_linea: 'pedido' | 'sugerido'
 *   motivo_sugerencia: string
 *   sugerencia_estado: 'pendiente' | 'aceptada' | 'descartada'
 *
 * cotizacion:
 *   dudas_cotizador: [{ id, pregunta, contexto?, estado, respuesta? }]
 *   revision_taller_estado: 'pendiente' | 'lista' | 'sin_revision'
 *
 * Persistencia transitoria: metadata.decisiones_lineas, metadata.dudas_cotizador,
 * metadata.revision_taller_estado. El serializer actual descarta claves
 * desconocidas de cada línea.
 *
 * Totales y vista pública: pedido siempre (si tiene precio);
 * sugerido solo si aceptada; pendiente y descartada no se cobran.
 *
 * Ciclo de aprobación:
 *   POST /ordenes/cotizaciones-canal/{id}/revision-taller/
 *   body: { dudas_cotizador, decisiones_lineas, revision_taller_estado: 'lista' }
 *   Si 404, PATCH metadata.revision_taller_estado = 'lista'.
 *
 * Notificación interna: type agente_ia_revision_taller
 *   data: { cotizacion_id, conversation_id }
 */

export type OrigenLinea = 'pedido' | 'sugerido';
export type SugerenciaEstado = 'pendiente' | 'aceptada' | 'descartada';
export type DudaEstado = 'pendiente' | 'respondida' | 'confirmada';
export type RevisionTallerEstado = 'pendiente' | 'lista' | 'sin_revision';

export type DudaCotizador = {
  id: string;
  pregunta: string;
  contexto?: string;
  estado?: DudaEstado | string;
  respuesta?: string;
};

export type LineaDecision = {
  id?: string | number | null;
  nombre?: string | null;
  origen_linea?: OrigenLinea | string | null;
  motivo_sugerencia?: string | null;
  sugerencia_estado?: SugerenciaEstado | string | null;
};

export type DecisionLineaGuardada = {
  origen_linea?: OrigenLinea | string;
  motivo_sugerencia?: string;
  sugerencia_estado?: SugerenciaEstado | string;
};

export type MetadataDecision = {
  decisiones_lineas?: Record<string, DecisionLineaGuardada>;
  dudas_cotizador?: DudaCotizador[];
  revision_taller_estado?: RevisionTallerEstado | string;
  [key: string]: unknown;
};

export type CotizacionDecision = {
  repuestos?: LineaDecision[] | null;
  dudas_cotizador?: DudaCotizador[] | null;
  revision_taller_estado?: RevisionTallerEstado | string | null;
  metadata?: MetadataDecision | null;
};

export function origenLinea(rep: LineaDecision | null | undefined): OrigenLinea {
  return String(rep?.origen_linea || '').trim() === 'sugerido' ? 'sugerido' : 'pedido';
}

export function esLineaSugerida(rep: LineaDecision | null | undefined): boolean {
  return origenLinea(rep) === 'sugerido';
}

export function sugerenciaEstado(rep: LineaDecision | null | undefined): SugerenciaEstado {
  if (!esLineaSugerida(rep)) return 'aceptada';
  const valor = String(rep?.sugerencia_estado || 'pendiente').trim();
  if (valor === 'aceptada' || valor === 'descartada') return valor;
  return 'pendiente';
}

export function motivoSugerencia(rep: LineaDecision | null | undefined): string {
  return String(rep?.motivo_sugerencia || '').trim();
}

/** Pedido siempre. Sugerido solo si el taller lo aceptó. Pendiente y descartada no. */
export function cobraAlCliente(rep: LineaDecision | null | undefined): boolean {
  if (!rep) return false;
  if (origenLinea(rep) === 'pedido') return true;
  return sugerenciaEstado(rep) === 'aceptada';
}

export function visibleAlCliente(rep: LineaDecision | null | undefined): boolean {
  return cobraAlCliente(rep);
}

export function etiquetaOrigenLinea(rep: LineaDecision | null | undefined): string {
  if (esLineaSugerida(rep)) {
    const estado = sugerenciaEstado(rep);
    if (estado === 'aceptada') return 'Sugerido · aceptado';
    if (estado === 'descartada') return 'Sugerido · descartado';
    return 'Sugerido';
  }
  return 'Pedido';
}

function metadataDecision(cotizacion: CotizacionDecision | null | undefined): MetadataDecision {
  return (cotizacion?.metadata || {}) as MetadataDecision;
}

export function dudasDe(cotizacion: CotizacionDecision | null | undefined): DudaCotizador[] {
  const arriba = cotizacion?.dudas_cotizador;
  if (Array.isArray(arriba) && arriba.length > 0) return arriba;
  const meta = metadataDecision(cotizacion).dudas_cotizador;
  return Array.isArray(meta) ? meta : [];
}

export function dudaEstaPendiente(duda: DudaCotizador | null | undefined): boolean {
  const estado = String(duda?.estado || 'pendiente').trim();
  return estado === 'pendiente' || estado === '';
}

export function dudasPendientes(cotizacion: CotizacionDecision | null | undefined): DudaCotizador[] {
  return dudasDe(cotizacion).filter(dudaEstaPendiente);
}

export function sugerenciasPendientes(
  cotizacion: CotizacionDecision | null | undefined,
): LineaDecision[] {
  return (cotizacion?.repuestos ?? []).filter(
    (rep) => esLineaSugerida(rep) && sugerenciaEstado(rep) === 'pendiente',
  );
}

export function revisionTallerEstado(
  cotizacion: CotizacionDecision | null | undefined,
): RevisionTallerEstado {
  const crudo = cotizacion?.revision_taller_estado
    || metadataDecision(cotizacion).revision_taller_estado
    || '';
  const valor = String(crudo).trim();
  if (valor === 'pendiente' || valor === 'lista' || valor === 'sin_revision') return valor;
  if (sugerenciasPendientes(cotizacion).length > 0 || dudasPendientes(cotizacion).length > 0) {
    return 'pendiente';
  }
  return 'sin_revision';
}

/** El cotizador pidió opinión y todavía no se confirma. */
export function esperaRevisionTaller(cotizacion: CotizacionDecision | null | undefined): boolean {
  if (!cotizacion) return false;
  if (revisionTallerEstado(cotizacion) === 'lista') return false;
  if (revisionTallerEstado(cotizacion) === 'pendiente') return true;
  return sugerenciasPendientes(cotizacion).length > 0 || dudasPendientes(cotizacion).length > 0;
}

export function puedeCerrarRevisionTaller(
  cotizacion: CotizacionDecision | null | undefined,
): boolean {
  return esperaRevisionTaller(cotizacion)
    && sugerenciasPendientes(cotizacion).length === 0
    && dudasPendientes(cotizacion).length === 0;
}

export function resumenRevisionTaller(cotizacion: CotizacionDecision | null | undefined): {
  espera: boolean;
  lista: boolean;
  sugerencias: number;
  dudas: number;
  texto: string;
} {
  const sugerencias = sugerenciasPendientes(cotizacion).length;
  const dudas = dudasPendientes(cotizacion).length;
  const espera = esperaRevisionTaller(cotizacion);
  const lista = revisionTallerEstado(cotizacion) === 'lista';
  const partes: string[] = [];
  if (sugerencias > 0) {
    partes.push(sugerencias === 1 ? '1 sugerencia' : `${sugerencias} sugerencias`);
  }
  if (dudas > 0) {
    partes.push(dudas === 1 ? '1 duda' : `${dudas} dudas`);
  }
  let texto = 'El cotizador espera tu opinión.';
  if (!espera && lista) texto = 'Lista. El agente puede continuar.';
  else if (partes.length) texto = `El cotizador espera tu opinión: ${partes.join(' y ')}.`;
  else if (espera) texto = 'Revisa y confirma para que el agente continúe.';
  return { espera, lista, sugerencias, dudas, texto };
}

export function mensajeBloqueoDudas(cotizacion: CotizacionDecision | null | undefined): string | null {
  const n = dudasPendientes(cotizacion).length;
  if (n <= 0) return null;
  return n === 1
    ? 'El cotizador dejó una duda. Respóndela o confírmala antes de enviar.'
    : `El cotizador dejó ${n} dudas. Respóndelas o confírmalas antes de enviar.`;
}

function decisionDesdeMeta(
  meta: DecisionLineaGuardada | undefined,
): DecisionLineaGuardada {
  if (!meta || typeof meta !== 'object') return {};
  return {
    origen_linea: meta.origen_linea,
    motivo_sugerencia: meta.motivo_sugerencia,
    sugerencia_estado: meta.sugerencia_estado,
  };
}

export function hidratarLineaDecision(
  rep: LineaDecision,
  meta?: DecisionLineaGuardada,
): LineaDecision {
  const guardada = decisionDesdeMeta(meta);
  const origen = String(rep.origen_linea || guardada.origen_linea || '').trim() === 'sugerido'
    ? 'sugerido'
    : (guardada.origen_linea === 'sugerido' ? 'sugerido' : (rep.origen_linea || 'pedido'));
  const motivo = String(rep.motivo_sugerencia || guardada.motivo_sugerencia || '');
  const estadoCrudo = rep.sugerencia_estado || guardada.sugerencia_estado;
  return {
    ...rep,
    origen_linea: origen,
    motivo_sugerencia: motivo,
    sugerencia_estado: origen === 'sugerido'
      ? (estadoCrudo as SugerenciaEstado) || 'pendiente'
      : estadoCrudo,
  };
}

export function hidratarDecisionesCotizacion<T extends CotizacionDecision>(cotizacion: T): T {
  const decisiones = metadataDecision(cotizacion).decisiones_lineas ?? {};
  const repuestos = (cotizacion.repuestos ?? []).map((rep) => {
    const clave = rep.id != null ? String(rep.id) : '';
    return hidratarLineaDecision(rep, clave ? decisiones[clave] : undefined);
  });
  const dudas = dudasDe(cotizacion);
  const revision = revisionTallerEstado({
    ...cotizacion,
    repuestos,
    dudas_cotizador: dudas,
  });
  return {
    ...cotizacion,
    repuestos,
    dudas_cotizador: dudas,
    revision_taller_estado: revision,
    metadata: {
      ...(cotizacion.metadata || {}),
      dudas_cotizador: dudas,
      revision_taller_estado: revision,
      decisiones_lineas: decisiones,
    } as T['metadata'],
  };
}

export function serializarDecisionesMetadata(
  cotizacion: CotizacionDecision,
): MetadataDecision {
  const decisiones: Record<string, DecisionLineaGuardada> = {
    ...(metadataDecision(cotizacion).decisiones_lineas || {}),
  };
  for (const rep of cotizacion.repuestos ?? []) {
    if (rep.id == null || String(rep.id) === '') continue;
    if (!esLineaSugerida(rep) && !motivoSugerencia(rep) && !rep.sugerencia_estado) continue;
    decisiones[String(rep.id)] = {
      origen_linea: origenLinea(rep),
      motivo_sugerencia: motivoSugerencia(rep),
      sugerencia_estado: sugerenciaEstado(rep),
    };
  }
  const dudas = dudasDe(cotizacion);
  const revision = cotizacion.revision_taller_estado
    || metadataDecision(cotizacion).revision_taller_estado
    || revisionTallerEstado(cotizacion);
  return {
    ...(cotizacion.metadata || {}),
    decisiones_lineas: decisiones,
    dudas_cotizador: dudas,
    revision_taller_estado: revision,
  };
}

export function responderDuda(
  dudas: DudaCotizador[],
  id: string,
  respuesta: string,
  estado: DudaEstado = 'respondida',
): DudaCotizador[] {
  return dudas.map((duda) => (
    String(duda.id) === String(id)
      ? { ...duda, respuesta: respuesta.trim(), estado: respuesta.trim() ? estado : 'pendiente' }
      : duda
  ));
}

export function confirmarDuda(dudas: DudaCotizador[], id: string): DudaCotizador[] {
  return dudas.map((duda) => (
    String(duda.id) === String(id)
      ? { ...duda, estado: 'confirmada', respuesta: duda.respuesta?.trim() || 'Confirmado' }
      : duda
  ));
}

export function hrefRevisionTaller(cotizacionId?: number | string | null): string {
  if (cotizacionId != null && String(cotizacionId).trim()) {
    return `/cotizacion-canal/${cotizacionId}`;
  }
  return '/cotizaciones?estado=revision';
}
