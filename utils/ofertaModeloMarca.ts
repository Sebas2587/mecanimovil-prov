/**
 * Claves y publicación de ofertas por marca + modelo.
 * modelo null en API = todos los modelos de la marca.
 */

export function claveOfertaMarcaModelo(marcaId: number, modeloId: number | null): string {
  return `${marcaId}-${modeloId ?? 'all'}`;
}

/** Todas las marcas del catálogo con el mismo precio → una sola oferta precio base (marca null). */
export function debeConsolidarPrecioBaseMarcas(
  marcasSeleccionadas: number[],
  totalMarcasDisponibles: number,
): boolean {
  return totalMarcasDisponibles > 1 && marcasSeleccionadas.length >= totalMarcasDisponibles;
}

export type PublicacionOfertaItem = {
  marcaId: number | null;
  modeloId: number | null;
  clave: string;
  costoManoObra?: string;
  costoRepuestos?: string;
};

/**
 * Decide si publicar una oferta por marca (modelo null) o una por cada modelo seleccionado.
 * El precio siempre proviene de los costos base del formulario.
 */
export function buildPublicacionesPorMarca(
  marcaId: number,
  modelosDisponibles: number[],
  modelosSeleccionados: number[],
  opts: {
    manoObraBase: string;
    repuestosBase: string;
  },
): PublicacionOfertaItem[] {
  const seleccionados = modelosSeleccionados.filter((id) => modelosDisponibles.includes(id));
  if (seleccionados.length === 0) {
    return [];
  }

  const todosSeleccionados =
    modelosDisponibles.length > 0 && seleccionados.length === modelosDisponibles.length;

  if (todosSeleccionados) {
    return [
      {
        marcaId,
        modeloId: null,
        clave: claveOfertaMarcaModelo(marcaId, null),
        costoManoObra: opts.manoObraBase,
        costoRepuestos: opts.repuestosBase,
      },
    ];
  }

  return seleccionados.map((modeloId) => ({
    marcaId,
    modeloId,
    clave: claveOfertaMarcaModelo(marcaId, modeloId),
    costoManoObra: opts.manoObraBase,
    costoRepuestos: opts.repuestosBase,
  }));
}
