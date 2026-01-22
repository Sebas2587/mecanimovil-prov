import * as Network from 'expo-network';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

/**
 * Configuración dinámica del servidor backend para la aplicación de proveedores
 * Detecta automáticamente la IP correcta sin hardcodear IPs fijas
 * 
 * CONFIGURACIÓN:
 * - Para desarrollo: Usa detección automática de IP
 * - Para producción: Usa URL fija configurada en variables de entorno
 */

// Configuración por defecto y fallbacks
const DEFAULT_CONFIG = {
  port: 8000,
  protocol: 'http',
  apiPath: '/api',
  timeout: 15000,
  retryAttempts: 3,
  retryDelay: 1000,
  // No forzar IP específica - usar detección automática
  forcedServerIP: null as string | null,
};

// Variables de entorno (pueden ser configuradas en .env o expo-constants)
const ENV_CONFIG = {
  SERVER_HOST: Constants.expoConfig?.extra?.serverHost,
  SERVER_PORT: Constants.expoConfig?.extra?.serverPort,
  API_URL: Constants.expoConfig?.extra?.apiUrl,
  FORCE_LOCALHOST: Constants.expoConfig?.extra?.forceLocalhost,
  USE_NGROK: Constants.expoConfig?.extra?.useNgrok || false,
  NGROK_URL: Constants.expoConfig?.extra?.ngrokUrl || null,
  PRODUCTION_API_URL: Constants.expoConfig?.extra?.productionApiUrl || 'https://mecanimovil-api.onrender.com',
  FORCE_PRODUCTION: Constants.expoConfig?.extra?.forceProduction || false,
};

/**
 * Obtiene la IP local del dispositivo/emulador
 */
async function getLocalNetworkInfo() {
  try {
    if (Network && Network.getNetworkStateAsync) {
      const networkState = await Network.getNetworkStateAsync();
      return networkState;
    }
  } catch (error) {
    // Solo loguear en desarrollo
    if (__DEV__) {
      console.warn('⚠️ No se pudo obtener información de red:', error);
    }
  }
  return null;
}

/**
 * Detecta la IP del servidor automáticamente de forma agnóstica
 */
function detectServerIPs(): string[] {
  const possibleIPs: string[] = [];
  
  // 1. Variables de entorno (prioridad máxima)
  if (ENV_CONFIG.SERVER_HOST) {
    possibleIPs.push(ENV_CONFIG.SERVER_HOST);
  }
  
  // 2. Configuración según plataforma
  if (Platform.OS === 'android') {
    // Android físico: IP del host de desarrollo de Expo
    if (Constants.expoConfig?.hostUri) {
      const hostIP = Constants.expoConfig.hostUri.split(':')[0];
      possibleIPs.push(hostIP);
    }
    
    // Android emulador: IP especial para localhost
    possibleIPs.push('10.0.2.2');
    
  } else if (Platform.OS === 'ios') {
    // iOS simulator: puede usar localhost directamente
    possibleIPs.push('localhost', '127.0.0.1');
    
    // iOS físico: IP del host de desarrollo de Expo
    if (Constants.expoConfig?.hostUri) {
      const hostIP = Constants.expoConfig.hostUri.split(':')[0];
      possibleIPs.push(hostIP);
    }
    
  } else if (Platform.OS === 'web') {
    // Web: usar localhost
    possibleIPs.push('localhost', '127.0.0.1');
  }
  
  // 3. IPs específicas de la red actual
  possibleIPs.push('192.168.100.63'); // IP actual del servidor
  possibleIPs.push('192.168.100.235'); // IP anterior detectada
  possibleIPs.push('192.168.100.34'); // IP anterior
  possibleIPs.push('192.168.100.24'); // IP anterior
  possibleIPs.push('192.168.100.1'); // Gateway común
  possibleIPs.push('192.168.100.100'); // IP común
  
  // 4. Fallbacks universales (prioridad baja)
  possibleIPs.push('localhost', '127.0.0.1');
  
  // Eliminar duplicados manteniendo orden
  return [...new Set(possibleIPs)];
}

