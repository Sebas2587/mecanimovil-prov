import api from './api';
import { extraerMensajeErrorApi } from '@/utils/extraerMensajeErrorApi';

export type OrigenAgenda = 'mecanimovil' | 'personal';
export type EstadoCitaPersonal = 'activa' | 'cerrada' | 'cancelada';
export type TipoServicioAgenda = 'taller' | 'domicilio';

export interface CitaAgendaPersonalDetalle {
  cliente_nombre: string;
  cliente_telefono: string;
  direccion?: string;
  vehiculo_marca: string;
  vehiculo_modelo: string;
  vehiculo_patente?: string;
  vehiculo_anio?: number | null;
  vehiculo_cilindraje?: string;
  vehiculo_color?: string;
  oferta_servicio_id?: number | null;
  servicio_nombre?: string;
  servicio_nombre_resuelto?: string;
  descripcion?: string;
  precio_referencia?: string | number | null;
}

export interface CitaAgendaPersonal {
  id: number;
  fecha_servicio: string;
  hora_servicio: string;
  duracion_minutos?: number;
  tipo_servicio: TipoServicioAgenda;
  estado: EstadoCitaPersonal;
  cerrada_en?: string | null;
  cancelada_en?: string | null;
  fecha_creacion: string;
  fecha_actualizacion: string;
  detalle: CitaAgendaPersonalDetalle;
  origen: 'personal';
  etiqueta: string;
  editable: boolean;
  tiene_checklist: boolean;
  mecanico_nombre?: string | null;
  miembro_taller?: number | null;
}

export interface EventoAgendaUnificado {
  id: string;
  origen: OrigenAgenda;
  etiqueta: string;
  fecha_servicio: string;
  hora_servicio: string;
  duracion_minutos?: number | null;
  estado: string;
  editable: boolean;
  tiene_checklist: boolean;
  cliente_nombre?: string;
  cliente_telefono?: string;
  vehiculo_marca?: string;
  vehiculo_modelo?: string;
  vehiculo_anio?: number | null;
  vehiculo_patente?: string;
  servicio_nombre?: string;
  descripcion?: string;
  precio_referencia?: string | number | null;
  tipo_servicio?: string;
  oferta_proveedor_id?: string | null;
  orden_id?: number | null;
  miembro_taller_id?: number | null;
  mecanico_nombre?: string | null;
}

export interface CitaAgendaPersonalCreatePayload {
  fecha_servicio: string;
  hora_servicio: string;
  duracion_minutos?: number;
  tipo_servicio: TipoServicioAgenda;
  miembro_taller?: number | null;
  detalle: Partial<CitaAgendaPersonalDetalle> & {
    cliente_nombre: string;
    cliente_telefono: string;
    vehiculo_marca: string;
    vehiculo_modelo: string;
  };
}

export interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: unknown;
}

function extractArray<T>(responseData: unknown): T[] {
  if (responseData && typeof responseData === 'object' && Array.isArray((responseData as { results?: T[] }).results)) {
    return (responseData as { results: T[] }).results;
  }
  if (Array.isArray(responseData)) {
    return responseData;
  }
  return [];
}

function handleServiceError(error: unknown, action: string): ServiceResponse<never> {
  const err = error as {
    code?: string;
    message?: string;
    response?: { data?: { message?: string; error?: string; detail?: string } };
    request?: unknown;
  };

  const isTimeout =
    err?.code === 'ECONNABORTED'
    || (typeof err?.message === 'string' && err.message.toLowerCase().includes('timeout'));

  if (isTimeout) {
    return {
      success: false,
      message: 'La solicitud tardó demasiado. Comprueba tu conexión e inténtalo de nuevo.',
      error: err.message,
    };
  }

  if (err.response) {
    const data = err.response.data;
    const msg = extraerMensajeErrorApi(err as Parameters<typeof extraerMensajeErrorApi>[0], `Error al ${action}`);
    return { success: false, message: msg, error: data };
  }

  if (err.request) {
    return {
      success: false,
      message: 'Error de conexión. Verifica tu conexión a internet.',
      error: err.message,
    };
  }

  return {
    success: false,
    message: err.message || `Error inesperado al ${action}`,
    error: err.message,
  };
}

class AgendaProveedorService {
  private agendaUrl = '/ordenes/proveedor-agenda';
  private citasUrl = '/ordenes/citas-agenda-personal';

