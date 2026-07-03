/**
 * El asistente IA solo debe usarse en sesión de mecánico asignado al trabajo.
 */
export function puedeUsarAsistenteIaEnOrden(params: {
  esMecanicoEquipo: boolean;
  esProveedorDomicilio: boolean;
  miembroId: number | null;
  mecanicoAsignadoId?: number | null;
}): boolean {
  const { esMecanicoEquipo, esProveedorDomicilio, miembroId, mecanicoAsignadoId } = params;
  if (esMecanicoEquipo) {
    return mecanicoAsignadoId != null && miembroId != null && mecanicoAsignadoId === miembroId;
  }
  if (esProveedorDomicilio) {
    return mecanicoAsignadoId != null;
  }
  return false;
}

export function puedeUsarAsistenteIaEnCita(params: {
  esMecanicoEquipo: boolean;
  esProveedorDomicilio: boolean;
  miembroId: number | null;
  citaMiembroTallerId?: number | null;
}): boolean {
  const { esMecanicoEquipo, esProveedorDomicilio, miembroId, citaMiembroTallerId } = params;
  if (esMecanicoEquipo) {
    return citaMiembroTallerId != null && miembroId != null && citaMiembroTallerId === miembroId;
  }
  if (esProveedorDomicilio) {
    return true;
  }
  return false;
}
