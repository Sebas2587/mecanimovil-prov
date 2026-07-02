import { getAPI } from '@/services/api';
import type { EstadoProveedor } from '@/services/api';

export type ProveedorAgendaIds = {
  tipoProveedor: 'taller' | 'mecanico';
  proveedorId: number;
};

function extractList(data: unknown): Array<{ id?: number }> {
  if (Array.isArray(data)) return data;
  if (data && typeof data === 'object' && Array.isArray((data as { results?: unknown[] }).results)) {
    return (data as { results: Array<{ id?: number }> }).results;
  }
  return [];
}

/** Resuelve el ID del proveedor autenticado para consultas de agenda. */
export async function resolveProveedorAgendaIds(
  tipoProveedor?: 'taller' | 'mecanico',
): Promise<ProveedorAgendaIds | null> {
  const api = await getAPI();
  const preferido = tipoProveedor ?? 'taller';

  try {
    const estadoRes = await api.get<EstadoProveedor>('/usuarios/estado-proveedor/');
    const estado = estadoRes.data;
    if (estado?.tiene_perfil && typeof estado.proveedor_id === 'number') {
      const tipo = estado.tipo_proveedor === 'mecanico' ? 'mecanico' : 'taller';
      return { tipoProveedor: tipo, proveedorId: estado.proveedor_id };
    }
  } catch {
    /* fallback abajo */
  }

  if (preferido === 'mecanico') {
    const res = await api.get('/usuarios/mecanicos-domicilio/');
    const id = extractList(res.data)[0]?.id;
    if (typeof id === 'number') {
      return { tipoProveedor: 'mecanico', proveedorId: id };
    }
  }

  const res = await api.get('/usuarios/talleres/');
  const id = extractList(res.data)[0]?.id;
  if (typeof id === 'number') {
    return { tipoProveedor: 'taller', proveedorId: id };
  }

  if (preferido === 'taller') {
    const mecRes = await api.get('/usuarios/mecanicos-domicilio/');
    const mecId = extractList(mecRes.data)[0]?.id;
    if (typeof mecId === 'number') {
      return { tipoProveedor: 'mecanico', proveedorId: mecId };
    }
  }

  return null;
}
