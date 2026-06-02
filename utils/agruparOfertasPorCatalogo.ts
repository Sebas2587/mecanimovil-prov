/**
 * Agrupa ofertas por servicio de catálogo + tipo (vista Mis servicios).
 * Calcula rango de precio publicado cuando hay varias marcas/configuraciones.
 */
import type { ServicioOfertaLike, ServicioOfertaGrupo } from './agruparOfertasServicio';
import { agruparOfertasServicio } from './agruparOfertasServicio';

export interface ServicioCatalogoGrupo<T extends ServicioOfertaLike = ServicioOfertaLike> {
  key: string;
  servicioId: number;
  tipo_servicio: string;
  nombre: string;
  ofertas: T[];
  subgrupos: ServicioOfertaGrupo<T>[];
  representante: T;
  ofertasGrupo: { id: number; marca_id: number; nombre?: string }[];
  marcaIds: number[];
  precioMin: number | null;
  precioMax: number | null;
  tieneRangoPrecio: boolean;
  todasDisponibles: boolean;
  algunaDisponible: boolean;
  fechaReciente: string;
}

function montoPrecioPublico(o: ServicioOfertaLike): number | null {
  const d = o.desglose_precios?.precio_final_cliente;
  if (typeof d === 'number' && Number.isFinite(d) && d >= 0) {
    return d;
  }
  const raw = String(o.precio_publicado_cliente ?? '').trim().replace(',', '.');
  const p = parseFloat(raw);
  if (!Number.isFinite(p) || p < 0) return null;
  return p;
}

function catalogoKey(o: ServicioOfertaLike): string {
  const servicioId = o.servicio ?? o.servicio_info?.id ?? 0;
  return `${servicioId}|${o.tipo_servicio || 'sin_repuestos'}`;
}

export function agruparOfertasPorCatalogo<T extends ServicioOfertaLike>(
  ofertas: T[],
): ServicioCatalogoGrupo<T>[] {
  const porCatalogo = new Map<string, T[]>();
  for (const o of ofertas) {
    const key = catalogoKey(o);
    const bucket = porCatalogo.get(key);
    if (bucket) bucket.push(o);
    else porCatalogo.set(key, [o]);
  }

  const grupos: ServicioCatalogoGrupo<T>[] = [];

  for (const [key, list] of porCatalogo) {
    const sorted = [...list].sort((a, b) => a.id - b.id);
    const subgrupos = agruparOfertasServicio(sorted);
    const representante = subgrupos[0]?.representante ?? sorted[0];
    const montos = sorted.map(montoPrecioPublico).filter((m): m is number => m != null);
    const precioMin = montos.length ? Math.min(...montos) : null;
    const precioMax = montos.length ? Math.max(...montos) : null;
    const tieneRangoPrecio =
      precioMin != null && precioMax != null && Math.round(precioMin) !== Math.round(precioMax);

    const ofertasGrupo = sorted.map((o) => ({
      id: o.id,
      marca_id: o.marca_vehiculo_seleccionada ?? 0,
      nombre: o.marca_vehiculo_info?.nombre?.trim() || undefined,
    }));
    const marcaIds = [...new Set(ofertasGrupo.map((x) => x.marca_id))].sort((a, b) => a - b);

    const fechas = sorted
      .map((o) => o.fecha_creacion)
      .filter((f): f is string => !!f);
    const fechaReciente = fechas.length
      ? fechas.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0]
      : representante.fecha_creacion ?? '';

    const servicioId = representante.servicio ?? representante.servicio_info?.id ?? 0;

    grupos.push({
      key,
      servicioId: Number(servicioId),
      tipo_servicio: representante.tipo_servicio,
      nombre: representante.servicio_info?.nombre ?? 'Servicio',
      ofertas: sorted,
      subgrupos,
      representante,
      ofertasGrupo,
      marcaIds,
      precioMin,
      precioMax,
      tieneRangoPrecio,
      todasDisponibles: sorted.every((o) => o.disponible !== false),
      algunaDisponible: sorted.some((o) => o.disponible !== false),
      fechaReciente,
    });
  }

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
