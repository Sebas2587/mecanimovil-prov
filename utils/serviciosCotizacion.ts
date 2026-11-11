import { esLineaSugerida } from '@/utils/decisionCotizador';
import type { RepuestoCotizacion } from '@/services/cotizacionCanalService';

export type VehiculoServicio = {
  marca?: string;
  modelo?: string;
  anio?: number | null;
  motor?: string;
};

export type ManoObraServicio = {
  monto_clp: number | null;
  horas: number | null;
  tarifa_hora_clp: number | null;
  origen?: string;
  estimada: boolean;
  motivo?: string;
  nombre?: string;
};

export type ServicioVista = {
  id: string;
  nombre: string;
  soloMano: boolean;
  esOtros?: boolean;
  vehiculo?: VehiculoServicio;
  manoObra: ManoObraServicio;
  pedidos: RepuestoCotizacion[];
  sugeridos: RepuestoCotizacion[];
};

const OTROS_ID = 'otros-repuestos';

function texto(valor: unknown): string {
  return String(valor || '').trim();
}

function lista(valor: unknown): unknown[] {
  return Array.isArray(valor) ? valor : [];
}

function numeroONull(valor: unknown): number | null {
  if (valor == null || valor === '') return null;
  const n = Number(valor);
  if (!Number.isFinite(n)) return null;
  return n;
}

function esRecord(valor: unknown): valor is Record<string, unknown> {
  return Boolean(valor) && typeof valor === 'object' && !Array.isArray(valor);
}

export function identidadDe(item: { identidad?: string | number | null } | null | undefined): string {
  return String(item?.identidad || '').trim().toLowerCase();
}

function comoRepuestos(valor: unknown): RepuestoCotizacion[] {
  const out: RepuestoCotizacion[] = [];
  lista(valor).forEach((item, indice) => {
    if (!esRecord(item)) return;
    const nombre = texto(item.nombre) || texto(item.nombre_producto) || `Ítem ${indice + 1}`;
    const cantidad = Math.max(1, Math.round(Number(item.cantidad) || 1));
    const precio = Number(item.precio_unitario_clp);
    const identidad = texto(item.identidad);
    out.push({
      ...(item as unknown as RepuestoCotizacion),
      id: texto(item.id) || identidad || `srv-rep-${indice}`,
      nombre,
      ...(identidad ? { identidad } : {}),
      cantidad,
      precio_unitario_clp: Number.isFinite(precio) ? precio : 0,
    });
  });
  return out;
}

function vehiculoDe(raw: unknown): VehiculoServicio | undefined {
  if (!esRecord(raw)) return undefined;
  const marca = texto(raw.marca);
  const modelo = texto(raw.modelo);
  const motor = texto(raw.motor);
  const anio = numeroONull(raw.anio);
  if (!marca && !modelo && !motor && anio == null) return undefined;
  return { marca: marca || undefined, modelo: modelo || undefined, anio, motor: motor || undefined };
}

function manoDe(raw: Record<string, unknown>): ManoObraServicio {
  const nested = esRecord(raw.mano_obra) ? raw.mano_obra : null;
  const fuente = nested || raw;
  const origen = texto(fuente.origen || raw.origen);
  const estimada = fuente.estimada === true
    || origen === 'estimada'
    || fuente.precio_estimado === true
    || raw.mano_obra_estimada === true;
  return {
    monto_clp: numeroONull(
      fuente.monto_clp
      ?? fuente.precio_mano_obra_clp
      ?? fuente.precio_clp
      ?? raw.mano_obra_clp
      ?? raw.precio_mano_obra_clp,
    ),
    horas: numeroONull(fuente.horas ?? fuente.horas_estimadas ?? raw.horas),
    tarifa_hora_clp: numeroONull(fuente.tarifa_hora_clp ?? raw.tarifa_hora_clp),
    origen: origen || undefined,
    estimada,
    motivo: texto(fuente.motivo ?? raw.motivo_mano_obra) || undefined,
    nombre: texto(fuente.nombre) || undefined,
  };
}

function planPiezas(raw: Record<string, unknown>, clave: 'requeridos' | 'sugeridos'): {
  identidad: string;
  nombre: string;
  motivo: string;
}[] {
  const fuente = clave === 'requeridos'
    ? (raw.repuestos_requeridos ?? raw.repuestos ?? raw.items ?? raw.lineas ?? raw.requeridos)
    : (raw.sugeridos ?? raw.sugerencias ?? raw.extras);
  return lista(fuente).flatMap((item) => {
    if (!esRecord(item)) return [];
    const identidad = identidadDe(item);
    const nombre = texto(item.nombre);
    if (!identidad && !nombre) return [];
    return [{
      identidad,
      nombre: nombre || identidad,
      motivo: texto(item.motivo ?? item.motivo_sugerencia),
    }];
  });
}

function crudoServicios(cotizacion: {
  servicios?: unknown;
  metadata?: { servicios?: unknown } | null;
}): unknown[] | null {
  const deMeta = lista(cotizacion.metadata?.servicios);
  if (deMeta.length) return deMeta;
  const directo = lista(cotizacion.servicios);
  return directo.length ? directo : null;
}

