/**
 * Contrato backend PR47 (518c8ca), rama cursor/cotizacion-pedido-sugerencias-fe0b.
 *
 * repuestos[]:
 *   origen: 'pedido' | 'sugerencia'
 *   motivo_sugerencia: string
 *   estado_sugerencia: 'pendiente' | 'aceptada' | 'descartada'
 *
 * cotizacion:
 *   dudas: [{ id, texto, confirmada }]
 *   revision_sugerencias: { estado: 'pendiente' | 'resuelta' | 'sin_sugerencias', pendientes }
 *
 * Totales, ganancia y vista pública: pedido siempre (si tiene precio);
 * sugerencia solo si aceptada; pendiente y descartada no se cobran.
 *
 * POST /ordenes/cotizaciones-canal/{id}/sugerencias/
 *   { linea_id, accion: 'aceptar' | 'descartar' } → { cotizacion }
 *   400 si la línea no existe o no es sugerencia.
 * POST /ordenes/cotizaciones-canal/{id}/dudas/confirmar/ { id } → { cotizacion }
 * DELETE /ordenes/cotizaciones-canal/{id}/
 *   200 { eliminada, id, estado: 'cancelada', modo: 'oculta' }
 *   409 { detail, codigo: 'cotizacion_con_caja' }
 *   404 si es de otro taller.
 *
 * Notificación interna websocket: type revision_sugerencias_pendiente
 *   data: { cotizacion_id, conversation_id, pendientes }
 */

export type OrigenLinea = 'pedido' | 'sugerencia';
export type SugerenciaEstado = 'pendiente' | 'aceptada' | 'descartada';
export type RevisionSugerenciasEstado = 'pendiente' | 'resuelta' | 'sin_sugerencias';

export type DudaCotizador = {
  id: string;
  texto?: string;
  confirmada?: boolean;
};

export type LineaDecision = {
  id?: string | number | null;
  nombre?: string | null;
  origen?: OrigenLinea | string | null;
  motivo_sugerencia?: string | null;
  estado_sugerencia?: SugerenciaEstado | string | null;
};

export type RevisionSugerencias = {
  estado?: RevisionSugerenciasEstado | string | null;
  pendientes?: number | null;
};

export type CotizacionDecision = {
  repuestos?: LineaDecision[] | null;
  dudas?: DudaCotizador[] | null;
  revision_sugerencias?: RevisionSugerencias | null;
  metadata?: {
    dudas?: DudaCotizador[] | null;
    revision_sugerencias?: RevisionSugerencias | null;
    [key: string]: unknown;
  } | null;
};

export function origenLinea(rep: LineaDecision | null | undefined): OrigenLinea {
  const valor = String(rep?.origen || '').trim();
  return valor === 'sugerencia' ? 'sugerencia' : 'pedido';
}

export function esLineaSugerida(rep: LineaDecision | null | undefined): boolean {
  return origenLinea(rep) === 'sugerencia';
}

export function sugerenciaEstado(rep: LineaDecision | null | undefined): SugerenciaEstado {
  if (!esLineaSugerida(rep)) return 'aceptada';
  const valor = String(rep?.estado_sugerencia || 'pendiente').trim();
  if (valor === 'aceptada' || valor === 'descartada') return valor;
  return 'pendiente';
}

export function motivoSugerencia(rep: LineaDecision | null | undefined): string {
  return String(rep?.motivo_sugerencia || '').trim();
}

/** Pedido siempre. Sugerencia solo si el taller la aceptó. Pendiente y descartada no. */
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

export function dudasDe(cotizacion: CotizacionDecision | null | undefined): DudaCotizador[] {
  const arriba = cotizacion?.dudas;
  if (Array.isArray(arriba) && arriba.length > 0) return arriba;
  const meta = cotizacion?.metadata?.dudas;
  return Array.isArray(meta) ? meta : [];
}

export function dudaTexto(duda: DudaCotizador | null | undefined): string {
  return String(duda?.texto || '').trim();
}

