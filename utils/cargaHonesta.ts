/** Una consulta pendiente, sin error y sin datos todavía no es un vacío. */
export function consultaSinDatos(consulta: {
  isPending: boolean;
  isError: boolean;
  data: unknown;
}): boolean {
  return consulta.isPending && !consulta.isError && consulta.data == null;
}

/** null cuando ya hay filas y toca pintarlas. */
export function textoLista(
  cargando: boolean,
  cantidad: number,
  cargandoTexto: string,
  vacioTexto: string,
): string | null {
  if (cargando) return cargandoTexto;
  if (cantidad === 0) return vacioTexto;
  return null;
}
