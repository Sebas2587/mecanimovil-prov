import React, { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { authAPI, EstadoProveedor } from '@/services/api';
import { googleLoginProveedor, type GoogleLoginProveedorResponse } from '@/services/auth/googleAuth';
import NotificationService from '@/services/push/notificationService';
import { deleteItem, getItem, setItem } from '@/utils/authStorage';
import {
  beginAuthHydration,
  clearAuthTokenCache,
  completeAuthHydration,
} from '@/utils/authTokenCache';
import {
  clearEstadoProveedorCache,
  isUsableEstadoProveedorCache,
  loadEstadoProveedorCache,
  saveEstadoProveedorCache,
} from '@/utils/auth/estadoProveedorCache';

const IS_EXPO_GO = Constants.appOwnership === 'expo';
const CAN_USE_NATIVE_GOOGLE = Platform.OS !== 'web' && !IS_EXPO_GO;
if (CAN_USE_NATIVE_GOOGLE) {
  try {
    const { GoogleSignin } = require('@react-native-google-signin/google-signin');
    GoogleSignin.configure({
      iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
      webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
      offlineAccess: false,
    });
  } catch (e: any) {
    if (__DEV__) {
      console.warn('[AuthContext] GoogleSignin no disponible:', e?.message);
    }
  }
}

async function registerPushForUser(userId: number | undefined): Promise<void> {
  if (!userId) return;
  try {
    await NotificationService.syncNotificationsForUser(userId);
  } catch {
    /* no crítico */
  }
}

// Tipos
interface Usuario {
  id: number;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  telefono?: string;
  direccion?: string;
  es_mecanico?: boolean;
  foto_perfil?: string;
}

interface AuthContextType {
  usuario: Usuario | null;
  estadoProveedor: EstadoProveedor | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (
    username: string,
    password: string,
    manageLoading?: boolean,
    aceptaTerminos?: boolean,
  ) => Promise<{ estadoProveedor: EstadoProveedor | null }>;
  loginWithGoogle: (
    idToken: string,
    flow?: 'login' | 'register',
    aceptaTerminos?: boolean,
    manageLoading?: boolean,
  ) => Promise<{
    success: boolean;
    error?: string;
    code?: string;
    estadoProveedor?: EstadoProveedor | null;
    profile?: { email?: string; given_name?: string; family_name?: string };
  }>;
  logout: () => Promise<void>;
  registro: (datos: any) => Promise<void>;
  updateUser: (userData: Usuario) => void;
  refrescarEstadoProveedor: () => Promise<EstadoProveedor | null>;
  limpiarStorage: () => Promise<void>;
  // Función helper para obtener nombre del proveedor con fallbacks
  obtenerNombreProveedor: () => string;
  // Función helper para obtener datos completos del proveedor
  obtenerDatosCompletosProveedor: () => {
    nombre: string;
    telefono: string;
    email: string;
    descripcion: string;
    politicas_cotizacion: string;
    dias_validez_cotizacion: number;
    direccion: string;
  };
  /** Rol del usuario dentro del taller. 'mandante' por defecto. */
  rolTaller: 'mandante' | 'supervisor' | 'mecanico';
  /** True si la sesión actual es de un supervisor (acceso restringido). */
  esSupervisor: boolean;
  /** True si la sesión actual es de un mecánico del equipo (acceso mínimo). */
  esMecanicoEquipo: boolean;
  /** ID del MiembroTaller cuando la sesión es de mecánico del equipo. */
  miembroId: number | null;
  /** True si el usuario puede gestionar el recurso (mandante siempre puede). */
  puede: (recurso: keyof import('@/services/api').PermisosSupervisor) => boolean;
}

// Crear contexto
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Hook para usar el contexto
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth debe ser usado dentro de un AuthProvider');
  }
  return context;
};

// Props para el provider
interface AuthProviderProps {
  children: ReactNode;
}

function isAuthSessionError(error: any): boolean {
  if (!error) return false;
  if (error?.response?.status === 401) return true;
  const code = error?.code as string | undefined;
  if (code === 'ERR_NO_AUTH') return true;
  const msg = typeof error.message === 'string' ? error.message : '';
  const msgLower = msg.toLowerCase();
  if (
    msg === 'No autenticado'
    || msg === 'Sin sesión activa'
    || msgLower.includes('sin sesión')
  ) {
    return true;
  }
  return false;
}

