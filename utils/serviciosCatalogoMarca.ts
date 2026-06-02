/**
 * Catálogo de servicios por marca(s) — intersección para multiselección.
 */

export type ServicioCatalogoRow = {
  id: number;
  nombre: string;
  descripcion?: string;
  requiere_repuestos?: boolean;
  foto?: string | null;
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

/** Normaliza respuesta axios/API a array de servicios. */
export function normalizarListaServiciosCatalogo(data: unknown): ServicioCatalogoRow[] {
  if (Array.isArray(data)) return data as ServicioCatalogoRow[];
  if (data && typeof data === 'object' && Array.isArray((data as { results?: unknown }).results)) {
    return (data as { results: ServicioCatalogoRow[] }).results;
  }
  return [];
}
