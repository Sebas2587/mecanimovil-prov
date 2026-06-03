/**
 * Catálogo de servicios por marca(s) — intersección para multiselección.
 */
import { extractMotoresServicio, normalizeMotoresLista } from '@/utils/tiposMotorCatalogo';

export type ServicioCatalogoRow = {
  id: number;
  nombre: string;
  descripcion?: string;
  requiere_repuestos?: boolean;
  foto?: string | null;
  tipos_motor_compatibles?: string[];
};

export function intersectServiciosCatalogoPorId(
  listas: ServicioCatalogoRow[][],
): ServicioCatalogoRow[] {
  if (!listas.length) return [];
  const [first, ...rest] = listas;
  if (!first?.length) return [];

  const map = new Map<number, ServicioCatalogoRow>();
  for (const s of first) {
    if (s?.id != null) map.set(s.id, s);
  }
  for (const lista of rest) {
    const ids = new Set(lista.map((s) => s.id));
    for (const id of map.keys()) {
      if (!ids.has(id)) map.delete(id);
    }
  }

  return Array.from(map.values()).sort((a, b) =>
    (a.nombre || '').localeCompare(b.nombre || '', 'es', { sensitivity: 'base' }),
  );
}

function normalizarMotoresFila(row: ServicioCatalogoRow): ServicioCatalogoRow {
  const raw =
    row.tipos_motor_compatibles
    ?? (row as ServicioCatalogoRow & { motores_info?: unknown }).motores_info;
  const motores = normalizeMotoresLista(raw);
  return {
    ...row,
    tipos_motor_compatibles: motores.length > 0 ? motores : [],
  };
}

/** Completa motores del catálogo desde servicio_info de la oferta en edición. */
export function enriquecerMotoresCatalogoDesdeOferta(
  servicios: ServicioCatalogoRow[],
  catalogoId: number | null | undefined,
  servicioInfo?: { tipos_motor_compatibles?: unknown; motores_info?: unknown } | null,
): ServicioCatalogoRow[] {
  const motoresFallback = extractMotoresServicio(servicioInfo ?? undefined);
  if (!catalogoId || motoresFallback.length === 0) return servicios;

  return servicios.map((s) => {
    if (s.id !== catalogoId) return s;
    const motores = extractMotoresServicio(s);
    if (motores.length > 0) return s;
    return { ...s, tipos_motor_compatibles: motoresFallback };
  });
}

/** Normaliza respuesta axios/API a array de servicios. */
export function normalizarListaServiciosCatalogo(data: unknown): ServicioCatalogoRow[] {
  let lista: ServicioCatalogoRow[] = [];
  if (Array.isArray(data)) lista = data as ServicioCatalogoRow[];
  else if (data && typeof data === 'object' && Array.isArray((data as { results?: unknown }).results)) {
    lista = (data as { results: ServicioCatalogoRow[] }).results;
  }
  return lista.map(normalizarMotoresFila);
}
