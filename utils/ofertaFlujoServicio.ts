import type { ChecklistInstance } from '@/services/checklistService';
import type { OfertaProveedor } from '@/services/solicitudesService';

export function puedeIniciarServicioOferta(oferta: OfertaProveedor): boolean {
  if (oferta.estado === 'pagada') return true;
  if (
    oferta.estado === 'pagada_parcialmente' &&
    oferta.estado_pago_repuestos === 'pagado'
  ) {
    return true;
  }
  return false;
}

export function tieneManoObraPendientePago(oferta: OfertaProveedor): boolean {
  return (
    oferta.estado_pago_repuestos === 'pagado' &&
    oferta.estado_pago_servicio === 'pendiente'
  );
}

export function checklistEsperandoFirmaCliente(
  checklist: ChecklistInstance | null | undefined,
): boolean {
  return checklist?.estado === 'PENDIENTE_FIRMA_CLIENTE';
}

export function checklistCompletadoTotal(
  checklist: ChecklistInstance | null | undefined,
): boolean {
  return checklist?.estado === 'COMPLETADO';
}

/**
 * El proveedor puede usar terminar-servicio SOLO cuando:
 * - La oferta está en ejecución
 * - El checklist no está cargando ni tuvo error de red (error = no sabemos si hay checklist)
 * - NO existe checklist (si hay checklist, el cierre lo hace el cliente al firmar)
 * - No hay pagos de mano de obra pendientes
 */
export function puedeTerminarServicioManual(
  oferta: OfertaProveedor,
  checklist: ChecklistInstance | null | undefined,
  loadingChecklist: boolean,
  checklistLoadError?: boolean,
): boolean {
  if (oferta.estado !== 'en_ejecucion') return false;
  if (loadingChecklist) return false;
  if (checklistLoadError) return false;
  if (checklist) return false;
  if (tieneManoObraPendientePago(oferta)) return false;
  const ordenId = (oferta as { solicitud_servicio_id?: number | null }).solicitud_servicio_id;
  return ordenId != null && ordenId > 0;
}

/** El proveedor necesita completar el checklist antes de poder cerrar. */
export function checklistBloqueaCierre(
  checklist: ChecklistInstance | null | undefined,
): boolean {
  if (!checklist) return false;
  return checklist.estado !== 'PENDIENTE_FIRMA_CLIENTE' && checklist.estado !== 'COMPLETADO';
}

/** El mensaje de guía de siguiente paso para el proveedor según el estado del checklist. */
export function mensajeProximoPasoProveedor(
  oferta: OfertaProveedor,
  checklist: ChecklistInstance | null | undefined,
  loadingChecklist: boolean,
  checklistLoadError: boolean,
): string {
  if (loadingChecklist) return 'Cargando estado del checklist…';
  if (checklistLoadError) return 'No se pudo verificar el estado del checklist. Recarga la pantalla.';

  if (!checklist) {
    if (tieneManoObraPendientePago(oferta)) {
      return 'El cliente debe pagar la mano de obra pendiente desde su app antes de cerrar la orden.';
    }
    return 'Sin checklist configurado para este servicio. Puedes terminar el servicio manualmente.';
  }

  switch (checklist.estado) {
    case 'PENDIENTE':
      return 'Debes iniciar y completar el checklist antes de poder cerrar la orden.';
    case 'EN_PROGRESO':
    case 'PAUSADO':
      return 'Debes completar todos los ítems del checklist y firmar para continuar.';
    case 'PENDIENTE_FIRMA_CLIENTE':
      return 'Tu firma está registrada. El cliente debe firmar desde su app para cerrar la orden.';
    case 'COMPLETADO':
      return 'Checklist completado con ambas firmas. La orden será cerrada automáticamente.';
    default:
      return 'Completa el checklist para continuar.';
  }
}

export function mensajeEsperaCierreCliente(oferta: OfertaProveedor): string {
  const partes = [
    'Tu parte del trabajo está registrada. El cliente debe firmar desde su app para cerrar la orden.',
  ];
  if (tieneManoObraPendientePago(oferta)) {
    partes.push(
      'Además, debe pagar la mano de obra pendiente desde la app de usuarios antes de finalizar.',
    );
  }
  return partes.join(' ');
}
