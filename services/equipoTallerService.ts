import { Platform } from 'react-native';
import { getAPI } from './api';
import { getItem } from '@/utils/authStorage';
import ServerConfig from './serverConfig';

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

/** Modalidad requerida según tipo de servicio de la cita. */
export function modalidadRequeridaPorTipoServicio(
  tipoServicio: 'taller' | 'domicilio',
): ModalidadTecnico {
  return tipoServicio === 'domicilio' ? 'a_domicilio' : 'en_taller';
}

/** True si el mecánico puede atender el tipo de servicio indicado. */
export function mecanicoCompatibleConTipoServicio(
  m: Pick<MiembroTaller, 'modalidad_tecnico'>,
  tipoServicio: 'taller' | 'domicilio',
): boolean {
  const req = modalidadRequeridaPorTipoServicio(tipoServicio);
  if (m.modalidad_tecnico === 'ambas') return true;
  return m.modalidad_tecnico === req;
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

export interface ArchivoFotoMiembro {
  uri: string;
  type?: string;
  name?: string;
}

export interface MiembroTaller {
  id: number;
  rol: RolMiembro;
  rol_display: string;
  nombre: string;
  foto_url?: string | null;
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

export interface MecanicoKpisComparativoMes {
  completados: number;
  tiempo_prom: number | null;
  facturacion: number;
}

export interface MecanicoKpis {
  mecanico_id: number;
  nombre: string;
  foto_url: string | null;
  especialidades: { id: number; nombre: string }[];
  activo: boolean;
  servicios_completados: number;
  servicios_en_proceso: number;
  total_asignados: number;
  pct_dentro_tiempo: number | null;
  ratio_tiempo_promedio: number | null;
  tiempo_promedio_minutos: number | null;
  facturacion_periodo: number;
  facturacion_mes_actual: number;
  facturacion_mes_anterior: number;
  facturacion_delta_pct: number | null;
  comparativo: {
    mes_actual: MecanicoKpisComparativoMes;
    mes_anterior: MecanicoKpisComparativoMes;
    delta_completados_pct: number | null;
    delta_tiempo_pct: number | null;
    delta_facturacion_pct: number | null;
  };
  ordenes_mecanimovil: number;
  ordenes_personales: number;
  score_productividad: number | null;
  score_tiempo_ejecucion: number | null;
  score_checklist: number | null;
  score_puntualidad_inicio: number | null;
  score_rendimiento_global: number | null;
  ventana_desde?: string;
  ventana_hasta?: string;
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

  async obtener(id: number): Promise<MiembroTaller> {
    const api = await getAPI();
    const response = await api.get(`${BASE}${id}/`);
    return response.data;
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

  /** KPIs granulares por mecánico (tiempos, facturación, scores, comparativo mensual). */
  async rendimientoDetallado(params?: {
    desde?: string;
    hasta?: string;
    dias?: number;
    mecanico_id?: number;
  }): Promise<MecanicoKpis[]> {
    const api = await getAPI();
    const response = await api.get(`${BASE}rendimiento-detallado/${buildQuery(params)}`);
    return response.data || [];
  },

  /** Sube o reemplaza la foto de perfil de un mecánico (campo multipart `foto`). */
  async subirFoto(id: number, archivo: ArchivoFotoMiembro): Promise<MiembroTaller> {
    const token = await getItem('authToken');
    if (!token) {
      throw new Error('No hay token de autenticación disponible');
    }

    await ServerConfig.getInstance().initialize();
    const baseURL = await ServerConfig.getInstance().getBaseURL();
    const uploadURL = `${baseURL}${BASE}${id}/subir-foto/`;

    const type = archivo.type || 'image/jpeg';
    let name = archivo.name || `foto_mecanico_${Date.now()}.jpg`;
    if (!name.includes('.')) {
      name = `${name}.jpg`;
    }

    const formData = new FormData();
    if (Platform.OS === 'web') {
      const res = await fetch(archivo.uri);
      if (!res.ok) {
        throw new Error('No se pudo leer la imagen seleccionada');
      }
      const blob = await res.blob();
      formData.append('foto', blob, name);
    } else {
      formData.append(
        'foto',
        {
          uri: archivo.uri,
          type,
          name,
        } as any,
      );
    }

    const headers: Record<string, string> = {
      Authorization: `Token ${token}`,
    };
    if (baseURL.includes('ngrok-free.app') || baseURL.includes('ngrok.io')) {
      headers['ngrok-skip-browser-warning'] = 'true';
    }

    const response = await fetch(uploadURL, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      let message = 'No se pudo subir la foto';
      try {
        const data = await response.json();
        message = data?.error || data?.detail || message;
      } catch {
        /* ignore */
      }
      throw new Error(message);
    }

    return response.json();
  },
};

export default equipoTallerService;
