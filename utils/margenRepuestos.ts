import { formatearMontoCLP, redondearCLP } from '@/utils/formatearMontoCLP';

export type LineaMargenInput = {
  cantidad?: number | null;
  costo_unitario_clp?: number | null;
  precio_unitario_clp?: number | null;
  precio_cobrado_clp?: number | null;
};

export type MargenLinea = {
  cantidad: number;
  costoUnitario: number | null;
  cobradoUnitario: number;
  costoLinea: number | null;
  cobradoLinea: number;
  margenClp: number | null;
  margenPct: number | null;
};

export type ResumenMargen = {
  costoTotal: number | null;
  cobradoTotal: number;
  ganancia: number | null;
  margenPct: number | null;
  haySinCosto: boolean;
};

/** Cobrado que el taller está editando. Si aún no hay unitario, el del serializer. */
export function cobradoUnitarioLinea(rep: LineaMargenInput): number {
  const editado = Number(rep.precio_unitario_clp);
  if (Number.isFinite(editado)) return redondearCLP(editado);
  const servidor = Number(rep.precio_cobrado_clp);
  if (Number.isFinite(servidor)) return redondearCLP(servidor);
  return 0;
}

export function margenLineaRepuesto(rep: LineaMargenInput): MargenLinea {
  const cantidad = Math.max(1, redondearCLP(rep.cantidad || 1));
  const costoRaw = rep.costo_unitario_clp;
  const costoUnitario = costoRaw == null || !Number.isFinite(Number(costoRaw))
    ? null
    : redondearCLP(costoRaw);
  const cobradoUnitario = cobradoUnitarioLinea(rep);
  const cobradoLinea = cobradoUnitario * cantidad;
  if (costoUnitario == null) {
    return {
      cantidad,
      costoUnitario: null,
      cobradoUnitario,
      costoLinea: null,
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
  let cobradoConCosto = 0;
  let cobradoTotal = 0;
  let gananciaConocida = 0;
  let conCosto = 0;
  let haySinCosto = false;
  for (const linea of lineas) {
    const m = margenLineaRepuesto(linea);
    cobradoTotal += m.cobradoLinea;
    if (m.margenClp == null || m.costoLinea == null) {
      haySinCosto = true;
      continue;
    }
    conCosto += 1;
    costoConocido += m.costoLinea;
    cobradoConCosto += m.cobradoLinea;
    gananciaConocida += m.margenClp;
  }
  if (conCosto === 0) {
    return {
      costoTotal: null,
      cobradoTotal,
      ganancia: null,
      margenPct: null,
      haySinCosto: lineas.length > 0,
    };
  }
  return {
    costoTotal: costoConocido,
    cobradoTotal,
    ganancia: gananciaConocida,
    margenPct: costoConocido > 0 ? (gananciaConocida / costoConocido) * 100 : null,
    haySinCosto,
  };
}

export function textoMargenClp(valor: number | null): string {
  if (valor == null) return 'sin costo';
  if (valor < 0) return `−${formatearMontoCLP(Math.abs(valor))}`;
  return formatearMontoCLP(valor);
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
