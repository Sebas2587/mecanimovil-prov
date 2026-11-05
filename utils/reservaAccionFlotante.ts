/**
 * Hueco que el scroll debe dejar para una acción que flota sobre el contenido.
 * El botón se queda en su ancla (sobre el pie o la barra). El contenido termina
 * arriba del botón, no debajo de él.
 */
export const ALTO_BOTON_MAS = 56;
export const ALTO_NUEVA_COTIZACION = 48;
export const HUECO_ACCION = 12;

/** Padding inferior: ancla del botón + su alto + un hueco para no tapar la última línea. */
export function reservaScrollSobreAccion(anclaInferior: number, alto: number): number {
  return anclaInferior + alto + HUECO_ACCION;
}

/**
 * «Nueva cotización» mide 48 y flota 12 px sobre la barra.
 * 72 es el mismo hueco que Hoy y Agenda ya reservan.
 */
export function reservaNuevaCotizacion(): number {
  return ALTO_NUEVA_COTIZACION + HUECO_ACCION + HUECO_ACCION;
}

export function contenidoDespejaAccion(paddingInferior: number, ancla: number, alto: number): boolean {
  return paddingInferior >= ancla + alto + HUECO_ACCION;
}
