import type { MiembroTaller } from '@/services/equipoTallerService';
import { mecanicoCompatibleConTipoServicio } from '@/services/equipoTallerService';
import type { ServicioCatalogoGrupo } from '@/utils/agruparOfertasPorCatalogo';
import { labelTipoMotor } from '@/utils/tiposMotorCatalogo';

type OfertaConCategorias = {
  servicio_info?: { categorias_info?: Array<{ id?: number }> };
};

export type CatalogoOpcionAgenda = {
  key: string;
  label: string;
  ofertaId: number;
  categoriasIds: number[];
};

export function categoriasIdsFromOferta(oferta: OfertaConCategorias): number[] {
  const ids = new Set<number>();
  for (const cat of oferta.servicio_info?.categorias_info ?? []) {
    if (typeof cat?.id === 'number' && cat.id > 0) ids.add(cat.id);
  }
  return [...ids];
}

export function categoriasIdsFromGrupo(grupo: ServicioCatalogoGrupo): number[] {
  const ids = new Set<number>();
  for (const oferta of grupo.ofertas) {
    for (const id of categoriasIdsFromOferta(oferta)) ids.add(id);
  }
  return [...ids];
}

export function buildCatalogoOpcionesAgenda(grupos: ServicioCatalogoGrupo[]): CatalogoOpcionAgenda[] {
  const opciones: CatalogoOpcionAgenda[] = [];

  for (const grupo of grupos) {
    if (grupo.motoresDistintos.length > 1) {
      for (const sub of grupo.subgrupos) {
        const motorLabel = labelTipoMotor(sub.representante.tipo_motor);
        const label =
          motorLabel && motorLabel !== 'Todos los motores'
            ? `${grupo.nombre} · ${motorLabel}`
            : grupo.nombre;
        opciones.push({
          key: `${grupo.key}::${sub.key}`,
          label,
          ofertaId: sub.representante.id,
          categoriasIds: categoriasIdsFromOferta(sub.representante),
        });
      }
      continue;
    }

    opciones.push({
      key: grupo.key,
      label: grupo.nombre,
      ofertaId: grupo.representante.id,
      categoriasIds: categoriasIdsFromGrupo(grupo),
    });
  }

  return opciones.sort((a, b) =>
    a.label.localeCompare(b.label, 'es', { sensitivity: 'base' }),
  );
}

export function mecanicoAptoParaAgenda(
  m: Pick<MiembroTaller, 'modalidad_tecnico' | 'especialidades'>,
  tipoServicio: 'taller' | 'domicilio',
  categoriasIds: number[],
): boolean {
  if (!mecanicoCompatibleConTipoServicio(m, tipoServicio)) return false;
  if (categoriasIds.length === 0) return true;
  return m.especialidades.some((id) => categoriasIds.includes(id));
}

export function filtrarMecanicosParaAgenda(
  equipo: MiembroTaller[],
  opts: { tipoServicio: 'taller' | 'domicilio'; categoriasIds?: number[] },
): MiembroTaller[] {
  const categoriasIds = opts.categoriasIds ?? [];
  return equipo.filter((m) => mecanicoAptoParaAgenda(m, opts.tipoServicio, categoriasIds));
}
