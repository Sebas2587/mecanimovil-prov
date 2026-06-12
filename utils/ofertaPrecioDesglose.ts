/**
 * Desglose subtotal (sin IVA) + IVA derivados SIEMPRE de precio_total_ofrecido.
 *
 * IVA = total − round(total / 1.19)  — garantiza que IVA > 0 cuando total > 0.
 * Los costos individuales (mo, rep, gest) se usan solo como contexto de líneas,
 * nunca para calcular el IVA final (evita que costo_mano_obra=0 produzca IVA=$0).
 */
import { redondearCLP } from './formatearMontoCLP';

export type OfertaDesgloseInput = {
  costoManoObra?: string | number | null;
  costoRepuestos?: string | number | null;
  costoGestionCompra?: string | number | null;
  precioTotalOfrecido?: string | number | null;
};

export function calcularDesgloseIvaOferta({
  costoManoObra = 0,
  costoRepuestos = 0,
  costoGestionCompra = 0,
  precioTotalOfrecido = 0,
}: OfertaDesgloseInput = {}) {
  const mo = parseFloat(String(costoManoObra ?? '0')) || 0;
  const rep = parseFloat(String(costoRepuestos ?? '0')) || 0;
  const gest = parseFloat(String(costoGestionCompra ?? '0')) || 0;
  const totalCliente = parseFloat(String(precioTotalOfrecido ?? '0')) || 0;
  const sumSinIva = mo + rep + gest;
  const tieneMontosProveedor = mo > 0 || rep > 0 || gest > 0;
  const TOL = 0.02;
  const totalDesdeLineas = sumSinIva * 1.19;
  const lineasCuadranConTotal =
    sumSinIva > 0 && Math.abs(totalDesdeLineas - totalCliente) <= TOL;

  const usarLineasComoBase = tieneMontosProveedor && sumSinIva > 0 && !lineasCuadranConTotal;

  // CLP no admite decimales. Mostramos todo en pesos enteros y derivamos el IVA como
  // (total − subtotal) para que subtotal + IVA == total EXACTO (sin descuadres de ±1
  // al redondear cada parte por separado).
  const totalMostrar = redondearCLP(usarLineasComoBase ? totalDesdeLineas : totalCliente);
  const subSinIvaDisplay = totalMostrar > 0 ? redondearCLP(totalMostrar / 1.19) : 0;
  const ivaDisplay = totalMostrar > 0 ? totalMostrar - subSinIvaDisplay : 0;

  return {
    subSinIvaDisplay,
    ivaDisplay,
    totalCliente: totalMostrar,
    lineasCuadranConTotal,
    sumSinIva,
    tieneMontosProveedor,
    mostrarNotaReconciliacion:
      tieneMontosProveedor && totalCliente > 0 && !lineasCuadranConTotal && sumSinIva > 0,
  };
}

export type DesgloseIvaApi = {
  subtotal_sin_iva?: number | string | null;
  iva?: number | string | null;
  total?: number | string | null;
} | null | undefined;

type CalcDesglose = ReturnType<typeof calcularDesgloseIvaOferta>;

/**
 * Combina `desglose_iva` del API con el cálculo local.
 *
 * Problema que evita: `dApi.iva ?? calc` deja IVA en 0 cuando la API manda `iva: 0` explícito
 * (nullish coalescing no distingue "faltante" de "cero"), aunque subtotal+IVA no cierre con total.
 */
export function resolverDesgloseIvaMostrado(
  dApi: DesgloseIvaApi,
  calc: CalcDesglose
): { subSinIva: number; iva: number; total: number } {
  const fromCalc = {
    subSinIva: calc.subSinIvaDisplay,
    iva: calc.ivaDisplay,
    total: calc.subSinIvaDisplay + calc.ivaDisplay,
  };

  if (calc.tieneMontosProveedor && calc.sumSinIva > 0) {
    return fromCalc;
  }

  const TOL = 0.02;
  const apiIva = dApi != null && dApi.iva != null ? Number(dApi.iva) : null;
  const apiSub = dApi != null && dApi.subtotal_sin_iva != null ? Number(dApi.subtotal_sin_iva) : null;
  const apiTotal = dApi != null && dApi.total != null ? Number(dApi.total) : null;

  const apiCoherente =
    apiIva !== null &&
    Number.isFinite(apiIva) &&
    apiIva > 0 &&
    apiSub !== null &&
    Number.isFinite(apiSub) &&
    apiTotal !== null &&
    Number.isFinite(apiTotal) &&
    apiTotal > 0 &&
    Math.abs(apiSub + apiIva - apiTotal) <= TOL;

  if (apiCoherente) {
    return { subSinIva: apiSub as number, iva: apiIva as number, total: (apiSub as number) + (apiIva as number) };
  }

  return fromCalc;
}