export function dudaEstaPendiente(duda: DudaCotizador | null | undefined): boolean {
  return duda?.confirmada !== true;
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

export function revisionSugerenciasDe(
  cotizacion: CotizacionDecision | null | undefined,
): RevisionSugerencias {
  const arriba = cotizacion?.revision_sugerencias;
  if (arriba && typeof arriba === 'object') return arriba;
  const meta = cotizacion?.metadata?.revision_sugerencias;
  return meta && typeof meta === 'object' ? meta : {};
}

export function revisionSugerenciasEstado(
  cotizacion: CotizacionDecision | null | undefined,
): RevisionSugerenciasEstado {
  const crudo = String(revisionSugerenciasDe(cotizacion).estado || '').trim();
  if (crudo === 'pendiente' || crudo === 'resuelta' || crudo === 'sin_sugerencias') return crudo;
  if (sugerenciasPendientes(cotizacion).length > 0) return 'pendiente';
  if ((cotizacion?.repuestos ?? []).some((rep) => esLineaSugerida(rep))) return 'resuelta';
  return 'sin_sugerencias';
}

/** El cotizador pidió opinión y todavía no se decide. */
export function esperaRevisionTaller(cotizacion: CotizacionDecision | null | undefined): boolean {
  if (!cotizacion) return false;
  if (sugerenciasPendientes(cotizacion).length > 0 || dudasPendientes(cotizacion).length > 0) {
    return true;
  }
  const lineas = cotizacion.repuestos ?? [];
  const tieneOrigen = lineas.some((rep) => origenLinea(rep) === 'sugerencia' || String(rep.origen || '').trim() === 'pedido');
  if (tieneOrigen) return false;
  return revisionSugerenciasEstado(cotizacion) === 'pendiente';
}

export function resumenRevisionTaller(cotizacion: CotizacionDecision | null | undefined): {
  espera: boolean;
  lista: boolean;
  sugerencias: number;
  dudas: number;
  texto: string;
} {
  const deLineas = sugerenciasPendientes(cotizacion).length;
  const deRevision = Number(revisionSugerenciasDe(cotizacion).pendientes);
  const sugerencias = deLineas > 0 ? deLineas : (Number.isFinite(deRevision) ? deRevision : 0);
  const dudas = dudasPendientes(cotizacion).length;
  const espera = esperaRevisionTaller(cotizacion);
  const tuvoRevision = revisionSugerenciasEstado(cotizacion) === 'resuelta'
    || dudasDe(cotizacion).length > 0
    || (cotizacion?.repuestos ?? []).some((rep) => esLineaSugerida(rep));
  const lista = !espera && tuvoRevision;
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
    ? 'El cotizador dejó una duda. Confírmala antes de enviar.'
    : `El cotizador dejó ${n} dudas. Confírmalas antes de enviar.`;
}

export function hidratarLineaDecision(rep: LineaDecision): LineaDecision {
  const origen = origenLinea(rep);
  const motivo = motivoSugerencia(rep);
  const estado = origen === 'sugerencia' ? sugerenciaEstado(rep) : (rep.estado_sugerencia || 'aceptada');
  return {
    ...rep,
    origen,
    motivo_sugerencia: motivo,
    estado_sugerencia: estado,
  };
}

export function hidratarDecisionesCotizacion<T extends CotizacionDecision>(cotizacion: T): T {
  const repuestos = (cotizacion.repuestos ?? []).map((rep) => hidratarLineaDecision(rep));
  const dudas = dudasDe({ ...cotizacion, repuestos });
  const revision = revisionSugerenciasDe({ ...cotizacion, repuestos, dudas });
  const estado = revisionSugerenciasEstado({
    ...cotizacion,
    repuestos,
    dudas,
    revision_sugerencias: revision,
  });
  const pendientes = Number(revision.pendientes);
  return {
    ...cotizacion,
    repuestos,
    dudas,
    revision_sugerencias: {
      estado,
      pendientes: Number.isFinite(pendientes) ? pendientes : sugerenciasPendientes({ repuestos }).length,
    },
  };
}

export function confirmarDuda(dudas: DudaCotizador[], id: string): DudaCotizador[] {
  return dudas.map((duda) => (
    String(duda.id) === String(id) ? { ...duda, confirmada: true } : duda
  ));
}

export function hrefRevisionTaller(cotizacionId?: number | string | null): string {
  if (cotizacionId != null && String(cotizacionId).trim()) {
    return `/cotizacion-canal/${cotizacionId}`;
  }
  return '/cotizaciones?estado=revision';
}

export const TIPO_NOTIFICACION_REVISION = 'revision_sugerencias_pendiente';
