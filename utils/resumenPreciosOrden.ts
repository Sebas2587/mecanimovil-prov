/**
 * Desglose de una orden de la app. Si una línea no trae desglose del backend,
 * no se inventa IVA, comisión ni ganancia.
 */
export type DesglosePrecioLinea = {
  costo_total_sin_iva?: string | number | null;
  iva_19_porciento?: string | number | null;
  precio_final_cliente?: string | number | null;
  comision_mecanmovil_20_porciento?: string | number | null;
  iva_sobre_comision?: string | number | null;
  ganancia_neta_proveedor?: string | number | null;
};

export type LineaPrecioOrden = {
  precio_final?: string | number | null;
  oferta_servicio_detail?: {
    desglose_precios?: DesglosePrecioLinea | null;
  } | null;
};

export type ResumenPreciosOrden = {
  hayLineas: boolean;
  desgloseCompleto: boolean;
  precioFinalCliente: number;
  costoSinIva: number | null;
  iva: number | null;
  comision: number | null;
  ivaComision: number | null;
  despuesDeComision: number | null;
};

function numero(valor: string | number | null | undefined): number {
  const n = typeof valor === 'number' ? valor : parseFloat(String(valor ?? ''));
  return Number.isFinite(n) ? n : 0;
}

export function resumenPreciosOrden(
  lineas: LineaPrecioOrden[] | null | undefined,
): ResumenPreciosOrden {
  const filas = Array.isArray(lineas) ? lineas : [];
  if (!filas.length) {
    return {
      hayLineas: false,
      desgloseCompleto: false,
      precioFinalCliente: 0,
      costoSinIva: null,
      iva: null,
      comision: null,
      ivaComision: null,
      despuesDeComision: null,
    };
  }

  const vacio: ResumenPreciosOrden = {
    hayLineas: true,
    desgloseCompleto: false,
    precioFinalCliente: 0,
    costoSinIva: null,
    iva: null,
    comision: null,
    ivaComision: null,
    despuesDeComision: null,
  };

  let costo = 0;
  let iva = 0;
  let precio = 0;
  let comision = 0;
  let ivaComision = 0;
  let despues = 0;
  let faltan = 0;
  for (const linea of filas) {
    const desglose = linea.oferta_servicio_detail?.desglose_precios;
    if (!desglose) {
      faltan += 1;
      precio += numero(linea.precio_final);
      continue;
    }
    costo += numero(desglose.costo_total_sin_iva);
    iva += numero(desglose.iva_19_porciento);
    precio += numero(desglose.precio_final_cliente) || numero(linea.precio_final);
    comision += numero(desglose.comision_mecanmovil_20_porciento);
    ivaComision += numero(desglose.iva_sobre_comision);
    despues += numero(desglose.ganancia_neta_proveedor);
  }

  if (faltan > 0) {
    vacio.precioFinalCliente = precio;
    return vacio;
  }

  return {
    hayLineas: true,
    desgloseCompleto: true,
    precioFinalCliente: precio,
    costoSinIva: costo,
    iva,
    comision,
    ivaComision,
    despuesDeComision: despues,
  };
}
