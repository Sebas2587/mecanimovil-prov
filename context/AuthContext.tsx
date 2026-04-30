import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { authAPI, EstadoProveedor } from '@/services/api';
import * as SecureStore from 'expo-secure-store';

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
  login: (username: string, password: string, manageLoading?: boolean) => Promise<{ estadoProveedor: EstadoProveedor | null }>;
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
    direccion: string;
  };
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

// Provider del contexto
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [estadoProveedor, setEstadoProveedor] = useState<EstadoProveedor | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

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
        direccion: '',
      };
    }
  };

  // Verificar autenticación al iniciar la app
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
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
          
          // Intentar obtener datos actualizados del usuario (incluida foto de perfil)
          try {
            // Verificar token antes de intentar obtener datos
            const token = await SecureStore.getItemAsync('authToken');
            if (!token) {
              if (__DEV__) {
                console.log('⚠️ No hay token, no se pueden obtener datos actualizados del usuario');
              }
              // Continuar con el flujo, no retornar de la función completa
            } else {
              const datosUsuarioActualizados = await authAPI.obtenerDatosUsuario();
              setUsuario(datosUsuarioActualizados);
              // Actualizar también los datos guardados en SecureStore
              await SecureStore.setItemAsync('userData', JSON.stringify(datosUsuarioActualizados));
              if (__DEV__) {
                console.log('✅ Datos del usuario actualizados con foto de perfil');
              }
            }
          } catch (userError: any) {
            // Si es 401, los tokens están expirados - limpiar todo
            if (userError.response?.status === 401 || userError.message === 'No autenticado') {
              if (__DEV__) {
                console.log('🚨 Error 401 al obtener datos del usuario - tokens expirados');
              }
              // Limpiar tokens si aún existen
              try {
                await SecureStore.deleteItemAsync('authToken');
                await SecureStore.deleteItemAsync('userData');
              } catch (cleanupError) {
                if (__DEV__) {
                  console.error('Error limpiando tokens (detalles solo en desarrollo):', cleanupError);
                }
              }
              // Limpiar estado de autenticación
              setUsuario(null);
              setIsAuthenticated(false);
              setEstadoProveedor(null);
              if (__DEV__) {
                console.log('✅ Estado limpiado por error 401 en obtenerDatosUsuario');
              }
              return; // Salir de la función para evitar más llamadas
            } else {
              if (__DEV__) {
                console.log('No se pudieron obtener datos actualizados del usuario, usando datos del cache');
              }
            }
          }
          
          // Obtener estado del proveedor si está autenticado
          if (__DEV__) {
            console.log('🔍 Obteniendo estado del proveedor...');
          }
          try {
            // Verificar token antes de intentar obtener estado
            const token = await SecureStore.getItemAsync('authToken');
            if (!token) {
              if (__DEV__) {
                console.log('⚠️ No hay token, no se puede obtener estado del proveedor');
              }
              setEstadoProveedor(null);
              // Continuar con el flujo, no retornar de la función completa
            } else {
              const estado = await authAPI.obtenerEstadoProveedor();
              if (__DEV__) {
                console.log('📊 Estado del proveedor obtenido:', estado);
              }
              setEstadoProveedor(estado);
            }
          } catch (error: any) {
            // Si es 401, los tokens están expirados - limpiar todo inmediatamente
            if (error.response?.status === 401 || error.message === 'No autenticado') {
              if (__DEV__) {
                console.log('🚨 Error 401 detectado - tokens expirados, limpiando todo');
              }
              // Limpiar tokens si aún existen
              try {
                await SecureStore.deleteItemAsync('authToken');
                await SecureStore.deleteItemAsync('userData');
              } catch (cleanupError) {
                if (__DEV__) {
                  console.error('Error limpiando tokens (detalles solo en desarrollo):', cleanupError);
                }
              }
              // Limpiar estado de autenticación
              setUsuario(null);
              setIsAuthenticated(false);
              setEstadoProveedor(null);
              if (__DEV__) {
                console.log('✅ Estado limpiado, el usuario será redirigido al login');
              }
              return; // El usuario irá automáticamente al login
            } else {
              if (__DEV__) {
                console.log('❌ Error obteniendo estado del proveedor:', error.response?.status);
              }
              
              if (error.response?.status === 404) {
                // Usuario no tiene perfil de proveedor - esto es normal para usuarios nuevos
                if (__DEV__) {
                  console.log('👤 Usuario no tiene perfil de proveedor, estableciendo estado inicial');
                }
                setEstadoProveedor({ 
                  tiene_perfil: false,
                  estado_verificacion: 'pendiente' as const,
                  verificado: false,
                  onboarding_iniciado: false,
                  onboarding_completado: false,
                  activo: false
                });
              } else if (error.response?.status === 403) {
                // Usuario autenticado pero sin permisos de proveedor
                if (__DEV__) {
                  console.log('🚫 Usuario sin permisos de proveedor, necesita completar onboarding');
                }
                setEstadoProveedor({ 
                  tiene_perfil: false,
                  estado_verificacion: 'pendiente' as const,
                  verificado: false,
                  onboarding_iniciado: false,
                  onboarding_completado: false,
                  activo: false,
                  necesita_onboarding: true // Flag para indicar redirección
                });
              } else {
                // Otro tipo de error - mantener como null para mostrar error
                if (__DEV__) {
                  console.log('❓ Error no es 401/404/403, manteniendo estadoProveedor como null');
                }
                setEstadoProveedor(null);
              }
            }
          }
        } else {
          if (__DEV__) {
            console.log('❌ No se pudieron obtener datos del usuario, limpiando estado');
          }
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
      }
    } catch (error) {
      // Log solo en desarrollo
      if (__DEV__) {
        console.error('❌ Error verificando autenticación (detalles solo en desarrollo):', error);
      }
      setIsAuthenticated(false);
      setUsuario(null);
      setEstadoProveedor(null);
    } finally {
      if (__DEV__) {
        console.log('🏁 checkAuthStatus completado, estableciendo isLoading = false');
      }
      setIsLoading(false);
    }
  };

  const login = async (username: string, password: string, manageLoading: boolean = true) => {
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
      const response = await authAPI.login({ username, password });
      
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
        const estado = await authAPI.obtenerEstadoProveedor();
        if (__DEV__) {
          console.log('Estado obtenido del API:', estado);
        }
        setEstadoProveedor(estado);
        estadoProveedorActual = estado;
        if (__DEV__) {
          console.log('✅ Estado del proveedor establecido correctamente');
        }
      } catch (error: any) {
        // Log solo en desarrollo
        if (__DEV__) {
          console.log('Error obteniendo estado del proveedor tras login:', error.response?.status);
        }
        if (error.response?.status === 404) {
          // Usuario no tiene perfil de proveedor aún - esto es normal
          const estadoSinPerfil = { 
            tiene_perfil: false,
            estado_verificacion: 'pendiente' as const,
            verificado: false,
            onboarding_iniciado: false,
            onboarding_completado: false,
            activo: false
          };
          if (__DEV__) {
            console.log('Estableciendo estado sin perfil:', estadoSinPerfil);
          }
          setEstadoProveedor(estadoSinPerfil);
          estadoProveedorActual = estadoSinPerfil;
        } else {
          // Otro tipo de error - mantener como null
          if (__DEV__) {
            console.log('Error no es 404, manteniendo estadoProveedor como null');
          }
          setEstadoProveedor(null);
          estadoProveedorActual = null;
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
          await SecureStore.setItemAsync('pendingRegistration', JSON.stringify({
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
      
      // Luego limpiar almacenamiento
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

  const refrescarEstadoProveedor = async (): Promise<EstadoProveedor | null> => {
    try {
      const estado = await authAPI.obtenerEstadoProveedor();
      setEstadoProveedor(estado);

      try {
        const datosUsuario = await authAPI.obtenerDatosUsuario();
        setUsuario(datosUsuario);
        await SecureStore.setItemAsync('userData', JSON.stringify(datosUsuario));
      } catch (userError) {
        if (__DEV__) {
          console.log('No se pudieron actualizar los datos del usuario (detalles solo en desarrollo):', userError);
        }
      }

      return estado;
    } catch (error: any) {
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
        setEstadoProveedor(sinPerfil);
        return null;
      }

      if (__DEV__) {
        console.error('Error refrescando estado del proveedor (detalles solo en desarrollo):', error);
      }
      throw error;
    }
  };

  const limpiarStorage = async () => {
    await authAPI.clearStorage();
    setUsuario(null);
    setIsAuthenticated(false);
    setEstadoProveedor(null);
  };

  const value: AuthContextType = {
    usuario,
    estadoProveedor,
    isLoading,
    isAuthenticated,
    login,
    logout,
    registro,
    updateUser,
    refrescarEstadoProveedor,
    limpiarStorage,
    obtenerNombreProveedor,
    obtenerDatosCompletosProveedor,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 