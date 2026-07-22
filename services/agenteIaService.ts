import api from './api';

export type CanalAgente = 'WHATSAPP' | 'MESSENGER' | 'INSTAGRAM' | 'APP';

export interface AgenteIaConfig {
  habilitado: boolean;
  instrucciones_personalizadas: string;
  canales_habilitados: CanalAgente[];
  mensaje_bienvenida: string;
  actualizado_en?: string;
}

export interface ConocimientoDocumento {
  id: number;
  titulo: string;
  archivo?: string | null;
  texto_pegado?: string;
  estado_procesamiento: 'pendiente' | 'procesando' | 'listo' | 'error';
  error_detalle?: string;
  creado_en?: string;
  actualizado_en?: string;
}

export interface AgenteSesionEstado {
  activa?: boolean;
  id?: number;
  conversation_id?: number;
  estado?: string;
  datos_capturados?: Record<string, unknown>;
  pausado_por_taller?: boolean;
  cotizacion_borrador?: number | null;
  cotizacion_borrador_id?: number | null;
  ultima_interaccion_ia?: string | null;
}

const agenteIaService = {
  async obtenerConfig(): Promise<AgenteIaConfig> {
    const { data } = await api.get<AgenteIaConfig>('/agente-ia/config/');
    return data;
  },

  async actualizarConfig(payload: Partial<AgenteIaConfig>): Promise<AgenteIaConfig> {
    const { data } = await api.patch<AgenteIaConfig>('/agente-ia/config/', payload);
    return data;
  },

  async listarDocumentos(): Promise<ConocimientoDocumento[]> {
    const { data } = await api.get<ConocimientoDocumento[]>('/agente-ia/documentos/');
    return data;
  },

  async crearDocumento(payload: {
    titulo: string;
    texto_pegado?: string;
    archivo?: { uri: string; name: string; type: string } | null;
  }): Promise<ConocimientoDocumento> {
    const form = new FormData();
    form.append('titulo', payload.titulo);
    if (payload.texto_pegado?.trim()) {
      form.append('texto_pegado', payload.texto_pegado.trim());
    }
    if (payload.archivo) {
      form.append('archivo', {
        uri: payload.archivo.uri,
        name: payload.archivo.name,
        type: payload.archivo.type,
      } as unknown as Blob);
    }
    const { data } = await api.post<ConocimientoDocumento>('/agente-ia/documentos/', form);
    return data;
  },

  async eliminarDocumento(id: number): Promise<void> {
    await api.delete(`/agente-ia/documentos/${id}/`);
  },

  async obtenerSesion(conversationId: number | string): Promise<AgenteSesionEstado> {
    const { data } = await api.get<AgenteSesionEstado>('/agente-ia/sesion/', {
      params: { conversation_id: conversationId },
    });
    return data;
  },

  async pausarSesion(conversationId: number | string): Promise<void> {
    await api.post('/agente-ia/pausar/', { conversation_id: conversationId });
  },

  async reanudarSesion(conversationId: number | string): Promise<void> {
    await api.post('/agente-ia/reanudar/', { conversation_id: conversationId });
  },

  async borradoresPendientes(): Promise<{
    count: number;
    results: Array<{
      sesion_id: number;
      conversation_id: number;
      cotizacion_id: number | null;
      servicio_nombre: string;
    }>;
  }> {
    const { data } = await api.get('/agente-ia/borradores-pendientes/');
    return data;
  },
};

export default agenteIaService;
