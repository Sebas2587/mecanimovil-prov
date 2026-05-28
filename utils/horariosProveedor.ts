import type { HorarioProveedor } from '@/services/api';

/** Coerce API boolean-ish values (evita que `"false"` cuente como activo). */
export function normalizarActivo(activo: unknown): boolean {
  if (activo === false || activo === 0 || activo === '0' || activo === 'false') {
    return false;
  }
  if (activo === true || activo === 1 || activo === '1' || activo === 'true') {
    return true;
  }
  return Boolean(activo);
}

export function parseHorariosApiResponse(data: unknown): HorarioProveedor[] {
  if (Array.isArray(data)) {
    return data;
  }
  if (data && typeof data === 'object') {
    const obj = data as { results?: unknown; horarios?: unknown };
    if (Array.isArray(obj.results)) {
      return obj.results as HorarioProveedor[];
    }
    if (Array.isArray(obj.horarios)) {
      return obj.horarios as HorarioProveedor[];
    }
  }
  return [];
}

/** True si el proveedor guardó horarios y tiene al menos un día activo en BD. */
export function proveedorTieneHorariosActivos(horarios: HorarioProveedor[]): boolean {
  if (!Array.isArray(horarios) || horarios.length === 0) {
    return false;
  }
  return horarios.some((h) => normalizarActivo(h.activo));
}
