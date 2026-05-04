import * as SecureStore from 'expo-secure-store';
import { AppState, AppStateStatus } from 'react-native';
import ServerConfig from '../../services/serverConfig';
import { devLog } from '@/utils/devLog';
import { isRadarOportunidadesActivo } from '@/utils/radarOportunidadesGate';

// Función simple para obtener token
const getAuthToken = async (): Promise<string | null> => {
  try {
    const token = await SecureStore.getItemAsync('authToken');
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
  mensaje_id: string;
  oferta_id: string;
  solicitud_id: string;
  enviado_por: string;
  mensaje: string;
  message?: string; // Optional alias
  content?: string; // Optional alias
  es_proveedor: boolean;
  timestamp: string;
  archivo_adjunto?: string | null;
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

  /**
   * Inicializa la conexión WebSocket con autenticación JWT
   */
  async connect(): Promise<void> {
    if (!isRadarOportunidadesActivo()) {
      devLog('WebSocket: radar de oportunidades inactivo, no se conecta');
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
          devLog('   📄 Solicitud ID:', data.solicitud_id);
          devLog('   💰 Monto:', data.monto_total);
          devLog('   📋 Estado:', data.estado_oferta);
          devLog('   💬 Mensaje:', data.mensaje);
          // TODO: Mostrar notificación al proveedor
          // TODO: Actualizar lista de ofertas en tiempo real
          break;

        case 'pago_en_proceso':
          devLog('💳 Cliente procesando pago:', data);
          devLog('   📄 Solicitud ID:', data.solicitud_id);
          devLog('   💵 Oferta ID:', data.oferta_id);
          devLog('   💰 Monto:', data.monto_total);
          devLog('   📋 Estado:', data.estado_oferta);
          devLog('   💬 Mensaje:', data.mensaje);
          // TODO: Mostrar notificación "Cliente está pagando..."
          // TODO: Actualizar estado de oferta a 'pendiente_pago'
          break;

        case 'pago_completado':
          devLog('💰 ¡Pago completado!:', data);
          devLog('   📄 Solicitud ID:', data.solicitud_id);
          devLog('   🔧 Solicitud Servicio ID:', data.solicitud_servicio_id);
          devLog('   💵 Oferta ID:', data.oferta_id);
          devLog('   💰 Monto:', data.monto_total);
          devLog('   📅 Fecha servicio:', data.fecha_servicio);
          devLog('   🕐 Hora servicio:', data.hora_servicio);
          devLog('   📋 Estado:', data.estado_oferta);
          devLog('   💬 Mensaje:', data.mensaje);
          // TODO: Mostrar notificación "¡Pago completado! Servicio confirmado."
          // TODO: Actualizar estado de oferta a 'pagada'
          // TODO: Recargar órdenes activas
          break;

        case 'oferta_rechazada':
          devLog('❌ Oferta rechazada:', data);
          // TODO: Manejar evento de oferta rechazada
          break;

        case 'solicitud_cancelada':
          devLog('🚫 Solicitud cancelada:', data);
          // TODO: Manejar evento de solicitud cancelada
          break;

        case 'nuevo_mensaje_chat':
          devLog('💬 Nuevo mensaje de chat recibido:', data);
          // Normalize payload to match interface
          const chatEvent: NuevoMensajeChatEvent = {
            type: 'nuevo_mensaje_chat',
            mensaje_id: data.id || data.mensaje_id,
            oferta_id: data.oferta_id || data.oferta,
            solicitud_id: data.solicitud_id,
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
  disconnect(): void {
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
      // App vuelve a primer plano - reconectar si es necesario
      if (!this.isConnected && isRadarOportunidadesActivo()) {
        devLog('🔄 App activa, reconectando WebSocket...');
        this.connect();
      }
    } else if (nextAppState === 'background' || nextAppState === 'inactive') {
      // App va a segundo plano - desconectar para ahorrar batería
      devLog('🔌 App en segundo plano, desconectando WebSocket...');
      this.disconnect();
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
    this.disconnect();
  }
}

export default new WebSocketService();