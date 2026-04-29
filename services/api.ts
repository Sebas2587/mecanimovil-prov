import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import ServerConfig from './serverConfig';

// Configuración dinámica del servidor
const serverConfig = ServerConfig.getInstance();

// Inicializar configuración del servidor
let isInitialized = false;
let initializationPromise: Promise<boolean> | null = null;

/**
 * Inicializa la configuración del servidor si no está inicializada
 */
async function ensureInitialized(): Promise<void> {
  if (isInitialized) {
    return;
  }

  // Si ya hay una inicialización en progreso, esperar a que termine
  if (initializationPromise) {
    await initializationPromise;
    return;
  }

  // Crear nueva promesa de inicialización
  initializationPromise = serverConfig.initialize();

  try {
    await initializationPromise;
    isInitialized = true;
    // Log solo en desarrollo (__DEV__), nunca en producción (APK)
    if (__DEV__) {
      console.log('✅ Configuración del servidor inicializada correctamente');
    }
  } catch (error) {
    // Log solo en desarrollo
    if (__DEV__) {
      console.error('❌ Error en inicialización del servidor (detalles solo en desarrollo):', error);
    }
    // Continuar con configuración fallback
    isInitialized = true;
  } finally {
    initializationPromise = null;
  }
}

// Función para obtener la URL base dinámicamente
const getBaseURL = async (): Promise<string> => {
  await ensureInitialized();
  const baseURL = await serverConfig.getBaseURL();
  // Log solo en desarrollo
  if (__DEV__) {
    console.log(`🌐 Configurando API con URL: ${baseURL}`);
  }
  return baseURL;
};

// Función para obtener la URL base de medios
const getMediaBaseURL = async (): Promise<string> => {
  await ensureInitialized();
  return await serverConfig.getMediaBaseURL();
};

// Crear instancia de axios con configuración dinámica
const createAPIInstance = async () => {
  const baseURL = await getBaseURL();
  console.log(`🌐 Configurando API con URL: ${baseURL}`);

  return axios.create({
    baseURL,
    timeout: 30000, // 30 segundos - aumentado para operaciones pesadas como iniciar servicio
    // NO incluir configuración global que pueda interferir con FormData
  });
};

// Variable para almacenar la instancia de API
let apiInstance: any = null;

// Función para obtener la instancia de API
const getAPI = async () => {
  if (!apiInstance) {
    const baseURL = await getBaseURL();
    // El log ya se hace en getBaseURL, no duplicar aquí - solo si es necesario en desarrollo
    if (__DEV__) {
      console.log(`🌐 Instancia de API creada con URL: ${baseURL}`);
    }

    apiInstance = axios.create({
      baseURL,
      // 30s: listas de órdenes / Render cold start / redes móviles lentas (antes 10s causaba timeouts falsos)
      timeout: 30000,
      // NO incluir configuración global que pueda interferir con FormData
    });

    // Configurar interceptores después de crear la instancia
    setupInterceptors(apiInstance);
  }
  return apiInstance;
};

// Función para configurar interceptores
const setupInterceptors = (api: any) => {
  // Interceptor para agregar token de autenticación - CORREGIDO
  api.interceptors.request.use(
    async (config: any) => {
      // Log solo en desarrollo (__DEV__), nunca en producción (APK)
      if (__DEV__) {
        console.log(`🔍 Request interceptor - URL: ${config.url}, BaseURL: ${config.baseURL}`);
      }

      // Agregar header de ngrok si es necesario (para evitar warning de ngrok-free.app)
      if (config.baseURL && (config.baseURL.includes('ngrok-free.app') || config.baseURL.includes('ngrok.io'))) {
        config.headers['ngrok-skip-browser-warning'] = 'true';
      }

      // No agregar token para endpoints públicos
      const publicEndpoints = [
        '/usuarios/usuarios/', // registro
        '/usuarios/login/', // login (usuarios)
        '/usuarios/login-proveedor/', // login (proveedores)
      ];

      const isPublicEndpoint = publicEndpoints.some(endpoint =>
        config.url?.includes(endpoint)
      );

      // Detectar si es FormData (subida de archivos)
      const isFormData = config.data instanceof FormData;

      // CRÍTICO: Para FormData, NO configurar Content-Type manualmente
      // React Native y axios lo maneja automáticamente
      if (!isFormData) {
        // Solo para requests JSON, asegurar Content-Type
        if (!config.headers['Content-Type']) {
          config.headers['Content-Type'] = 'application/json';
        }
      } else {
        // Para FormData, ELIMINAR cualquier Content-Type manual
        delete config.headers['Content-Type'];
        // Log solo en desarrollo
        if (__DEV__) {
          console.log('📤 Enviando FormData a:', config.url);
          console.log('📋 Headers limpiados para FormData - axios manejará automáticamente');
        }
      }

      // Agregar token de autenticación
      if (!isPublicEndpoint) {
        try {
          const token = await SecureStore.getItemAsync('authToken');
          if (token) {
            config.headers.Authorization = `Token ${token}`;
            // Log solo en desarrollo
            if (__DEV__) {
              console.log('🔑 Token interceptor: Token encontrado (' + token.substring(0, 10) + '...)');
            }
          } else {
            // Log solo en desarrollo
            if (__DEV__) {
              console.log('⚠️ No hay token para endpoint privado:', config.url);
            }
          }
        } catch (error) {
          // Log solo en desarrollo
          if (__DEV__) {
            console.log('❌ Error obteniendo token (detalles solo en desarrollo):', error);
          }
        }
      }

      return config;
    },
    (error: any) => {
      // Log solo en desarrollo - este error se manejará apropiadamente en los callers
      if (__DEV__) {
        console.log('❌ Error en request interceptor (detalles solo en desarrollo):', error);
      }
      return Promise.reject(error);
    }
  );

  // Interceptor para manejar respuestas
  api.interceptors.response.use(
    (response: any) => {
      return response;
    },
    async (error: any) => {
      if (error.response?.status === 401) {
        // Verificar si hay token - si no hay, es normal (no hay sesión)
        try {
          const token = await SecureStore.getItemAsync('authToken');
          if (!token) {
            // No hay token, no es un error crítico - solo log informativo (solo en desarrollo)
            if (__DEV__) {
              console.log('⚠️ Error 401 sin token en:', error.config?.url, '- No hay sesión activa');
            }
            // Retornar error silenciosamente para que el caller lo maneje
            return Promise.reject(error);
          }
        } catch (tokenError) {
          // Error obteniendo token, asumir que no hay sesión
          if (__DEV__) {
            console.log('⚠️ Error 401 sin token en:', error.config?.url, '- No hay sesión activa');
          }
          return Promise.reject(error);
        }
        // Hay token pero expiró - limpiar tokens inmediatamente
        // Log solo en desarrollo
        if (__DEV__) {
          console.log('❌ Error 401 detectado con token existente en:', error.config?.url);
          console.log('🧹 Limpiando tokens expirados...');
        }
        try {
          await SecureStore.deleteItemAsync('authToken');
          await SecureStore.deleteItemAsync('userData');
          if (__DEV__) {
            console.log('✅ Tokens limpiados correctamente');
          }
        } catch (cleanupError) {
          // Log solo en desarrollo
          if (__DEV__) {
            console.error('❌ Error limpiando tokens (detalles solo en desarrollo):', cleanupError);
          }
        }
        // El AuthContext detectará el cambio y limpiará el estado
      } else if (
        error.code === 'ECONNABORTED' ||
        (typeof error.message === 'string' && error.message.toLowerCase().includes('timeout'))
      ) {
        if (__DEV__) {
          console.log('⏱️ Timeout de solicitud HTTP:', error.config?.url, '—', error.message);
        }
      } else if (error.code === 'NETWORK_ERROR' || error.code === 'ERR_NETWORK' || error.message === 'Network Error') {
        if (__DEV__) {
          console.log('🔄 Error de red en:', error.config?.url, '—', error.code || error.message);
        }
        const isProductionUrl = error.config?.baseURL?.includes('onrender.com') ||
          error.config?.baseURL?.includes('render.com');
        if (!isProductionUrl && (error.code === 'ECONNREFUSED' || error.code === 'ERR_NETWORK')) {
          try {
            await serverConfig.recheckConnection();
            apiInstance = null;
            if (__DEV__) {
              console.log('✅ Configuración del servidor actualizada (desarrollo)');
            }
          } catch (recheckError) {
            if (__DEV__) {
              console.error('❌ Error al verificar reconexión:', recheckError);
            }
          }
        }
      } else {
        // Log solo en desarrollo - estos errores se manejarán apropiadamente en los callers
        if (__DEV__) {
          console.log('❌ Error en respuesta (detalles solo en desarrollo):', {
            status: error.response?.status,
            url: error.config?.url,
            message: error.message
          });
        }
      }

      return Promise.reject(error);
    }
  );
};

