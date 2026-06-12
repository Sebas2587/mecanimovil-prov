export interface DesglosePrecios {
  costo_total_sin_iva: number;
  iva_19_porciento: number;
  precio_final_cliente: number;
  comision_mecanmovil_20_porciento: number;
  iva_sobre_comision: number;
  ganancia_neta_proveedor: number;
  monto_transferido: number;
}

import { redondearCLP } from './formatearMontoCLP';

/**
 * Misma fórmula que el backend (IVA 19%, comisión 20%).
 * El precio que pagará el cliente y los montos derivados se redondean a peso entero
 * (CLP no admite decimales), de modo que coincidan con el backend, con lo que cobra
 * Mercado Pago y con la boleta del SII.
 */
export function calcularDesglosePrecios(
  costoManoObra: number,
  costoRepuestos: number = 0
): DesglosePrecios {
  const mano = Math.max(0, costoManoObra);
  const repuestos = Math.max(0, costoRepuestos);
  const costo_total_sin_iva = mano + repuestos;
  const iva_19_porciento = redondearCLP(costo_total_sin_iva * 0.19);
  const precio_final_cliente = redondearCLP(costo_total_sin_iva * 1.19);
  const comision_mecanmovil_20_porciento = redondearCLP(costo_total_sin_iva * 0.2);
  const iva_sobre_comision = redondearCLP(costo_total_sin_iva * 0.2 * 0.19);
  const ganancia_neta_proveedor = redondearCLP(
    costo_total_sin_iva - costo_total_sin_iva * 0.2
  );
  const monto_transferido = redondearCLP(
    costo_total_sin_iva * 1.19 -
      (costo_total_sin_iva * 0.2 + costo_total_sin_iva * 0.2 * 0.19)
  );

  return {
    costo_total_sin_iva,
    iva_19_porciento,
    precio_final_cliente,
    comision_mecanmovil_20_porciento,
    iva_sobre_comision,
    ganancia_neta_proveedor,
    monto_transferido,
  };
}
