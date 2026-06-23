import type { HorarioProveedor } from '@/services/api';

/** Coerce API boolean-ish values (evita que `"false"` cuente como activo). */
export function normalizarActivo(activo: unknown): boolean {
  if (activo === false || activo === 0 || activo === '0' || activo === 'false') {
    return false;
  }
  if (activo === true || activo === 1 || activo === '1' || activo === 'true') {
    return true;
  }
  return Boolean(activo);
}

export function parseHorariosApiResponse(data: unknown): HorarioProveedor[] {
  if (Array.isArray(data)) {
    return data;
  }
  if (data && typeof data === 'object') {
    const obj = data as { results?: unknown; horarios?: unknown };
    if (Array.isArray(obj.results)) {
      return obj.results as HorarioProveedor[];
    }
    if (Array.isArray(obj.horarios)) {
      return obj.horarios as HorarioProveedor[];
    }
  }
  return [];
}

/** True si el proveedor guardó horarios y tiene al menos un día activo en BD. */
export function proveedorTieneHorariosActivos(horarios: HorarioProveedor[]): boolean {
  if (!Array.isArray(horarios) || horarios.length === 0) {
    return false;
  }
  return horarios.some((h) => normalizarActivo(h.activo));
}

export type EstadoAgendaProveedor = {
  agenda_configurada: boolean;
  tiene_horario_general: boolean;
  mecanicos_con_horario: number;
  mecanicos_con_horario_ids: number[];
  necesita_configurar: boolean;
};

/** Evalúa agenda operativa a partir de todos los registros del taller/proveedor. */
export function evaluarAgendaDesdeHorarios(horarios: HorarioProveedor[]): EstadoAgendaProveedor {
  const activos = horarios.filter((h) => normalizarActivo(h.activo));
  const general = activos.filter((h) => h.miembro_taller == null);
  const tieneHorarioGeneral = general.length > 0;

  const idsMecanicos = new Set<number>();
  for (const h of activos) {
    if (h.miembro_taller != null) {
      idsMecanicos.add(Number(h.miembro_taller));
    }
  }
  const mecanicosConHorarioIds = [...idsMecanicos];
  const agendaConfigurada = tieneHorarioGeneral || mecanicosConHorarioIds.length > 0;

  return {
    agenda_configurada: agendaConfigurada,
    tiene_horario_general: tieneHorarioGeneral,
    mecanicos_con_horario: mecanicosConHorarioIds.length,
    mecanicos_con_horario_ids: mecanicosConHorarioIds,
    necesita_configurar: !agendaConfigurada,
  };
}

export function normalizarEstadoAgendaApi(data: unknown): EstadoAgendaProveedor {
  const fallback: EstadoAgendaProveedor = {
    agenda_configurada: false,
    tiene_horario_general: false,
    mecanicos_con_horario: 0,
    mecanicos_con_horario_ids: [],
    necesita_configurar: true,
  };
  if (!data || typeof data !== 'object') return fallback;
  const raw = data as Partial<EstadoAgendaProveedor>;
  const ids = Array.isArray(raw.mecanicos_con_horario_ids)
    ? raw.mecanicos_con_horario_ids.map((id) => Number(id)).filter((id) => !Number.isNaN(id))
    : [];
  const agenda =
    typeof raw.agenda_configurada === 'boolean'
      ? raw.agenda_configurada
      : Boolean(raw.tiene_horario_general) || ids.length > 0;
  return {
    agenda_configurada: agenda,
    tiene_horario_general: Boolean(raw.tiene_horario_general),
    mecanicos_con_horario:
      typeof raw.mecanicos_con_horario === 'number' ? raw.mecanicos_con_horario : ids.length,
    mecanicos_con_horario_ids: ids,
    necesita_configurar:
      typeof raw.necesita_configurar === 'boolean' ? raw.necesita_configurar : !agenda,
  };
}
