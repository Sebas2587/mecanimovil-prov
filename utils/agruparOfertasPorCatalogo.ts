/**
 * Agrupa ofertas por servicio de catálogo (vista Mis servicios).
 * Una card = mismo nombre de servicio (+ con/sin repuestos), con todas las tarifas marca/modelo.
 */
import type { ServicioOfertaLike, ServicioOfertaGrupo } from './agruparOfertasServicio';
import { agruparOfertasServicio } from './agruparOfertasServicio';
import {
  buildTarifasPorMarca,
  montoPrecioPublicoOferta,
  type TarifaPorMarca,
} from './tarifasPorMarca';

export interface ServicioCatalogoGrupo<T extends ServicioOfertaLike = ServicioOfertaLike> {
  key: string;
  servicioId: number;
  tipo_servicio: string;
  nombre: string;
  ofertas: T[];
  subgrupos: ServicioOfertaGrupo<T>[];
  representante: T;
  ofertasGrupo: {
    id: number;
    marca_id: number;
    nombre?: string;
    modelo_id?: number | null;
    modelo_nombre?: string;
  }[];
  marcaIds: number[];
  motoresDistintos: string[];
  precioMin: number | null;
  precioMax: number | null;
  tieneRangoPrecio: boolean;
  todasDisponibles: boolean;
  algunaDisponible: boolean;
  fechaReciente: string;
  tarifasPorMarca: TarifaPorMarca[];
}

function resolveServicioCatalogoId(o: ServicioOfertaLike): number {
  const raw = o.servicio_info?.id ?? o.servicio ?? 0;
  const n = typeof raw === 'number' ? raw : parseInt(String(raw), 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** Nombre normalizado para agrupar aunque el catálogo tenga IDs distintos con el mismo título. */
export function normalizeNombreServicio(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/\s+/g, ' ');
}

export function normalizeTipoServicio(raw?: string | null): 'con_repuestos' | 'sin_repuestos' {
  return raw === 'con_repuestos' ? 'con_repuestos' : 'sin_repuestos';
}

/** Clave única de card en Mis servicios: nombre catálogo + tipo (con/sin repuestos). */
export function grupoKeyOferta(o: ServicioOfertaLike): string {
  const nombre = normalizeNombreServicio(o.servicio_info?.nombre ?? 'servicio');
  const tipo = normalizeTipoServicio(o.tipo_servicio);
  return `${nombre}|${tipo}`;
}

export function motoresDistintosEnOfertas(ofertas: ServicioOfertaLike[]): string[] {
  const set = new Set<string>();
  for (const o of ofertas) {
    const motor = (o.tipo_motor ?? '').trim();
    if (motor) set.add(motor);
  }
  return [...set].sort();
}

function buildGrupoFromOfertas<T extends ServicioOfertaLike>(
  key: string,
  list: T[],
): ServicioCatalogoGrupo<T> {
  const byId = new Map<number, T>();
  for (const o of list) {
    if (o?.id != null) byId.set(o.id, o);
  }
  const sorted = [...byId.values()].sort((a, b) => a.id - b.id);
  const subgrupos = agruparOfertasServicio(sorted);
  const motoresDistintos = motoresDistintosEnOfertas(sorted);
  const tarifasPorMarca = buildTarifasPorMarca(sorted, {
    incluirMotor: motoresDistintos.length > 1,
  });
  const representante = subgrupos[0]?.representante ?? sorted[0];
  const montos = sorted.map(montoPrecioPublicoOferta).filter((m): m is number => m != null);
  const precioMin = montos.length ? Math.min(...montos) : null;
  const precioMax = montos.length ? Math.max(...montos) : null;
  const tieneRangoPrecio =
    precioMin != null && precioMax != null && Math.round(precioMin) !== Math.round(precioMax);

  const ofertasGrupo = sorted.map((o) => ({
    id: o.id,
    marca_id: o.marca_vehiculo_seleccionada ?? 0,
    modelo_id: o.modelo_vehiculo_seleccionado ?? null,
    nombre: o.marca_vehiculo_info?.nombre?.trim() || undefined,
    modelo_nombre: o.modelo_vehiculo_info?.nombre?.trim() || undefined,
  }));
  const marcaIds = [...new Set(ofertasGrupo.map((x) => x.marca_id))].sort((a, b) => a - b);

  const fechas = sorted
    .map((o) => o.fecha_creacion)
    .filter((f): f is string => !!f);
  const fechaReciente = fechas.length
    ? fechas.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0]
    : representante.fecha_creacion ?? '';

  const servicioId = resolveServicioCatalogoId(representante);

  return {
    key,
    servicioId,
    tipo_servicio: normalizeTipoServicio(representante.tipo_servicio),
    nombre: representante.servicio_info?.nombre ?? 'Servicio',
    ofertas: sorted,
    subgrupos,
    representante,
    ofertasGrupo,
    marcaIds,
    motoresDistintos,
    precioMin,
    precioMax,
    tieneRangoPrecio,
    todasDisponibles: sorted.every((o) => o.disponible !== false),
    algunaDisponible: sorted.some((o) => o.disponible !== false),
    fechaReciente,
    tarifasPorMarca,
  };
}

export function agruparOfertasPorCatalogo<T extends ServicioOfertaLike>(
  ofertas: T[],
): ServicioCatalogoGrupo<T>[] {
  const porGrupo = new Map<string, T[]>();

  for (const o of ofertas) {
    const key = grupoKeyOferta(o);
    const bucket = porGrupo.get(key);
    if (bucket) bucket.push(o);
    else porGrupo.set(key, [o]);
  }

  const grupos = [...porGrupo.entries()].map(([key, list]) =>
    buildGrupoFromOfertas(key, list),
  );

  return grupos.sort((a, b) =>
    a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }),
  );
}

export function formatearRangoPrecioCLP(min: number | null, max: number | null): string | null {
  const fmt = (n: number) =>
    new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      maximumFractionDigits: 0,
    }).format(Math.round(n));

  if (min == null && max == null) return null;
  if (min != null && max != null && Math.round(min) !== Math.round(max)) {
    return `${fmt(min)} – ${fmt(max)}`;
  }
  const unico = min ?? max;
  return unico != null ? fmt(unico) : null;
}
