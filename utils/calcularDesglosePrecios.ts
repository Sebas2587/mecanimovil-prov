export interface DesglosePrecios {
  costo_total_sin_iva: number;
  iva_19_porciento: number;
  precio_final_cliente: number;
  comision_mecanmovil_20_porciento: number;
  iva_sobre_comision: number;
  ganancia_neta_proveedor: number;
  monto_transferido: number;
}

/** Misma fórmula que el backend (IVA 19%, comisión 20%). */
export function calcularDesglosePrecios(
  costoManoObra: number,
  costoRepuestos: number = 0
): DesglosePrecios {
  const mano = Math.max(0, costoManoObra);
  const repuestos = Math.max(0, costoRepuestos);
  const costo_total_sin_iva = mano + repuestos;
  const iva_19_porciento = costo_total_sin_iva * 0.19;
  const precio_final_cliente = costo_total_sin_iva + iva_19_porciento;
  const comision_mecanmovil_20_porciento = costo_total_sin_iva * 0.2;
  const iva_sobre_comision = comision_mecanmovil_20_porciento * 0.19;
  const ganancia_neta_proveedor =
    costo_total_sin_iva - comision_mecanmovil_20_porciento;
  const monto_transferido =
    precio_final_cliente -
    (comision_mecanmovil_20_porciento + iva_sobre_comision);

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