  async obtenerAgendaUnificada(params?: {
    fecha_desde?: string;
    fecha_hasta?: string;
    incluir?: string;
    miembro_taller?: number | null;
  }): Promise<ServiceResponse<EventoAgendaUnificado[]>> {
    try {
      const search = new URLSearchParams();
      if (params?.fecha_desde) search.append('fecha_desde', params.fecha_desde);
      if (params?.fecha_hasta) search.append('fecha_hasta', params.fecha_hasta);
      if (params?.miembro_taller) search.append('miembro_taller', String(params.miembro_taller));
      search.append('incluir', params?.incluir ?? 'activas,cerradas,mecanimovil');

      const qs = search.toString();
      const response = await api.get(`${this.agendaUrl}/${qs ? `?${qs}` : ''}`);
      return { success: true, data: extractArray<EventoAgendaUnificado>(response.data) };
    } catch (error) {
      return handleServiceError(error, 'obtener agenda');
    }
  }

  async crearCita(payload: CitaAgendaPersonalCreatePayload): Promise<ServiceResponse<CitaAgendaPersonal>> {
    try {
      const response = await api.post(`${this.citasUrl}/`, payload);
      return { success: true, data: response.data };
    } catch (error) {
      return handleServiceError(error, 'crear cita personal');
    }
  }

  async obtenerCita(id: number): Promise<ServiceResponse<CitaAgendaPersonal>> {
    try {
      const response = await api.get(`${this.citasUrl}/${id}/`);
      return { success: true, data: response.data };
    } catch (error) {
      return handleServiceError(error, 'obtener cita personal');
    }
  }

  async actualizarCita(
    id: number,
    payload: Partial<CitaAgendaPersonalCreatePayload>,
  ): Promise<ServiceResponse<CitaAgendaPersonal>> {
    try {
      const response = await api.patch(`${this.citasUrl}/${id}/`, payload);
      return { success: true, data: response.data };
    } catch (error) {
      return handleServiceError(error, 'actualizar cita personal');
    }
  }

  async cerrarCita(id: number): Promise<ServiceResponse<CitaAgendaPersonal>> {
    try {
      const response = await api.post(`${this.citasUrl}/${id}/cerrar/`);
      return { success: true, data: response.data };
    } catch (error) {
      return handleServiceError(error, 'cerrar cita personal');
    }
  }

  async cancelarCita(id: number): Promise<ServiceResponse<CitaAgendaPersonal>> {
    try {
      const response = await api.post(`${this.citasUrl}/${id}/cancelar/`);
      return { success: true, data: response.data };
    } catch (error) {
      return handleServiceError(error, 'cancelar cita personal');
    }
  }

  async eliminarCita(id: number): Promise<ServiceResponse<void>> {
    try {
      await api.delete(`${this.citasUrl}/${id}/`);
      return { success: true };
    } catch (error) {
      return handleServiceError(error, 'eliminar cita personal');
    }
  }

  async obtenerCitasCerradas(): Promise<ServiceResponse<CitaAgendaPersonal[]>> {
    try {
      const response = await api.get(`${this.citasUrl}/cerradas/`);
      return { success: true, data: extractArray<CitaAgendaPersonal>(response.data) };
    } catch (error) {
      return handleServiceError(error, 'obtener citas cerradas');
    }
  }

  async obtenerCitasCanceladas(): Promise<ServiceResponse<CitaAgendaPersonal[]>> {
    try {
      const response = await api.get(`${this.citasUrl}/canceladas/`);
      return { success: true, data: extractArray<CitaAgendaPersonal>(response.data) };
    } catch (error) {
      return handleServiceError(error, 'obtener citas canceladas');
    }
  }

  async validarSlot(
    payload: CitaAgendaPersonalCreatePayload & { excluir_cita_id?: number },
  ): Promise<ServiceResponse<{ valido: boolean; error?: string }>> {
    try {
      const response = await api.post(`${this.citasUrl}/validar-slot/`, payload);
      return { success: true, data: response.data };
    } catch (error) {
      const err = error as { response?: { data?: { error?: string; valido?: boolean } } };
      if (err.response?.data) {
        return {
          success: false,
          data: { valido: false, error: err.response.data.error },
          message: err.response.data.error,
        };
      }
      return handleServiceError(error, 'validar horario');
    }
  }
}

export const agendaProveedorService = new AgendaProveedorService();

export function nombreServicioCita(cita: CitaAgendaPersonal): string {
  const det = cita.detalle;
  return (
    det.servicio_nombre_resuelto
    || det.servicio_nombre
    || 'Servicio'
  ).trim();
}

export function nombreServicioEvento(evento: EventoAgendaUnificado): string {
  return (evento.servicio_nombre || 'Servicio').trim();
}
