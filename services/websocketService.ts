import { getItem } from '@/utils/authStorage';
import { AppState, AppStateStatus } from 'react-native';
import ServerConfig from './serverConfig';
import { devLog } from '@/utils/devLog';
import { isRadarOportunidadesActivo } from '@/utils/radarOportunidadesGate';

// Función simple para obtener token
const getAuthToken = async (): Promise<string | null> => {
  try {
    const token = await getItem('authToken');
    return token;
  } catch (error) {
    devLog('❌ Error obteniendo token:', error);
    return null;
  }
};

export interface ConnectionStatus {
  esta_conectado: boolean;
  ultima_conexion: string | null;
  proveedor: string;
  tipo: 'mecanico' | 'taller';
}

export interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

export interface MechanicStatus {
  status: 'online' | 'offline' | 'busy';
  is_online: boolean;
  last_heartbeat: string | null;
  last_status_change: string | null;
}

export interface NuevaSolicitudEvent {
  type: 'nueva_solicitud';
  solicitud_id: string;
  vehiculo: string;
  descripcion: string;
  urgencia: 'normal' | 'urgente';
  fecha_expiracion: string;
  timestamp: string;
}

export interface NuevoMensajeChatEvent {
  type: 'nuevo_mensaje_chat';
  conversation_id?: string;
  mensaje_id: string;
  oferta_id?: string;
  solicitud_id?: string;
  sender_id?: number;
  enviado_por: string;
  mensaje: string;
  message?: string;
  content?: string;
  es_proveedor: boolean;
  timestamp: string;
  archivo_adjunto?: string | null;
  channel?: string;
  external_contact_name?: string | null;
  external_contact_phone?: string | null;
}

export interface PagoExpiradoEvent {
  type: 'pago_expirado';
  oferta_id: string;
  solicitud_id: string;
  mensaje: string;
  fecha_limite_pago?: string;
  creditos_devueltos: boolean;
  timestamp: string;
}

export interface SolicitudCanceladaClienteEvent {
  type: 'solicitud_cancelada_cliente';
  oferta_id: string;
  solicitud_id: string;
  mensaje: string;
  creditos_devueltos: boolean;
  timestamp: string;
}

export type NuevaSolicitudCallback = (event: NuevaSolicitudEvent) => void;
export type NuevoMensajeChatCallback = (event: NuevoMensajeChatEvent) => void;
export type PagoExpiradoCallback = (event: PagoExpiradoEvent) => void;
export type SolicitudCanceladaClienteCallback = (event: SolicitudCanceladaClienteEvent) => void;

export interface ServicioCerradoPorClienteEvent {
  type: 'servicio_cerrado_por_cliente';
  oferta_id?: string;
  solicitud_publica_id?: string;
  solicitud_servicio_id?: number;
  timestamp?: string;
}

export type ServicioCerradoPorClienteCallback = (event: ServicioCerradoPorClienteEvent) => void;

/** Adjudicación, pago o cambios que deben refrescar Órdenes y Ofertas en la app proveedor */
export interface OrdenesListRefreshEvent {
  type: 'oferta_aceptada' | 'pago_en_proceso' | 'pago_completado' | 'oferta_rechazada';
  oferta_id?: string;
  solicitud_id?: string;
  solicitud_servicio_id?: string | number;
}

export type OrdenesListRefreshCallback = (event: OrdenesListRefreshEvent) => void;

export interface AsignacionMecanicoEvent {
  type: 'orden_asignada_mecanico' | 'cita_asignada_mecanico' | 'asignacion_mecanico';
  orden_id?: string;
  cita_id?: string;
  solicitud_id?: string;
  miembro_id?: string;
}

export type AsignacionMecanicoCallback = (event: AsignacionMecanicoEvent) => void;