function isTransientEstadoProveedorError(error: any): boolean {
  if (!error) return false;
  if (isAuthSessionError(error)) return false;
  const status = error.response?.status;
  if (status === 401 || status === 403 || status === 404) return false;
  const code = error.code as string | undefined;
  if (code === 'ERR_CANCELED' || code === 'ERR_NO_AUTH') return false;
  if (code === 'ECONNABORTED' || code === 'ERR_NETWORK' || code === 'ETIMEDOUT') return true;
  const msg = typeof error.message === 'string' ? error.message.toLowerCase() : '';
  if (msg.includes('timeout') || msg.includes('network')) return true;
  // Sin response solo es transitorio si no es un cancel/auth local
  if (!error.response || (typeof status === 'number' && (status >= 500 || status === 429))) return true;
  return false;
}

async function clearStoredAuthSession(): Promise<void> {
  try {
    await clearAuthTokenCache();
    await deleteItem('userData');
    await clearEstadoProveedorCache();
  } catch {
    /* no crítico */
  }
}

/**
 * Reintentos ante timeouts / 503 / cold start de Render.
 * 4 intentos con backoff creciente (hasta ~7s de espera acumulada).
 */
async function obtenerEstadoProveedorWithRetries(): Promise<EstadoProveedor> {
  const maxAttempts = 4;
  let lastError: any;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await authAPI.obtenerEstadoProveedor();
    } catch (error: any) {
      lastError = error;
      if (!isTransientEstadoProveedorError(error)) throw error;
      if (attempt === maxAttempts) throw error;
      await new Promise<void>((resolve) => setTimeout(resolve, 900 * attempt));
    }
  }
  throw lastError;
}

async function applyEstadoProveedor(
  setEstadoProveedor: React.Dispatch<React.SetStateAction<EstadoProveedor | null>>,
  estado: EstadoProveedor,
): Promise<EstadoProveedor> {
  setEstadoProveedor(estado);
  await saveEstadoProveedorCache(estado);
  return estado;
}

/** Si la API falla de forma transitoria, reutiliza el último estado bueno en disco. */
async function resolveEstadoProveedorOrCache(
  setEstadoProveedor: React.Dispatch<React.SetStateAction<EstadoProveedor | null>>,
  error: any,
): Promise<EstadoProveedor | null> {
  if (isAuthSessionError(error)) return null;
  if (error?.response?.status === 403 || error?.response?.status === 404) return null;

  const cached = await loadEstadoProveedorCache();
  if (isUsableEstadoProveedorCache(cached)) {
    if (__DEV__) {
      console.log('♻️ Usando estadoProveedor en caché tras fallo transitorio de API');
    }
    setEstadoProveedor(cached);
    return cached;
  }
  return null;
}

