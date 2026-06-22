import { getAPI } from './api';

export type RolMiembro = 'mandante' | 'supervisor' | 'mecanico';
export type ModalidadTecnico = 'en_taller' | 'a_domicilio' | 'ambas';

/** Etiqueta corta de la modalidad del mecánico para chips y listas. */
export function etiquetaModalidadMecanico(
  m: Pick<MiembroTaller, 'modalidad_tecnico' | 'modalidad_tecnico_display'>,
): string {
  switch (m.modalidad_tecnico) {
    case 'en_taller':
      return 'En taller';
    case 'a_domicilio':
      return 'A domicilio';
    case 'ambas':
      return 'Taller y domicilio';
    default:
      return m.modalidad_tecnico_display || '';
  }
}

/** Permisos de gestión que el mandante otorga a un supervisor. */
export interface PermisosSupervisor {
  servicios?: boolean;
  mecanicos?: boolean;
  horarios?: boolean;
  agenda?: boolean;
  zonas_cobertura?: boolean;
  finanzas?: boolean;
}

export interface MiembroTaller {
  id: number;
  rol: RolMiembro;
  rol_display: string;
  nombre: string;
  usuario: number | null;
  especialidades: number[];
  especialidades_detalle: Array<{ id: number; nombre: string }>;
  modalidad_tecnico: ModalidadTecnico;
  modalidad_tecnico_display: string;
  activo: boolean;
  permisos?: PermisosSupervisor;
  usuario_username?: string | null;
  usuario_email?: string | null;
  tiene_acceso?: boolean;
  fecha_creacion: string;
  fecha_actualizacion: string;
}

export interface CrearMiembroData {
  rol: RolMiembro;
  nombre: string;
  especialidades?: number[];
  modalidad_tecnico?: ModalidadTecnico;
  activo?: boolean;
  // Credenciales y permisos para supervisores
  username?: string;
  password?: string;
  email?: string;
  permisos?: PermisosSupervisor;
}

export type ActualizarMiembroData = Partial<CrearMiembroData>;

export interface RendimientoMecanico {
  mecanico_id: number;
  nombre: string;
  activo: boolean;
  ordenes_asignadas: number;
  ordenes_completadas: number;
  ordenes_en_proceso: number;
}

const BASE = '/usuarios/taller/equipo/';

function buildQuery(params?: Record<string, string | number | boolean | undefined>): string {
  if (!params) return '';
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      search.append(key, String(value));
    }
  });
  const query = search.toString();
  return query ? `?${query}` : '';
}

const equipoTallerService = {
  /** Lista el equipo del taller del usuario autenticado. */
  async listar(params?: { rol?: RolMiembro; activo?: boolean }): Promise<MiembroTaller[]> {
    const api = await getAPI();
    const response = await api.get(`${BASE}${buildQuery(params)}`);
    return response.data?.results || response.data || [];
  },

  async crear(data: CrearMiembroData): Promise<MiembroTaller> {
    const api = await getAPI();
    const response = await api.post(BASE, data);
    return response.data;
  },

  async actualizar(id: number, data: ActualizarMiembroData): Promise<MiembroTaller> {
    const api = await getAPI();
    const response = await api.patch(`${BASE}${id}/`, data);
    return response.data;
  },

  async eliminar(id: number): Promise<void> {
    const api = await getAPI();
    await api.delete(`${BASE}${id}/`);
  },

  async habilitar(id: number): Promise<MiembroTaller> {
    const api = await getAPI();
    const response = await api.post(`${BASE}${id}/habilitar/`);
    return response.data;
  },

  async deshabilitar(id: number): Promise<MiembroTaller> {
    const api = await getAPI();
    const response = await api.post(`${BASE}${id}/deshabilitar/`);
    return response.data;
  },

  /** Cambia el estado activo del mecánico según su valor actual. */
  async toggleActivo(miembro: MiembroTaller): Promise<MiembroTaller> {
    return miembro.activo ? this.deshabilitar(miembro.id) : this.habilitar(miembro.id);
  },

  async rendimiento(params?: { desde?: string; hasta?: string }): Promise<RendimientoMecanico[]> {
    const api = await getAPI();
    const response = await api.get(`${BASE}rendimiento/${buildQuery(params)}`);
    return response.data || [];
  },
};

export default equipoTallerService;
