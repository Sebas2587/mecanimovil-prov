const MARCA_PRUEBA = /(^|[^0-9A-Za-zÁÉÍÓÚÜÑáéíóúüñ])test([^0-9A-Za-zÁÉÍÓÚÜÑáéíóúüñ]|$)/i;

type TituloCotizacion = {
  cliente_nombre?: string | null;
  cliente_display?: string | null;
  servicio_nombre?: string | null;
};

/** TEST en cualquier título visible de la ficha: cliente o servicio. */
export function esCotizacionDePrueba(cotizacion: TituloCotizacion): boolean {
  return [cotizacion.cliente_nombre, cotizacion.cliente_display, cotizacion.servicio_nombre]
    .some((titulo) => MARCA_PRUEBA.test((titulo || '').trim()));
}