class WebSocketService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private reconnectDelay = 1000;
  private maxReconnectDelay = 30000;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private isConnected = false;
  private isConnecting = false;
  private serverUrl = '';
  private appStateListener: any = null;
  private currentStatus: 'online' | 'offline' | 'busy' = 'offline';
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private nuevaSolicitudCallbacks: Set<NuevaSolicitudCallback> = new Set();
  private nuevoMensajeChatCallbacks: Set<NuevoMensajeChatCallback> = new Set();
  private pagoExpiradoCallbacks: Set<PagoExpiradoCallback> = new Set();
  private solicitudCanceladaClienteCallbacks: Set<SolicitudCanceladaClienteCallback> = new Set();
  private servicioCerradoPorClienteCallbacks: Set<ServicioCerradoPorClienteCallback> = new Set();
  private ordenesListRefreshCallbacks: Set<OrdenesListRefreshCallback> = new Set();
  private asignacionMecanicoCallbacks: Set<AsignacionMecanicoCallback> = new Set();
  /** Mecánico de equipo: mantener WS aunque el radar de oportunidades esté apagado */
  private mecanicoEquipoSession = false;
  /** Pantallas de chat abiertas: mantener WS aunque el radar esté apagado */
  private chatSessionCount = 0;

  shouldMaintainConnection(): boolean {
    return isRadarOportunidadesActivo() || this.chatSessionCount > 0 || this.mecanicoEquipoSession;
  }

  setMecanicoEquipoSession(active: boolean): void {
    this.mecanicoEquipoSession = active;
  }

  isMecanicoEquipoSessionActive(): boolean {
    return this.mecanicoEquipoSession;
  }

  isChatSessionActive(): boolean {
    return this.chatSessionCount > 0;
  }

  setChatSessionActive(active: boolean): void {
    if (active) {
      this.chatSessionCount += 1;
      return;
    }
    this.chatSessionCount = Math.max(0, this.chatSessionCount - 1);
  }

  /**
   * Inicializa la conexión WebSocket con autenticación JWT
   */
  async connect(options?: { force?: boolean }): Promise<void> {
    if (!options?.force && !this.shouldMaintainConnection()) {
      devLog('WebSocket: sin radar ni sesión de chat, no se conecta');
      return;
    }

    // Evitar múltiples conexiones simultáneas - PROTECCIÓN MEJORADA
    if (this.isConnecting) {
      devLog('🔄 Conexión ya en progreso (isConnecting=true), ignorando...');
      return;
    }

    if (this.ws) {
      if (this.ws.readyState === WebSocket.CONNECTING) {
        devLog('🔄 Conexión ya en progreso (WebSocket.CONNECTING), ignorando...');
        return;
      }
      if (this.ws.readyState === WebSocket.OPEN && this.isConnected) {
        devLog('✅ Ya conectado (WebSocket.OPEN), ignorando...');
        return;
      }
    }

    // Limpiar timeout de reconexión si existe
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    try {
      devLog('🚀 INICIANDO CONEXIÓN WEBSOCKET - VERSIÓN CORREGIDA');

      // Obtener token de autenticación
      const token = await getAuthToken();
      if (!token) {
        devLog('❌ No hay token de autenticación');
        return;
      }

      // Obtener URL del servidor
      const serverUrl = await this.getServerUrl();
      if (!serverUrl) {
        devLog('❌ No se pudo obtener la URL del servidor');
        return;
      }

      // Cerrar conexión existente si está en estado inválido
      if (this.ws && (this.ws.readyState === WebSocket.CLOSED || this.ws.readyState === WebSocket.CLOSING)) {
        this.ws = null;
      }

      // Crear URL del WebSocket con token JWT en query string
      // En producción usar wss://, en desarrollo usar ws://
      const isProduction = serverUrl.startsWith('https://');
      const wsProtocol = isProduction ? 'wss' : 'ws';
      const wsUrl = serverUrl.replace(/^https?:\/\//, `${wsProtocol}://`) + '/ws/mechanic_status/?token=' + token;
      devLog('🔗 Conectando WebSocket proveedor...');

      this.isConnecting = true;

      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = this.handleOpen.bind(this);
      this.ws.onmessage = this.handleMessage.bind(this);
      this.ws.onclose = this.handleClose.bind(this);
      this.ws.onerror = this.handleError.bind(this);

      // Evitar listeners duplicados de AppState
      if (!this.appStateListener) {
        this.setupAppStateListener();
      }

    } catch (error) {
      devLog('❌ Error conectando WebSocket:', error);
      this.isConnecting = false;
      this.scheduleReconnect();
    }
  }

  /**
   * Maneja la apertura de la conexión
   */
  private handleOpen(event: Event): void {
    devLog('✅ WEBSOCKET CONECTADO EXITOSAMENTE');
    this.isConnected = true;
    this.isConnecting = false;
    this.reconnectAttempts = 0;
    this.currentStatus = 'online';

    this.startHeartbeat();
  }

  /**
   * Maneja mensajes recibidos
   */
  private handleMessage(event: MessageEvent): void {
    try {
      const data: WebSocketMessage = JSON.parse(event.data);
      devLog('📨 Mensaje WebSocket recibido:', data);

      switch (data.type) {
        case 'connection_confirmed':
          devLog('✅ Conexión confirmada:', data);
          break;

        case 'mechanic_status_update':
          devLog('🔄 Actualización de estado:', data);
          break;

        case 'heartbeat':
          devLog('💓 Heartbeat recibido:', data);
          break;

        case 'connection_status_update':
          devLog('🔄 Actualización de estado:', data);
          break;

        case 'nueva_solicitud':
          devLog('📬 Nueva solicitud recibida:', data);
          this.handleNuevaSolicitud(data as NuevaSolicitudEvent);
          break;

        case 'oferta_aceptada':
          devLog('✅ Oferta aceptada:', data);
          this.handleOrdenesListRefresh({
            type: 'oferta_aceptada',
            oferta_id: data.oferta_id != null ? String(data.oferta_id) : undefined,
            solicitud_id: data.solicitud_id != null ? String(data.solicitud_id) : undefined,
          });
          break;

        case 'pago_en_proceso':
          devLog('💳 Cliente procesando pago:', data);
          this.handleOrdenesListRefresh({
            type: 'pago_en_proceso',
            oferta_id: data.oferta_id != null ? String(data.oferta_id) : undefined,
            solicitud_id: data.solicitud_id != null ? String(data.solicitud_id) : undefined,
          });
          break;

        case 'pago_completado':
          devLog('💰 ¡Pago completado!:', data);
          this.handleOrdenesListRefresh({
            type: 'pago_completado',
            oferta_id: data.oferta_id != null ? String(data.oferta_id) : undefined,
            solicitud_id: data.solicitud_id != null ? String(data.solicitud_id) : undefined,
            solicitud_servicio_id: data.solicitud_servicio_id,
          });
          break;

        case 'oferta_rechazada':
          devLog('❌ Oferta rechazada:', data);
          this.handleOrdenesListRefresh({
            type: 'oferta_rechazada',
            oferta_id: data.oferta_id != null ? String(data.oferta_id) : undefined,
            solicitud_id: data.solicitud_id != null ? String(data.solicitud_id) : undefined,
          });
          break;

        case 'solicitud_cancelada':
          devLog('🚫 Solicitud cancelada (legacy):', data);
          this.handleSolicitudCanceladaCliente({
            type: 'solicitud_cancelada_cliente',
            solicitud_id: String(data.solicitud_id || ''),
            oferta_id: '',
            mensaje: 'La solicitud fue cancelada.',
            creditos_devueltos: false,
            timestamp: data.timestamp || new Date().toISOString(),
          });
          break;

        case 'nuevo_mensaje_chat':
          devLog('💬 Nuevo mensaje de chat recibido:', data);
          // Normalize payload to match interface
          const chatEvent: NuevoMensajeChatEvent = {
            type: 'nuevo_mensaje_chat',
            conversation_id: data.conversation_id != null ? String(data.conversation_id) : undefined,
            mensaje_id: String(data.mensaje_id ?? data.id ?? ''),
            oferta_id: data.oferta_id != null ? String(data.oferta_id) : (data.oferta != null ? String(data.oferta) : ''),
            solicitud_id: data.solicitud_id != null ? String(data.solicitud_id) : '',
            sender_id: data.sender_id != null ? Number(data.sender_id) : undefined,
            enviado_por: data.sender_name || data.enviado_por,
            mensaje: data.mensaje || data.message || data.content || '',
            message: data.message,
            content: data.content,
            es_proveedor: data.es_proveedor !== undefined ? data.es_proveedor : false,
            timestamp: data.timestamp,
            archivo_adjunto: data.archivo_adjunto || data.attachment || null
          };
          this.handleNuevoMensajeChat(chatEvent);
          break;

        case 'pago_expirado':
          devLog('⏰ Pago expirado recibido:', data);
          this.handlePagoExpirado(data as PagoExpiradoEvent);
          break;

        case 'solicitud_cancelada_cliente':
          devLog('❌ Solicitud cancelada por cliente recibida:', data);
          this.handleSolicitudCanceladaCliente(data as SolicitudCanceladaClienteEvent);
          break;

        case 'servicio_cerrado_por_cliente':
          devLog('✅ Servicio cerrado por firma del cliente:', data);
          this.handleServicioCerradoPorCliente(data as ServicioCerradoPorClienteEvent);
          break;

        case 'orden_asignada_mecanico':
        case 'cita_asignada_mecanico':
        case 'asignacion_mecanico':
          devLog('🔧 Asignación recibida para mecánico:', data);
          this.handleAsignacionMecanico({
            type: data.type as AsignacionMecanicoEvent['type'],
            orden_id: data.orden_id != null ? String(data.orden_id) : undefined,
            cita_id: data.cita_id != null ? String(data.cita_id) : undefined,
            solicitud_id: data.solicitud_id != null ? String(data.solicitud_id) : undefined,
            miembro_id: data.miembro_id != null ? String(data.miembro_id) : undefined,
          });
          break;

        default:
          devLog('📨 Mensaje no manejado:', data);
      }
    } catch (error) {
      devLog('❌ Error procesando mensaje WebSocket:', error);
    }
  }

  /**
   * Maneja el cierre de la conexión
   */
  private handleClose(event: CloseEvent): void {
    devLog('🔌 WebSocket desconectado:', event.code, event.reason);
    this.isConnected = false;
    this.isConnecting = false;
    this.stopHeartbeat();

    // Intentar reconectar si no fue un cierre intencional
    if (event.code !== 1000) {
      this.scheduleReconnect();
    }
  }

  /**
   * Maneja errores de la conexión
   */
  private handleError(event: Event): void {
    devLog('❌ Error en WebSocket:', event);
    this.isConnected = false;
    this.isConnecting = false;
  }

  /**
   * Programa reconexión con exponential backoff + jitter (sin límite de intentos).
   */
  private scheduleReconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    this.reconnectAttempts++;
    const exponential = Math.min(
      this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1),
      this.maxReconnectDelay
    );
    const jitter = Math.random() * 1000;
    const delay = exponential + jitter;

    devLog(`🔄 Reconexión #${this.reconnectAttempts} en ${Math.round(delay)}ms`);

    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, delay) as any;
  }

  /**
   * Inicia el heartbeat
   */
  private startHeartbeat(): void {
    // Limpiar heartbeat anterior si existe
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    this.heartbeatInterval = setInterval(async () => {
      // IMPORTANTE: Verificar estado antes de enviar
      if (!this.isConnected || !this.ws) {
        devLog('⚠️ Heartbeat cancelado: No hay conexión activa');
        return;
      }

      // Verificar que el WebSocket esté en estado OPEN
      if (this.ws.readyState !== WebSocket.OPEN) {
        devLog('⚠️ Heartbeat cancelado: WebSocket no está en estado OPEN (estado actual:', this.ws.readyState, ')');
        return;
      }

      try {
        const heartbeatMessage: WebSocketMessage = {
          type: 'heartbeat',
          timestamp: new Date().toISOString()
        };

        this.ws.send(JSON.stringify(heartbeatMessage));
        devLog('💓 Heartbeat enviado -', new Date().toISOString());
      } catch (error) {
        console.error('❌ Error enviando heartbeat:', error);
        // Si falla el envío, detener heartbeat y reconectar
        this.stopHeartbeat();
        this.scheduleReconnect();
      }
    }, 45000) as any; // 45s: equilibrio UX (sigue vivo) vs carga en Channels/BD
  }

  /**
   * Actualiza el estado del proveedor en el backend
   */
  private async updateProviderStatus(): Promise<void> {
    try {
      const token = await getAuthToken();
      if (!token) {
        devLog('❌ No hay token para actualizar estado');
        return;
      }

      devLog('🔄 ACTUALIZANDO ESTADO DEL PROVEEDOR EN BACKEND...');
      const serverConfig = ServerConfig.getInstance();
      const baseURL = await serverConfig.getBaseURL();
      const response = await fetch(`${baseURL}/usuarios/proveedores/conectar/`, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        devLog('✅ ESTADO DEL PROVEEDOR ACTUALIZADO EN BACKEND - TIMESTAMP:', new Date().toISOString());
      } else {
        devLog('❌ Error actualizando estado del proveedor:', response.status);
      }
    } catch (error) {
      devLog('❌ Error en updateProviderStatus:', error);
    }
  }

  /**
   * Detiene el heartbeat
   */
  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  /**
   * Obtiene la URL del servidor usando detección automática
   */
  private async getServerUrl(): Promise<string> {
    const serverConfig = ServerConfig.getInstance();
    const baseURL = await serverConfig.getBaseURL();
    // Convertir de /api a la URL base del servidor
    const serverUrl = baseURL.replace('/api', '');
    devLog('🎯 URL del servidor detectada automáticamente:', serverUrl);
    return serverUrl;
  }

  /**
   * Obtiene headers de autenticación
   */
  private async getAuthHeaders(): Promise<Record<string, string>> {
    const token = await getAuthToken();
    const headers: Record<string, string> = {};

    if (token) {
      headers['Authorization'] = `Token ${token}`;
    }

    return headers;
  }

  /**
   * Desconecta el WebSocket
   */
  disconnect(options?: { force?: boolean }): void {
    if (!options?.force && this.shouldMaintainConnection()) {
      devLog('🔌 WebSocket: sesión de chat o radar activo, no se desconecta');
      return;
    }
    devLog('🔌 Desconectando WebSocket...');

    // Limpiar timeout de reconexión
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    this.stopHeartbeat();

    if (this.ws) {
      // Verificar el estado antes de cerrar
      if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
        this.ws.close(1000, 'Desconexión intencional');
      }
      this.ws = null;
    }

    this.isConnected = false;
    this.isConnecting = false;
    this.reconnectAttempts = 0;
  }

  /**
   * Envía un mensaje al WebSocket
   */
  send(message: WebSocketMessage): void {
    if (this.isConnected && this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(message));
        devLog('📤 Mensaje enviado:', message);
      } catch (error) {
        devLog('❌ Error enviando mensaje WebSocket:', error);
      }
    } else {
      devLog('❌ WebSocket no conectado, no se puede enviar mensaje');
    }
  }

  /**
   * Obtiene el estado de conexión
   */
  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  /**
   * Configura el listener del estado de la app
   */
  private setupAppStateListener(): void {
    this.appStateListener = AppState.addEventListener('change', this.handleAppStateChange.bind(this));
  }

  /**
   * Maneja cambios en el estado de la app
   */
  private handleAppStateChange(nextAppState: AppStateStatus): void {
    devLog('📱 Estado de la app cambiado:', nextAppState);

    if (nextAppState === 'active') {
      if (!this.isConnected && this.shouldMaintainConnection()) {
        devLog('🔄 App activa, reconectando WebSocket...');
        this.connect();
      }
    } else if (nextAppState === 'background' || nextAppState === 'inactive') {
      if (!this.isChatSessionActive()) {
        devLog('🔌 App en segundo plano, desconectando WebSocket...');
        this.disconnect({ force: true });
      }
    }
  }

  /**
   * Cambia el estado del proveedor manualmente
   */
  updateStatus(newStatus: 'online' | 'offline' | 'busy'): void {
    if (this.isConnected && this.ws) {
      this.currentStatus = newStatus;
      this.send({
        type: 'status_update',
        status: newStatus
      });
      devLog('🔄 Estado actualizado a:', newStatus);
    } else {
      devLog('❌ No se puede actualizar estado - WebSocket no conectado');
    }
  }

  /**
   * Obtiene el estado actual del proveedor
   */
  getCurrentStatus(): 'online' | 'offline' | 'busy' {
    return this.currentStatus;
  }

  /**
   * Maneja eventos de nueva solicitud
   */
  private handleNuevaSolicitud(event: NuevaSolicitudEvent): void {
    // Notificar a todos los callbacks suscritos
    this.nuevaSolicitudCallbacks.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('❌ Error en callback de nueva solicitud:', error);
      }
    });
  }

  /**
   * Suscribe un callback para recibir notificaciones de nuevas solicitudes
   */
  onNuevaSolicitud(callback: NuevaSolicitudCallback): () => void {
    this.nuevaSolicitudCallbacks.add(callback);

    // Retornar función para desuscribirse
    return () => {
      this.nuevaSolicitudCallbacks.delete(callback);
    };
  }

  /**
   * Maneja eventos de nuevo mensaje de chat
   */
  private handleNuevoMensajeChat(event: NuevoMensajeChatEvent): void {
    // Notificar a todos los callbacks suscritos
    this.nuevoMensajeChatCallbacks.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('❌ Error en callback de nuevo mensaje chat:', error);
      }
    });
  }

  /**
   * Suscribe un callback para recibir notificaciones de nuevos mensajes de chat
   */
  onNuevoMensajeChat(callback: NuevoMensajeChatCallback): () => void {
    this.nuevoMensajeChatCallbacks.add(callback);

    // Retornar función para desuscribirse
    return () => {
      this.nuevoMensajeChatCallbacks.delete(callback);
    };
  }

  /**
   * Maneja eventos de pago expirado
   */
  private handlePagoExpirado(event: PagoExpiradoEvent): void {
    // Notificar a todos los callbacks suscritos
    this.pagoExpiradoCallbacks.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('❌ Error en callback de pago expirado:', error);
      }
    });
  }

  /**
   * Suscribe un callback para recibir notificaciones de pago expirado
   */
  onPagoExpirado(callback: PagoExpiradoCallback): () => void {
    this.pagoExpiradoCallbacks.add(callback);

    // Retornar función para desuscribirse
    return () => {
      this.pagoExpiradoCallbacks.delete(callback);
    };
  }

  /**
   * Maneja eventos de solicitud cancelada por cliente
   */
  private handleSolicitudCanceladaCliente(event: SolicitudCanceladaClienteEvent): void {
    // Notificar a todos los callbacks suscritos
    this.solicitudCanceladaClienteCallbacks.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('❌ Error en callback de solicitud cancelada:', error);
      }
    });
  }

  /**
   * Suscribe un callback para recibir notificaciones de solicitud cancelada por cliente
   */
  onSolicitudCanceladaCliente(callback: SolicitudCanceladaClienteCallback): () => void {
    this.solicitudCanceladaClienteCallbacks.add(callback);

    // Retornar función para desuscribirse
    return () => {
      this.solicitudCanceladaClienteCallbacks.delete(callback);
    };
  }

  private handleServicioCerradoPorCliente(event: ServicioCerradoPorClienteEvent): void {
    this.servicioCerradoPorClienteCallbacks.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('❌ Error en callback servicio_cerrado_por_cliente:', error);
      }
    });
  }

  /**
   * Cliente firmó checklist — invalidar órdenes/ofertas en pantallas suscritas.
   */
  onServicioCerradoPorCliente(callback: ServicioCerradoPorClienteCallback): () => void {
    this.servicioCerradoPorClienteCallbacks.add(callback);
    return () => {
      this.servicioCerradoPorClienteCallbacks.delete(callback);
    };
  }

  private handleOrdenesListRefresh(event: OrdenesListRefreshEvent): void {
    this.ordenesListRefreshCallbacks.forEach((callback) => {
      try {
        callback(event);
      } catch (error) {
        console.error('❌ Error en callback ordenes_list_refresh:', error);
      }
    });
  }

  /** Adjudicación / pago / rechazo — refrescar tab Órdenes y Ofertas */
  onOrdenesListRefresh(callback: OrdenesListRefreshCallback): () => void {
    this.ordenesListRefreshCallbacks.add(callback);
    return () => {
      this.ordenesListRefreshCallbacks.delete(callback);
    };
  }

  private handleAsignacionMecanico(event: AsignacionMecanicoEvent): void {
    this.asignacionMecanicoCallbacks.forEach((callback) => {
      try {
        callback(event);
      } catch (error) {
        console.error('❌ Error en callback asignacion_mecanico:', error);
      }
    });
  }

  /** Nueva orden o cita asignada al mecánico de equipo */
  onAsignacionMecanico(callback: AsignacionMecanicoCallback): () => void {
    this.asignacionMecanicoCallbacks.add(callback);
    return () => {
      this.asignacionMecanicoCallbacks.delete(callback);
    };
  }

  /**
   * Limpia los listeners al destruir el servicio
   */
  cleanup(): void {
    if (this.appStateListener) {
      this.appStateListener.remove();
      this.appStateListener = null;
    }
    this.nuevaSolicitudCallbacks.clear();
    this.nuevoMensajeChatCallbacks.clear();
    this.pagoExpiradoCallbacks.clear();
    this.solicitudCanceladaClienteCallbacks.clear();
    this.servicioCerradoPorClienteCallbacks.clear();
    this.ordenesListRefreshCallbacks.clear();
    this.asignacionMecanicoCallbacks.clear();
    this.mecanicoEquipoSession = false;
    this.disconnect();
  }
}

export default new WebSocketService();