// Tipos para TypeScript
export interface RegistroUsuario {
  username: string;
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
  telefono?: string;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface PerfilTaller {
  nombre: string;
  rut: string;
  direccion: string;
  descripcion: string;
  telefono?: string;
}

export interface PerfilMecanico {
  nombre: string;
  dni: string;
  experiencia_anos: number;
  descripcion: string;
  telefono?: string;
}

export interface MarcaVehiculo {
  id: number;
  nombre: string;
  logo?: string;
}

export interface EstadoProveedor {
  tiene_perfil: boolean;
  tipo_proveedor?: 'taller' | 'mecanico';
  nombre?: string;
  estado_verificacion: 'pendiente' | 'en_revision' | 'aprobado' | 'rechazado';
  verificado: boolean;
  onboarding_iniciado?: boolean;
  onboarding_completado: boolean;
  fecha_registro?: string;
  fecha_verificacion?: string | null;
  activo: boolean;
  necesita_onboarding?: boolean;
  datos_proveedor?: {
    descripcion?: string;
    telefono?: string;
    direccion?: string;
    calificacion_promedio: number;
    numero_de_calificaciones: number;
  };
}

// Tipos para nuevos servicios
export interface DocumentoOnboarding {
  id?: number;
  tipo_documento: string;
  archivo: string;
  nombre_original?: string;
  fecha_subida?: string;
  verificado?: boolean;
  comentarios_verificacion?: string;
}

export interface TipoDocumento {
  key: string;
  label: string;
}

export interface CategoriaServicio {
  id: number;
  nombre: string;
  descripcion?: string;
}

// Servicios de autenticación
export const authAPI = {
  // Registro de usuario
  registro: async (datos: RegistroUsuario) => {
    try {
      const api = await getAPI();

      // Log solo en desarrollo
      if (__DEV__) {
        console.log('📝 Enviando registro a:', '/usuarios/usuarios/');
        console.log('📝 Datos de registro:', { ...datos, password: '***' });
      }

      const response = await api.post('/usuarios/usuarios/', datos);

      if (__DEV__) {
        console.log('✅ Registro exitoso:', response.status);
      }

      return response.data;
    } catch (error: any) {
      // Log detallado solo en desarrollo
      if (__DEV__) {
        console.error('❌ Error en registro API:', {
          message: error.message,
          status: error.response?.status,
          code: error.code,
          data: error.response?.data
        });
      }

      // Re-lanzar el error para que AuthContext lo maneje
      throw error;
    }
  },

  // Login - Usa fetch() directo para máxima compatibilidad con iOS
  login: async (credenciales: LoginCredentials) => {
    if (__DEV__) {
      console.log('🚀 Iniciando login proveedor:', credenciales.username);
    }

    const baseURL = await getBaseURL();
    const loginUrl = `${baseURL.replace(/\/$/, '')}/usuarios/login-proveedor/`;

    // Diagnóstico de conectividad (solo dev)
    if (__DEV__) {
      console.log('🩺 Diagnóstico de red antes de login...');
      const probes = [
        { label: 'Google HTTPS', url: 'https://www.google.com/generate_204' },
        { label: 'Render GET', url: `${baseURL.replace(/\/$/, '')}/hello/` },
      ];
      for (const probe of probes) {
        const t0 = Date.now();
        try {
          const ctrl = new AbortController();
          const tm = setTimeout(() => ctrl.abort(), 10000);
          const r = await fetch(probe.url, {
            method: 'GET',
            signal: ctrl.signal,
            headers: { Accept: '*/*' },
          });
          clearTimeout(tm);
          console.log(`  ✅ ${probe.label}: HTTP ${r.status} (${Date.now() - t0}ms)`);
        } catch (e: any) {
          console.log(`  ❌ ${probe.label}: ${e.name} ${e.message} (${Date.now() - t0}ms)`);
        }
      }
    }

    const maxAttempts = 3;
    let lastError: any;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      if (attempt > 1) {
        const delay = attempt * 2000;
        if (__DEV__) {
          console.log(`🔁 Reintento login ${attempt}/${maxAttempts} en ${delay}ms...`);
        }
        await new Promise(r => setTimeout(r, delay));
      }

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 60000);

      try {
        if (__DEV__) {
          console.log(`📡 [Intento ${attempt}] POST ${loginUrl}`);
        }

        const response = await fetch(loginUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify(credenciales),
          signal: controller.signal,
        });

        clearTimeout(timer);
        const data = await response.json();

        if (__DEV__) {
          console.log(`📡 [Intento ${attempt}] HTTP ${response.status}`);
        }

        if (!response.ok) {
          const serverMsg =
            data.detail ||
            data.non_field_errors?.[0] ||
            data.error ||
            `Error ${response.status}`;
          const error: any = new Error(serverMsg);
          error.response = { status: response.status, data };
          error.code = `HTTP_${response.status}`;
          throw error;
        }

        if (data.token) {
          await SecureStore.setItemAsync('authToken', data.token);
          await SecureStore.setItemAsync('userData', JSON.stringify(data.user));
          if (__DEV__) {
            console.log('✅ Login exitoso - Credenciales guardadas');
          }
        } else {
          throw new Error('No se recibió un token válido del servidor.');
        }

        return data;
      } catch (error: any) {
        clearTimeout(timer);
        lastError = error;

        if (error.response?.status) {
          if (__DEV__) {
            console.error('❌ Error del servidor:', error.response.status, error.message);
          }
          throw error;
        }

        if (__DEV__) {
          console.warn(`⚠️ [Intento ${attempt}/${maxAttempts}] Red:`, error.name, error.message);
        }

        if (attempt >= maxAttempts) {
          const networkError: any = new Error(
            'Error de conexión. Por favor, verifica tu conexión a internet e intenta nuevamente.'
          );
          networkError.code = 'ERR_NETWORK';
          networkError.originalError = error;
          throw networkError;
        }
      }
    }

    throw lastError;
  },

  // Logout
  logout: async () => {
    // Log solo en desarrollo
    if (__DEV__) {
      console.log('🚪 Cerrando sesión...');
    }

    try {
      await SecureStore.deleteItemAsync('authToken');
      await SecureStore.deleteItemAsync('userData');

      if (__DEV__) {
        console.log('✅ Sesión cerrada correctamente');
      }
    } catch (error) {
      // Log solo en desarrollo
      if (__DEV__) {
        console.error('❌ Error cerrando sesión (detalles solo en desarrollo):', error);
      }
      throw error;
    }
  },

  // Verificar si está autenticado
  isAuthenticated: async () => {
    try {
      const token = await SecureStore.getItemAsync('authToken');
      console.log('🔑 isAuthenticated - Token encontrado:', !!token);
      if (token) {
        console.log('🔑 Token preview:', token.substring(0, 10) + '...');
      }
      return !!token;
    } catch (error) {
      console.error('❌ Error verificando autenticación:', error);
      return false;
    }
  },

  // Obtener datos del usuario del storage
  getUserData: async () => {
    try {
      const userData = await SecureStore.getItemAsync('userData');
      console.log('👤 getUserData - Datos encontrados:', !!userData);

      if (userData) {
        const parsedData = JSON.parse(userData);
        console.log('👤 Usuario:', parsedData.username, 'ID:', parsedData.id);
        return parsedData;
      }

      console.log('👤 No hay datos de usuario en storage');
      return null;
    } catch (error) {
      console.error('❌ Error obteniendo datos del usuario:', error);
      return null;
    }
  },

  // Obtener estado del proveedor
  obtenerEstadoProveedor: async (): Promise<EstadoProveedor> => {
    // Verificar autenticación antes de hacer la llamada
    const token = await SecureStore.getItemAsync('authToken');
    if (!token) {
      console.log('⚠️ [AUTH API] No hay token, no se puede obtener estado del proveedor');
      throw new Error('No autenticado');
    }

    const api = await getAPI();
    const response = await api.get('/usuarios/estado-proveedor/');
    return response.data;
  },

  // Obtener datos completos del usuario (incluyendo foto de perfil)
  obtenerDatosUsuario: async () => {
    // Verificar autenticación antes de hacer la llamada
    const token = await SecureStore.getItemAsync('authToken');
    if (!token) {
      console.log('⚠️ [AUTH API] No hay token, no se pueden obtener datos del usuario');
      throw new Error('No autenticado');
    }

    const api = await getAPI();
    const response = await api.get('/usuarios/profile/');
    return response.data;
  },

  // Inicializar proceso de onboarding - acepta string o objeto
  inicializarOnboarding: async (tipoProveedor: 'taller' | 'mecanico' | any) => {
    const api = await getAPI();
    // Si es un string, convertirlo al formato esperado por el backend
    const datos = typeof tipoProveedor === 'string'
      ? { tipo_proveedor: tipoProveedor }
      : tipoProveedor;
    const response = await api.post('/usuarios/inicializar-onboarding/', datos);
    return response.data;
  },

  // Cancelar proceso de onboarding
  cancelarOnboarding: async () => {
    const api = await getAPI();
    const response = await api.post('/usuarios/cancelar-onboarding/');
    return response.data;
  },

  // Limpiar completamente el almacenamiento (para debugging)
  clearStorage: async () => {
    await SecureStore.deleteItemAsync('authToken');
    await SecureStore.deleteItemAsync('userData');
    console.log('✅ Storage limpiado completamente');
  },

};