function tomarRepuesto(
  flat: RepuestoCotizacion[],
  usados: Set<number>,
  plan: { identidad: string; nombre: string; motivo: string },
  comoSugerencia: boolean,
): RepuestoCotizacion {
  const idn = plan.identidad;
  const nombre = plan.nombre.toLowerCase();
  let index = -1;
  if (idn) {
    index = flat.findIndex((rep, i) => !usados.has(i) && identidadDe(rep) === idn);
  }
  if (index < 0 && nombre) {
    index = flat.findIndex((rep, i) => !usados.has(i) && texto(rep.nombre).toLowerCase() === nombre);
  }
  if (index >= 0) {
    usados.add(index);
    const encontrado = flat[index];
    const motivo = texto(encontrado.motivo_sugerencia) || plan.motivo;
    return motivo && !encontrado.motivo_sugerencia
      ? { ...encontrado, motivo_sugerencia: motivo }
      : encontrado;
  }
  return {
    id: idn || `plan-${plan.nombre}`,
    nombre: plan.nombre || 'Repuesto',
    identidad: plan.identidad || undefined,
    cantidad: 1,
    precio_unitario_clp: 0,
    origen: comoSugerencia ? 'sugerencia' : 'pedido',
    estado_sugerencia: comoSugerencia ? 'pendiente' : 'aceptada',
    motivo_sugerencia: plan.motivo || undefined,
  };
}

/**
 * Agrupa por metadata.servicios[] si el backend lo manda.
 * Relaciona cada línea de repuestos[] por identidad.
 * Null = cotización vieja: la vista queda como ahora.
 */
export function serviciosDeCotizacion(cotizacion: {
  servicios?: unknown;
  metadata?: { servicios?: unknown } | null;
  repuestos?: unknown;
  mano_obra_lineas?: unknown;
} | null | undefined): ServicioVista[] | null {
  if (!cotizacion) return null;
  const crudo = crudoServicios(cotizacion);
  if (!crudo) return null;
  const flat = comoRepuestos(cotizacion.repuestos);
  const usados = new Set<number>();
  const grupos: ServicioVista[] = [];

  crudo.forEach((item, indice) => {
    if (!esRecord(item)) return;
    const nombre = texto(item.nombre)
      || texto(item.servicio_nombre)
      || texto(item.titulo)
      || `Servicio ${indice + 1}`;
    const id = texto(item.id) || `servicio-${indice}`;
    const soloMano = item.solo_mano === true;
    const requeridos = soloMano ? [] : planPiezas(item, 'requeridos');
    const sugeridosPlan = planPiezas(item, 'sugeridos');
    const pedidos = requeridos.map((plan) => tomarRepuesto(flat, usados, plan, false));
    const sugeridos = sugeridosPlan.map((plan) => tomarRepuesto(flat, usados, plan, true));
    grupos.push({
      id,
      nombre,
      soloMano,
      vehiculo: vehiculoDe(item.vehiculo),
      manoObra: manoDe(item),
      pedidos,
      sugeridos,
    });
  });

  const otrosPedidos: RepuestoCotizacion[] = [];
  const otrosSugeridos: RepuestoCotizacion[] = [];
  flat.forEach((rep, index) => {
    if (usados.has(index)) return;
    if (esLineaSugerida(rep)) otrosSugeridos.push(rep);
    else otrosPedidos.push(rep);
  });
  if (otrosPedidos.length || otrosSugeridos.length) {
    grupos.push({
      id: OTROS_ID,
      nombre: 'Otros repuestos',
      soloMano: false,
      esOtros: true,
      manoObra: {
        monto_clp: null,
        horas: null,
        tarifa_hora_clp: null,
        estimada: false,
      },
      pedidos: otrosPedidos,
      sugeridos: otrosSugeridos,
    });
  }

  return grupos.length ? grupos : null;
}

export function sugeridosDeServicios(grupos: ServicioVista[]): RepuestoCotizacion[] {
  return grupos.flatMap((grupo) => grupo.sugeridos);
}

export function mismaLinea(
  a: { id?: string | number | null; nombre?: string | null; identidad?: string | null },
  b: { id?: string | number | null; nombre?: string | null; identidad?: string | null },
): boolean {
  const idnA = identidadDe(a);
  const idnB = identidadDe(b);
  if (idnA && idnB && idnA === idnB) return true;
  const idA = String(a.id || '');
  const idB = String(b.id || '');
  if (idA && idB && idA === idB) return true;
  const nombreA = String(a.nombre || '').trim();
  const nombreB = String(b.nombre || '').trim();
  return Boolean(nombreA && nombreA === nombreB);
}

export function indiceLinea<T extends { id?: string | number | null; nombre?: string | null; identidad?: string | null }>(
  lista: T[],
  item: { id?: string | number | null; nombre?: string | null; identidad?: string | null },
): number {
  return lista.findIndex((linea) => mismaLinea(linea, item));
}
