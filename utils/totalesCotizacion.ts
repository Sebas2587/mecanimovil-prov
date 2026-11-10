/**
 * Total de las líneas de la respuesta. IVA ya incluido. No guarda la cotización.
 * Null y vacío no son 0. Un 0 numérico sí es un total.
 */

import { cobraAlCliente, mensajeBloqueoDudas, type CotizacionDecision } from '@/utils/decisionCotizador';

export type LineaRepuestoTotal = {
  id?: string | number | null;
  nombre?: string | null;
  cantidad?: number | string | null;
  precio_unitario_clp?: number | string | null;
  origen?: string | null;
  estado_sugerencia?: string | null;
  identidad?: string | null;
  rol?: string | null;
};

export type LineaManoObraTotal = {
  monto_clp?: number | string | null;
};

export type TotalesLineas = {
  costo_repuestos_clp: number | null;
  mano_obra_clp: number;
  descuento_clp: number;
  total_clp: number | null;
  total_persistido_clp: number | null;
  total_conocido_parcial_clp: number;
  total_alineado: boolean;
  totales_completos: boolean;
  totales_faltantes: string[];
  totales_fuente: 'lineas_respuesta';
  precios_iva: 'incluido';
};

export type LecturaTotal = {
  total: number | null;
  texto: string;
  incompleto: boolean;
  enviable: boolean;
  parcial: number | null;
  persistido: number | null;
};

function medioPar(valor: number): number {
  const base = Math.floor(valor);
  const fraccion = valor - base;
  if (Math.abs(fraccion - 0.5) < 1e-9) return base % 2 === 0 ? base : base + 1;
  return Math.round(valor);
}

export function precioPresente(valor: unknown): boolean {
  if (valor == null) return false;
  if (typeof valor === 'string' && !valor.trim()) return false;
  return true;
}

function aEnteroClp(valor: unknown, porOmision = 0): number {
  if (valor == null) return porOmision;
  if (typeof valor === 'number') {
    if (!Number.isFinite(valor)) return porOmision;
    return Math.max(0, medioPar(valor));
  }
  const texto = String(valor).trim();
  if (!texto) return porOmision;
  const negativo = texto.startsWith('-');
  const digitos = texto.replace(/\D/g, '');
  if (!digitos) return porOmision;
  const n = Number(digitos);
  if (!Number.isFinite(n)) return porOmision;
  return negativo ? -Math.max(0, n) : Math.max(0, n);
}

export function numeroTotal(valor: unknown): number | null {
  if (!precioPresente(valor)) return null;
  if (typeof valor === 'number') {
    if (!Number.isFinite(valor)) return null;
    return medioPar(valor);
  }
  const n = Number(String(valor).trim());
  if (!Number.isFinite(n)) return null;
  return medioPar(n);
}

export function calcularDescuentoAplicado(input: {
  costoRepuestosClp: number;
  manoObraClp: number;
  descuentoTipo?: string | null;
  descuentoAlcance?: string | null;
  descuentoValor?: number | string | null;
}): { descuentoClp: number; totalClp: number } {
  const costo = Math.max(0, Math.trunc(input.costoRepuestosClp || 0));
  const mano = Math.max(0, Math.trunc(input.manoObraClp || 0));
  const bruto = costo + mano;
  const tipo = (input.descuentoTipo || '').trim();
  if (tipo !== 'monto' && tipo !== 'porcentaje') return { descuentoClp: 0, totalClp: bruto };
  const alcance = input.descuentoAlcance === 'total' ? 'total' : 'mano_obra';
  const base = alcance === 'mano_obra' ? mano : bruto;
  let desc = 0;
  if (tipo === 'porcentaje') {
    const pct = Number(input.descuentoValor || 0);
    const acotado = Number.isFinite(pct) ? Math.min(100, Math.max(0, pct)) : 0;
    desc = medioPar((base * acotado) / 100);
  } else {
    desc = Math.max(0, aEnteroClp(input.descuentoValor));
  }
  desc = Math.max(0, Math.min(desc, base));
  return { descuentoClp: desc, totalClp: Math.max(0, bruto - desc) };
}

