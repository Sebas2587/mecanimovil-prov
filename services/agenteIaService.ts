import { Platform } from 'react-native';
import type { AxiosProgressEvent } from 'axios';
import api from './api';

export type CanalAgente = 'WHATSAPP' | 'MESSENGER' | 'INSTAGRAM' | 'APP';

export type NivelInsistenciaAgente = 'bajo' | 'medio' | 'alto';
export type TonoVentasAgente = 'conservador' | 'balanceado' | 'proactivo';

export interface AgenteIaConfig {
  habilitado: boolean;
  nombre_agente?: string;
  instrucciones_personalizadas: string;
  canales_habilitados: CanalAgente[];
  mensaje_bienvenida: string;
  recargo_domicilio_clp?: number;
  nivel_insistencia?: NivelInsistenciaAgente;
  permite_estimados_historicos?: boolean;
  tono_ventas?: TonoVentasAgente;
  requiere_direccion_antes_de_cotizar?: boolean;
  actualizado_en?: string;
  /** false si el plan actual del taller no incluye el Agente IA (ej. Plan Básico). */
  agente_ia_disponible_en_plan?: boolean;
  /** Chats donde se apagó el agente al desactivar el master o un canal (respuesta del PATCH). */
  chats_desactivados?: number;
}

export interface ConocimientoDocumento {
  id: number;
  titulo: string;
  archivo?: string | null;
  /** URL firmada (Cloudflare R2) para abrir/ver el PDF. */
  archivo_url?: string | null;
  /** pdf | archivo | texto | otro */
  tipo?: string;
  texto_pegado?: string;
  estado_procesamiento: 'pendiente' | 'procesando' | 'listo' | 'error';
  error_detalle?: string;
  creado_en?: string;
  actualizado_en?: string;
}

export interface AgenteAprendizajeFactor {
  clave: string;
  label: string;
  peso: number;
  pct: number;
  ok?: boolean;
  detalle?: string;
}

export interface AgenteAprendizajeScore {
  score: number;
  completitud: number;
  actividad: number;
  detalle: AgenteAprendizajeFactor[];
  pendientes: string[];
  metricas?: {
    ofertas_total?: number;
    ofertas_con_precio?: number;
    mecanicos?: number;
    chunks_indexados?: number;
    chunks_con_embedding?: number;
    chunks_sin_embedding?: number;
    mensajes_procesados?: number;
    documentos_listos?: number;
  };
}

export interface AgenteSesionEstado {
  activa?: boolean;
  id?: number;
  conversation_id?: number;
  estado?: string;
  datos_capturados?: Record<string, unknown>;
  habilitado_en_chat?: boolean;
  pausado_por_taller?: boolean;
  pausado_hasta?: string | null;
  cotizacion_borrador?: number | null;
  cotizacion_borrador_id?: number | null;
  ultima_interaccion_ia?: string | null;
  agente_ia_disponible_en_plan?: boolean;
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

  async crearDocumento(
    payload: {
      titulo: string;
      texto_pegado?: string;
      archivo?: { uri: string; name: string; type: string } | null;
    },
    options?: {
      onUploadProgress?: (pct: number) => void;
    },
  ): Promise<ConocimientoDocumento> {
    const form = new FormData();
    form.append('titulo', payload.titulo.slice(0, 120));
    if (payload.texto_pegado?.trim()) {
      form.append('texto_pegado', payload.texto_pegado.trim());
    }
    if (payload.archivo?.uri) {
      const name = (payload.archivo.name || 'documento.pdf').slice(0, 100);
      const type = payload.archivo.type || 'application/pdf';
      if (Platform.OS === 'web') {
        // En web hay que mandar Blob/File real; {uri,name,type} solo sirve en RN nativo.
        const res = await fetch(payload.archivo.uri);
        if (!res.ok) {
          throw new Error('No se pudo leer el archivo seleccionado.');
        }
        const blob = await res.blob();
        const webFile =
          typeof File !== 'undefined'
            ? new File([blob], name, { type: type || blob.type || 'application/pdf' })
            : blob;
        if (webFile instanceof File) {
          form.append('archivo', webFile);
        } else {
          form.append('archivo', webFile, name);
        }
      } else {
        form.append('archivo', {
          uri: payload.archivo.uri,
          name,
          type,
        } as unknown as Blob);
      }
    }

    const { data } = await api.post<ConocimientoDocumento>('/agente-ia/documentos/', form, {
      onUploadProgress: (event: AxiosProgressEvent) => {
        const total = event.total ?? 0;
        if (!total || !options?.onUploadProgress) return;
        const pct = Math.min(100, Math.round((event.loaded / total) * 100));
        options.onUploadProgress(pct);
      },
    });
    options?.onUploadProgress?.(100);
    return data;
  },

  async eliminarDocumento(id: number): Promise<void> {
    await api.delete(`/agente-ia/documentos/${id}/`);
  },

  async obtenerSesion(
    conversationId: number | string,
    signal?: AbortSignal,
  ): Promise<AgenteSesionEstado> {
    const { data } = await api.get<AgenteSesionEstado>('/agente-ia/sesion/', {
      params: { conversation_id: conversationId },
      signal,
    });
    return data;
  },

  async pausarSesion(conversationId: number | string): Promise<void> {
    await api.post('/agente-ia/pausar/', { conversation_id: conversationId });
  },

  async reanudarSesion(conversationId: number | string): Promise<void> {
    await api.post('/agente-ia/reanudar/', { conversation_id: conversationId });
  },

  async activarEnChat(
    conversationId: number | string,
    activo: boolean,
  ): Promise<AgenteSesionEstado> {
    const { data } = await api.post<AgenteSesionEstado>('/agente-ia/activar-chat/', {
      conversation_id: conversationId,
      activo,
    });
    return data;
  },

  async reindexarConocimiento(): Promise<{
    encolado: boolean;
    ofertas: number;
    solicitudes: number;
    documentos: number;
  }> {
    const { data } = await api.post('/agente-ia/reindexar/');
    return data;
  },

  async obtenerAprendizajeScore(): Promise<AgenteAprendizajeScore> {
    const { data } = await api.get<AgenteAprendizajeScore>('/agente-ia/aprendizaje-score/');
    return data;
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
