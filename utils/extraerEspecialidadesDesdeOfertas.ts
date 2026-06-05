export type EspecialidadTag = {
  id: number;
  nombre: string;
};

type OfertaConCategorias = {
  servicio_info?: {
    categorias_info?: EspecialidadTag[];
  };
};

/** Especialidades únicas derivadas de las categorías de los servicios configurados. */
export function extraerEspecialidadesDesdeOfertas(
  ofertas: OfertaConCategorias[],
): EspecialidadTag[] {
  const map = new Map<number, EspecialidadTag>();

  for (const oferta of ofertas) {
    for (const categoria of oferta.servicio_info?.categorias_info ?? []) {
      if (categoria?.id && categoria?.nombre) {
        map.set(categoria.id, categoria);
      }
    }
  }

  return Array.from(map.values()).sort((a, b) =>
    a.nombre.localeCompare(b.nombre, 'es'),
  );
}