export function totalesDesdeLineas(input: {
  repuestos?: LineaRepuestoTotal[] | null;
  manoObraLineas?: LineaManoObraTotal[] | null;
  descuentoTipo?: string | null;
  descuentoAlcance?: string | null;
  descuentoValor?: number | string | null;
  totalPersistido?: number | string | null;
}): TotalesLineas {
  const faltantes: string[] = [];
  let costo = 0;
  (input.repuestos || []).forEach((rep, indice) => {
    if (!rep || typeof rep !== 'object') {
      faltantes.push(String(indice));
      return;
    }
    if (!cobraAlCliente(rep)) return;
    if (!precioPresente(rep.precio_unitario_clp)) {
      faltantes.push(String(rep.nombre || rep.id || indice));
      return;
    }
    const cantidadCruda = Number(rep.cantidad || 1);
    const cantidad = Number.isFinite(cantidadCruda) ? Math.max(1, Math.trunc(cantidadCruda)) : 1;
    costo += cantidad * aEnteroClp(rep.precio_unitario_clp);
  });
  let mano = 0;
  (input.manoObraLineas || []).forEach((linea) => {
    if (linea && typeof linea === 'object' && precioPresente(linea.monto_clp)) {
      mano += aEnteroClp(linea.monto_clp);
    }
  });
  const desc = calcularDescuentoAplicado({
    costoRepuestosClp: costo,
    manoObraClp: mano,
    descuentoTipo: input.descuentoTipo,
    descuentoAlcance: input.descuentoAlcance,
    descuentoValor: input.descuentoValor,
  });
  const completo = faltantes.length === 0;
  const persistido = numeroTotal(input.totalPersistido);
  return {
    costo_repuestos_clp: completo ? costo : null,
    mano_obra_clp: mano,
    descuento_clp: desc.descuentoClp,
    total_clp: completo ? desc.totalClp : null,
    total_persistido_clp: persistido,
    total_conocido_parcial_clp: desc.totalClp,
    total_alineado: Boolean(completo && persistido != null && desc.totalClp === persistido),
    totales_completos: completo,
    totales_faltantes: faltantes,
    totales_fuente: 'lineas_respuesta',
    precios_iva: 'incluido',
  };
}

export function formatearTotalConocido(total: number): string {
  const formatted = Math.round(total).toLocaleString('es-CL', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  return `$${formatted}`;
}

/** Lectura del recurso. Sin `totales_completos`, un número (incluido 0) es el total viejo. */
export function lecturaTotalServidor(cotizacion: {
  total_clp?: unknown;
  totales_completos?: boolean | null;
  total_conocido_parcial_clp?: unknown;
  total_persistido_clp?: unknown;
}): LecturaTotal {
  const persistido = numeroTotal(cotizacion.total_persistido_clp);
  const parcial = numeroTotal(cotizacion.total_conocido_parcial_clp);
  const total = numeroTotal(cotizacion.total_clp);
  const incompleto = cotizacion.totales_completos === false || total == null;
  if (incompleto) {
    return {
      total: null,
      texto: 'Incompleto',
      incompleto: true,
      enviable: false,
      parcial,
      persistido,
    };
  }
  return {
    total,
    texto: formatearTotalConocido(total as number),
    incompleto: false,
    enviable: true,
    parcial,
    persistido,
  };
}

type CotizacionEnvio = Omit<CotizacionDecision, 'repuestos'> & {
  total_clp?: unknown;
  totales_completos?: boolean | null;
  total_persistido_clp?: unknown;
  repuestos?: LineaRepuestoTotal[] | null;
  mano_obra_lineas?: LineaManoObraTotal[] | null;
  descuento_tipo?: string | null;
  descuento_alcance?: string | null;
  descuento_valor?: number | string | null;
};

/** Null si se puede enviar. El mensaje explica por qué no se manda como $0. */
export function envioTotalBloqueado(cotizacion: CotizacionEnvio): string | null {
  const dudas = mensajeBloqueoDudas(cotizacion);
  if (dudas) return dudas;
  if (Array.isArray(cotizacion.repuestos)) {
    const canon = totalesDesdeLineas({
      repuestos: cotizacion.repuestos,
      manoObraLineas: cotizacion.mano_obra_lineas,
      descuentoTipo: cotizacion.descuento_tipo,
      descuentoAlcance: cotizacion.descuento_alcance,
      descuentoValor: cotizacion.descuento_valor,
      totalPersistido: cotizacion.total_persistido_clp as number | string | null | undefined,
    });
    if (!canon.totales_completos || canon.total_clp == null) {
      return 'Falta el precio de una línea. No se envía como $0.';
    }
    return null;
  }
  const lectura = lecturaTotalServidor(cotizacion);
  if (!lectura.enviable) return 'El total está incompleto. No se envía como $0.';
  return null;
}
