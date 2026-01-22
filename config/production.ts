/**
 * Configuración para producción
 * 
 * Para cambiar a producción:
 * 1. Configurar variables de entorno:
 *    - EXPO_PUBLIC_ENVIRONMENT=production
 *    - EXPO_PUBLIC_PRODUCTION_API_URL=https://api.mecanimovil.com
 *    - EXPO_PUBLIC_PRODUCTION_WS_URL=wss://api.mecanimovil.com
 * 
 * 2. O modificar directamente las URLs aquí:
 */

export const PRODUCTION_CONFIG = {
  // URLs del servidor - Render
  API_BASE_URL: process.env.EXPO_PUBLIC_PRODUCTION_API_URL || 'https://mecanimovil-api.onrender.com',
  WS_BASE_URL: process.env.EXPO_PUBLIC_PRODUCTION_WS_URL || 'wss://mecanimovil-api.onrender.com',
  
  // Configuración de WebSocket
  WS_ENDPOINTS: {
    MECHANIC_STATUS: '/ws/mechanic_status/',
    CLIENT_STATUS: '/ws/client_status/',
    PROVIDER: '/ws/proveedor/'
  },
  
  // Timeouts
  CONNECTION_TIMEOUT: 10000,
  HEARTBEAT_INTERVAL: 30000,
  
  // Reintentos
  MAX_RECONNECT_ATTEMPTS: 5,
  RECONNECT_DELAY: 1000,
  
  // Logging
  ENABLE_DEBUG_LOGS: false,
  ENABLE_NETWORK_LOGS: true
};

/**
 * Verificar si estamos en producción
 */
export const isProduction = (): boolean => {
  // Verificar si está forzado en app.json
  const Constants = require('expo-constants');
  const forceProduction = Constants.expoConfig?.extra?.forceProduction || false;
  
  return forceProduction ||
         process.env.NODE_ENV === 'production' || 
         process.env.EXPO_PUBLIC_ENVIRONMENT === 'production';
};

/**
 * Obtener configuración según el entorno
 * NOTA: En desarrollo, la API_BASE_URL y WS_BASE_URL se detectan automáticamente
 * usando serverConfig.ts. Estos valores son solo para referencia/fallback.
 */
export const getConfig = () => {
  if (isProduction()) {
    return PRODUCTION_CONFIG;
  }
  
  // Configuración de desarrollo
  // NOTA: Las URLs reales se detectan automáticamente en serverConfig.ts
  // Estos valores son fallbacks - usar serverConfig para obtener las URLs reales
  return {
    API_BASE_URL: 'http://192.168.100.70:8000/api', // Fallback, usar serverConfig.getBaseURL()
    WS_BASE_URL: 'ws://192.168.100.70:8000', // Fallback, derivar de serverConfig
    WS_ENDPOINTS: {
      MECHANIC_STATUS: '/ws/mechanic_status/',
      CLIENT_STATUS: '/ws/client_status/',
      PROVIDER: '/ws/proveedor/'
    },
    CONNECTION_TIMEOUT: 5000,
    HEARTBEAT_INTERVAL: 30000,
    MAX_RECONNECT_ATTEMPTS: 5,
    RECONNECT_DELAY: 1000,
    ENABLE_DEBUG_LOGS: true,
    ENABLE_NETWORK_LOGS: true
  };
}; 