/**
 * Retención Mercado Pago (Chile): comisión 3,19% sobre el cobro + IVA 19% sobre esa comisión.
 * Se usa para mostrar fallback coherente con el backend cuando aún no hay estadísticas.
 */
export const MERCADO_PAGO_COMISION = 0.0319;
export const MERCADO_PAGO_IVA = 0.19;

export const mercadoPagoRetencionEfectivaSobreBruto = MERCADO_PAGO_COMISION * (1 + MERCADO_PAGO_IVA);

/** Monto bruto (CLP) a cobrar para acercarse a `neto` de liquidación tras MP. */
export function montoBrutoParaNetoDeseado(neto: number): number {
  const r = mercadoPagoRetencionEfectivaSobreBruto;
  if (r >= 1) return neto;
  return Math.round(neto / (1 - r));
}

/** Objetivo neto histórico por crédito (negocio); el bruto cobrado sale del backend. */
export const NETO_OBJETIVO_CREDITO_REF_CLP = 400;

/** Fallback si la API no devuelve `precio_credito_unitario_clp` (debe coincidir con bruto backend). */
export const FALLBACK_PRECIO_CREDITO_BRUTO_CLP = montoBrutoParaNetoDeseado(NETO_OBJETIVO_CREDITO_REF_CLP);