// Servicios para talleres
export const tallerAPI = {
  // Crear taller
  crearTaller: async (datos: any) => {
    const api = await getAPI();
    const response = await api.post('/usuarios/talleres/', datos);
    return response.data;
  },

  // Actualizar taller
  actualizarTaller: async (id: number, datos: any) => {
    const api = await getAPI();
    const response = await api.put(`/usuarios/talleres/${id}/`, datos);
    return response.data;
  },

  // Actualizar taller propio
  actualizarTallerPropio: async (datos: any) => {
    const api = await getAPI();
    const response = await api.patch('/usuarios/talleres/actualizar_propio/', datos);
    return response.data;
  },

  // Mantener compatibilidad con nombres antiguos
  actualizarPerfilExistente: async (datos: any) => {
    const api = await getAPI();
    const response = await api.patch('/usuarios/talleres/actualizar_propio/', datos);
    return response.data;
  },

  // Actualizar marcas del taller
  actualizarMarcas: async (marcasIds: number[]) => {
    const api = await getAPI();
    const response = await api.post('/usuarios/actualizar-marcas-taller/', {
      marcas: marcasIds
    });
    return response.data;
  },
};

// Servicios para mecánicos
export const mecanicoAPI = {
  // Crear mecánico
  crearMecanico: async (datos: any) => {
    const api = await getAPI();
    const response = await api.post('/usuarios/mecanicos-domicilio/', datos);
    return response.data;
  },

  // Actualizar mecánico
  actualizarMecanico: async (id: number, datos: any) => {
    const api = await getAPI();
    const response = await api.put(`/usuarios/mecanicos-domicilio/${id}/`, datos);
    return response.data;
  },

  // Actualizar mecánico propio
  actualizarMecanicoPropio: async (datos: any) => {
    const api = await getAPI();
    const response = await api.patch('/usuarios/mecanicos-domicilio/actualizar_propio/', datos);
    return response.data;
  },

  // Mantener compatibilidad con nombres antiguos
  actualizarPerfilExistente: async (datos: any) => {
    const api = await getAPI();
    const response = await api.patch('/usuarios/mecanicos-domicilio/actualizar_propio/', datos);
    return response.data;
  },

  // Actualizar marcas del mecánico
  actualizarMarcas: async (marcasIds: number[]) => {
    const api = await getAPI();
    const response = await api.post('/usuarios/actualizar-marcas-mecanico/', {
      marcas: marcasIds
    });
    return response.data;
  },
};

// Servicios para vehículos
export const vehiculoAPI = {
  // Obtener marcas de vehículos
  obtenerMarcas: async () => {
    const api = await getAPI();
    const response = await api.get('/vehiculos/marcas/');
    const data = response.data;
    return Array.isArray(data) ? data : (data?.results || []);
  },
};

