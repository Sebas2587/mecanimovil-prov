import api from './api';
import { AppState, AppStateStatus } from 'react-native';
import * as SecureStore from 'expo-secure-store';

export interface ConnectionStatus {
  esta_conectado: boolean;
  ultima_conexion: string | null;
  proveedor: string;
  tipo: 'mecanico' | 'taller';
}

class ConnectionService {
  private connectionInterval: NodeJS.Timeout | null = null;
  private isConnected = false;
  private appStateListener: any = null;
  private disconnectTimeout: NodeJS.Timeout | null = null;
  private lastAppState: AppStateStatus = 'active';

  /**
   * Marca al proveedor como conectado
   */
  async connect(): Promise<ConnectionStatus> {
    try {
      console.log('🔗 Marcando proveedor como conectado...');
      console.log('📍 Usando endpoint: /usuarios/proveedores/conectar/');
      
      const response = await api.post('/usuarios/proveedores/conectar/');
      
      if (response.status === 200) {
        this.isConnected = true;
        console.log('✅ Proveedor marcado como conectado');
        return response.data;
      } else {
        console.log('❌ Error marcando como conectado:', response.status);
        throw new Error('Error al conectar');
      }
    } catch (error) {
      console.log('❌ Error en connect():', error);
      throw error;
    }
  }

  /**
   * Marca al proveedor como desconectado
   */
  async disconnect(): Promise<ConnectionStatus | null> {
    try {
      // Verificar si hay token antes de intentar desconectar
      const token = await SecureStore.getItemAsync('authToken');
      if (!token) {
        console.log('⚠️ No hay token válido, saltando desconexión');
        this.isConnected = false;
        return null;
      }

      console.log('🔌 Marcando proveedor como desconectado...');
      console.log('📍 Usando endpoint: /usuarios/proveedores/desconectar/');
      
      const response = await api.post('/usuarios/proveedores/desconectar/');
      
      if (response.status === 200) {
        this.isConnected = false;
        console.log('✅ Proveedor marcado como desconectado');
        return response.data;
      } else {
        console.log('❌ Error marcando como desconectado:', response.status);
        throw new Error('Error al desconectar');
      }
    } catch (error) {
      console.log('❌ Error en disconnect():', error);
      // Si hay error, asumir que está desconectado
      this.isConnected = false;
      return null;
    }
  }

  /**
   * Maneja los cambios de estado de la app
   */
  private handleAppStateChange = (nextAppState: AppStateStatus) => {
    console.log('📱 Estado de la app cambiado:', this.lastAppState, '→', nextAppState);
    
    // Solo procesar si el estado realmente cambió
    if (this.lastAppState === nextAppState) {
      return;
    }
    
    this.lastAppState = nextAppState;
    
    if (nextAppState === 'active') {
      // App vuelve a estar activa - reconectar
      console.log('🔄 App activa - reconectando...');
      
      // Limpiar timeout de desconexión si existe
      if (this.disconnectTimeout) {
        clearTimeout(this.disconnectTimeout);
        this.disconnectTimeout = null;
        console.log('⏰ Timeout de desconexión cancelado');
      }
      
      this.connect().catch(error => {
        console.log('⚠️ Error reconectando:', error);
      });
    } else if (nextAppState === 'background' || nextAppState === 'inactive') {
      // App pasa a segundo plano o se cierra - desconectar después de un delay
      console.log('🛑 App en segundo plano - programando desconexión...');
      
      // Desconectar después de 5 segundos para evitar desconexiones falsas
      this.disconnectTimeout = setTimeout(() => {
        console.log('🛑 Ejecutando desconexión programada...');
        this.disconnect().catch(error => {
          console.log('⚠️ Error desconectando:', error);
        });
      }, 5000) as any; // 5 segundos
    }
  };

  /**
   * Inicia el monitoreo automático de conexión
   */
  startConnectionMonitoring(): void {
    console.log('🔄 Iniciando monitoreo de conexión...');
    
    // Conectar inmediatamente
    this.connect().catch(error => {
      console.log('⚠️ Error en conexión inicial:', error);
    });

    // Mantener conexión activa cada 60 segundos (más eficiente)
    this.connectionInterval = setInterval(async () => {
      if (this.isConnected) {
        try {
          await this.connect();
        } catch (error) {
          console.log('⚠️ Error manteniendo conexión:', error);
          this.isConnected = false;
        }
      }
    }, 60000) as any; // 60 segundos

    // Escuchar cambios de estado de la app
    this.appStateListener = AppState.addEventListener('change', this.handleAppStateChange);
    console.log('👂 Escuchando cambios de estado de la app');
    
    // Obtener estado inicial
    this.lastAppState = AppState.currentState;
    console.log('📱 Estado inicial de la app:', this.lastAppState);
  }

  /**
   * Detiene el monitoreo de conexión
   */
  stopConnectionMonitoring(): void {
    console.log('🛑 Deteniendo monitoreo de conexión...');
    
    if (this.connectionInterval) {
      clearInterval(this.connectionInterval);
      this.connectionInterval = null;
    }

    // Limpiar timeout de desconexión
    if (this.disconnectTimeout) {
      clearTimeout(this.disconnectTimeout);
      this.disconnectTimeout = null;
    }

    // Remover listener de AppState
    if (this.appStateListener) {
      this.appStateListener.remove();
      this.appStateListener = null;
      console.log('👂 Removido listener de AppState');
    }

    // Desconectar al salir (solo si hay token)
    this.disconnect().catch(error => {
      console.log('⚠️ Error al desconectar:', error);
    });
  }

  /**
   * Obtiene el estado actual de conexión
   */
  getConnectionStatus(): boolean {
    return this.isConnected;
  }
}

export default new ConnectionService(); 