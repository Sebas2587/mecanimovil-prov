import api from './api';

export interface RepuestoCotizacion {
  id?: string;
  nombre: string;
  cantidad: number;
  precio_unitario_clp: number;
  precio_referencia_ia?: number;
  comentario?: string;
}

export interface CotizacionCanal {
  id: number;
  conversation: number;
  estado: 'borrador' | 'enviada' | 'aceptada' | 'rechazada' | 'expirada' | 'cancelada';
  modalidad: 'taller' | 'domicilio';
  vehiculo_marca: string;
  vehiculo_modelo: string;
  vehiculo_anio?: number | null;
  vehiculo_patente: string;
  vehiculo_cilindraje: string;
  vehiculo_vin: string;
  tipo_motor: string;
  tipo_motor_label: string;
  aviso_motor: string;
  servicio_nombre: string;
  descripcion_problema: string;
  repuestos: RepuestoCotizacion[];
  mano_obra_clp: number;
  costo_repuestos_clp: number;
  total_clp: number;
  duracion_minutos_estimada?: number | null;
  advertencias?: string[];
  message_envio?: number | null;
  enviada_en?: string | null;
  aceptada_en?: string | null;
  rechazada_en?: string | null;
}

export interface CotizacionPlantilla {
  id: number;
  titulo: string;
  snapshot: Record<string, unknown>;
  uso_count: number;
  creado_en: string;
  actualizado_en: string;
}

export interface GenerarCotizacionIaPayload {
  conversation_id: number;
  servicio_nombre?: string;
  descripcion_problema?: string;
  modalidad?: 'taller' | 'domicilio';
  vehiculo?: Record<string, unknown>;
  plantilla_id?: number;
}

export interface GenerarCotizacionIaResponse {
  disponible: boolean;
  cotizacion?: CotizacionCanal;
  error?: string | null;
  latencia_ms?: number;
  desde_plantilla?: boolean;
}

class CotizacionCanalService {
  async generarIa(payload: GenerarCotizacionIaPayload): Promise<GenerarCotizacionIaResponse> {
    const response = await api.post('/ordenes/cotizaciones-canal/generar-ia/', payload);
    return response.data as GenerarCotizacionIaResponse;
  }

  async actualizar(id: number, patch: Partial<CotizacionCanal>): Promise<CotizacionCanal> {
    const response = await api.patch(`/ordenes/cotizaciones-canal/${id}/`, patch);
    return response.data as CotizacionCanal;
  }

  async enviar(id: number): Promise<{ cotizacion: CotizacionCanal; message_id: number }> {
    const response = await api.post(`/ordenes/cotizaciones-canal/${id}/enviar/`);
    return response.data as { cotizacion: CotizacionCanal; message_id: number };
  }

  async cancelar(id: number): Promise<CotizacionCanal> {
    const response = await api.post(`/ordenes/cotizaciones-canal/${id}/cancelar/`);
    return response.data as CotizacionCanal;
  }

  async marcarAceptada(id: number): Promise<CotizacionCanal> {
    const response = await api.post(`/ordenes/cotizaciones-canal/${id}/marcar-aceptada/`);
    return response.data as CotizacionCanal;
  }

  async listarPorConversacion(conversationId: number): Promise<CotizacionCanal[]> {
    const response = await api.get(`/ordenes/cotizaciones-canal/por-conversacion/${conversationId}/`);
    const data = response.data as CotizacionCanal[] | { results?: CotizacionCanal[] };
    return Array.isArray(data) ? data : data?.results ?? [];
  }

  async obtener(id: number): Promise<CotizacionCanal> {
    const response = await api.get(`/ordenes/cotizaciones-canal/${id}/`);
    return response.data as CotizacionCanal;
  }

  async listarPlantillas(): Promise<CotizacionPlantilla[]> {
    const response = await api.get('/ordenes/cotizaciones-canal-plantillas/');
    const data = response.data as CotizacionPlantilla[] | { results?: CotizacionPlantilla[] };
    if (Array.isArray(data)) return data;
    return data?.results ?? [];
  }

  async guardarPlantilla(payload: {
    titulo: string;
    cotizacion_id?: number;
    snapshot?: Record<string, unknown>;
  }): Promise<CotizacionPlantilla> {
    const response = await api.post('/ordenes/cotizaciones-canal-plantillas/', payload);
    return response.data as CotizacionPlantilla;
  }

  async eliminarPlantilla(id: number): Promise<void> {
    await api.delete(`/ordenes/cotizaciones-canal-plantillas/${id}/`);
  }
}

const cotizacionCanalService = new CotizacionCanalService();
export default cotizacionCanalService;
