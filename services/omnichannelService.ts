/**
 * Servicio para canales omnicanal Meta (WhatsApp, Messenger, Instagram).
 */
import api from './api';

export type CanalSlug = 'whatsapp' | 'messenger' | 'instagram';
export type EstadoCanal =
  | 'no_configurada'
  | 'pendiente'
  | 'conectada'
  | 'desconectada'
  | 'error';

export interface ConexionCanal {
  id: string;
  channel: 'WHATSAPP' | 'MESSENGER' | 'INSTAGRAM';
  channel_display: string;
  channel_slug: CanalSlug;
  enabled: boolean;
  status: EstadoCanal;
  status_display: string;
  display_name: string | null;
  display_identifier: string | null;
  mensaje_estado: string | null;
  connected_at: string | null;
  updated_at: string;
}

export interface EstadoCanalesResponse {
  enabled: boolean;
  connections: ConexionCanal[];
}

export interface MetaEmbeddedConfig {
  enabled: boolean;
  app_id?: string;
  config_id?: string;
  redirect_uri?: string;
  graph_version?: string;
}

export interface IniciarConexionCanalResponse {
  success: boolean;
  connection_id: string;
  auth_url: string;
  channel: CanalSlug;
  embedded?: MetaEmbeddedConfig;
}

export interface CompletarConexionPayload {
  connection_id: string;
  code: string;
  phone_number_id?: string;
  waba_id?: string;
  business_id?: string;
  shared_waba_ids?: string[];
}

export interface CompletarConexionResponse {
  success: boolean;
  message?: string;
  instruction?: string;
  needs_phone_number_id?: boolean;
  waba_id?: string;
  channel?: CanalSlug;
  connection?: ConexionCanal;
}

export interface InboxChatItem {
  kind: 'oferta' | 'omnichannel';
  channel: string;
  conversation_id: string | null;
  oferta_id: string | null;
  solicitud_id: string | null;
  otra_persona: {
    id?: string | number | null;
    nombre: string;
    foto?: string | null;
    telefono?: string | null;
  };
  vehiculo?: Record<string, unknown> | null;
  ultimo_mensaje: {
    id: string;
    mensaje: string;
    fecha_envio: string;
    es_propio: boolean;
    leido: boolean;
  };
  mensajes_no_leidos: number;
  estado_oferta?: string | null;
}

const omnichannelService = {
  async obtenerEstadoCanales(): Promise<EstadoCanalesResponse> {
    const { data } = await api.get<EstadoCanalesResponse>('/omnichannel/connections/estado/');
    return data;
  },

  async iniciarConexion(channel: CanalSlug): Promise<IniciarConexionCanalResponse> {
    const { data } = await api.get<IniciarConexionCanalResponse>(
      `/omnichannel/connections/iniciar-conexion/?channel=${channel}`,
    );
    return data;
  },

  async completarConexion(payload: CompletarConexionPayload): Promise<CompletarConexionResponse> {
    const { data } = await api.post<CompletarConexionResponse>(
      '/omnichannel/connections/completar-conexion/',
      payload,
    );
    return data;
  },

  async toggleCanal(connectionId: string, enabled: boolean): Promise<ConexionCanal> {
    const { data } = await api.patch<ConexionCanal>(
      `/omnichannel/connections/${connectionId}/toggle/`,
      { enabled },
    );
    return data;
  },

  async desconectarCanal(connectionId: string): Promise<ConexionCanal> {
    const { data } = await api.post<ConexionCanal>(
      `/omnichannel/connections/${connectionId}/desconectar/`,
    );
    return data;
  },

  async configurarWhatsapp(connectionId: string, phoneNumberId: string): Promise<ConexionCanal> {
    const { data } = await api.post<ConexionCanal>(
      `/omnichannel/connections/${connectionId}/configurar-whatsapp/`,
      { phone_number_id: phoneNumberId.trim() },
    );
    return data;
  },

  async obtenerInboxUnificado(): Promise<InboxChatItem[]> {
    const { data } = await api.get<InboxChatItem[]>('/chat/conversations/inbox/');
    return Array.isArray(data) ? data : [];
  },

  async vincularSolicitud(conversationId: string, solicitudId: string): Promise<void> {
    await api.post(`/chat/conversations/${conversationId}/vincular-solicitud/`, {
      solicitud_id: solicitudId,
    });
  },
};

export default omnichannelService;
