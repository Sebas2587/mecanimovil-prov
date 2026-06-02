/**
 * Agrupa OfertaServicio que comparten la misma configuración (publicación multi-marca).
 */

export interface OfertaGrupoItem {
  id: number;
  marca_id: number;
  nombre?: string;
}

export interface ServicioOfertaLike {
  id: number;
  servicio: number;
  servicio_info?: { id: number; nombre: string; descripcion?: string; requiere_repuestos?: boolean; foto?: string | null };
  marca_vehiculo_seleccionada: number | null;
  marca_vehiculo_info?: { id: number; nombre: string; logo?: string | null } | null;
  tipo_servicio: string;
  tipo_motor?: string;
  detalles_adicionales: string | null;
  costo_mano_de_obra_sin_iva: string;
  costo_repuestos_sin_iva: string;
  repuestos_seleccionados?: unknown[];
  disponible?: boolean;
  fecha_creacion?: string;
  desglose_precios?: { precio_final_cliente?: number };
  precio_publicado_cliente?: string;
}

export interface ServicioOfertaGrupo<T extends ServicioOfertaLike = ServicioOfertaLike> {
  key: string;
  ofertas: T[];
  representante: T;
  ofertaIds: number[];
  /** 0 = genérico (sin marca en API) */
  marcaIds: number[];
  ofertasGrupo: OfertaGrupoItem[];
}

function firmaOferta(o: ServicioOfertaLike): string {
  const repKey = JSON.stringify(o.repuestos_seleccionados ?? []);
  const servicioId = o.servicio ?? o.servicio_info?.id ?? 0;
  return [
    servicioId,
    o.tipo_servicio,
    (o.tipo_motor ?? '').trim(),
    (o.detalles_adicionales ?? '').trim(),
    String(o.costo_mano_de_obra_sin_iva ?? ''),
    String(o.costo_repuestos_sin_iva ?? ''),
    repKey,
  ].join('|');
}

export function agruparOfertasServicio<T extends ServicioOfertaLike>(
  ofertas: T[]
): ServicioOfertaGrupo<T>[] {
  const map = new Map<string, T[]>();
  for (const o of ofertas) {
    const key = firmaOferta(o);
    const bucket = map.get(key);
    if (bucket) {
      bucket.push(o);
    } else {
      map.set(key, [o]);
    }
  }

  const grupos: ServicioOfertaGrupo<T>[] = [];
  for (const [key, list] of map) {
    const sorted = [...list].sort((a, b) => a.id - b.id);
    const representante = sorted[0];
    const ofertasGrupo: OfertaGrupoItem[] = sorted.map((o) => ({
      id: o.id,
      marca_id: o.marca_vehiculo_seleccionada ?? 0,
      nombre: o.marca_vehiculo_info?.nombre?.trim() || undefined,
    }));
    const marcaIds = [...new Set(ofertasGrupo.map((x) => x.marca_id))].sort((a, b) => a - b);
    grupos.push({
      key,
      ofertas: sorted,
      representante,
      ofertaIds: sorted.map((o) => o.id),
      marcaIds,
      ofertasGrupo,
    });
  }

  return grupos.sort((a, b) =>
    (a.representante.servicio_info?.nombre ?? '').localeCompare(
      b.representante.servicio_info?.nombre ?? '',
      'es',
      { sensitivity: 'base' }
    )
  );
}

export function parseOfertasGrupoParam(raw: string | string[] | undefined): OfertaGrupoItem[] {
  if (!raw || typeof raw !== 'string') return [];
  try {
    const parsed = JSON.parse(raw) as OfertaGrupoItem[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (x) =>
        x &&
        typeof x.id === 'number' &&
        x.id > 0 &&
        typeof x.marca_id === 'number'
    );
  } catch {
    return [];
  }
}