/**
 * Prueba la conectividad con una URL específica
 */
async function testConnection(url: string, timeout: number = 5000): Promise<boolean> {
  try {
    // Solo loguear en desarrollo
    if (__DEV__) {
      console.log(`🔍 Probando conexión a: ${url}`);
    }
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    // Construir la URL correctamente
    const testUrl = url.endsWith('/api') ? `${url}/hello/` : `${url}/api/hello/`;
    
    // Preparar headers - agregar header para ngrok si es necesario
    const headers: Record<string, string> = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    };
    
    // Si es una URL de ngrok, agregar header para evitar warning
    if (url.includes('ngrok-free.app') || url.includes('ngrok.io')) {
      headers['ngrok-skip-browser-warning'] = 'true';
    }
    
    const response = await fetch(testUrl, {
      method: 'GET',
      signal: controller.signal,
      headers: headers,
    });
    
    clearTimeout(timeoutId);
    
    if (response.ok) {
      if (__DEV__) {
        console.log(`✅ Servidor encontrado en: ${url}`);
      }
      return true;
    } else {
      if (__DEV__) {
        console.log(`❌ Error HTTP ${response.status} en: ${url}`);
      }
      return false;
    }
    
  } catch (error: any) {
    if (__DEV__) {
      if (error.name === 'AbortError') {
        console.log(`⏱️ Timeout en: ${url}`);
      } else {
        console.log(`❌ Error de conexión a ${url}: ${error.message}`);
      }
    }
    return false;
  }
}

/**
 * Descubre automáticamente la URL del servidor
 */
async function discoverServerURL(): Promise<string> {
  // Solo loguear en desarrollo
  if (__DEV__) {
    console.log('🔍 Iniciando auto-discovery del servidor...');
  }
  
  // 1. Si hay URL de ngrok configurada y activada, probarla PRIMERO
  if (ENV_CONFIG.USE_NGROK && ENV_CONFIG.NGROK_URL) {
    const ngrokAPIUrl = `${ENV_CONFIG.NGROK_URL}/api`;
    if (__DEV__) {
      console.log('🌐 Probando URL de ngrok:', ngrokAPIUrl);
    }
    if (await testConnection(ngrokAPIUrl)) {
      if (__DEV__) {
        console.log(`✅ Servidor encontrado en ngrok: ${ngrokAPIUrl}`);
      }
      return ngrokAPIUrl;
    }
    if (__DEV__) {
      console.log('⚠️ ngrok no disponible, probando alternativas locales...');
    }
  }
  
  // 2. Si hay configuración manual (API_URL), probarla
  if (ENV_CONFIG.API_URL) {
    if (__DEV__) {
      console.log('🔧 Probando URL configurada manualmente:', ENV_CONFIG.API_URL);
    }
    if (await testConnection(ENV_CONFIG.API_URL)) {
      return ENV_CONFIG.API_URL;
    }
  }
  
  // 3. Si hay IP forzada, probarla
  if (DEFAULT_CONFIG.forcedServerIP) {
    const forcedURL = `${DEFAULT_CONFIG.protocol}://${DEFAULT_CONFIG.forcedServerIP}:${DEFAULT_CONFIG.port}${DEFAULT_CONFIG.apiPath}`;
    if (__DEV__) {
      console.log('🔧 Probando IP forzada:', forcedURL);
    }
    
    if (await testConnection(forcedURL)) {
      if (__DEV__) {
        console.log(`✅ Servidor encontrado en IP forzada: ${forcedURL}`);
      }
      return forcedURL;
    }
  }
  
  // 4. Detectar IPs locales posibles
  const possibleIPs = detectServerIPs();
  const port = ENV_CONFIG.SERVER_PORT || DEFAULT_CONFIG.port;
  
  if (__DEV__) {
    console.log('🔍 Probando IPs locales candidatas:', possibleIPs);
  }
  
  // 5. Probar cada IP local secuencialmente
  for (const ip of possibleIPs) {
    const url = `${DEFAULT_CONFIG.protocol}://${ip}:${port}${DEFAULT_CONFIG.apiPath}`;
    
    if (await testConnection(url)) {
      if (__DEV__) {
        console.log(`✅ Servidor encontrado localmente en: ${url}`);
      }
      return url;
    }
  }
  
  // 6. Si no se encontró ninguna, intentar ngrok como último recurso si está configurado
  if (ENV_CONFIG.NGROK_URL && !ENV_CONFIG.USE_NGROK) {
    const ngrokAPIUrl = `${ENV_CONFIG.NGROK_URL}/api`;
    if (__DEV__) {
      console.log('🔄 Intentando ngrok como último recurso:', ngrokAPIUrl);
    }
    if (await testConnection(ngrokAPIUrl)) {
      if (__DEV__) {
        console.log(`✅ Servidor encontrado en ngrok (fallback): ${ngrokAPIUrl}`);
      }
      return ngrokAPIUrl;
    }
  }
  
  // 7. Fallback final
  const fallbackURL = `${DEFAULT_CONFIG.protocol}://localhost:${port}${DEFAULT_CONFIG.apiPath}`;
  if (__DEV__) {
    console.log(`⚠️ No se pudo conectar a ningún servidor, usando fallback: ${fallbackURL}`);
  }
  return fallbackURL;
}