// Función para subir archivo directamente usando fetch (evita interceptores)
const subirArchivoDirecto = async (formData: FormData, token: string) => {
  try {
    const baseURL = await getBaseURL();
    const uploadURL = `${baseURL}/usuarios/documentos-onboarding/`;

    console.log('📤 Subiendo archivo a:', uploadURL);

    const response = await fetch(uploadURL, {
      method: 'POST',
      headers: {
        'Authorization': `Token ${token}`,
        // NO incluir Content-Type - fetch lo maneja automáticamente para FormData
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('✅ Archivo subido exitosamente (fetch):', data);
    return data;

  } catch (error: any) {
    console.error('❌ Error subiendo archivo (fetch):', error);
    throw error;
  }
};

// Servicios para documentos de onboarding
export const documentosAPI = {
  // Obtener tipos de documentos disponibles
  obtenerTiposDocumento: async (): Promise<any> => {
    const api = await getAPI();
    const response = await api.get('/usuarios/documentos-onboarding/tipos_documento/');
    return response.data;
  },

  // Subir documento - VERSIÓN CORREGIDA CON PARÁMETROS CORRECTOS
  subirDocumento: async (archivo: any, tipoDocumento: string) => {
    try {
      console.log('📤 Subiendo documento:', tipoDocumento);
      console.log('📤 Datos del archivo:', { archivo: archivo, tipo: tipoDocumento });

      // Obtener token directamente
      const token = await SecureStore.getItemAsync('authToken');
      if (!token) {
        throw new Error('No hay token de autenticación');
      }

      // Extraer nombre del archivo
      let nombreArchivo = archivo.fileName || archivo.name || 'documento.jpg';

      // Detectar tipo de archivo y ajustar nombre si es necesario
      let tipoArchivo = archivo.type || 'image/jpeg';

      // Validación y corrección de tipos de archivo
      console.log('📋 Detalles del archivo:', {
        name: nombreArchivo,
        type: tipoArchivo,
        uri: archivo.uri
      });

      // VALIDACIÓN CRÍTICA: Verificar que URI existe antes de procesarlo
      if (!archivo.uri) {
        throw new Error('El archivo no tiene URI válida. Intenta seleccionar el archivo nuevamente.');
      }

      // Detectar tipo de archivo basado en URI
      const uriLower = archivo.uri.toLowerCase();

      if (uriLower.includes('.pdf')) {
        tipoArchivo = 'application/pdf';
        if (!nombreArchivo.endsWith('.pdf')) {
          nombreArchivo += '.pdf';
        }
      } else if (uriLower.includes('.png')) {
        tipoArchivo = 'image/png';
        if (!nombreArchivo.endsWith('.png')) {
          nombreArchivo += '.png';
        }
      } else if (uriLower.includes('.jpg') || uriLower.includes('.jpeg')) {
        tipoArchivo = 'image/jpeg';
        if (!nombreArchivo.endsWith('.jpg') && !nombreArchivo.endsWith('.jpeg')) {
          nombreArchivo += '.jpg';
        }
      } else {
        // Por defecto, tratar como imagen JPEG
        tipoArchivo = 'image/jpeg';
        if (!nombreArchivo.includes('.')) {
          nombreArchivo += '.jpg';
        }
      }

      console.log('📋 Tipo detectado:', tipoArchivo, 'Nombre final:', nombreArchivo);

      // Crear FormData específico para React Native
      const formData = new FormData();

      // IMPORTANTE: Primero el tipo de documento
      formData.append('tipo_documento', tipoDocumento);

      // FORMATO ESPECÍFICO PARA REACT NATIVE - CORREGIDO
      formData.append('archivo', {
        uri: archivo.uri,
        type: tipoArchivo,
        name: nombreArchivo
      } as any);

      console.log('📋 FormData construido para:', tipoDocumento);

      // USAR FUNCIÓN DIRECTA SIN INTERCEPTOR
      const response = await subirArchivoDirecto(formData, token);

      console.log('✅ Documento subido exitosamente:', response);
      return response;

    } catch (error: any) {
      console.error('❌ Error subiendo documento:', error);

      // Logging detallado para debugging
      console.log('❌ Error en respuesta:', {
        message: error.message,
        status: error.response?.status,
        url: error.config?.url
      });

      if (error.response) {
        console.error('❌ Error response:', error.response.data);
        console.error('❌ Error status:', error.response.status);
        console.error('❌ Error headers:', error.response.headers);
      } else if (error.request) {
        console.error('❌ Error request (no response):', error.request);
      }

      // Si es error de red, dar mensaje más específico
      if (error.message === 'Network Error') {
        throw new Error(`Error de conexión al subir ${tipoDocumento}. Verifica tu conexión a internet y que el servidor esté funcionando.`);
      }

      // Si es error 400, mostrar detalles del servidor
      if (error.response?.status === 400) {
        const detalles = error.response.data?.details || error.response.data?.error || 'Error de validación';
        throw new Error(`Error validando ${tipoDocumento}: ${JSON.stringify(detalles)}`);
      }

      throw error;
    }
  },

  // Obtener mis documentos
  obtenerMisDocumentos: async (): Promise<DocumentoOnboarding[]> => {
    const api = await getAPI();
    const response = await api.get('/usuarios/documentos-onboarding/mis_documentos/');
    return response.data;
  },

  // Eliminar documento
  eliminarDocumento: async (id: number) => {
    const api = await getAPI();
    const response = await api.delete(`/usuarios/documentos-onboarding/${id}/`);
    return response.data;
  },
};

// Servicios para especialidades
export const especialidadesAPI = {
  // Obtener categorías de servicios
  obtenerCategorias: async (): Promise<CategoriaServicio[]> => {
    try {
      const api = await getAPI();
      console.log('📋 Obteniendo categorías de servicios...');
      // Usar el endpoint de categorías principales que sabemos que funciona
      const response = await api.get('/servicios/categorias/principales/');
      console.log('✅ Categorías obtenidas:', response.data?.length || (response.data?.results?.length || 0));
      const data = response.data;
      return Array.isArray(data) ? data : (data?.results || []);
    } catch (error) {
      console.error('❌ Error obteniendo categorías:', error);
      // Retornar categorías de ejemplo en caso de error
      return [
        { id: 1, nombre: 'Mecánica General', descripcion: 'Servicios básicos de mecánica automotriz' },
        { id: 2, nombre: 'Electricidad Automotriz', descripcion: 'Sistemas eléctricos del vehículo' },
        { id: 3, nombre: 'Frenos', descripcion: 'Mantenimiento y reparación de sistemas de frenos' },
        { id: 4, nombre: 'Suspensión', descripcion: 'Reparación de sistemas de suspensión' },
        { id: 5, nombre: 'Motor', descripcion: 'Reparación y mantenimiento de motores' },
        { id: 6, nombre: 'Transmisión', descripcion: 'Caja de cambios y transmisión' },
        { id: 7, nombre: 'Aire Acondicionado', descripcion: 'Sistema de climatización' },
        { id: 8, nombre: 'Diagnóstico por Computadora', descripcion: 'Diagnóstico con scanner automotriz' },
      ];
    }
  },

  // Actualizar especialidades del proveedor
  actualizarEspecialidades: async (especialidadesIds: number[]) => {
    const api = await getAPI();
    const response = await api.post('/usuarios/actualizar-especialidades/', {
      especialidades: especialidadesIds
    });
    return response.data;
  },
};

// Servicios adicionales para proveedores verificados  
export const proveedorVerificadoAPI = {
  // Obtener datos completos del proveedor (MEJORADO para ser más robusto)
  obtenerDatosCompletos: async () => {
    try {
      console.log('📊 Obteniendo datos completos del proveedor...');

      // Validación inicial
      const api = await getAPI();
      if (!api) {
        throw new Error('No se pudo obtener la instancia de la API');
      }

      // Intentar obtener estado del proveedor que incluye más información
      const estadoResponse = await api.get('/usuarios/estado-proveedor/');

      if (!estadoResponse || !estadoResponse.data) {
        throw new Error('Respuesta inválida del servidor');
      }

      const estadoData = estadoResponse.data;
      console.log('✅ Estado del proveedor obtenido:', estadoData);

      // Validar que el estado del proveedor tenga la información mínima necesaria
      if (!estadoData.tipo_proveedor) {
        console.warn('⚠️ Estado del proveedor sin tipo_proveedor definido');
        return { data: estadoData, tipo: 'unknown' };
      }

      if (estadoData.tipo_proveedor === 'taller') {
        // Para talleres, obtener datos adicionales del ViewSet
        try {
          console.log('🏗️ Obteniendo datos adicionales del taller...');
          const talleresResponse = await api.get('/usuarios/talleres/');

          if (!talleresResponse || !talleresResponse.data) {
            console.warn('⚠️ Respuesta inválida de talleres');
            return { data: estadoData, tipo: 'taller' };
          }

          const talleres = Array.isArray(talleresResponse.data) ? talleresResponse.data : talleresResponse.data.results || [];
          console.log('🏗️ Talleres obtenidos:', talleres.length);

          // Buscar el taller del usuario actual con múltiples criterios
          let miTaller = null;

          // Criterio 1: Por usuario ID
          if (estadoData.id && typeof estadoData.id === 'number') {
            miTaller = talleres.find((t: any) => t.usuario?.id === estadoData.id);
            if (miTaller) {
              console.log('✅ Taller encontrado por usuario ID:', miTaller.nombre);
            }
          }

          // Criterio 2: Por nombre exacto
          if (!miTaller && estadoData.nombre && typeof estadoData.nombre === 'string') {
            miTaller = talleres.find((t: any) => t.nombre === estadoData.nombre);
            if (miTaller) {
              console.log('✅ Taller encontrado por nombre exacto:', miTaller.nombre);
            }
          }

          // Criterio 3: Por username si existe
          if (!miTaller && estadoData.usuario?.username && typeof estadoData.usuario.username === 'string') {
            miTaller = talleres.find((t: any) => t.usuario?.username === estadoData.usuario.username);
            if (miTaller) {
              console.log('✅ Taller encontrado por username:', miTaller.nombre);
            }
          }

          // Criterio 4: Si solo hay un taller, asumir que es el correcto
          if (!miTaller && talleres.length === 1) {
            miTaller = talleres[0];
            console.log('✅ Taller encontrado (único taller disponible):', miTaller.nombre);
          }

          if (miTaller) {
            console.log('🔧 Especialidades del taller:', miTaller.especialidades?.length || 0);
            console.log('🚗 Marcas atendidas del taller:', miTaller.marcas_atendidas?.length || 0);

            return {
              data: {
                ...estadoData,
                especialidades: Array.isArray(miTaller.especialidades) ? miTaller.especialidades : [],
                marcas_atendidas: Array.isArray(miTaller.marcas_atendidas) ? miTaller.marcas_atendidas : [],
                // Incluir nombres también para facilitar el manejo en el frontend
                especialidades_nombres: Array.isArray(miTaller.especialidades_nombres) ? miTaller.especialidades_nombres : [],
                marcas_atendidas_nombres: Array.isArray(miTaller.marcas_atendidas_nombres) ? miTaller.marcas_atendidas_nombres : [],
              },
              tipo: 'taller'
            };
          } else {
            console.warn('⚠️ No se encontró el taller específico del usuario');
            return { data: estadoData, tipo: 'taller' };
          }
        } catch (tallerError) {
          console.warn('❌ Error obteniendo datos adicionales del taller:', tallerError);
          return { data: estadoData, tipo: 'taller' };
        }
      } else if (estadoData.tipo_proveedor === 'mecanico') {
        // Para mecánicos, obtener datos adicionales del ViewSet
        try {
          console.log('🔧 Obteniendo datos adicionales del mecánico...');
          const mecanicosResponse = await api.get('/usuarios/mecanicos-domicilio/');

          if (!mecanicosResponse || !mecanicosResponse.data) {
            console.warn('⚠️ Respuesta inválida de mecánicos');
            return { data: estadoData, tipo: 'mecanico' };
          }

          const mecanicos = Array.isArray(mecanicosResponse.data) ? mecanicosResponse.data : mecanicosResponse.data.results || [];
          console.log('🔧 Mecánicos obtenidos:', mecanicos.length);

          // Buscar el mecánico del usuario actual con múltiples criterios
          let miMecanico = null;

          // Criterio 1: Por usuario ID
          if (estadoData.id && typeof estadoData.id === 'number') {
            miMecanico = mecanicos.find((m: any) => m.usuario?.id === estadoData.id);
            if (miMecanico) {
              console.log('✅ Mecánico encontrado por usuario ID:', miMecanico.nombre);
            }
          }

          // Criterio 2: Por nombre exacto
          if (!miMecanico && estadoData.nombre && typeof estadoData.nombre === 'string') {
            miMecanico = mecanicos.find((m: any) => m.nombre === estadoData.nombre);
            if (miMecanico) {
              console.log('✅ Mecánico encontrado por nombre exacto:', miMecanico.nombre);
            }
          }

          // Criterio 3: Por username si existe
          if (!miMecanico && estadoData.usuario?.username && typeof estadoData.usuario.username === 'string') {
            miMecanico = mecanicos.find((m: any) => m.usuario?.username === estadoData.usuario.username);
            if (miMecanico) {
              console.log('✅ Mecánico encontrado por username:', miMecanico.nombre);
            }
          }

          // Criterio 4: Si solo hay un mecánico, asumir que es el correcto
          if (!miMecanico && mecanicos.length === 1) {
            miMecanico = mecanicos[0];
            console.log('✅ Mecánico encontrado (único mecánico disponible):', miMecanico.nombre);
          }

          if (miMecanico) {
            console.log('🔧 Especialidades del mecánico:', miMecanico.especialidades?.length || 0);
            console.log('🚗 Marcas atendidas del mecánico:', miMecanico.marcas_atendidas?.length || 0);

            return {
              data: {
                ...estadoData,
                especialidades: Array.isArray(miMecanico.especialidades) ? miMecanico.especialidades : [],
                marcas_atendidas: Array.isArray(miMecanico.marcas_atendidas) ? miMecanico.marcas_atendidas : [],
                // Incluir nombres también para facilitar el manejo en el frontend
                especialidades_nombres: Array.isArray(miMecanico.especialidades_nombres) ? miMecanico.especialidades_nombres : [],
                marcas_atendidas_nombres: Array.isArray(miMecanico.marcas_atendidas_nombres) ? miMecanico.marcas_atendidas_nombres : [],
              },
              tipo: 'mecanico'
            };
          } else {
            console.warn('⚠️ No se encontró el mecánico específico del usuario');
            return { data: estadoData, tipo: 'mecanico' };
          }
        } catch (mecanicoError) {
          console.warn('❌ Error obteniendo datos adicionales del mecánico:', mecanicoError);
          return { data: estadoData, tipo: 'mecanico' };
        }
      }

      // Si no es taller ni mecánico, retornar solo el estado
      console.log('ℹ️ Proveedor no es taller ni mecánico, retornando solo estado');
      return { data: estadoData, tipo: 'unknown' };

    } catch (error) {
      console.error('❌ Error obteniendo datos del proveedor:', error);

      // Retornar estructura por defecto en caso de error crítico
      return {
        data: {
          nombre: 'Proveedor',
          tipo_proveedor: 'unknown',
          especialidades: [],
          marcas_atendidas: [],
          especialidades_nombres: [],
          marcas_atendidas_nombres: [],
        },
        tipo: 'unknown'
      };
    }
  },

  // Actualizar marcas según el tipo de proveedor
  actualizarMarcas: async (marcasIds: number[], tipoProveedor: string) => {
    const api = await getAPI();
    if (tipoProveedor === 'taller') {
      const response = await api.post('/usuarios/actualizar-marcas-taller/', {
        marcas: marcasIds
      });
      return response.data;
    } else {
      // CORREGIDO: Usar el endpoint correcto para mecánicos
      const response = await api.post('/usuarios/actualizar-marcas-mecanico/', {
        marcas: marcasIds
      });
      return response.data;
    }
  },
};

// Servicios para onboarding
export const onboardingAPI = {
  // Inicializar onboarding
  inicializar: async (datos: any) => {
    const api = await getAPI();
    const response = await api.post('/usuarios/inicializar-onboarding/', datos);
    return response.data;
  },

  // Mantener compatibilidad con nombres antiguos - acepta tipo como string o objeto
  inicializarOnboarding: async (tipoProveedor: 'taller' | 'mecanico' | any) => {
    const api = await getAPI();
    // Si es un string, convertirlo al formato esperado por el backend
    const datos = typeof tipoProveedor === 'string'
      ? { tipo_proveedor: tipoProveedor }
      : tipoProveedor;
    const response = await api.post('/usuarios/inicializar-onboarding/', datos);
    return response.data;
  },

  // Completar onboarding con archivos
  completarConArchivos: async (archivos: any[]) => {
    const api = await getAPI();
    const response = await api.post('/usuarios/completar-onboarding/');
    return response.data;
  },

  // Completar onboarding (versión simplificada)
  completar: async () => {
    const api = await getAPI();
    const response = await api.post('/usuarios/completar-onboarding/');
    return response.data;
  },

  // Mantener compatibilidad con nombres antiguos
  completarOnboarding: async () => {
    const api = await getAPI();
    const response = await api.post('/usuarios/completar-onboarding/');
    return response.data;
  },
};

// Nuevos tipos para funcionalidades adicionales
export interface HorarioProveedor {
  id?: number;
  dia_semana: number;
  dia_nombre?: string;
  activo: boolean;
  hora_inicio: string;
  hora_fin: string;
  duracion_slot: number;
  tiempo_descanso: number;
  proveedor_nombre?: string;
  tipo_proveedor?: string;
}

export interface ConfiguracionSemanal {
  hora_inicio_global: string;
  hora_fin_global: string;
  duracion_slot_global: number;
  tiempo_descanso_global: number;
  dias_habilitados: number[];
  configuracion_por_dia?: { [key: string]: any };
  eliminar_existente?: boolean;
}

export interface ModeloVehiculo {
  id: number;
  nombre: string;
  marca: number;
}

export interface ActualizarPerfilRequest {
  nombre?: string;
  telefono?: string;
  descripcion?: string;
  direccion?: string;
  rut?: string;
  dni?: string;
  experiencia_anos?: number;
}

// Servicios para horarios de proveedor
export const horariosAPI = {
  obtenerMisHorarios: async (): Promise<HorarioProveedor[]> => {
    const api = await getAPI();
    const response = await api.get('/usuarios/horarios-proveedor/mis_horarios/');
    return response.data;
  },

  configurarSemanaCompleta: async (configuracion: ConfiguracionSemanal) => {
    const api = await getAPI();
    // Función helper para convertir hora a formato HH:MM (eliminar segundos)
    const formatearHora = (hora: string): string => {
      if (!hora) return hora;
      // Si viene con segundos (HH:MM:SS), extraer solo HH:MM
      if (hora.includes(':') && hora.split(':').length === 3) {
        return hora.substring(0, 5); // Tomar solo los primeros 5 caracteres HH:MM
      }
      return hora;
    };

    // Convertir el formato de datos al que espera el backend
    const payload: any = {
      hora_inicio_global: formatearHora(configuracion.hora_inicio_global),
      hora_fin_global: formatearHora(configuracion.hora_fin_global),
      duracion_slot_global: configuracion.duracion_slot_global,
      tiempo_descanso_global: configuracion.tiempo_descanso_global,
      dias_habilitados: configuracion.dias_habilitados,
      eliminar_existente: configuracion.eliminar_existente || true,
    };

    // Agregar configuración por día si existe (con formato de hora corregido)
    if (configuracion.configuracion_por_dia) {
      payload.configuracion_por_dia = {};
      Object.keys(configuracion.configuracion_por_dia).forEach(dia => {
        const config = configuracion.configuracion_por_dia![dia];
        payload.configuracion_por_dia[dia] = {
          ...config,
          hora_inicio: formatearHora(config.hora_inicio),
          hora_fin: formatearHora(config.hora_fin),
        };
      });
    }

    console.log('📤 Enviando configuración de horarios (formato corregido):', payload);

    // URL CORREGIDA: debe ser 'configurar_semana_completa' no 'configurar-semana'
    const response = await api.post('/usuarios/horarios-proveedor/configurar_semana_completa/', payload);
    return response.data;
  },

  configuracionRapida: async (preset: string) => {
    const api = await getAPI();
    const response = await api.post('/usuarios/horarios-proveedor/configuracion_rapida/', {
      preset: preset
    });
    return response.data;
  },

  obtenerPresets: async () => {
    const api = await getAPI();
    const response = await api.get('/usuarios/horarios-proveedor/presets/');
    return response.data;
  },
};

// Servicios de foto de perfil y documentos (CORREGIDOS)
export const perfilAPI = {
  // Actualizar foto de perfil (CORREGIDO PARA REACT NATIVE - usando fetch nativo)
  actualizarFotoPerfil: async (archivo: any) => {
    try {
      // Log solo en desarrollo
      if (__DEV__) {
        console.log('📷 Iniciando subida de foto de perfil...');
        console.log('📋 Datos del archivo:', {
          uri: archivo.uri,
          type: archivo.type,
          name: archivo.name,
          size: archivo.fileSize
        });
      }

      // Obtener token y baseURL
      const token = await SecureStore.getItemAsync('authToken');
      if (!token) {
        throw new Error('No hay token de autenticación disponible. Por favor, inicia sesión nuevamente.');
      }

      const baseURL = await getBaseURL();

      // Validar que la baseURL sea válida
      if (!baseURL || typeof baseURL !== 'string') {
        throw new Error('Error de configuración del servidor. Por favor, reinicia la aplicación.');
      }

      // Construir URL completa del endpoint
      const uploadURL = `${baseURL}/usuarios/actualizar-foto-perfil/`;

      // Validar que la URI sea válida
      if (!archivo.uri || typeof archivo.uri !== 'string') {
        throw new Error('La imagen seleccionada no tiene una URI válida. Por favor, intenta seleccionar otra imagen.');
      }

      // expo-image-picker ya proporciona URIs correctamente formateadas
      // No necesitamos modificar la URI - dejarla como viene de ImagePicker
      const imageUri = archivo.uri;

      // Validar y normalizar el tipo de archivo
      // expo-image-picker proporciona mimeType, pero puede venir como type en algunos casos
      const rawType = archivo.type || archivo.mimeType || 'image/jpeg';
      let fileType = rawType.toLowerCase().trim();

      // Normalizar 'image/jpg' a 'image/jpeg' para consistencia
      if (fileType === 'image/jpg') {
        fileType = 'image/jpeg';
      }

      // Validar que el tipo de archivo sea una imagen
      const validImageTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!validImageTypes.includes(fileType)) {
        throw new Error('El archivo seleccionado no es una imagen válida. Por favor, selecciona una imagen en formato JPG, PNG o WebP.');
      }

      // Validar tamaño del archivo (máximo 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB en bytes
      if (archivo.fileSize && archivo.fileSize > maxSize) {
        throw new Error('La imagen es demasiado grande. Por favor, selecciona una imagen de menos de 10MB.');
      }

      // Crear FormData con formato correcto para React Native
      // IMPORTANTE: En React Native, el objeto debe tener uri, type y name
      // El formato es el mismo para iOS y Android cuando se usa fetch nativo
      const formData = new FormData();

      // Asegurar que el nombre del archivo tenga una extensión válida
      let fileName = archivo.name || `foto_perfil_${Date.now()}.jpg`;
      if (!fileName.includes('.')) {
        // Si no tiene extensión, agregarla según el tipo
        const extension = fileType.includes('png') ? '.png' :
          fileType.includes('webp') ? '.webp' : '.jpg';
        fileName = `${fileName}${extension}`;
      }

      formData.append('foto_perfil', {
        uri: imageUri,
        type: fileType, // Ya validado arriba
        name: fileName
      } as any);

      // Log solo en desarrollo
      if (__DEV__) {
        console.log('📤 FormData creado, enviando petición a:', uploadURL);
        console.log('📋 Headers:', {
          'Authorization': `Token ${token.substring(0, 10)}...`,
          'Content-Type': 'multipart/form-data (automático)'
        });
      }

      // Usar fetch nativo en lugar de axios para mejor compatibilidad con FormData
      // Esto evita problemas de red en React Native y funciona mejor con archivos
      // Crear un AbortController para manejar timeout manualmente
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 segundos de timeout

      let response: Response;
      try {
        response = await fetch(uploadURL, {
          method: 'POST',
          headers: {
            'Authorization': `Token ${token}`,
            // CRÍTICO: NO incluir Content-Type - fetch lo maneja automáticamente para FormData
            // Incluirlo manualmente causa errores de red en React Native
          },
          body: formData,
          signal: controller.signal, // Para poder cancelar la petición si hay timeout
        });

        // Limpiar el timeout si la petición se completa antes del timeout
        clearTimeout(timeoutId);
      } catch (fetchError: any) {
        // Limpiar el timeout en caso de error
        clearTimeout(timeoutId);

        // Si fue abortado por timeout
        if (fetchError.name === 'AbortError' || controller.signal.aborted) {
          throw new Error('La subida de la foto está tardando demasiado. Por favor, verifica tu conexión a internet e intenta nuevamente.');
        }

        // Manejar errores de red específicamente
        if (fetchError.message?.includes('fetch') || fetchError.message?.includes('network') ||
          fetchError.message?.includes('Network') || fetchError.code === 'NETWORK_ERROR') {
          throw new Error('Error de conexión. Por favor, verifica tu conexión a internet e intenta nuevamente.');
        }

        // Relanzar otros errores con mensaje más descriptivo
        throw new Error(`Error de red al subir la foto: ${fetchError.message || 'Error desconocido'}`);
      }

      // Verificar si la respuesta es exitosa
      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (parseError) {
          errorData = { error: `HTTP error! status: ${response.status}` };
        }

        // Log solo en desarrollo
        if (__DEV__) {
          console.error('❌ Error en respuesta HTTP:', {
            status: response.status,
            statusText: response.statusText,
            errorData
          });
        }

        // Proporcionar mensaje de error más específico según el status
        if (response.status === 400) {
          const errorMsg = errorData?.error || errorData?.detail || errorData?.non_field_errors?.[0] || 'Archivo no válido';
          throw new Error(`Error en el archivo: ${errorMsg}`);
        } else if (response.status === 401) {
          throw new Error('No autorizado. Por favor, inicia sesión nuevamente.');
        } else if (response.status === 413) {
          throw new Error('El archivo es demasiado grande. Tamaño máximo: 10MB');
        } else if (response.status >= 500) {
          throw new Error('Error del servidor. Por favor, intenta más tarde.');
        } else {
          const errorMsg = errorData?.error || errorData?.detail || errorData?.message || `Error HTTP ${response.status}`;
          throw new Error(`Error al subir la foto: ${errorMsg}`);
        }
      }

      // Parsear respuesta JSON exitosa
      const data = await response.json();
      // Log solo en desarrollo
      if (__DEV__) {
        console.log('✅ Foto de perfil actualizada exitosamente:', data);
      }
      return data;
    } catch (error: any) {
      // Log detallado solo en desarrollo para debugging
      if (__DEV__) {
        console.error('❌ Error subiendo foto de perfil (detalles solo en desarrollo):', {
          message: error.message,
          code: error.code,
          name: error.name,
          stack: error.stack?.substring(0, 500) // Limitar stack trace
        });
      }

      // Si el error ya tiene un mensaje específico y amigable (de las validaciones anteriores o de la respuesta HTTP)
      // usarlo directamente sin modificarlo
      if (error.message &&
        (error.message.includes('La imagen') ||
          error.message.includes('El archivo') ||
          error.message.includes('No autorizado') ||
          error.message.includes('Error del servidor') ||
          error.message.includes('Error en el archivo') ||
          error.message.includes('Error de conexión') ||
          error.message.includes('La subida') ||
          error.message.includes('No hay token'))) {
        throw error; // Ya tiene un mensaje amigable, solo relanzarlo
      }

      // Manejar errores de red específicamente (capturar todos los casos posibles)
      if (error.message?.includes('network') ||
        error.message?.includes('Network') ||
        error.message?.includes('fetch failed') ||
        error.message?.includes('Failed to fetch') ||
        error.code === 'NETWORK_ERROR' ||
        error.code === 'ECONNREFUSED' ||
        error.code === 'ETIMEDOUT' ||
        error.code === 'ENOTFOUND' ||
        error.name === 'NetworkError' ||
        error.name === 'TypeError') {
        throw new Error('Error de conexión. Por favor, verifica tu conexión a internet e intenta nuevamente.');
      }

      // Si el error tiene un mensaje genérico pero no específico, mejorarlo
      if (error.message) {
        // Si el mensaje contiene información técnica, proporcionar mensaje amigable
        if (error.message.includes('network error') ||
          error.message.includes('Network request failed') ||
          error.message.includes('TypeError: Network request failed')) {
          throw new Error('Error de conexión. Por favor, verifica tu conexión a internet e intenta nuevamente.');
        }

        // Si es un error con código HTTP, ya fue manejado arriba
        // Para otros errores, proporcionar mensaje genérico pero útil
        throw new Error(`Error al subir la foto: ${error.message}`);
      }

      // Mensaje genérico como último recurso
      throw new Error('Error al subir la foto. Por favor, verifica tu conexión a internet e intenta nuevamente.');
    }
  },

  // Actualizar documento existente (CORREGIDO PARA REACT NATIVE)
  actualizarDocumento: async (documentoId: number, archivo: any) => {
    try {
      console.log('📄 Iniciando actualización de documento...');
      console.log('📋 Datos del archivo:', {
        uri: archivo.uri,
        type: archivo.type,
        name: archivo.name,
        size: archivo.fileSize
      });

      const formData = new FormData();
      formData.append('archivo', {
        uri: archivo.uri,
        type: archivo.type,
        name: archivo.name
      } as any);

      console.log('📤 FormData creado, enviando petición...');

      // CORREGIDO: NO incluir Content-Type manual - React Native lo maneja automáticamente
      const api = await getAPI();
      const response = await api.patch(`/usuarios/documentos-onboarding/${documentoId}/`, formData, {
        timeout: 60000, // 60 segundos para subida de archivos
        // React Native configura el Content-Type automáticamente
      });

      console.log('✅ Documento actualizado exitosamente:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Error actualizando documento:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      throw error;
    }
  },

  // Actualizar datos del proveedor (CORREGIDO para usar endpoints correctos)
  actualizarDatosProveedor: async (datos: any) => {
    try {
      const api = await getAPI();

      // Primero obtener el estado del proveedor para saber el tipo
      const estadoResponse = await api.get('/usuarios/estado-proveedor/');
      const estadoData = estadoResponse.data;

      console.log('📊 Actualizando datos del proveedor:', estadoData.tipo_proveedor);

      let response;

      if (estadoData.tipo_proveedor === 'taller') {
        // Para talleres usar el endpoint específico
        response = await api.patch('/usuarios/talleres/actualizar_propio/', datos);
      } else if (estadoData.tipo_proveedor === 'mecanico') {
        // Para mecánicos usar el endpoint específico
        response = await api.patch('/usuarios/mecanicos-domicilio/actualizar_propio/', datos);
      } else {
        throw new Error(`Tipo de proveedor no soportado: ${estadoData.tipo_proveedor}`);
      }

      console.log('✅ Datos del proveedor actualizados:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error actualizando datos del proveedor:', error);
      throw error;
    }
  },
};

// Servicios para modelos de vehículos
export const modelosAPI = {
  // Obtener modelos por marca
  obtenerModelosPorMarca: async (marcaId: number) => {
    const api = await getAPI();
    const response = await api.get(`/vehiculos/modelos/?marca=${marcaId}`);
    const data = response.data;
    return Array.isArray(data) ? data : (data?.results || []);
  },

  // Obtener todos los modelos
  obtenerTodosLosModelos: async () => {
    const api = await getAPI();
    const response = await api.get('/vehiculos/modelos/');
    const data = response.data;
    return Array.isArray(data) ? data : (data?.results || []);
  },
};

// Función helper para realizar peticiones HTTP
const makeRequest = async (method: string, url: string, data?: any) => {
  const api = await getAPI();
  switch (method.toLowerCase()) {
    case 'get':
      return await api.get(url);
    case 'post':
      return await api.post(url, data);
    case 'put':
      return await api.put(url, data);
    case 'patch':
      return await api.patch(url, data);
    case 'delete':
      return await api.delete(url);
    default:
      throw new Error(`Método HTTP no soportado: ${method}`);
  }
};

// Función para realizar peticiones GET
const get = async (url: string) => {
  return await makeRequest('get', url);
};

// Función para realizar peticiones POST
const post = async (url: string, data?: any) => {
  return await makeRequest('post', url, data);
};

// Función para realizar peticiones PUT
const put = async (url: string, data?: any) => {
  return await makeRequest('put', url, data);
};

// Función para realizar peticiones PATCH
const patch = async (url: string, data?: any) => {
  return await makeRequest('patch', url, data);
};

// Función para realizar peticiones DELETE
const del = async (url: string) => {
  return await makeRequest('delete', url);
};

// Crear un objeto API con las funciones necesarias para mantener compatibilidad
const api = {
  get,
  post,
  put,
  patch,
  delete: del
};

// ========================================
// API de Servicios para Proveedores
// ========================================

export const serviciosAPI = {
  // Mis servicios
  obtenerMisServicios: () => get('/servicios/proveedor/mis-servicios/'),
  obtenerEstadisticas: () => get('/servicios/proveedor/mis-servicios/resumen_estadisticas/'),
  crearServicio: (datos: any) => post('/servicios/proveedor/mis-servicios/', datos),
  actualizarServicio: (id: number, datos: any) => patch(`/servicios/proveedor/mis-servicios/${id}/`, datos),
  cambiarDisponibilidad: (id: number, disponible: boolean) =>
    post(`/servicios/proveedor/mis-servicios/${id}/cambiar_disponibilidad/`, { disponible }),
  eliminarServicio: (id: number) => del(`/servicios/proveedor/mis-servicios/${id}/`),
  calcularPreview: (costoManoObra: number, costoRepuestos: number = 0) =>
    get(`/servicios/proveedor/mis-servicios/calcular_preview/?costo_mano_obra=${costoManoObra}&costo_repuestos=${costoRepuestos}`),

  // Catálogos específicos para proveedores
  obtenerMisMarcas: () => get('/servicios/proveedor/mis-servicios/mis_marcas/'),
  obtenerServiciosPorMarca: (marcaId: number) =>
    get(`/servicios/proveedor/mis-servicios/servicios_por_marca/?marca_id=${marcaId}`),

  // Catálogos generales (mantener para compatibilidad)
  obtenerMarcas: () => get('/vehiculos/marcas/'),
  obtenerServicios: (marcaId?: number) => {
    const params = marcaId ? `?marca=${marcaId}` : '';
    return get(`/servicios/servicios/${params}`);
  },
  obtenerRepuestosPorServicio: (servicioId: number) =>
    get(`/servicios/repuestos/por_servicio/?servicio=${servicioId}`),
  obtenerRepuestos: (categoria?: string, busqueda?: string) => {
    let url = '/servicios/repuestos/';
    const params = new URLSearchParams();
    if (categoria) params.append('categoria', categoria);
    if (busqueda) params.append('search', busqueda);
    if (params.toString()) url += `?${params.toString()}`;
    return get(url);
  },
  obtenerRepuestosPorCategoria: (categoria: string) =>
    get(`/servicios/repuestos/por_categoria/?categoria=${categoria}`),
};

// ========================================
// API de Fotos de Servicios
// ========================================

export const fotosServiciosAPI = {
  // Subir una foto de servicio (usando fetch nativo para mejor compatibilidad)
  subirFoto: async (ofertaId: number, archivo: any, descripcion?: string) => {
    try {
      console.log('📸 Subiendo foto de servicio para oferta:', ofertaId);

      // Obtener token y baseURL
      const token = await SecureStore.getItemAsync('authToken');
      if (!token) {
        throw new Error('No hay token de autenticación disponible');
      }

      const baseURL = await getBaseURL();
      const uploadURL = `${baseURL}/servicios/fotos-servicios/`;

      const formData = new FormData();
      formData.append('oferta_servicio', ofertaId.toString());
      formData.append('imagen', {
        uri: archivo.uri,
        type: archivo.type || 'image/jpeg',
        name: archivo.name || `foto_servicio_${Date.now()}.jpg`
      } as any);

      if (descripcion) {
        formData.append('descripcion', descripcion);
      }

      console.log('📤 Enviando FormData a:', uploadURL);

      // Usar fetch nativo en lugar de axios para mejor compatibilidad con FormData
      const response = await fetch(uploadURL, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${token}`,
          // NO incluir Content-Type - fetch lo maneja automáticamente para FormData
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }));
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorData.error || 'Error al subir foto'}`);
      }

      const data = await response.json();
      console.log('✅ Foto de servicio subida exitosamente:', data);
      return data;
    } catch (error: any) {
      console.error('❌ Error subiendo foto de servicio:', error);
      throw error;
    }
  },

  // Subir múltiples fotos de servicio (usando fetch nativo para mejor compatibilidad)
  subirMultiplesFotos: async (ofertaId: number, archivos: any[]) => {
    try {
      console.log('📸 Subiendo múltiples fotos de servicio para oferta:', ofertaId);

      // Obtener token y baseURL
      const token = await SecureStore.getItemAsync('authToken');
      if (!token) {
        throw new Error('No hay token de autenticación disponible');
      }

      const baseURL = await getBaseURL();
      const uploadURL = `${baseURL}/servicios/fotos-servicios/subir_multiple/`;

      // Crear FormData
      const formData = new FormData();
      formData.append('oferta_servicio', ofertaId.toString());

      archivos.forEach((archivo, index) => {
        formData.append('fotos', {
          uri: archivo.uri,
          type: archivo.type || 'image/jpeg',
          name: archivo.name || `foto_servicio_${index + 1}_${Date.now()}.jpg`
        } as any);
      });

      console.log('📤 Enviando FormData a:', uploadURL);
      console.log('📋 Número de fotos:', archivos.length);

      // Usar fetch nativo en lugar de axios para mejor compatibilidad con FormData
      const response = await fetch(uploadURL, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${token}`,
          // NO incluir Content-Type - fetch lo maneja automáticamente para FormData
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Error desconocido' }));
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorData.error || 'Error al subir fotos'}`);
      }

      const data = await response.json();
      console.log('✅ Múltiples fotos de servicio subidas exitosamente:', data);
      return data;
    } catch (error: any) {
      console.error('❌ Error subiendo múltiples fotos de servicio:', error);
      throw error;
    }
  },

  // Obtener fotos de una oferta
  obtenerFotosOferta: async (ofertaId: number) => {
    try {
      const api = await getAPI();
      const response = await api.get(`/servicios/fotos-servicios/?oferta_servicio=${ofertaId}`);
      return response.data;
    } catch (error: any) {
      console.error('❌ Error obteniendo fotos de oferta:', error);
      throw error;
    }
  },

  // Eliminar foto de servicio
  eliminarFoto: async (fotoId: number) => {
    try {
      const api = await getAPI();
      const response = await api.delete(`/servicios/fotos-servicios/${fotoId}/`);
      console.log('✅ Foto de servicio eliminada exitosamente');
      return response.data;
    } catch (error: any) {
      console.error('❌ Error eliminando foto de servicio:', error);
      throw error;
    }
  }
};

export { getAPI, get, post, put, patch, del };
export default api; 