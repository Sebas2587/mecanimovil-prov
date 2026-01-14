/**
 * Servicio para gestionar la cuenta de Mercado Pago del proveedor
 * Permite configurar, verificar y gestionar la integración con Mercado Pago
 */
import api from './api';

// ============================================================================
// TIPOS E INTERFACES
// ============================================================================

/**
 * Estados posibles de la cuenta de Mercado Pago del proveedor
 */
export type EstadoCuentaMP = 
  | 'no_configurada'    // No tiene cuenta configurada
  | 'pendiente'         // Configuración iniciada pero no completada
  | 'conectada'         // Cuenta conectada y activa
  | 'desconectada'      // Cuenta desconectada por el usuario
  | 'error'             // Error en la conexión
  | 'suspendida';       // Cuenta suspendida por algún motivo

/**
 * Información de la cuenta de Mercado Pago del proveedor
 */
export interface CuentaMercadoPagoProveedor {
  id: number;
  estado: EstadoCuentaMP;
  estado_display: string;
  email_mp: string | null;
  user_id_mp: string | null;
  nombre_cuenta: string | null;
  fecha_conexion: string | null;
  fecha_actualizacion: string;
  puede_recibir_pagos: boolean;
  mensaje_estado: string;
}

/**
 * Datos para iniciar la conexión OAuth
 */
export interface IniciarConexionResponse {
  auth_url: string;
  redirect_uri: string;
  state: string;
}

/**
 * Datos del callback OAuth
 */
export interface CallbackOAuthData {
  code: string;
  state: string;
}

/**
 * Resultado del callback OAuth
 */
export interface CallbackOAuthResponse {
  success: boolean;
  cuenta: CuentaMercadoPagoProveedor;
  mensaje: string;
}

/**
 * Estadísticas de pagos recibidos
 */
export interface EstadisticasPagosMP {
  total_recibido: number;
  total_recibido_mes: number;
  cantidad_transacciones: number;
  cantidad_transacciones_mes: number;
  ultima_transaccion: string | null;
  cantidad_pagos_repuestos?: number;
  total_repuestos?: number;
  moneda: string;
}

/**
 * Item del historial de pagos
 */
export interface PagoRecibido {
  id: string;
  fecha: string | null;
  monto: number;
  cliente_nombre: string;
  cliente_email: string | null;
  servicios: string;
  vehiculo: string;
  tipo_pago: string;
  estado_oferta: string;
  estado_pago_repuestos: string;
  estado_pago_servicio: string;
  costo_repuestos: number;
  costo_mano_obra: number;
  costo_gestion_compra?: number;
  precio_total?: number;
}

/**
 * Respuesta del historial de pagos
 */
export interface HistorialPagosResponse {
  historial: PagoRecibido[];
  total_resultados: number;
  moneda: string;
}

/**
 * Respuesta genérica de la API
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// ============================================================================
// FUNCIONES DEL SERVICIO
// ============================================================================

/**
 * Obtiene el estado actual de la cuenta de Mercado Pago del proveedor
 */
export const obtenerEstadoCuenta = async (): Promise<ApiResponse<CuentaMercadoPagoProveedor>> => {
  try {
    const response = await api.get('/mercadopago/cuenta-proveedor/mi-cuenta/');
    return {
      success: true,
      data: response.data
    };
  } catch (error: any) {
    // Solo loguear en modo desarrollo para evitar spam en consola
    if (__DEV__) {
      console.log('Estado de cuenta MP - manejando respuesta de error:', error.response?.status);
    }
    
    // Si es 404 o 400, significa que no tiene cuenta configurada o perfil de proveedor
    // Esto es un estado válido durante el onboarding
    if (error.response?.status === 404 || error.response?.status === 400) {
      return {
        success: true,
        data: {
          id: 0,
          estado: 'no_configurada',
          estado_display: 'Sin configurar',
          email_mp: null,
          user_id_mp: null,
          nombre_cuenta: null,
          fecha_conexion: null,
          fecha_actualizacion: new Date().toISOString(),
          puede_recibir_pagos: false,
          mensaje_estado: error.response?.status === 400 
            ? 'Completa tu perfil de proveedor para configurar Mercado Pago.'
            : 'No tienes una cuenta de Mercado Pago configurada. Conecta tu cuenta para recibir pagos directos de los clientes.'
        }
      };
    }
    
    return {
      success: false,
      error: error.response?.data?.error || error.message || 'Error al obtener estado de la cuenta'
    };
  }
};

/**
 * Inicia el proceso de conexión OAuth con Mercado Pago
 */
export const iniciarConexion = async (): Promise<ApiResponse<IniciarConexionResponse>> => {
  try {
    const response = await api.get('/mercadopago/cuenta-proveedor/iniciar-conexion/');
    return {
      success: true,
      data: response.data
    };
  } catch (error: any) {
    console.error('Error iniciando conexión con MP:', error);
    
    // Detectar error 503 específico (servicio no disponible - configuración faltante)
    if (error.response?.status === 503) {
      const errorMessage = error.response?.data?.error || 'La integración con Mercado Pago no está configurada correctamente en el servidor. Por favor, contacta al soporte.';
      return {
        success: false,
        error: errorMessage,
        isConfigurationError: true // Marcar como error de configuración
      };
    }
    
    return {
      success: false,
      error: error.response?.data?.error || error.message || 'Error al iniciar la conexión con Mercado Pago'
    };
  }
};

/**
 * Procesa el callback de OAuth después de la autorización
 */
