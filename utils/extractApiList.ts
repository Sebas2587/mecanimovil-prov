/** Normaliza respuestas axios/DRF a un array plano. */
export function extractApiList<T = unknown>(res: unknown): T[] {
  if (Array.isArray(res)) return res as T[];

  const axiosLike = res as { data?: unknown } | null | undefined;
  const data = axiosLike?.data ?? res;

  if (Array.isArray(data)) return data as T[];

  if (data && typeof data === 'object') {
    const paginated = data as { results?: unknown };
    if (Array.isArray(paginated.results)) return paginated.results as T[];
  }

  return [];
}

/** Lee un query param de expo-router (string | string[]). */
export function readRouteParam(value: string | string[] | undefined): string | undefined {
  if (value == null) return undefined;
  return Array.isArray(value) ? value[0] : value;
}

/** Parsea IDs de marcas desde el JSON del query param `marcas`. */
export function parseMarcasIdsParam(value: string | string[] | undefined): number[] {
  const raw = readRouteParam(value);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return normalizeMarcasIds(parsed);
  } catch {
    return [];
  }
}

export function normalizeMarcasIds(ids: unknown[]): number[] {
  const out: number[] = [];
  for (const id of ids) {
    const n = Number(id);
    if (Number.isFinite(n) && !out.includes(n)) out.push(n);
  }
  return out;
}

/** Clave estable para efectos (evita re-fetch por referencias nuevas en params). */
export function marcasIdsKeyFromParam(value: string | string[] | undefined): string {
  return parseMarcasIdsParam(value)
    .slice()
    .sort((a, b) => a - b)
    .join(',');
}

type MarcaMeta = { id: number; nombre: string };

export function parseMarcasMetaParam(value: string | string[] | undefined): MarcaMeta[] {
  const raw = readRouteParam(value);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item) => {
        if (!item || typeof item !== 'object') return null;
        const row = item as { id?: unknown; nombre?: unknown };
        const id = Number(row.id);
        const nombre = typeof row.nombre === 'string' ? row.nombre.trim() : '';
        if (!Number.isFinite(id) || !nombre) return null;
        return { id, nombre };
      })
      .filter((item): item is MarcaMeta => item != null);
  } catch {
    return [];
  }
}