/**
 * Configuración principal del servidor
 */
class ServerConfig {
  private static instance: ServerConfig;
  private baseURL: string | null = null;
  private mediaURL: string | null = null;
  private isConnected: boolean = false;
  private lastCheck: number | null = null;
  private checkInterval: number = 30000; // 30 segundos
  private isProduction: boolean = false;

  private constructor() {
    // Detectar si estamos en producción
    // Prioridad: FORCE_PRODUCTION > EXPO_PUBLIC_ENVIRONMENT > NODE_ENV > !__DEV__
    // Si hay una URL de producción configurada y no hay configuración de desarrollo explícita, usar producción
    const hasProductionURL = !!ENV_CONFIG.PRODUCTION_API_URL;
    const hasDevelopmentConfig = ENV_CONFIG.API_URL && !ENV_CONFIG.API_URL.includes('onrender.com');
    
    this.isProduction = ENV_CONFIG.FORCE_PRODUCTION ||
                       process.env.EXPO_PUBLIC_ENVIRONMENT === 'production' ||
                       process.env.NODE_ENV === 'production' ||
                       (hasProductionURL && !hasDevelopmentConfig) ||
                       (!__DEV__ && hasProductionURL);
  }

  static getInstance(): ServerConfig {
    if (!ServerConfig.instance) {
      ServerConfig.instance = new ServerConfig();
    }
    return ServerConfig.instance;
  }
  