export const procesarCallbackOAuth = async (
  data: CallbackOAuthData
): Promise<ApiResponse<CallbackOAuthResponse>> => {
  try {
    const response = await api.post('/mercadopago/cuenta-proveedor/callback-oauth/', data);
    return {
      success: true,
      data: response.data
    };
  } catch (error: any) {
    console.error('Error procesando callback OAuth:', error);
    return {
      success: false,
      error: error.response?.data?.error || error.message || 'Error al procesar la autorización de Mercado Pago'
    };
  }
};

/**
 * Desconecta la cuenta de Mercado Pago del proveedor
 */
export const desconectarCuenta = async (): Promise<ApiResponse<CuentaMercadoPagoProveedor>> => {
  try {
    const response = await api.post('/mercadopago/cuenta-proveedor/desconectar/');
    return {
      success: true,
      data: response.data,
      message: 'Cuenta de Mercado Pago desconectada exitosamente'
    };
  } catch (error: any) {
    console.error('Error desconectando cuenta MP:', error);
    return {
      success: false,
      error: error.response?.data?.error || error.message || 'Error al desconectar la cuenta de Mercado Pago'
    };
  }
};

/**
 * Reconecta una cuenta de Mercado Pago previamente desconectada
 */
export const reconectarCuenta = async (): Promise<ApiResponse<IniciarConexionResponse>> => {
  try {
    const response = await api.get('/mercadopago/cuenta-proveedor/reconectar/');
    return {
      success: true,
      data: response.data
    };
  } catch (error: any) {
    console.error('Error reconectando cuenta MP:', error);
    return {
      success: false,
      error: error.response?.data?.error || error.message || 'Error al reconectar la cuenta de Mercado Pago'
    };
  }
};

/**
 * Verifica el estado de la conexión con Mercado Pago
 */
export const verificarConexion = async (): Promise<ApiResponse<{ conectado: boolean; mensaje: string }>> => {
  try {
    const response = await api.get('/mercadopago/cuenta-proveedor/verificar-conexion/');
    return {
      success: true,
      data: response.data
    };
  } catch (error: any) {
    console.error('Error verificando conexión MP:', error);
    return {
      success: false,
      error: error.response?.data?.error || error.message || 'Error al verificar la conexión'
    };
  }
};

/**
 * Obtiene las estadísticas de pagos recibidos
 */
export const obtenerEstadisticasPagos = async (): Promise<ApiResponse<EstadisticasPagosMP>> => {
  try {
    const response = await api.get('/mercadopago/cuenta-proveedor/estadisticas-pagos/');
    return {
      success: true,
      data: response.data
    };
  } catch (error: any) {
    console.error('Error obteniendo estadísticas de pagos MP:', error);
    return {
      success: false,
      error: error.response?.data?.error || error.message || 'Error al obtener estadísticas de pagos'
    };
  }
};

/**
 * Obtiene el historial de pagos recibidos
 */
export const obtenerHistorialPagos = async (): Promise<ApiResponse<HistorialPagosResponse>> => {
  try {
    const response = await api.get('/mercadopago/cuenta-proveedor/historial-pagos/');
    return {
      success: true,
      data: response.data
    };
  } catch (error: any) {
    console.error('Error obteniendo historial de pagos MP:', error);
    return {
      success: false,
      error: error.response?.data?.error || error.message || 'Error al obtener historial de pagos'
    };
  }
};

/**
 * Actualiza la información de la cuenta (sincroniza con Mercado Pago)
 */
export const actualizarInfoCuenta = async (): Promise<ApiResponse<CuentaMercadoPagoProveedor>> => {
  try {
    const response = await api.post('/mercadopago/cuenta-proveedor/actualizar-info/');
    return {
      success: true,
      data: response.data,
      message: 'Información de la cuenta actualizada'
    };
  } catch (error: any) {
    console.error('Error actualizando info de cuenta MP:', error);
    return {
      success: false,
      error: error.response?.data?.error || error.message || 'Error al actualizar la información de la cuenta'
    };
  }
};

// ============================================================================
// UTILIDADES
// ============================================================================

/**
 * Obtiene el color del estado para mostrar en la UI
 */
export const getColorEstado = (estado: EstadoCuentaMP): string => {
  switch (estado) {
    case 'conectada':
      return '#3DB6B1'; // success
    case 'pendiente':
      return '#FFB84D'; // warning
    case 'error':
    case 'suspendida':
      return '#FF5555'; // error
    case 'desconectada':
    case 'no_configurada':
    default:
      return '#999999'; // tertiary
  }
};

/**
 * Obtiene el icono del estado para mostrar en la UI
 */
export const getIconoEstado = (estado: EstadoCuentaMP): string => {
  switch (estado) {
    case 'conectada':
      return 'check-circle';
    case 'pendiente':
      return 'schedule';
    case 'error':
      return 'error';
    case 'suspendida':
      return 'block';
    case 'desconectada':
      return 'link-off';
    case 'no_configurada':
    default:
      return 'add-circle-outline';
  }
};

/**
 * Formatea el monto en pesos chilenos
 */
export const formatearMonto = (monto: number): string => {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(monto);
};

// ============================================================================
// EXPORT DEFAULT
// ============================================================================

const mercadoPagoProveedorService = {
  obtenerEstadoCuenta,
  iniciarConexion,
  procesarCallbackOAuth,
  desconectarCuenta,
  reconectarCuenta,
  verificarConexion,
  obtenerEstadisticasPagos,
  obtenerHistorialPagos,
  actualizarInfoCuenta,
  // Utilidades
  getColorEstado,
  getIconoEstado,
  formatearMonto,
};

export default mercadoPagoProveedorService;