// Provider del contexto
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [estadoProveedor, setEstadoProveedor] = useState<EstadoProveedor | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const refreshEstadoInFlight = useRef<Promise<EstadoProveedor | null> | null>(null);

  // Función helper para obtener nombre del proveedor con fallbacks robustos
  const obtenerNombreProveedor = (): string => {
    try {
      // Prioridad 1: Nombre del estado del proveedor
      if (estadoProveedor?.nombre && typeof estadoProveedor.nombre === 'string' && estadoProveedor.nombre.trim()) {
        return estadoProveedor.nombre.trim();
      }
      
      // Prioridad 2: Combinar first_name y last_name del usuario
      if (usuario?.first_name || usuario?.last_name) {
        const nombre = `${usuario.first_name || ''} ${usuario.last_name || ''}`.trim();
        if (nombre) {
          return nombre;
        }
      }
      
      // Prioridad 3: Username del usuario
      if (usuario?.username && typeof usuario.username === 'string' && usuario.username.trim()) {
        return usuario.username.trim();
      }
      
      // Prioridad 4: Tipo de proveedor como fallback
      if (estadoProveedor?.tipo_proveedor && typeof estadoProveedor.tipo_proveedor === 'string') {
        return estadoProveedor.tipo_proveedor === 'taller' ? 'Mi Taller' : 'Mi Servicio';
      }
      
      // Fallback final
      return 'Proveedor';
    } catch (error) {
      // Log solo en desarrollo
      if (__DEV__) {
        console.error('Error obteniendo nombre del proveedor (detalles solo en desarrollo):', error);
      }
      return 'Proveedor'; // Fallback seguro
    }
  };

  // Función helper para obtener datos completos del proveedor
  const obtenerDatosCompletosProveedor = () => {
    try {
      return {
        nombre: obtenerNombreProveedor(),
        telefono: estadoProveedor?.datos_proveedor?.telefono || usuario?.telefono || '',
        email: usuario?.email || '',
        descripcion: estadoProveedor?.datos_proveedor?.descripcion || '',
        politicas_cotizacion: estadoProveedor?.datos_proveedor?.politicas_cotizacion || '',
        dias_validez_cotizacion: Number(
          estadoProveedor?.datos_proveedor?.dias_validez_cotizacion,
        ) > 0
          ? Math.min(90, Math.max(1, Math.round(Number(
            estadoProveedor?.datos_proveedor?.dias_validez_cotizacion,
          ))))
          : 30,
        direccion:
          estadoProveedor?.datos_proveedor?.direccion?.trim() ||
          usuario?.direccion?.trim() ||
          '',
      };
    } catch (error) {
      // Log solo en desarrollo
      if (__DEV__) {
        console.error('Error obteniendo datos completos del proveedor (detalles solo en desarrollo):', error);
      }
      // Retornar datos seguros por defecto
      return {
        nombre: 'Proveedor',
        telefono: '',
        email: '',
        descripcion: '',
        politicas_cotizacion: '',
        dias_validez_cotizacion: 30,
        direccion: '',
      };
    }
  };

  // Verificar autenticación al iniciar la app
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    beginAuthHydration();
    try {
      // Log solo en desarrollo
      if (__DEV__) {
        console.log('🔍 Verificando estado de autenticación...');
      }
      setIsLoading(true);
      
      // Verificar si hay tokens almacenados
      const tokenExiste = await authAPI.isAuthenticated();
      if (__DEV__) {
        console.log('🔑 Token existe:', tokenExiste);
      }
      
      if (tokenExiste) {
        if (__DEV__) {
          console.log('📱 Token encontrado, obteniendo datos del usuario...');
        }
        const storedToken = await getItem('authToken');
        completeAuthHydration(storedToken);
        const userData = await authAPI.getUserData();
        if (__DEV__) {
          console.log('👤 Datos del usuario obtenidos:', userData ? 'SÍ' : 'NO', userData?.username);
        }
        
        if (userData) {
          if (__DEV__) {
            console.log('✅ Estableciendo usuario como autenticado');
          }
          setUsuario(userData);
          setIsAuthenticated(true);

          // Optimistic: último estado bueno en disco → no bloquear Hoy si la API tarda/falla
          const cachedEstado = await loadEstadoProveedorCache();
          if (isUsableEstadoProveedorCache(cachedEstado)) {
            setEstadoProveedor(cachedEstado);
          }
          
          // Intentar obtener datos actualizados del usuario (incluida foto de perfil)
          try {
            // Verificar token antes de intentar obtener datos
            const token = await getItem('authToken');
            if (!token) {
              if (__DEV__) {
                console.log('⚠️ No hay token, no se pueden obtener datos actualizados del usuario');
              }
              // Continuar con el flujo, no retornar de la función completa
            } else {
              const datosUsuarioActualizados = await authAPI.obtenerDatosUsuario();
              setUsuario(datosUsuarioActualizados);
              // Actualizar también los datos guardados en SecureStore
              await setItem('userData', JSON.stringify(datosUsuarioActualizados));
              if (__DEV__) {
                console.log('✅ Datos del usuario actualizados con foto de perfil');
              }
            }
          } catch (userError: any) {
            if (isAuthSessionError(userError)) {
              if (__DEV__) {
                console.log('🚨 Sesión inválida al obtener datos del usuario — limpiando', {
                  status: userError?.response?.status,
                  code: userError?.code,
                  message: userError?.message,
                });
              }
              try {
                await clearStoredAuthSession();
              } catch (cleanupError) {
                if (__DEV__) {
                  console.error('Error limpiando tokens (detalles solo en desarrollo):', cleanupError);
                }
              }
              setUsuario(null);
              setIsAuthenticated(false);
              setEstadoProveedor(null);
              completeAuthHydration(null);
              return;
            }
            if (__DEV__) {
              console.log('No se pudieron obtener datos actualizados del usuario, usando datos del cache');
            }
          }
          
          // Obtener estado del proveedor si está autenticado
          if (__DEV__) {
            console.log('🔍 Obteniendo estado del proveedor...');
          }
          try {
            // Verificar token antes de intentar obtener estado
            const token = await getItem('authToken');
            if (!token) {
              // userData en caché sin token → sesión inconsistente; ir a login
              if (__DEV__) {
                console.log('⚠️ userData sin authToken — limpiando sesión fantasma');
              }
              await clearStoredAuthSession();
              setUsuario(null);
              setIsAuthenticated(false);
              setEstadoProveedor(null);
              completeAuthHydration(null);
              return;
            }
            const estado = await obtenerEstadoProveedorWithRetries();
            if (__DEV__) {
              console.log('📊 Estado del proveedor obtenido:', estado);
            }
            await applyEstadoProveedor(setEstadoProveedor, estado);
          } catch (error: any) {
            // Sesión inválida / token limpio mid-bootstrap → login (no pantalla de taller)
            if (isAuthSessionError(error)) {
              if (__DEV__) {
                console.log('🚨 Sesión inválida al obtener estado — limpiando y yendo a login', {
                  status: error?.response?.status,
                  code: error?.code,
                  message: error?.message,
                });
              }
              try {
                await clearStoredAuthSession();
              } catch (cleanupError) {
                if (__DEV__) {
                  console.error('Error limpiando tokens (detalles solo en desarrollo):', cleanupError);
                }
              }
              setUsuario(null);
              setIsAuthenticated(false);
              setEstadoProveedor(null);
              completeAuthHydration(null);
              return;
            }

            if (__DEV__) {
              console.log('❌ Error obteniendo estado del proveedor:', error.response?.status || error?.code);
            }

            if (error.response?.status === 404 || error.response?.status === 403) {
              const sinPerfil = {
                tiene_perfil: false,
                estado_verificacion: 'pendiente' as const,
                verificado: false,
                onboarding_iniciado: false,
                onboarding_completado: false,
                activo: false,
                necesita_onboarding: true,
              } as EstadoProveedor;
              if (__DEV__) {
                console.log(
                  error.response?.status === 404
                    ? '👤 Usuario no tiene perfil de proveedor, estableciendo estado inicial'
                    : '🚫 Usuario sin permisos de proveedor, evaluando si conservar estado previo',
                );
              }
              setEstadoProveedor((prev) => {
                if (
                  prev?.tiene_perfil
                  && (prev.onboarding_completado
                    || prev.necesita_onboarding === false
                    || prev.estado_verificacion === 'aprobado')
                ) {
                  return prev;
                }
                return sinPerfil;
              });
              await saveEstadoProveedorCache(sinPerfil);
            } else {
              // Fallo transitorio: preferir caché (disco o ya hidratado) antes de bloquear
              const fromCache = await resolveEstadoProveedorOrCache(setEstadoProveedor, error);
              if (!fromCache) {
                if (__DEV__) {
                  console.log('❓ Sin estado ni caché usable — Index mostrará reintento');
                }
                // No pisar un estado usable ya mostrado (optimistic hydrate)
                setEstadoProveedor((prev) =>
                  (isUsableEstadoProveedorCache(prev) ? prev : null),
                );
              }
            }
          }
          void registerPushForUser(userData.id);
        } else {
          setIsAuthenticated(false);
          setUsuario(null);
          setEstadoProveedor(null);
        }
      } else {
        if (__DEV__) {
          console.log('🔒 No hay tokens - Usuario no autenticado');
        }
        setIsAuthenticated(false);
        setUsuario(null);
        setEstadoProveedor(null);
        completeAuthHydration(null);
      }
    } catch (error) {
      // Log solo en desarrollo
      if (__DEV__) {
        console.error('❌ Error verificando autenticación (detalles solo en desarrollo):', error);
      }
      setIsAuthenticated(false);
      setUsuario(null);
      setEstadoProveedor(null);
      completeAuthHydration(null);
    } finally {
      if (__DEV__) {
        console.log('🏁 checkAuthStatus completado, estableciendo isLoading = false');
      }
      setIsLoading(false);
    }
  };

  const loginWithGoogle = async (
    idToken: string,
    flow: 'login' | 'register' = 'login',
    aceptaTerminos = false,
    manageLoading: boolean = true,
  ) => {
    try {
      if (manageLoading) setIsLoading(true);

      const response = await googleLoginProveedor(idToken, flow, aceptaTerminos);

      if ('__clientAccount' in response && response.__clientAccount) {
        await clearAuthTokenCache().catch(() => {});
        await deleteItem('userData').catch(() => {});
        setUsuario(null);
        setIsAuthenticated(false);
        setEstadoProveedor(null);
        return {
          success: false,
          code: 'CLIENT_ACCOUNT',
          error:
            response.error ||
            'Esta cuenta no es de proveedor. Utiliza la aplicación de usuarios.',
        };
      }

      const loginResponse = response as GoogleLoginProveedorResponse;
      completeAuthHydration(loginResponse.token);
      setUsuario({
        id: loginResponse.user.id,
        username: loginResponse.user.username,
        email: loginResponse.user.email,
        first_name: loginResponse.user.first_name,
        last_name: loginResponse.user.last_name,
        telefono: loginResponse.user.telefono,
        direccion: loginResponse.user.direccion,
        es_mecanico: loginResponse.user.es_mecanico,
        foto_perfil: loginResponse.user.foto_perfil ?? undefined,
      });
      setIsAuthenticated(true);

      let estadoProveedorActual: EstadoProveedor | null = null;
      try {
        const estado = await obtenerEstadoProveedorWithRetries();
        estadoProveedorActual = await applyEstadoProveedor(setEstadoProveedor, estado);
      } catch (error: any) {
        // Tras login fresco no tratar fallos de API como “sesión muerta” (limpiaría el token recién guardado)
        if (error.response?.status === 404 || error.response?.status === 403) {
          const estadoSinPerfil = {
            tiene_perfil: false,
            estado_verificacion: 'pendiente' as const,
            verificado: false,
            onboarding_iniciado: false,
            onboarding_completado: false,
            activo: false,
            necesita_onboarding: true,
          } as EstadoProveedor;
          estadoProveedorActual = await applyEstadoProveedor(setEstadoProveedor, estadoSinPerfil);
        } else {
          estadoProveedorActual = await resolveEstadoProveedorOrCache(setEstadoProveedor, error);
        }
      }

      await new Promise((resolve) => setTimeout(resolve, 100));
      void registerPushForUser(loginResponse.user.id);
      return { success: true, estadoProveedor: estadoProveedorActual };
    } catch (error: any) {
      const status = error?.response?.status;
      const code = error?.response?.data?.code;
      let errorMessage = error?.message || 'No se pudo iniciar sesión con Google. Intenta nuevamente.';
      if (status === 404 && code === 'USER_NOT_FOUND') {
        return {
          success: false,
          code: 'USER_NOT_FOUND',
          error: errorMessage,
          profile: error?.response?.data?.profile,
        };
      }
      if (status === 403 || code === 'CLIENT_ACCOUNT') {
        errorMessage =
          'Esta cuenta no es de proveedor. Utiliza la aplicación de usuarios.';
        return { success: false, error: errorMessage, code: 'CLIENT_ACCOUNT' };
      }
      return { success: false, error: errorMessage };
    } finally {
      if (manageLoading) setIsLoading(false);
    }
  };

  const login = async (
    username: string,
    password: string,
    manageLoading: boolean = true,
    aceptaTerminos: boolean = false,
  ) => {
    try {
      // Logs solo en desarrollo (__DEV__), nunca en producción (APK)
      if (__DEV__) {
        console.log('🎯 AuthContext.login iniciado');
        console.log('Username recibido:', username);
        console.log('Password length:', password.length);
        console.log('manageLoading:', manageLoading);
      }
      
      if (manageLoading) {
        setIsLoading(true);
        if (__DEV__) {
          console.log('⏳ isLoading establecido a true en AuthContext');
        }
      }
      
      if (__DEV__) {
        console.log('📡 Llamando a authAPI.login...');
      }
      const response = await authAPI.login({ username, password, acepta_terminos: aceptaTerminos });
      
      if (__DEV__) {
        console.log('✅ Respuesta de authAPI.login recibida');
      }
      
      if (__DEV__) {
        console.log('👤 Estableciendo usuario en estado...');
      }
      setUsuario(response.user);
      setIsAuthenticated(true);
      
      let estadoProveedorActual = null;
      
      // Obtener estado del proveedor después del login
      if (__DEV__) {
        console.log('🔍 Obteniendo estado del proveedor...');
      }
      try {
        const estado = await obtenerEstadoProveedorWithRetries();
        if (__DEV__) {
          console.log('Estado obtenido del API:', estado);
        }
        estadoProveedorActual = await applyEstadoProveedor(setEstadoProveedor, estado);
        if (__DEV__) {
          console.log('✅ Estado del proveedor establecido correctamente');
        }
      } catch (error: any) {
        if (__DEV__) {
          console.log('Error obteniendo estado del proveedor tras login:', error.response?.status);
        }
        if (error.response?.status === 404 || error.response?.status === 403) {
          const estadoSinPerfil = {
            tiene_perfil: false,
            estado_verificacion: 'pendiente' as const,
            verificado: false,
            onboarding_iniciado: false,
            onboarding_completado: false,
            activo: false,
            necesita_onboarding: true,
          } as EstadoProveedor;
          if (__DEV__) {
            console.log('Estableciendo estado sin perfil:', estadoSinPerfil);
          }
          estadoProveedorActual = await applyEstadoProveedor(setEstadoProveedor, estadoSinPerfil);
        } else {
          estadoProveedorActual = await resolveEstadoProveedorOrCache(setEstadoProveedor, error);
        }
      }
      
      if (__DEV__) {
        console.log('🎉 Proceso de login en AuthContext completado exitosamente');
      }
      
      // Pequeño delay para asegurar que el estado se propague correctamente
      if (__DEV__) {
        console.log('⏰ Esperando 100ms para propagación de estado...');
      }
      await new Promise(resolve => setTimeout(resolve, 100));
      if (__DEV__) {
        console.log('✅ Estado debería estar propagado ahora');
      }

      void registerPushForUser(response.user?.id);

      // Retornar el estado actual para que el componente pueda usarlo
      return { estadoProveedor: estadoProveedorActual };
      
    } catch (error: any) {
      // Log detallado solo en desarrollo para debugging
      // En producción (APK), estos logs NO aparecerán
      if (__DEV__) {
        console.error('❌ Error en login AuthContext (detalles solo en desarrollo):', {
          message: error.message,
          status: error.response?.status,
          code: error.code,
          // NO loguear datos sensibles, contraseñas, o detalles técnicos completos
        });
        if (error.response?.data) {
          console.error('Response data:', error.response.data);
        }
      }
      
      // Determinar mensaje de error amigable para el usuario
      let errorMessage = 'No se pudo iniciar sesión. Por favor, verifica tus credenciales e intenta nuevamente.';
      
      // Errores de conexión/red
      if (error.code === 'ERR_NETWORK' || 
          error.code === 'ECONNREFUSED' || 
          error.code === 'ETIMEDOUT' || 
          error.code === 'ENOTFOUND' ||
          error.message?.includes('Network Error') ||
          error.message?.includes('network error') ||
          error.message?.includes('fetch failed')) {
        errorMessage = 'Error de conexión. Por favor, verifica tu conexión a internet e intenta nuevamente.';
      }
      // Error 400 - Credenciales inválidas
      else if (error.response?.status === 400) {
        const serverMessage = error.response?.data?.non_field_errors?.[0] || 
                            error.response?.data?.error || 
                            error.response?.data?.detail;
        if (serverMessage) {
          // Usar mensaje del servidor si está disponible
          errorMessage = serverMessage;
        } else {
          errorMessage = 'Correo electrónico o contraseña incorrectos. Por favor, verifica tus credenciales e intenta nuevamente.';
        }
      }
      // Error 401 - No autorizado
      else if (error.response?.status === 401) {
        errorMessage = 'No autorizado. Por favor, verifica tus credenciales e intenta nuevamente.';
      }
      // Error 403 - Prohibido
      else if (error.response?.status === 403) {
        errorMessage = 'No tienes permisos para acceder. Por favor, contacta al soporte.';
      }
      // Error 500+ - Error del servidor
      else if (error.response?.status >= 500) {
        errorMessage = 'Error del servidor. Por favor, intenta más tarde.';
      }
      // Si hay un mensaje específico del servidor, usarlo
      else if (error.response?.data?.non_field_errors?.[0]) {
        errorMessage = error.response.data.non_field_errors[0];
      }
      else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      }
      else if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      }
      // Si el error ya tiene un mensaje amigable, usarlo
      else if (error.message && 
               (error.message.includes('No se pudo iniciar sesión') ||
                error.message.includes('Error de conexión') ||
                error.message.includes('Correo electrónico') ||
                error.message.includes('No autorizado'))) {
        errorMessage = error.message;
      }
      
      // Lanzar error con mensaje amigable
      throw new Error(errorMessage);
    } finally {
      if (manageLoading) {
        if (__DEV__) {
          console.log('🏁 Estableciendo isLoading a false en AuthContext');
        }
        setIsLoading(false);
      }
    }
  };

  const registro = async (datos: any) => {
    try {
      setIsLoading(true);
      // Log solo en desarrollo
      if (__DEV__) {
        console.log('Enviando datos de registro:', datos);
      }
      
      // Debug: verificar si hay token almacenado
      const tokenAlmacenado = await authAPI.getUserData();
      if (__DEV__) {
        console.log('Token almacenado antes del registro:', tokenAlmacenado ? 'SÍ HAY TOKEN' : 'NO HAY TOKEN');
      }
      
      const response = await authAPI.registro(datos);
      if (__DEV__) {
        console.log('✅ Respuesta de registro exitosa recibida:', response);
      }
      
      // Después del registro exitoso, guardar credenciales temporalmente para el onboarding
      // NO intentar login automático porque el usuario aún no está marcado como proveedor
      if (datos.username && datos.password) {
        if (__DEV__) {
          console.log('💾 Guardando credenciales temporalmente para onboarding...');
        }
        
        try {
          // Guardar credenciales en SecureStore para usar después del onboarding
          await setItem('pendingRegistration', JSON.stringify({
            username: datos.username,
            password: datos.password,
            email: datos.email || response.email,
            timestamp: Date.now()
          }));
          
          if (__DEV__) {
            console.log('✅ Credenciales guardadas temporalmente');
            console.log('📝 El usuario será redirigido al onboarding');
            console.log('🔐 El login se hará después de seleccionar el tipo de cuenta');
          }
        } catch (saveError) {
          if (__DEV__) {
            console.warn('⚠️ Error guardando credenciales temporales (no crítico):', saveError);
          }
          // No es crítico, el usuario puede hacer login manualmente
        }
      }
      
      return response;
    } catch (error: any) {
      // Log detallado solo en desarrollo
      if (__DEV__) {
        console.error('Error completo en registro (detalles solo en desarrollo):', {
          message: error.message,
          status: error.response?.status,
          code: error.code,
          // NO loguear datos sensibles
        });
        if (error.response?.data) {
          console.error('Respuesta del servidor:', error.response.data);
        }
      }
      
      let errorMessage = 'Error al registrar usuario. Por favor, verifica los datos e intenta nuevamente.';
      
      // Manejar errores de red
      if (error.code === 'ERR_NETWORK' || error.message?.includes('Network')) {
        errorMessage = 'No hay conexión a internet. Por favor, verifica tu conexión e intenta nuevamente.';
      } else if (error.response?.status === 403) {
        errorMessage = 'No tienes permisos para realizar esta acción. Por favor, contacta al soporte.';
      } else if (error.response?.status === 500) {
        errorMessage = 'Error en el servidor. Por favor, intenta más tarde.';
      } else if (error.response?.data) {
        const data = error.response.data;
        
        // Manejar errores específicos del backend
        if (data.username) {
          const msg = Array.isArray(data.username) ? data.username[0] : data.username;
          errorMessage = `Error en el nombre de usuario: ${msg}`;
        } else if (data.email) {
          const msg = Array.isArray(data.email) ? data.email[0] : data.email;
          errorMessage = `Error en el correo electrónico: ${msg}`;
        } else if (data.password) {
          const msg = Array.isArray(data.password) ? data.password[0] : data.password;
          errorMessage = `Error en la contraseña: ${msg}`;
        } else if (data.error) {
          errorMessage = typeof data.error === 'string' ? data.error : JSON.stringify(data.error);
        } else if (data.detail) {
          errorMessage = typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail);
        } else if (data.non_field_errors) {
          const msg = Array.isArray(data.non_field_errors) ? data.non_field_errors[0] : data.non_field_errors;
          errorMessage = msg || errorMessage;
        } else if (data.details) {
          errorMessage = typeof data.details === 'string' ? data.details : JSON.stringify(data.details);
        }
      } else if (error.message) {
        // Usar el mensaje del error si está disponible
        errorMessage = error.message;
      }
      
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      // Log solo en desarrollo
      if (__DEV__) {
        console.log('🚪 Iniciando logout...');
      }
      
      // Limpiar estado del contexto PRIMERO (para UI inmediata)
      setUsuario(null);
      setIsAuthenticated(false);
      setEstadoProveedor(null);
      void clearEstadoProveedorCache();
      
      try {
        if (Platform.OS !== 'web' && !IS_EXPO_GO) {
          const { GoogleSignin: GS } = require('@react-native-google-signin/google-signin');
          await GS.signOut().catch(() => {});
        }
      } catch {
        /* no crítico */
      }

      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        try {
          window.localStorage.removeItem('mecanimovil-prov:connectedGoogleAccounts');
        } catch {
          /* no crítico */
        }
      }

      await NotificationService.deactivateOnLogout();

      await authAPI.logout();
      
      if (__DEV__) {
        console.log('✅ Logout completado exitosamente');
        console.log('🧹 Estado de onboarding incompleto eliminado - próximo registro empezará desde cero');
      }
    } catch (error) {
      // Log solo en desarrollo
      if (__DEV__) {
        console.error('❌ Error en logout (detalles solo en desarrollo):', error);
      }
      
      // Aún así limpiar el estado local
      setUsuario(null);
      setIsAuthenticated(false);
      setEstadoProveedor(null);
      if (__DEV__) {
        console.log('🧹 Estado local limpiado tras error');
      }
    }
  };

  const updateUser = (userData: Usuario) => {
    setUsuario(userData);
    setIsAuthenticated(true); // Si hay datos de usuario, está autenticado
  };

  const refrescarEstadoProveedor = useCallback(async (): Promise<EstadoProveedor | null> => {
    if (refreshEstadoInFlight.current) {
      return refreshEstadoInFlight.current;
    }

    const run = (async (): Promise<EstadoProveedor | null> => {
      const token = await getItem('authToken');
      if (!token) {
        setUsuario(null);
        setIsAuthenticated(false);
        setEstadoProveedor(null);
        return null;
      }

      try {
        const estado = await obtenerEstadoProveedorWithRetries();
        await applyEstadoProveedor(setEstadoProveedor, estado);

        try {
          const datosUsuario = await authAPI.obtenerDatosUsuario();
          setUsuario(datosUsuario);
          await setItem('userData', JSON.stringify(datosUsuario));
        } catch (userError) {
          if (isAuthSessionError(userError)) {
            await clearStoredAuthSession();
            setUsuario(null);
            setIsAuthenticated(false);
            setEstadoProveedor(null);
            return null;
          }
          if (__DEV__) {
            console.log('No se pudieron actualizar los datos del usuario (detalles solo en desarrollo):', userError);
          }
        }

        return estado;
      } catch (error: any) {
        if (isAuthSessionError(error)) {
          await clearStoredAuthSession();
          setUsuario(null);
          setIsAuthenticated(false);
          setEstadoProveedor(null);
          return null;
        }

        if (error.response?.status === 403 || error.response?.status === 404) {
          if (__DEV__) {
            console.log('ℹ️ Usuario aún no tiene perfil de proveedor (normal después del registro)');
          }
          const sinPerfil = {
            tiene_perfil: false,
            estado_verificacion: 'pendiente' as const,
            verificado: false,
            onboarding_iniciado: false,
            onboarding_completado: false,
            activo: false,
            necesita_onboarding: true,
          } as EstadoProveedor;
          let resolved: EstadoProveedor = sinPerfil;
          setEstadoProveedor((prev) => {
            if (
              prev?.tiene_perfil
              && (prev.onboarding_completado
                || prev.necesita_onboarding === false
                || prev.estado_verificacion === 'aprobado')
            ) {
              resolved = prev;
              return prev;
            }
            return sinPerfil;
          });
          await saveEstadoProveedorCache(resolved);
          return resolved;
        }

        // Fallo transitorio: devolver caché en vez de tumbar la UI
        const fromCache = await resolveEstadoProveedorOrCache(setEstadoProveedor, error);
        if (fromCache) return fromCache;

        if (__DEV__) {
          console.error('Error refrescando estado del proveedor (detalles solo en desarrollo):', error);
        }
        throw error;
      }
    })();

    refreshEstadoInFlight.current = run;
    try {
      return await run;
    } finally {
      refreshEstadoInFlight.current = null;
    }
  }, []);

  const limpiarStorage = async () => {
    await authAPI.clearStorage();
    await clearEstadoProveedorCache();
    setUsuario(null);
    setIsAuthenticated(false);
    setEstadoProveedor(null);
  };

  const rolTaller: 'mandante' | 'supervisor' | 'mecanico' =
    estadoProveedor?.rol_taller === 'supervisor'
      ? 'supervisor'
      : estadoProveedor?.rol_taller === 'mecanico'
        ? 'mecanico'
        : 'mandante';
  const esSupervisor = rolTaller === 'supervisor';
  const esMecanicoEquipo = rolTaller === 'mecanico';
  const miembroId = estadoProveedor?.miembro_id ?? null;

  const puede = useCallback(
    (recurso: keyof import('@/services/api').PermisosSupervisor): boolean => {
      if (rolTaller === 'mandante') return true;
      if (rolTaller === 'mecanico') return false;
      const permisos = estadoProveedor?.permisos;
      return Boolean(permisos && permisos[recurso]);
    },
    [rolTaller, estadoProveedor?.permisos],
  );

  const value: AuthContextType = {
    usuario,
    estadoProveedor,
    isLoading,
    isAuthenticated,
    login,
    loginWithGoogle,
    logout,
    registro,
    updateUser,
    refrescarEstadoProveedor,
    limpiarStorage,
    obtenerNombreProveedor,
    obtenerDatosCompletosProveedor,
    rolTaller,
    esSupervisor,
    esMecanicoEquipo,
    miembroId,
    puede,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 