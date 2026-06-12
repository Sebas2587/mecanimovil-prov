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

/** El proveedor puede usar terminar-servicio solo sin checklist configurado. */
export function puedeTerminarServicioManual(
  oferta: OfertaProveedor,
  checklist: ChecklistInstance | null | undefined,
  loadingChecklist: boolean,
): boolean {
  if (oferta.estado !== 'en_ejecucion') return false;
  if (loadingChecklist) return false;
  if (checklist) return false;
  const ordenId = (oferta as { solicitud_servicio_id?: number | null }).solicitud_servicio_id;
  return ordenId != null && ordenId > 0;
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
