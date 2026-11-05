/**
 * Misma suma que el total canónico del backend: líneas de la respuesta,
 * IVA ya incluido. No guarda la cotización.
 */

export type LineaRepuestoTotal = {
  id?: string | number | null;
  nombre?: string | null;
  cantidad?: number | string | null;
  precio_unitario_clp?: number | string | null;
};

export type LineaManoObraTotal = {
  monto_clp?: number | string | null;
};

export type TotalesLineas = {
  costo_repuestos_clp: number | null;
  mano_obra_clp: number;
  descuento_clp: number;
  total_clp: number | null;
  total_persistido_clp: number;
  total_conocido_parcial_clp: number;
  total_alineado: boolean;
  totales_completos: boolean;
  totales_faltantes: string[];
  totales_fuente: 'lineas_respuesta';
  precios_iva: 'incluido';
};

function medioPar(valor: number): number {
  const base = Math.floor(valor);
  const fraccion = valor - base;
  if (Math.abs(fraccion - 0.5) < 1e-9) return base % 2 === 0 ? base : base + 1;
  return Math.round(valor);
}

function aEnteroClp(valor: unknown, porOmision = 0): number {
  if (valor == null) return porOmision;
  if (typeof valor === 'number') {
    if (!Number.isFinite(valor)) return porOmision;
    return Math.max(0, medioPar(valor));
  }
  const texto = String(valor).trim();
  if (!texto) return porOmision;
  const digitos = texto.replace(/\D/g, '');
  if (!digitos) return porOmision;
  const n = Number(digitos);
  return Number.isFinite(n) ? Math.max(0, n) : porOmision;
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
    desc = aEnteroClp(input.descuentoValor);
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
    const precio = rep.precio_unitario_clp;
    if (precio == null || (typeof precio === 'string' && !precio.trim())) {
      faltantes.push(String(rep.nombre || rep.id || indice));
      return;
    }
    const cantidadCruda = Number(rep.cantidad || 1);
    const cantidad = Number.isFinite(cantidadCruda) ? Math.max(1, Math.trunc(cantidadCruda)) : 1;
    costo += cantidad * aEnteroClp(precio);
  });
  let mano = 0;
  (input.manoObraLineas || []).forEach((linea) => {
    if (linea && typeof linea === 'object') mano += aEnteroClp(linea.monto_clp);
  });
  const desc = calcularDescuentoAplicado({
    costoRepuestosClp: costo,
    manoObraClp: mano,
    descuentoTipo: input.descuentoTipo,
    descuentoAlcance: input.descuentoAlcance,
    descuentoValor: input.descuentoValor,
  });
  const completo = faltantes.length === 0;
  const persistido = aEnteroClp(input.totalPersistido);
  return {
    costo_repuestos_clp: completo ? costo : null,
    mano_obra_clp: mano,
    descuento_clp: desc.descuentoClp,
    total_clp: completo ? desc.totalClp : null,
    total_persistido_clp: persistido,
    total_conocido_parcial_clp: desc.totalClp,
    total_alineado: completo && desc.totalClp === persistido,
    totales_completos: completo,
    totales_faltantes: faltantes,
    totales_fuente: 'lineas_respuesta',
    precios_iva: 'incluido',
  };
}

export type ObligacionCotizacion = {
  obligacion_clp: number | null;
  obligacion_conocida: boolean;
  obligacion_fuente: 'congelada' | 'no_aceptada' | 'incompleto' | 'discrepancia' | 'lineas_respuesta';
  obligacion_faltantes: string[];
};

/**
 * Misma obligación que el backend. No guarda la cotización.
 * Una discrepancia deja el monto en null: no es deuda cero.
 */
export function resolverObligacionCotizacion(input: {
  estado?: string | null;
  obligacionCongeladaClp?: number | string | null;
  repuestos?: LineaRepuestoTotal[] | null;
  manoObraLineas?: LineaManoObraTotal[] | null;
  descuentoTipo?: string | null;
  descuentoAlcance?: string | null;
  descuentoValor?: number | string | null;
  totalPersistido?: number | string | null;
}): ObligacionCotizacion {
  const estado = String(input.estado || '');
  const congelada = input.obligacionCongeladaClp;
  if (estado === 'aceptada' && congelada != null && String(congelada).trim() !== '') {
    const monto = Number(congelada);
    if (Number.isFinite(monto) && monto >= 0) {
      return {
        obligacion_clp: Math.trunc(monto),
        obligacion_conocida: true,
        obligacion_fuente: 'congelada',
        obligacion_faltantes: [],
      };
    }
  }
  const canon = totalesDesdeLineas({
    repuestos: input.repuestos,
    manoObraLineas: input.manoObraLineas,
    descuentoTipo: input.descuentoTipo,
    descuentoAlcance: input.descuentoAlcance,
    descuentoValor: input.descuentoValor,
    totalPersistido: input.totalPersistido,
  });
  if (estado !== 'aceptada') {
    return {
      obligacion_clp: null,
      obligacion_conocida: false,
      obligacion_fuente: 'no_aceptada',
      obligacion_faltantes: [],
    };
  }
  if (!canon.totales_completos || canon.total_clp == null) {
    return {
      obligacion_clp: null,
      obligacion_conocida: false,
      obligacion_fuente: 'incompleto',
      obligacion_faltantes: canon.totales_faltantes,
    };
  }
  if (!canon.total_alineado) {
    return {
      obligacion_clp: null,
      obligacion_conocida: false,
      obligacion_fuente: 'discrepancia',
      obligacion_faltantes: ['total_no_alineado'],
    };
  }
  return {
    obligacion_clp: canon.total_clp,
    obligacion_conocida: true,
    obligacion_fuente: 'lineas_respuesta',
    obligacion_faltantes: [],
  };
}

export function totalConocidoCotizacion(cotizacion: {
  total_clp?: number | null;
  totales_completos?: boolean | null;
}): number | null {
  if (cotizacion.totales_completos === false) return null;
  if (cotizacion.total_clp == null || !Number.isFinite(Number(cotizacion.total_clp))) return null;
  return Math.round(Number(cotizacion.total_clp));
}
