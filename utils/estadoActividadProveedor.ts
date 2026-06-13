/**
 * Estado efectivo marketplace: la oferta puede quedar en `en_ejecucion` en BD
 * mientras la SolicitudServicio ya está `completado`. La UI del proveedor debe
 * priorizar el estado de la orden cuando cierra el servicio.
 */

export const ESTADOS_COMPLETADOS_OK = ['completado', 'completada'] as const;

export const ESTADOS_ORDEN_PRECEDENCIA_OFERTA = [
  'completado',
  'cancelado',
  'rechazada_por_proveedor',
  'devuelto',
] as const;

export const ESTADOS_RECHAZADAS_ACTIVIDAD = [
  'cancelado',
  'rechazada_por_proveedor',
  'devuelto',
  'rechazada',
  'retirada',
  'expirada',
] as const;

export const OFERTA_LABELS: Record<string, string> = {
  enviada: 'Oferta enviada',
  vista: 'Vista por cliente',
  en_chat: 'En conversación',
  pendiente_confirmacion: 'Confirmar asignación',
  pendiente_creditos: 'Pendiente créditos',
  aceptada: 'Adjudicada — espera pago',
  pendiente_pago: 'Pendiente de pago',
  pagada_parcialmente: 'Pago parcial',
  pagada: 'Pagada',
  en_ejecucion: 'En ejecución',
  completada: 'Completada',
  completado: 'Completada',
  rechazada: 'Rechazada',
  retirada: 'Retirada',
  expirada: 'Expirada',
  cancelado: 'Cancelada',
  rechazada_por_proveedor: 'Rechazada',
  devuelto: 'Devuelta',
  servicio_iniciado: 'Servicio iniciado',
  checklist_en_progreso: 'Checklist en curso',
  checklist_completado: 'Checklist completado',
  en_proceso: 'En proceso',
  pendiente_aceptacion_proveedor: 'Pendiente aceptación',
  aceptada_por_proveedor: 'Aceptada',
};

type OfertaEstadoInput = {
  estado: string;
  estado_solicitud_servicio?: string | null;
};

type OrdenEstadoInput = {
  estado: string;
  oferta_proveedor_id?: number | string | null;
  estado_display?: string;
};

/** Estado de la SolicitudServicio (orden) si existe. */
export function resolveEstadoOrdenServicio(
  oferta: OfertaEstadoInput,
  orden?: OrdenEstadoInput | null,
): string | null {
  if (orden?.estado) return orden.estado;
  return oferta.estado_solicitud_servicio ?? null;
}

/** Estado unificado para badges, tabs y acciones. */
export function resolveEstadoEfectivoMarketplace(
  oferta: OfertaEstadoInput,
  orden?: OrdenEstadoInput | null,
): string {
  const ordenEstado = resolveEstadoOrdenServicio(oferta, orden);
  if (ordenEstado && (ESTADOS_ORDEN_PRECEDENCIA_OFERTA as readonly string[]).includes(ordenEstado)) {
    if (ordenEstado === 'completado') return 'completada';
    return ordenEstado;
  }
  return oferta.estado;
}

/** Legacy: orden con mapa de estados de oferta (lista de órdenes). */
export function resolveEstadoEfectivoOrden(
  orden: OrdenEstadoInput,
  ofertaEstadoById: Record<string, string>,
): string {
  if ((ESTADOS_ORDEN_PRECEDENCIA_OFERTA as readonly string[]).includes(orden.estado)) {
    if (orden.estado === 'completado') return 'completada';
    return orden.estado;
  }
  const ofertaId = orden.oferta_proveedor_id ? String(orden.oferta_proveedor_id) : null;
  if (ofertaId && ofertaEstadoById[ofertaId]) return ofertaEstadoById[ofertaId];
  return orden.estado;
}

export function resolveTextoEstadoActividad(
  estadoEfectivo: string,
  orden?: OrdenEstadoInput | null,
): string {
  if (OFERTA_LABELS[estadoEfectivo]) return OFERTA_LABELS[estadoEfectivo];
  if (orden?.estado_display) return orden.estado_display;
  return estadoEfectivo.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
}

export function isActividadCompletada(estadoEfectivo: string): boolean {
  return (ESTADOS_COMPLETADOS_OK as readonly string[]).includes(estadoEfectivo);
}

export function isActividadRechazada(estadoEfectivo: string): boolean {
  return (ESTADOS_RECHAZADAS_ACTIVIDAD as readonly string[]).includes(estadoEfectivo);
}

/** Servicio cerrado: no mostrar Iniciar checklist ni acciones de ejecución. */
export function isServicioCerradoProveedor(opts: {
  ofertaEstado: string;
  estadoSolicitudServicio?: string | null;
  checklistEstado?: string | null;
}): boolean {
  if (opts.ofertaEstado === 'completada') return true;
  if (opts.estadoSolicitudServicio === 'completado') return true;
  if (opts.checklistEstado === 'COMPLETADO') return true;
  return false;
}
