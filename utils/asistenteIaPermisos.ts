/**
 * Permisos del asistente IA:
 * - Mecánico asignado: puede usar en su orden/cita.
 * - Mandante (taller unipersonal): puede usar si no hay mecánico asignado.
 * - Mecánico domicilio legacy: sus propias órdenes.
 * - Supervisor: nunca (evita gasto de tokens y mantiene la guía operativa).
 */
export function puedeUsarAsistenteIaEnOrden(params: {
  esMecanicoEquipo: boolean;
  esProveedorDomicilio: boolean;
  esMandanteTaller: boolean;
  esSupervisor: boolean;
  miembroId: number | null;
  mecanicoAsignadoId?: number | null;
  puedeServicios: boolean;
}): boolean {
  if (!params.puedeServicios) return false;

  const {
    esMecanicoEquipo,
    esProveedorDomicilio,
    esMandanteTaller,
    esSupervisor,
    miembroId,
    mecanicoAsignadoId,
  } = params;

  if (esSupervisor) return false;

  if (esMecanicoEquipo) {
    return mecanicoAsignadoId != null && miembroId != null && mecanicoAsignadoId === miembroId;
  }

  if (esProveedorDomicilio) {
    return mecanicoAsignadoId != null;
  }

  if (esMandanteTaller) {
    return mecanicoAsignadoId == null;
  }

  return false;
}

export function puedeUsarAsistenteIaEnCita(params: {
  esMecanicoEquipo: boolean;
  esProveedorDomicilio: boolean;
  esMandanteTaller: boolean;
  esSupervisor: boolean;
  miembroId: number | null;
  citaMiembroTallerId?: number | null;
  puedeServicios: boolean;
}): boolean {
  if (!params.puedeServicios) return false;

  const {
    esMecanicoEquipo,
    esProveedorDomicilio,
    esMandanteTaller,
    esSupervisor,
    miembroId,
    citaMiembroTallerId,
  } = params;

  if (esSupervisor) return false;

  if (esMecanicoEquipo) {
    return citaMiembroTallerId != null && miembroId != null && citaMiembroTallerId === miembroId;
  }

  if (esProveedorDomicilio) {
    return true;
  }

  if (esMandanteTaller) {
    return citaMiembroTallerId == null;
  }

  return false;
}
