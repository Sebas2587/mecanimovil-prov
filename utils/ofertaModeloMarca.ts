/**
 * Claves y publicación de ofertas por marca + modelo.
 * modelo null en API = todos los modelos de la marca.
 */

export function claveOfertaMarcaModelo(marcaId: number, modeloId: number | null): string {
  return `${marcaId}-${modeloId ?? 'all'}`;
}

export type PublicacionOfertaItem = {
  marcaId: number | null;
  modeloId: number | null;
  clave: string;
  costoManoObra?: string;
  costoRepuestos?: string;
};

export type PreciosPorModeloMap = Record<string, { manoObra: string; repuestos: string }>;

function preciosIguales(
  a: { manoObra: string; repuestos: string },
  b: { manoObra: string; repuestos: string },
): boolean {
  return a.manoObra.trim() === b.manoObra.trim() && a.repuestos.trim() === b.repuestos.trim();
}

/**
 * Decide si publicar una oferta por marca (modelo null) o una por cada modelo seleccionado.
 */
export function buildPublicacionesPorMarca(
  marcaId: number,
  modelosDisponibles: number[],
  modelosSeleccionados: number[],
  opts: {
    manoObraBase: string;
    repuestosBase: string;
    personalizarPrecio: boolean;
    preciosPorModelo: PreciosPorModeloMap;
  },
): PublicacionOfertaItem[] {
  const seleccionados = modelosSeleccionados.filter((id) => modelosDisponibles.includes(id));
  if (seleccionados.length === 0) {
    return [];
  }

  const base = { manoObra: opts.manoObraBase, repuestos: opts.repuestosBase };
  const todosSeleccionados =
    modelosDisponibles.length > 0 && seleccionados.length === modelosDisponibles.length;

  if (todosSeleccionados && !opts.personalizarPrecio) {
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

  if (todosSeleccionados && opts.personalizarPrecio) {
    const precios = seleccionados.map((modeloId) => {
      const custom = opts.preciosPorModelo[claveOfertaMarcaModelo(marcaId, modeloId)];
      return custom ?? base;
    });
    const todosIguales = precios.every((p) => preciosIguales(p, base));
    if (todosIguales) {
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
  }

  return seleccionados.map((modeloId) => {
    const custom = opts.preciosPorModelo[claveOfertaMarcaModelo(marcaId, modeloId)];
    return {
      marcaId,
      modeloId,
      clave: claveOfertaMarcaModelo(marcaId, modeloId),
      costoManoObra: custom?.manoObra ?? opts.manoObraBase,
      costoRepuestos: custom?.repuestos ?? opts.repuestosBase,
    };
  });
}
