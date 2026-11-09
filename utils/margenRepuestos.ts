import { formatearMontoCLP, redondearCLP } from '@/utils/formatearMontoCLP';

export type LineaMargenInput = {
  cantidad?: number | null;
  costo_unitario_clp?: number | null;
  costo_registrado_clp?: number | null;
  costo_estimado_clp?: number | null;
  precio_unitario_clp?: number | null;
  precio_cobrado_clp?: number | null;
  /** Porcentaje que ya aplicó el descubrimiento. La UI no lo vuelve a multiplicar. */
  margen_pct?: number | null;
};

export type TotalesMargenServidor = {
  costo_total_repuestos_clp?: number | null;
  cobrado_total_repuestos_clp?: number | null;
  ganancia_repuestos_clp?: number | null;
  margen_repuestos_pct?: number | null;
};

export type MargenLinea = {
  cantidad: number;
  costoUnitario: number | null;
  cobradoUnitario: number | null;
  costoLinea: number | null;
  cobradoLinea: number | null;
  margenClp: number | null;
  margenPct: number | null;
};

export type ResumenMargen = {
  costoTotal: number | null;
  cobradoTotal: number | null;
  ganancia: number | null;
  margenPct: number | null;
  haySinCosto: boolean;
};

function montoConocido(valor: unknown): number | null {
  if (valor == null || valor === '') return null;
  const numero = Number(valor);
  if (!Number.isFinite(numero)) return null;
  return redondearCLP(numero);
}

/** Cobrado que el taller está editando. Null no es $0. El cero explícito sí. */
export function cobradoUnitarioLinea(rep: LineaMargenInput): number | null {
  const editado = montoConocido(rep.precio_unitario_clp);
  if (editado != null) return editado;
  return montoConocido(rep.precio_cobrado_clp);
}

/**
 * Costo ya congelado. Orden: declarado, unitario del serializer, estimado al descubrir.
 * No usa el precio cobrado ni vuelve a aplicar margen_pct.
 */
export function costoUnitarioConocido(rep: LineaMargenInput): number | null {
  const registrado = montoConocido(rep.costo_registrado_clp);
  if (registrado != null) return registrado;
  const unitario = montoConocido(rep.costo_unitario_clp);
  if (unitario != null) return unitario;
  const estimado = montoConocido(rep.costo_estimado_clp);
  if (estimado != null && estimado > 0) return estimado;
  return null;
}

export function margenLineaRepuesto(rep: LineaMargenInput): MargenLinea {
  const cantidad = Math.max(1, redondearCLP(rep.cantidad || 1));
  const costoUnitario = costoUnitarioConocido(rep);
  const cobradoUnitario = cobradoUnitarioLinea(rep);
  const cobradoLinea = cobradoUnitario == null ? null : cobradoUnitario * cantidad;
  if (costoUnitario == null || cobradoUnitario == null) {
    return {
      cantidad,
      costoUnitario,
      cobradoUnitario,
      costoLinea: costoUnitario == null ? null : costoUnitario * cantidad,
      cobradoLinea,
      margenClp: null,
      margenPct: null,
    };
  }
  const margenClp = (cobradoUnitario - costoUnitario) * cantidad;
  const costoLinea = costoUnitario * cantidad;
  const margenPct = costoLinea > 0 ? (margenClp / costoLinea) * 100 : null;
  return {
    cantidad,
    costoUnitario,
    cobradoUnitario,
    costoLinea,
    cobradoLinea,
    margenClp,
    margenPct,
  };
}

export function resumenMargenRepuestos(lineas: LineaMargenInput[]): ResumenMargen {
  let costoConocido = 0;
  let cobradoTotal = 0;
  let gananciaConocida = 0;
  let conCosto = 0;
  let haySinCosto = false;
  let haySinCobrado = false;
  for (const linea of lineas) {
    const m = margenLineaRepuesto(linea);
    if (m.cobradoLinea == null) haySinCobrado = true;
    else cobradoTotal += m.cobradoLinea;
    if (m.costoLinea == null) {
      haySinCosto = true;
      continue;
    }
    conCosto += 1;
    costoConocido += m.costoLinea;
    if (m.margenClp != null) gananciaConocida += m.margenClp;
  }
  const cobrado = haySinCobrado ? null : cobradoTotal;
  const costoTotal = haySinCosto || conCosto === 0 ? null : costoConocido;
  const ganancia = haySinCosto || haySinCobrado || conCosto === 0 ? null : gananciaConocida;
  return {
    costoTotal,
    cobradoTotal: cobrado,
    ganancia,
    margenPct: costoTotal != null && ganancia != null && costoTotal > 0
      ? (ganancia / costoTotal) * 100
      : null,
    haySinCosto: haySinCosto || lineas.length > 0 && conCosto === 0,
  };
}

export const TEXTO_SIN_COSTO = 'sin costo registrado';
export const TEXTO_INCOMPLETO = 'Incompleto';

export function textoMargenClp(valor: number | null): string {
  if (valor == null) return TEXTO_SIN_COSTO;
  if (valor < 0) return `−${formatearMontoCLP(Math.abs(valor))}`;
  return formatearMontoCLP(valor);
}

/** Precio cobrado nulo: Incompleto. El cero explícito sí se formatea. */
export function textoCobradoClp(valor: number | null): string {
  if (valor == null) return TEXTO_INCOMPLETO;
  return textoMargenClp(valor);
}

export function textoMargenPct(pct: number | null): string {
  if (pct == null || !Number.isFinite(pct)) return '';
  const rounded = Math.round(pct * 10) / 10;
  const abs = Math.abs(rounded);
  const body = Number.isInteger(abs)
    ? String(abs)
    : abs.toLocaleString('es-CL', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  return `${rounded < 0 ? '−' : ''}${body}%`;
}
