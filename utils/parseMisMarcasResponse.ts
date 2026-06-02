/**
 * Normaliza respuesta de GET .../mis_marcas/ (array legacy o { es_multimarca, marcas }).
 */

export type MarcaProveedorRow = {
  id: number;
  nombre: string;
  logo?: string | null;
};

export type MisMarcasPayload = {
  esMultimarca: boolean;
  marcas: MarcaProveedorRow[];
};

export function parseMisMarcasResponse(raw: unknown): MisMarcasPayload {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const obj = raw as Record<string, unknown>;
    const data = (obj.data ?? obj) as Record<string, unknown>;
    const marcasRaw = data.marcas ?? obj.marcas;
    const esMultimarca = Boolean(data.es_multimarca ?? obj.es_multimarca);
    const marcas = normalizeMarcasArray(marcasRaw);
    return { esMultimarca, marcas };
  }

  const arr = Array.isArray(raw)
    ? raw
    : Array.isArray((raw as { data?: unknown })?.data)
      ? ((raw as { data: unknown[] }).data)
      : [];

  return { esMultimarca: false, marcas: normalizeMarcasArray(arr) };
}

function normalizeMarcasArray(marcasRaw: unknown): MarcaProveedorRow[] {
  if (!Array.isArray(marcasRaw)) return [];
  return marcasRaw
    .map((m) => {
      const row = m as Record<string, unknown>;
      const id = Number(row.id);
      const nombre = String(row.nombre ?? '').trim();
      if (!Number.isFinite(id) || id <= 0 || !nombre) return null;
      return {
        id,
        nombre,
        logo: (row.logo as string | null | undefined) ?? null,
      };
    })
    .filter((m): m is MarcaProveedorRow => m != null);
}
