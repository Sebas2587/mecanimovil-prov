/**
 * Desglose de una orden de la app. Solo suma importes que el backend envió.
 * Un campo ausente, vacío o no numérico no se convierte en cero.
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
  /** Suma de precios explícitos. Null si alguna línea no trae precio. */
  precioFinalCliente: number | null;
  costoSinIva: number | null;
  iva: number | null;
  comision: number | null;
  ivaComision: number | null;
  despuesDeComision: number | null;
};

const CAMPOS_DESGLOSE = [
  'costo_total_sin_iva',
  'iva_19_porciento',
  'precio_final_cliente',
  'comision_mecanmovil_20_porciento',
  'iva_sobre_comision',
  'ganancia_neta_proveedor',
] as const;

/** Número finito, incluido el cero. Null si el dato no vino o no es numérico. */
export function montoExplicito(valor: unknown): number | null {
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : null;
  if (typeof valor === 'string') {
    const texto = valor.trim();
    if (!texto) return null;
    const n = Number(texto);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function vacio(hayLineas: boolean): ResumenPreciosOrden {
  return {
    hayLineas,
    desgloseCompleto: false,
    precioFinalCliente: null,
    costoSinIva: null,
    iva: null,
    comision: null,
    ivaComision: null,
    despuesDeComision: null,
  };
}

export function resumenPreciosOrden(
  lineas: LineaPrecioOrden[] | null | undefined,
): ResumenPreciosOrden {
  const filas = Array.isArray(lineas) ? lineas : [];
  if (!filas.length) return vacio(false);

  let costo = 0;
  let iva = 0;
  let precio = 0;
  let comision = 0;
  let ivaComision = 0;
  let despues = 0;
  let preciosConocidos = 0;
  let desgloseCompleto = true;

  for (const linea of filas) {
    const desglose = linea.oferta_servicio_detail?.desglose_precios;
    const precioLinea = montoExplicito(desglose?.precio_final_cliente) ?? montoExplicito(linea.precio_final);
    if (precioLinea == null) {
      desgloseCompleto = false;
      continue;
    }
    preciosConocidos += 1;
    precio += precioLinea;

    if (!desglose) {
      desgloseCompleto = false;
      continue;
    }
    const importes = CAMPOS_DESGLOSE.map((campo) => montoExplicito(desglose[campo]));
    if (importes.some((n) => n == null)) {
      desgloseCompleto = false;
      continue;
    }
    const [costoLinea, ivaLinea, , comisionLinea, ivaComisionLinea, despuesLinea] = importes as number[];
    costo += costoLinea;
    iva += ivaLinea;
    comision += comisionLinea;
    ivaComision += ivaComisionLinea;
    despues += despuesLinea;
  }

  const totalConocido = preciosConocidos === filas.length ? precio : null;
  if (!desgloseCompleto) {
    return { ...vacio(true), precioFinalCliente: totalConocido };
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
