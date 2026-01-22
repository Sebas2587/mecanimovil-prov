import api from './api';

// Tipos para créditos
export interface PaqueteCreditos {
  id: number;
  nombre: string;
  cantidad_creditos: number;
  precio: number;
  precio_por_credito: number;
  bonificacion_creditos: number;
  total_creditos: number;
  activo: boolean;
  orden: number;
  destacado: boolean;
}

export interface CompraCreditos {
  id: number;
  proveedor: number;
  proveedor_nombre: string;
  paquete: PaqueteCreditos;
  cantidad_creditos: number;
  precio_total: number;
  metodo_pago: 'mercadopago' | 'transferencia' | 'migracion';
  metodo_pago_display: string;
  estado: 'pendiente' | 'completada' | 'cancelada' | 'reembolsada';
  estado_display: string;
  payment_id_mp?: string | null;
  fecha_compra: string;
  fecha_expiracion_creditos: string;
  datos_bancarios?: {
    banco: string;
    cuenta: string;
    tipo_cuenta: string;
    rut: string;
    nombre: string;
    email?: string;
  };
  mercadopago?: {
    preference_id: string;
    init_point: string;
    sandbox_init_point: string;
  };
}

export interface DatosBancarios {
  transferencia: {
    banco: string;
    cuenta: string;
    tipo_cuenta: string;
    rut: string;
    nombre: string;
    email: string;
  };
  mercadopago: {
    nombre: string;
    rut: string;
    cuenta: string;
    tipo_cuenta: string;
    email: string;
  };
}

export interface CreditoProveedor {
  id: number;
  proveedor: number;
  proveedor_nombre: string;
  saldo_creditos: number;
  fecha_ultima_compra: string | null;
  fecha_ultimo_consumo: string | null;
  creditos_expirados: number;
}

export interface ConsumoCredito {
  id: number;
  proveedor: number;
  proveedor_nombre: string;
  oferta: string;
  oferta_id: string;
  servicio: number;
  servicio_nombre: string;
  creditos_consumidos: number;
  precio_credito: number;
  fecha_consumo: string;
}

