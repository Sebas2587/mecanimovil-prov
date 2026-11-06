const MARCA_PRUEBA = /(^|[^0-9A-Za-zÁÉÍÓÚÜÑáéíóúüñ])test([^0-9A-Za-zÁÉÍÓÚÜÑáéíóúüñ]|$)/i;

/** El título visible de la cotización es el nombre del servicio. */
export function esCotizacionDePrueba(cotizacion: { servicio_nombre?: string | null }): boolean {
  return MARCA_PRUEBA.test((cotizacion.servicio_nombre || '').trim());
}