  /**
   * Inicializa la configuración del servidor
   */
  async initialize(): Promise<boolean> {
    try {
      // Solo loguear en desarrollo
      if (__DEV__) {
        console.log('🚀 Inicializando configuración del servidor...');
      }
      
      // Si estamos en producción, usar URL de producción directamente
      if (this.isProduction) {
        const prodURL = process.env.EXPO_PUBLIC_PRODUCTION_API_URL || 
                       ENV_CONFIG.PRODUCTION_API_URL || 
                       'https://mecanimovil-api.onrender.com';
        
        // Asegurar que la URL esté correctamente formateada
        let finalURL = prodURL.trim();
        if (!finalURL.startsWith('http://') && !finalURL.startsWith('https://')) {
          finalURL = `https://${finalURL}`;
        }
        
        this.baseURL = finalURL.endsWith('/api') ? finalURL : `${finalURL}/api`;
        this.mediaURL = finalURL.replace('/api', '');
        this.isConnected = true;
        this.lastCheck = Date.now();
        
        // Loguear siempre en producción para debugging (pero solo información básica)
        console.log('🚀 [PRODUCCIÓN] Configuración del servidor inicializada:');
        console.log(`   📡 API URL: ${this.baseURL}`);
        console.log(`   🎨 Media URL: ${this.mediaURL}`);
        console.log(`   📱 Plataforma: ${Platform.OS}`);
        
        return true;
      }
      
      // Para desarrollo, descubrir la URL correcta
      this.baseURL = await discoverServerURL();
      this.mediaURL = this.baseURL.replace('/api', '');
      this.isConnected = true;
      this.lastCheck = Date.now();
      
      // Solo loguear en desarrollo
      if (__DEV__) {
        console.log('✅ Configuración del servidor inicializada:');
        console.log(`   📡 API URL: ${this.baseURL}`);
        console.log(`   🎨 Media URL: ${this.mediaURL}`);
        console.log(`   📱 Plataforma: ${Platform.OS}`);
        console.log(`   🔧 Modo desarrollo: ${__DEV__ ? 'SÍ' : 'NO'}`);
      }
      
      return true;
      
    } catch (error) {
      // Solo loguear errores en desarrollo
      if (__DEV__) {
        console.error('❌ Error inicializando configuración del servidor:', error);
      }
      this.isConnected = false;
      
      // Usar configuración fallback
      const fallbackPort = ENV_CONFIG.SERVER_PORT || DEFAULT_CONFIG.port;
      this.baseURL = `${DEFAULT_CONFIG.protocol}://localhost:${fallbackPort}${DEFAULT_CONFIG.apiPath}`;
      this.mediaURL = `${DEFAULT_CONFIG.protocol}://localhost:${fallbackPort}`;
      
      return false;
    }
  }
  
  /**
   * Obtiene la URL base del API
   */
  async getBaseURL(): Promise<string> {
    if (!this.baseURL) {
      await this.initialize();
    }
    return this.baseURL || `${DEFAULT_CONFIG.protocol}://localhost:${DEFAULT_CONFIG.port}${DEFAULT_CONFIG.apiPath}`;
  }
  
  /**
   * Obtiene la URL base para medios
   */
  async getMediaBaseURL(): Promise<string> {
    if (!this.mediaURL) {
      await this.initialize();
    }
    return this.mediaURL || `${DEFAULT_CONFIG.protocol}://localhost:${DEFAULT_CONFIG.port}`;
  }
  
  /**
   * Verifica si la configuración está inicializada
   */
  isInitialized(): boolean {
    return this.baseURL !== null;
  }
  
  /**
   * Verifica el estado de la conexión
   */
  isServerConnected(): boolean {
    return this.isConnected;
  }
  
  /**
   * Fuerza una nueva verificación de conectividad
   */
  async recheckConnection(): Promise<boolean> {
    if (!this.baseURL) {
      return await this.initialize();
    }
    
    const isConnected = await testConnection(this.baseURL);
    this.isConnected = isConnected;
    this.lastCheck = Date.now();
    
    return isConnected;
  }
  
  /**
   * Obtiene información de configuración para debug
   */
  getDebugInfo() {
    return {
      baseURL: this.baseURL,
      mediaURL: this.mediaURL,
      isConnected: this.isConnected,
      lastCheck: this.lastCheck,
      platform: Platform.OS,
      isDev: __DEV__,
      isProduction: this.isProduction,
      envConfig: ENV_CONFIG
    };
  }

  /**
   * Resetea la configuración (útil para reconexión)
   */
  reset(): void {
    this.baseURL = null;
    this.mediaURL = null;
    this.isConnected = false;
    this.lastCheck = null;
    // Solo loguear en desarrollo
    if (__DEV__) {
      console.log('🔄 Configuración del servidor reseteada');
    }
  }

  /**
   * Verifica si el servidor está configurado
   */
  isServerConfigured(): boolean {
    return this.isConfigured();
  }

  /**
   * Alias para compatibilidad
   */
  isConfigured(): boolean {
    return this.baseURL !== null;
  }
}

export default ServerConfig; 