export interface EstadisticasCreditos {
  saldo_actual: number;
  creditos_consumidos_mes: number;
  creditos_comprados_mes: number;
  creditos_expirados: number;
  fecha_ultima_compra: string | null;
  fecha_ultimo_consumo: string | null;
  proxima_expiracion: {
    fecha: string | null;
    creditos: number | null;
    dias_restantes: number | null;
  };
  historial_consumos: Array<{
    id: number;
    servicio: string;
    creditos_consumidos: number;
    fecha_consumo: string;
  }>;
  historial_compras: Array<{
    id: number;
    paquete: string;
    cantidad_creditos: number;
    precio_total: number;
    estado: string;
    fecha_compra: string;
  }>;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Obtiene el saldo actual de créditos del proveedor
 */
export const obtenerSaldo = async (): Promise<ApiResponse<CreditoProveedor>> => {
  try {
    // El endpoint es /suscripciones/creditos/mi-saldo/mi-saldo/ porque:
    // - router registra 'mi-saldo' como base
    // - action tiene url_path='mi-saldo'
    const response = await api.get('/suscripciones/creditos/mi-saldo/mi-saldo/');
    return {
      success: true,
      data: response.data
    };
  } catch (error: any) {
    console.error('Error obteniendo saldo de créditos:', error);
    return {
      success: false,
      error: error.response?.data?.error || error.message || 'Error al obtener saldo de créditos'
    };
  }
};

/**
 * Obtiene todos los paquetes de créditos disponibles
 */
export const obtenerPaquetes = async (): Promise<ApiResponse<PaqueteCreditos[]>> => {
  try {
    const response = await api.get('/suscripciones/creditos/paquetes/disponibles/');
    
    let paquetes: PaqueteCreditos[] = [];
    
    if (response.data && Array.isArray(response.data)) {
      paquetes = response.data;
    } else if (response.data?.results && Array.isArray(response.data.results)) {
      paquetes = response.data.results;
    }
    
    return {
      success: true,
      data: paquetes
    };
  } catch (error: any) {
    console.error('Error obteniendo paquetes de créditos:', error);
    return {
      success: false,
      error: error.response?.data?.error || error.message || 'Error al obtener paquetes de créditos'
    };
  }
};

/**
 * Crea una compra de créditos
 */
export const comprarCreditos = async (
  paqueteId: number,
  metodoPago: 'mercadopago' | 'transferencia' = 'mercadopago'
): Promise<ApiResponse<CompraCreditos>> => {
  try {
    const response = await api.post('/suscripciones/creditos/compras/', {
      paquete_id: paqueteId,
      metodo_pago: metodoPago
    });
    
    return {
      success: true,
      data: response.data
    };
  } catch (error: any) {
    console.error('Error comprando créditos:', error);
    
    let errorMessage = 'Error al comprar créditos';
    if (error.response?.data) {
      if (typeof error.response.data === 'string') {
        errorMessage = error.response.data;
      } else if (error.response.data.error) {
        errorMessage = error.response.data.error;
      } else if (error.response.data.message) {
        errorMessage = error.response.data.message;
      } else if (typeof error.response.data === 'object') {
        const firstKey = Object.keys(error.response.data)[0];
        if (firstKey) {
          const firstError = error.response.data[firstKey];
          if (Array.isArray(firstError) && firstError.length > 0) {
            errorMessage = `${firstKey}: ${firstError[0]}`;
          } else if (typeof firstError === 'string') {
            errorMessage = `${firstKey}: ${firstError}`;
          }
        }
      }
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    return {
      success: false,
      error: errorMessage
    };
  }
};

/**
 * Confirma el pago de una compra de créditos
 */
export const confirmarPago = async (
  compraId: number,
  paymentIdMp?: string
): Promise<ApiResponse<CreditoProveedor>> => {
  try {
    const response = await api.post(`/suscripciones/creditos/compras/${compraId}/confirmar-pago/`, {
      payment_id_mp: paymentIdMp
    });
    
    return {
      success: true,
      data: response.data
    };
  } catch (error: any) {
    console.error('Error confirmando pago:', error);
    return {
      success: false,
      error: error.response?.data?.error || error.message || 'Error al confirmar pago'
    };
  }
};

/**
 * Cancela una compra de créditos pendiente
 */
export const cancelarCompra = async (compraId: number): Promise<ApiResponse<CompraCreditos>> => {
  try {
    const response = await api.post(`/suscripciones/creditos/compras/${compraId}/cancelar/`);
    return {
      success: true,
      data: response.data
    };
  } catch (error: any) {
    console.error('Error cancelando compra:', error);
    return {
      success: false,
      error: error.response?.data?.error || error.message || 'Error al cancelar compra'
    };
  }
};

/**
 * Obtiene estadísticas completas de créditos
 */
export const obtenerEstadisticas = async (): Promise<ApiResponse<EstadisticasCreditos>> => {
  try {
    const response = await api.get('/suscripciones/creditos/mi-saldo/estadisticas/');
    return {
      success: true,
      data: response.data
    };
  } catch (error: any) {
    console.error('Error obteniendo estadísticas de créditos:', error);
    return {
      success: false,
      error: error.response?.data?.error || error.message || 'Error al obtener estadísticas'
    };
  }
};

/**
 * Obtiene el historial de consumos de créditos
 */
export const obtenerHistorialConsumos = async (limit: number = 50): Promise<ApiResponse<ConsumoCredito[]>> => {
  try {
    const response = await api.get(`/suscripciones/creditos/mi-saldo/historial-consumos/?limit=${limit}`);
    return {
      success: true,
      data: response.data
    };
  } catch (error: any) {
    console.error('Error obteniendo historial de consumos:', error);
    return {
      success: false,
      error: error.response?.data?.error || error.message || 'Error al obtener historial de consumos'
    };
  }
};

/**
 * Obtiene el historial de compras de créditos
 */
export const obtenerHistorialCompras = async (limit: number = 50): Promise<ApiResponse<CompraCreditos[]>> => {
  try {
    const response = await api.get(`/suscripciones/creditos/mi-saldo/historial-compras/?limit=${limit}`);
    return {
      success: true,
      data: response.data
    };
  } catch (error: any) {
    console.error('Error obteniendo historial de compras:', error);
    return {
      success: false,
      error: error.response?.data?.error || error.message || 'Error al obtener historial de compras'
    };
  }
};

/**
 * Respuesta de verificación de créditos para oferta
 */
export interface VerificacionCreditosOferta {
  puede_ofertar: boolean;
  saldo_actual: number;
  creditos_necesarios: number;
  creditos_faltantes: number;
  detalle_servicios: Array<{
    servicio_id: number;
    nombre: string;
    creditos: number;
  }>;
  mensaje: string;
}

/**
 * Verifica si el proveedor tiene créditos suficientes para crear una oferta
 * @param solicitudId - ID de la solicitud
 * @param serviciosIds - IDs de los servicios a ofertar (opcional)
 */
export const verificarCreditosOferta = async (
  solicitudId?: string,
  serviciosIds?: number[]
): Promise<ApiResponse<VerificacionCreditosOferta>> => {
  try {
    const body: { solicitud_id?: string; servicios_ids?: number[] } = {};
    
    if (solicitudId) {
      body.solicitud_id = solicitudId;
    }
    if (serviciosIds && serviciosIds.length > 0) {
      body.servicios_ids = serviciosIds;
    }
    
    const response = await api.post('/suscripciones/creditos/mi-saldo/verificar-creditos-oferta/', body);
    return {
      success: true,
      data: response.data
    };
  } catch (error: any) {
    console.error('Error verificando créditos para oferta:', error);
    return {
      success: false,
      error: error.response?.data?.error || error.message || 'Error al verificar créditos'
    };
  }
};

/**
 * Obtiene los datos bancarios oficiales de MecaniMovil
 */
export const obtenerDatosBancarios = async (): Promise<ApiResponse<DatosBancarios>> => {
  try {
    const response = await api.get('/suscripciones/creditos/compras/datos-bancarios/');
    return {
      success: true,
      data: response.data
    };
  } catch (error: any) {
    console.error('Error obteniendo datos bancarios:', error);
    return {
      success: false,
      error: error.response?.data?.error || error.message || 'Error al obtener datos bancarios'
    };
  }
};

/**
 * Respuesta de verificación de pago
 */
export interface VerificacionPagoResponse {
  status: string;
  compra?: CompraCreditos;
  preference_id?: string;
  payment_id?: string;
  mensaje: string;
  creditos_acreditados: boolean;
  error?: string;
}

/**
 * Verifica el estado de pago de una compra de créditos consultando a Mercado Pago
 */
export const verificarPago = async (compraId: number): Promise<ApiResponse<VerificacionPagoResponse>> => {
  try {
    const response = await api.get(`/suscripciones/creditos/compras/${compraId}/verificar-pago/`);
    return {
      success: true,
      data: response.data
    };
  } catch (error: any) {
    console.error('Error verificando pago:', error);
    return {
      success: false,
      error: error.response?.data?.error || error.message || 'Error al verificar pago'
    };
  }
};

/**
 * Respuesta de compras pendientes
 */
export interface ComprasPendientesResponse {
  compras: (CompraCreditos & {
    puede_reintentar: boolean;
    mensaje: string;
  })[];
  total: number;
}

/**
 * Obtiene las compras pendientes del proveedor
 */
export const obtenerComprasPendientes = async (): Promise<ApiResponse<ComprasPendientesResponse>> => {
  try {
    const response = await api.get('/suscripciones/creditos/compras/pendientes/');
    return {
      success: true,
      data: response.data
    };
  } catch (error: any) {
    console.error('Error obteniendo compras pendientes:', error);
    return {
      success: false,
      error: error.response?.data?.error || error.message || 'Error al obtener compras pendientes'
    };
  }
};

/**
 * Reintenta el pago de una compra pendiente (genera nueva URL de MP)
 */
export const reintentarPago = async (compraId: number): Promise<ApiResponse<CompraCreditos>> => {
  try {
    const response = await api.post(`/suscripciones/creditos/compras/${compraId}/reintentar-pago/`);
    return {
      success: true,
      data: response.data
    };
  } catch (error: any) {
    console.error('Error reintentando pago:', error);
    return {
      success: false,
      error: error.response?.data?.error || error.message || 'Error al reintentar pago'
    };
  }
};

const creditosService = {
  obtenerSaldo,
  obtenerPaquetes,
  comprarCreditos,
  confirmarPago,
  cancelarCompra,
  obtenerEstadisticas,
  obtenerHistorialConsumos,
  obtenerHistorialCompras,
  verificarCreditosOferta,
  obtenerDatosBancarios,
  verificarPago,
  obtenerComprasPendientes,
  reintentarPago,
};

export default creditosService;

