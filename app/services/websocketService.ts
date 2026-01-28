import * as SecureStore from 'expo-secure-store';
import { AppState, AppStateStatus } from 'react-native';
import ServerConfig from '../../services/serverConfig';

// Función simple para obtener token
const getAuthToken = async (): Promise<string | null> => {
  try {
    const token = await SecureStore.getItemAsync('authToken');
    return token;
  } catch (error) {
    console.log('❌ Error obteniendo token:', error);
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
  es_proveedor: boolean;
  timestamp: string;
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
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // 1 segundo
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
    // Evitar múltiples conexiones simultáneas - PROTECCIÓN MEJORADA
    if (this.isConnecting) {
      console.log('🔄 Conexión ya en progreso (isConnecting=true), ignorando...');
      return;
    }

    if (this.ws) {
      if (this.ws.readyState === WebSocket.CONNECTING) {
        console.log('🔄 Conexión ya en progreso (WebSocket.CONNECTING), ignorando...');
        return;
      }
      if (this.ws.readyState === WebSocket.OPEN && this.isConnected) {
        console.log('✅ Ya conectado (WebSocket.OPEN), ignorando...');
        return;
      }
    }

    // Limpiar timeout de reconexión si existe
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    try {
      console.log('🚀 INICIANDO CONEXIÓN WEBSOCKET - VERSIÓN CORREGIDA');

      // Obtener token de autenticación
      const token = await getAuthToken();
      if (!token) {
        console.log('❌ No hay token de autenticación');
        return;
      }

      // Obtener URL del servidor
      const serverUrl = await this.getServerUrl();
      if (!serverUrl) {
        console.log('❌ No se pudo obtener la URL del servidor');
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
      console.log('🔗 CONECTANDO A WEBSOCKET:', wsUrl);
      console.log('🔗 URL COMPLETA:', wsUrl);
      console.log('🔑 TOKEN EN URL:', token.substring(0, 10) + '...');

      this.isConnecting = true;

      // Crear conexión WebSocket
      this.ws = new WebSocket(wsUrl);

      // Configurar event listeners
      this.ws.onopen = this.handleOpen.bind(this);
      this.ws.onmessage = this.handleMessage.bind(this);
      this.ws.onclose = this.handleClose.bind(this);
      this.ws.onerror = this.handleError.bind(this);

      // Configurar listener de estado de la app
      this.setupAppStateListener();

    } catch (error) {
      console.log('❌ Error conectando WebSocket:', error);
      this.isConnecting = false;
      this.scheduleReconnect();
    }
  }

  /**
   * Maneja la apertura de la conexión
   */
  private handleOpen(event: Event): void {
    console.log('✅ WEBSOCKET CONECTADO EXITOSAMENTE');
    this.isConnected = true;
    this.isConnecting = false;
    this.reconnectAttempts = 0;
    this.currentStatus = 'online';

    // Iniciar heartbeat
    console.log('💓 INICIANDO HEARTBEAT - VERSIÓN CORREGIDA');
    // OPTIMIZACIÓN: Deshabilitado temporalmente
    // this.startHeartbeat();
  }

  /**
   * Maneja mensajes recibidos
   */
  private handleMessage(event: MessageEvent): void {
    try {
      const data: WebSocketMessage = JSON.parse(event.data);
      console.log('📨 Mensaje WebSocket recibido:', data);

      switch (data.type) {
        case 'connection_confirmed':
          console.log('✅ Conexión confirmada:', data);
          break;

        case 'mechanic_status_update':
          console.log('🔄 Actualización de estado:', data);
          break;

        case 'heartbeat':
          console.log('💓 Heartbeat recibido:', data);
          break;

        case 'connection_status_update':
          console.log('🔄 Actualización de estado:', data);
          break;

        case 'nueva_solicitud':
          console.log('📬 Nueva solicitud recibida:', data);
          this.handleNuevaSolicitud(data as NuevaSolicitudEvent);
          break;

        case 'oferta_aceptada':
          console.log('✅ Oferta aceptada:', data);
          console.log('   📄 Solicitud ID:', data.solicitud_id);
          console.log('   💰 Monto:', data.monto_total);
          console.log('   📋 Estado:', data.estado_oferta);
          console.log('   💬 Mensaje:', data.mensaje);
          // TODO: Mostrar notificación al proveedor
          // TODO: Actualizar lista de ofertas en tiempo real
          break;

        case 'pago_en_proceso':
          console.log('💳 Cliente procesando pago:', data);
          console.log('   📄 Solicitud ID:', data.solicitud_id);
          console.log('   💵 Oferta ID:', data.oferta_id);
          console.log('   💰 Monto:', data.monto_total);
          console.log('   📋 Estado:', data.estado_oferta);
          console.log('   💬 Mensaje:', data.mensaje);
          // TODO: Mostrar notificación "Cliente está pagando..."
          // TODO: Actualizar estado de oferta a 'pendiente_pago'
          break;

        case 'pago_completado':
          console.log('💰 ¡Pago completado!:', data);
          console.log('   📄 Solicitud ID:', data.solicitud_id);
          console.log('   🔧 Solicitud Servicio ID:', data.solicitud_servicio_id);
          console.log('   💵 Oferta ID:', data.oferta_id);
          console.log('   💰 Monto:', data.monto_total);
          console.log('   📅 Fecha servicio:', data.fecha_servicio);
          console.log('   🕐 Hora servicio:', data.hora_servicio);
          console.log('   📋 Estado:', data.estado_oferta);
          console.log('   💬 Mensaje:', data.mensaje);
          // TODO: Mostrar notificación "¡Pago completado! Servicio confirmado."
          // TODO: Actualizar estado de oferta a 'pagada'
          // TODO: Recargar órdenes activas
          break;

        case 'oferta_rechazada':
          console.log('❌ Oferta rechazada:', data);
          // TODO: Manejar evento de oferta rechazada
          break;

        case 'solicitud_cancelada':
          console.log('🚫 Solicitud cancelada:', data);
          // TODO: Manejar evento de solicitud cancelada
          break;

        case 'nuevo_mensaje_chat':
          console.log('💬 Nuevo mensaje de chat recibido:', data);
          // Normalize payload to match interface
          const chatEvent: NuevoMensajeChatEvent = {
            type: 'nuevo_mensaje_chat',
            mensaje_id: data.id || data.mensaje_id,
            oferta_id: data.oferta_id || data.oferta,
            solicitud_id: data.solicitud_id,
            enviado_por: data.sender_name || data.enviado_por,
            mensaje: data.message || data.content || data.mensaje,
            es_proveedor: data.es_proveedor !== undefined ? data.es_proveedor : false,
            timestamp: data.timestamp
          };
          this.handleNuevoMensajeChat(chatEvent);
          break;

        case 'pago_expirado':
          console.log('⏰ Pago expirado recibido:', data);
          this.handlePagoExpirado(data as PagoExpiradoEvent);
          break;

        case 'solicitud_cancelada_cliente':
          console.log('❌ Solicitud cancelada por cliente recibida:', data);
          this.handleSolicitudCanceladaCliente(data as SolicitudCanceladaClienteEvent);
          break;

        default:
          console.log('📨 Mensaje no manejado:', data);
      }
    } catch (error) {
      console.log('❌ Error procesando mensaje WebSocket:', error);
    }
  }

  /**
   * Maneja el cierre de la conexión
   */
  private handleClose(event: CloseEvent): void {
    console.log('🔌 WebSocket desconectado:', event.code, event.reason);
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
    console.log('❌ Error en WebSocket:', event);
    this.isConnected = false;
    this.isConnecting = false;
  }

  /**
   * Programa una reconexión
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * this.reconnectAttempts;

      console.log(`🔄 Programando reconexión ${this.reconnectAttempts}/${this.maxReconnectAttempts} en ${delay}ms`);

      this.reconnectTimeout = setTimeout(() => {
        this.connect();
      }, delay) as any;
    } else {
      console.log('❌ Máximo de intentos de reconexión alcanzado');
    }
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
        console.log('⚠️ Heartbeat cancelado: No hay conexión activa');
        return;
      }

      // Verificar que el WebSocket esté en estado OPEN
      if (this.ws.readyState !== WebSocket.OPEN) {
        console.log('⚠️ Heartbeat cancelado: WebSocket no está en estado OPEN (estado actual:', this.ws.readyState, ')');
        return;
      }

      try {
        const heartbeatMessage: WebSocketMessage = {
          type: 'heartbeat',
          timestamp: new Date().toISOString()
        };

        this.ws.send(JSON.stringify(heartbeatMessage));
        console.log('💓 Heartbeat enviado -', new Date().toISOString());
      } catch (error) {
        console.error('❌ Error enviando heartbeat:', error);
        // Si falla el envío, detener heartbeat y reconectar
        this.stopHeartbeat();
        this.scheduleReconnect();
      }
    }, 30000) as any; // 30 segundos
  }

  /**
   * Actualiza el estado del proveedor en el backend
   */
  private async updateProviderStatus(): Promise<void> {
    try {
      const token = await getAuthToken();
      if (!token) {
        console.log('❌ No hay token para actualizar estado');
        return;
      }

      console.log('🔄 ACTUALIZANDO ESTADO DEL PROVEEDOR EN BACKEND...');
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
        console.log('✅ ESTADO DEL PROVEEDOR ACTUALIZADO EN BACKEND - TIMESTAMP:', new Date().toISOString());
      } else {
        console.log('❌ Error actualizando estado del proveedor:', response.status);
      }
    } catch (error) {
      console.log('❌ Error en updateProviderStatus:', error);
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
    console.log('🎯 URL del servidor detectada automáticamente:', serverUrl);
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
    console.log('🔌 Desconectando WebSocket...');

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
        console.log('📤 Mensaje enviado:', message);
      } catch (error) {
        console.log('❌ Error enviando mensaje WebSocket:', error);
      }
    } else {
      console.log('❌ WebSocket no conectado, no se puede enviar mensaje');
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
    console.log('📱 Estado de la app cambiado:', nextAppState);

    if (nextAppState === 'active') {
      // App vuelve a primer plano - reconectar si es necesario
      if (!this.isConnected) {
        console.log('🔄 App activa, reconectando WebSocket...');
        this.connect();
      }
    } else if (nextAppState === 'background' || nextAppState === 'inactive') {
      // App va a segundo plano - desconectar para ahorrar batería
      console.log('🔌 App en segundo plano, desconectando WebSocket...');
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
      console.log('🔄 Estado actualizado a:', newStatus);
    } else {
      console.log('❌ No se puede actualizar estado - WebSocket no conectado');
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