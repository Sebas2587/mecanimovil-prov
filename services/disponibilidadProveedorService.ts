import { getAPI } from './api';
import { buildGrillaEntre } from '@/utils/citaPersonalHorario';

export type MiembroAptoAgenda = {
  id: number;
  nombre: string;
  foto_url?: string | null;
  modalidad_tecnico?: string;
  modalidad_display?: string;
};

export type SlotDisponible = {
  hora: string;
  hora_fin_estimada?: string;
};

export type VentanaLibreAgenda = {
  hora_inicio: string;
  hora_fin: string;
};

export type DisponibilidadConDuracion = {
  fecha?: string;
  proveedor_disponible?: boolean;
  mensaje?: string;
  slots_disponibles?: SlotDisponible[];
  grilla_horaria?: string[];
  ventanas_libres?: VentanaLibreAgenda[];
  hora_jornada_inicio?: string;
  hora_jornada_fin?: string;
  tiene_capacidad_rango?: boolean;
};

export type DiasDisponiblesAgenda = {
  fechas_disponibles?: string[];
};

/** Endpoint autenticado: resuelve taller/mecánico desde la sesión del proveedor. */
const AGENDA_SESION_BASE = '/usuarios/horarios-proveedor';

function basePathPublico(tipoProveedor: 'taller' | 'mecanico', proveedorId: number): string {
  if (tipoProveedor === 'taller') {
    return `/usuarios/talleres/${proveedorId}`;
  }
  return `/usuarios/mecanicos-domicilio/${proveedorId}`;
}

function appendAgendaQuery(
  query: URLSearchParams,
  params: {
    ofertaServicioId?: number;
    miembroTallerId?: number;
    modalidad?: 'a_domicilio' | 'en_taller';
    /** agenda_personal: no exige especialidad; usa jornada del taller/equipo. */
    contexto?: 'agenda_personal';
  },
): void {
  if (params.ofertaServicioId) {
    query.set('oferta_servicio_id', String(params.ofertaServicioId));
  }
  if (params.miembroTallerId) {
    query.set('miembro_taller', String(params.miembroTallerId));
  }
  if (params.modalidad) {
    query.set('modalidad', params.modalidad);
  }
  if (params.contexto) {
    query.set('contexto', params.contexto);
  }
}

export async function obtenerMecanicosAptosAgenda(params: {
  tallerId: number;
  ofertaServicioId?: number;
  modalidad?: 'a_domicilio' | 'en_taller';
}): Promise<MiembroAptoAgenda[]> {
  const api = await getAPI();
  const query = new URLSearchParams();
  if (params.ofertaServicioId) {
    query.set('oferta_servicio_id', String(params.ofertaServicioId));
  }
  if (params.modalidad) {
    query.set('modalidad', params.modalidad);
  }
  const suffix = query.toString() ? `?${query.toString()}` : '';
  const res = await api.get(`/usuarios/talleres/${params.tallerId}/mecanicos-aptos-agenda/${suffix}`);
  const miembros = res.data?.miembros;
  return Array.isArray(miembros) ? miembros : [];
}

export async function obtenerDisponibilidadConDuracion(params: {
  tipoProveedor?: 'taller' | 'mecanico';
  proveedorId?: number;
  fecha: string;
  ofertaServicioId?: number;
  miembroTallerId?: number;
  modalidad?: 'a_domicilio' | 'en_taller';
  /** Por defecto true en app proveedor: usa sesión autenticada. */
  usarSesionAutenticada?: boolean;
  /** Confirmar horario del taller: no bloquear por especialidad del catálogo. */
  contexto?: 'agenda_personal';
}): Promise<DisponibilidadConDuracion> {
  const api = await getAPI();
  const query = new URLSearchParams({ fecha: params.fecha });
  appendAgendaQuery(query, params);

  const usarSesion = params.usarSesionAutenticada !== false;
  let path: string;
  if (usarSesion) {
    path = `${AGENDA_SESION_BASE}/disponibilidad_agenda/?${query.toString()}`;
  } else {
    if (!params.tipoProveedor || params.proveedorId == null) {
      throw new Error('tipoProveedor y proveedorId son requeridos sin sesión autenticada');
    }
    path = `${basePathPublico(params.tipoProveedor, params.proveedorId)}/disponibilidad_con_duracion/?${query.toString()}`;
  }

  const res = await api.get(path);
  return res.data ?? {};
}

export async function obtenerDiasDisponiblesAgenda(params: {
  tipoProveedor?: 'taller' | 'mecanico';
  proveedorId?: number;
  ofertaServicioId?: number;
  miembroTallerId?: number;
  modalidad?: 'a_domicilio' | 'en_taller';
  dias?: number;
  usarSesionAutenticada?: boolean;
  contexto?: 'agenda_personal';
}): Promise<DiasDisponiblesAgenda> {
  const api = await getAPI();
  const query = new URLSearchParams({ dias: String(params.dias ?? 21) });
  appendAgendaQuery(query, params);

  const usarSesion = params.usarSesionAutenticada !== false;
  let path: string;
  if (usarSesion) {
    path = `${AGENDA_SESION_BASE}/dias_disponibles_agenda/?${query.toString()}`;
  } else {
    if (!params.tipoProveedor || params.proveedorId == null) {
      throw new Error('tipoProveedor y proveedorId son requeridos sin sesión autenticada');
    }
    path = `${basePathPublico(params.tipoProveedor, params.proveedorId)}/dias_disponibles_agenda/?${query.toString()}`;
  }

  const res = await api.get(path);
  return res.data ?? {};
}

/** Grilla de 15 min para elegir inicio/fin libremente (modo rango). */
export function resolverGrillaHorariaAgenda(data: DisponibilidadConDuracion): string[] {
  if (Array.isArray(data.grilla_horaria) && data.grilla_horaria.length > 0) {
    return data.grilla_horaria;
  }
  if (data.hora_jornada_inicio && data.hora_jornada_fin) {
    return buildGrillaEntre(data.hora_jornada_inicio, data.hora_jornada_fin);
  }
  return (data.slots_disponibles ?? [])
    .map((slot) => slot.hora)
    .filter((h): h is string => Boolean(h));
}

export function parseDisponibilidadRangoAgenda(data: DisponibilidadConDuracion): {
  grillaHoraria: string[];
  mensajeSinHoras?: string;
} {
  const grillaHoraria = resolverGrillaHorariaAgenda(data);
  return {
    grillaHoraria,
    mensajeSinHoras:
      grillaHoraria.length > 0
        ? undefined
        : (data.mensaje || 'No hay horarios disponibles para esta fecha.'),
  };
}
