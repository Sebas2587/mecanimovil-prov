import api, { getAPI } from './api';
import * as SecureStore from 'expo-secure-store';

// Tipos para solicitudes públicas
export interface ServicioSolicitado {
  id: number;
  nombre: string;
  descripcion?: string;
  categoria?: string;
}

export interface VehiculoInfo {
  id: number;
  marca: string;
  modelo: string;
  año?: number;
  anio?: number; // Alias para compatibilidad
  patente?: string;
  kilometraje?: number | null;
  tipo_motor?: string | null;
  cilindraje?: string | null;
}

export type MotivoRechazo =
  | 'ocupado'
  | 'lejos'
  | 'no_servicio'
  | 'no_marca'
  | 'precio'
  | 'complejidad'
  | 'recursos'
  | 'politica'
  | 'otro';

export interface RechazoSolicitud {
  id: string;
  solicitud: string;
  proveedor: number;
  proveedor_nombre: string;
  proveedor_info?: {
    id: number;
    nombre: string;
    calificacion?: number;
  } | null;
  tipo_proveedor: 'taller' | 'mecanico';
  motivo: MotivoRechazo;
  motivo_display: string;
  detalle_motivo?: string;
  fecha_rechazo: string;
  tiempo_respuesta?: string | null;
}

export interface SolicitudPublica {
  id: string;
  cliente?: number | null;
  cliente_nombre: string;
  cliente_info?: {
    nombre: string;
    foto_perfil?: string | null;
  } | null;
  vehiculo: number;
  vehiculo_info: VehiculoInfo;
  descripcion_problema: string;
  urgencia: 'normal' | 'urgente';
  requiere_repuestos?: boolean;
  tipo_solicitud: 'global' | 'dirigida';
  proveedores_dirigidos?: number[];
  proveedores_dirigidos_detail?: any[];
  servicios_solicitados: number[];
  servicios_solicitados_detail: ServicioSolicitado[];
  direccion_usuario?: number | null;
  direccion_usuario_info?: {
    id?: number | null;
    direccion: string;
    etiqueta?: string | null;
    detalles?: string | null;
  } | null;
  ubicacion_servicio?: {
    type: 'Point';
    coordinates: [number, number];
  };
  direccion_servicio_texto: string;
  detalles_ubicacion?: string;
  fecha_preferida: string;
  hora_preferida?: string | null;
  estado: 'creada' | 'seleccionando_servicios' | 'publicada' | 'con_ofertas' | 'adjudicada' | 'expirada' | 'cancelada';
  fecha_creacion: string;
  fecha_publicacion?: string | null;
  fecha_expiracion: string;
  tiempo_restante?: string;
  puede_recibir_ofertas: boolean;
  puede_ver_datos_cliente: boolean;
  total_ofertas: number;
  total_visualizaciones: number;
  total_rechazos: number;
  oferta_seleccionada?: string | null;
  oferta_seleccionada_detail?: any;
  ofertas?: any[];
  ofertas_secundarias?: OfertaProveedor[];
  rechazos?: RechazoSolicitud[];
  puede_reenviar?: boolean;
}

export interface DetalleServicioOferta {
  servicio: number;
  precio_servicio: string;
  tiempo_estimado_horas: number; // Número de horas (el backend espera este campo)
  notas?: string;
  repuestos_seleccionados?: Array<{
    id: number;
    cantidad: number;
  }>;
  repuestos_info?: Array<{
    id: number;
    nombre: string;
    descripcion?: string;
    precio_referencia: number;
    cantidad: number;
    marca?: string;
    categoria_repuesto?: string;
  }>;
}

export interface OfertaProveedorData {
  solicitud: string;
  servicios_ofertados: number[];
  detalles_servicios: DetalleServicioOferta[];
  precio_total_ofrecido: string;
  incluye_repuestos: boolean;
  tiempo_estimado_total: string;
  descripcion_oferta: string;
  garantia_ofrecida?: string;
  fecha_disponible: string;
  hora_disponible: string;
  // Campos para ofertas secundarias
  oferta_original?: string;
  es_oferta_secundaria?: boolean;
  motivo_servicio_adicional?: string;
  // Campos de desglose de costos (para ofertas con repuestos)
  costo_repuestos?: string;
  costo_mano_obra?: string;
  costo_gestion_compra?: string;
  foto_cotizacion_repuestos?: string;
}

export interface OfertaProveedor {
  solicitud_estado?: 'creada' | 'seleccionando_servicios' | 'publicada' | 'con_ofertas' | 'adjudicada' | 'pendiente_pago' | 'pagada' | 'en_ejecucion' | 'completada' | 'expirada' | 'cancelada';
  id: string;
  solicitud: string;
  solicitud_detail?: {
    id: string;
    cliente_nombre: string;
    cliente_foto?: string | null;
    vehiculo: {
      id: number;
      marca: string;
      modelo: string;
      año?: number | null;
      patente?: string;
      kilometraje?: number | null;
    } | null;
    descripcion_problema: string;
    urgencia: 'normal' | 'urgente';
    servicios_solicitados: Array<{
      id: number;
      nombre: string;
    }>;
    fecha_preferida: string;
    hora_preferida?: string | null;
    direccion_servicio_texto: string;
    detalles_ubicacion?: string;
  };
  proveedor: number;
  tipo_proveedor: 'taller' | 'mecanico';
  servicios_ofertados: number[];
  detalles_servicios_detail: DetalleServicioOferta[];
  precio_total_ofrecido: string;
  incluye_repuestos: boolean;
  tiempo_estimado_total: string;
  descripcion_oferta: string;
  garantia_ofrecida?: string;
  fecha_disponible: string;
  hora_disponible: string;
  estado: 'enviada' | 'vista' | 'en_chat' | 'aceptada' | 'pendiente_pago' | 'pagada' | 'en_ejecucion' | 'completada' | 'rechazada' | 'retirada' | 'expirada';
  fecha_envio: string;
  nombre_proveedor?: string;
  rating_proveedor?: number;
  // Campos para ofertas secundarias
  oferta_original?: string | null;
  es_oferta_secundaria?: boolean;
  motivo_servicio_adicional?: string;
  ofertas_secundarias?: OfertaProveedor[];
  oferta_original_info?: {
    id: string;
    precio_total_ofrecido: string;
    fecha_envio: string;
    estado: string;
  } | null;
  solicitud_servicio_id?: number | null;
  rechazada_por_expiracion?: boolean;
  // Campos de desglose de costos
  costo_repuestos?: string;
  costo_mano_obra?: string;
  costo_gestion_compra?: string;
  foto_cotizacion_repuestos?: string;
  metodo_pago_cliente?: 'repuestos_adelantado' | 'todo_adelantado' | 'pendiente';
  estado_pago_repuestos?: 'no_aplica' | 'pendiente' | 'pagado';
  estado_pago_servicio?: 'pendiente' | 'pagado';
  proveedor_puede_recibir_pagos?: boolean;
}

export interface MensajeChat {
  id: string;
  oferta: string;
  mensaje: string;
  enviado_por: number;
  es_proveedor: boolean;
  fecha_envio: string;
  leido: boolean;
  fecha_lectura?: string | null;
  nombre_remitente?: string;
  enviado_por_nombre?: string;
  archivo_adjunto?: string | null;
  solicitud_detail?: any; // Add this to fix the error, type could be more specific but 'any' or partial SolicitudDetail is fine for now
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

/**
 * Obtiene las solicitudes disponibles para que el proveedor oferte
 */
export const obtenerSolicitudesDisponibles = async (): Promise<ApiResponse<SolicitudPublica[]>> => {
  try {
    const response = await api.get('/ordenes/solicitudes-publicas/disponibles/');

    // El backend puede devolver FeatureCollection o array directo
    let solicitudes: SolicitudPublica[] = [];

    if (response.data && Array.isArray(response.data)) {
      solicitudes = response.data;
    } else if (response.data?.features && Array.isArray(response.data.features)) {
      // GeoJSON FeatureCollection
      solicitudes = response.data.features.map((feature: any) => ({
        ...feature.properties,
        id: feature.id || feature.properties.id,
        ubicacion_servicio: feature.geometry
      }));
    } else if (response.data?.results && Array.isArray(response.data.results)) {
      // Respuesta paginada
      solicitudes = response.data.results;
    }

    return {
      success: true,
      data: solicitudes
    };
  } catch (error: any) {
    console.error('Error obteniendo solicitudes disponibles:', error);
    return {
      success: false,
      error: error.response?.data?.error || error.message || 'Error al obtener solicitudes'
    };
  }
};

/**
 * Obtiene el detalle de una solicitud específica
 */
export const obtenerDetalleSolicitud = async (id: string): Promise<ApiResponse<SolicitudPublica>> => {
  try {
    const response = await api.get(`/ordenes/solicitudes-publicas/${id}/`);

    // Normalizar respuesta GeoJSON si es necesario
    let solicitud: SolicitudPublica;

    if (response.data.type === 'Feature' && response.data.properties) {
      solicitud = {
        ...response.data.properties,
        id: response.data.id || response.data.properties.id,
        ubicacion_servicio: response.data.geometry
      };
    } else {
      solicitud = response.data;
    }

    return {
      success: true,
      data: solicitud
    };
  } catch (error: any) {
    console.error('Error obteniendo detalle de solicitud:', error);
    return {
      success: false,
      error: error.response?.data?.error || error.message || 'Error al obtener detalle de solicitud'
    };
  }
};

/**
 * Crea una oferta para una solicitud
 */
export const crearOferta = async (datosOferta: OfertaProveedorData): Promise<ApiResponse<OfertaProveedor>> => {
  try {
    console.log('📤 Enviando oferta:', JSON.stringify(datosOferta, null, 2));
    const response = await api.post('/ordenes/ofertas/', datosOferta);

    console.log('✅ Oferta creada exitosamente:', response.data);
    return {
      success: true,
      data: response.data
    };
  } catch (error: any) {
    console.error('❌ Error creando oferta:', error);
    console.error('❌ Error detallado:', error.response?.data);
    console.error('❌ Datos enviados:', JSON.stringify(datosOferta, null, 2));

    // Extraer mensaje de error más detallado
    let errorMessage = 'Error al crear oferta';
    if (error.response?.data) {
      if (typeof error.response.data === 'string') {
        errorMessage = error.response.data;
      } else if (error.response.data.error) {
        errorMessage = error.response.data.error;
      } else if (error.response.data.message) {
        errorMessage = error.response.data.message;
      } else if (typeof error.response.data === 'object') {
        // Intentar extraer el primer error de validación
        const firstKey = Object.keys(error.response.data)[0];
        if (firstKey) {
          const firstError = error.response.data[firstKey];
          if (Array.isArray(firstError) && firstError.length > 0) {
            errorMessage = `${firstKey}: ${firstError[0]}`;
          } else if (typeof firstError === 'string') {
            errorMessage = `${firstKey}: ${firstError}`;
          } else {
            errorMessage = JSON.stringify(error.response.data);
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
 * Obtiene las ofertas enviadas por el proveedor
 */
export const obtenerMisOfertas = async (): Promise<ApiResponse<OfertaProveedor[]>> => {
  try {
    // ✅ Usar getAPI() para obtener la instancia de API correctamente configurada
    const apiInstance = await getAPI();

    console.log('🔄 Obteniendo mis ofertas...');

    // ✅ El backend filtra automáticamente por proveedor en get_queryset()
    // No es necesario enviar el parámetro 'proveedor: me', pero no causa problemas si se envía
    const response = await apiInstance.get('/ordenes/ofertas/');

    console.log('✅ Respuesta recibida:', {
      hasData: !!response.data,
      isArray: Array.isArray(response.data),
      hasResults: !!(response.data?.results),
      resultsCount: response.data?.results?.length || 0,
      dataCount: Array.isArray(response.data) ? response.data.length : 0
    });

    let ofertas: OfertaProveedor[] = [];

    if (response.data && Array.isArray(response.data)) {
      ofertas = response.data;
    } else if (response.data?.results && Array.isArray(response.data.results)) {
      ofertas = response.data.results;
    }

    console.log(`✅ Total ofertas obtenidas: ${ofertas.length}`);

    return {
      success: true,
      data: ofertas
    };
  } catch (error: any) {
    console.error('❌ Error obteniendo mis ofertas:', error);
    console.error('❌ Detalles del error:', {
      message: error?.message,
      code: error?.code,
      status: error?.response?.status,
      statusText: error?.response?.statusText,
      data: error?.response?.data,
      isNetworkError: error?.code === 'NETWORK_ERROR' || error?.message === 'Network Error',
      isAxiosError: error?.isAxiosError
    });

    return {
      success: false,
      error: error.response?.data?.error || error.message || 'Error al obtener ofertas'
    };
  }
};

/**
 * Obtiene el detalle de una oferta específica
 */
export const obtenerDetalleOferta = async (id: string): Promise<ApiResponse<OfertaProveedor>> => {
  try {
    const response = await api.get(`/ordenes/ofertas/${id}/`);

    return {
      success: true,
      data: response.data
    };
  } catch (error: any) {
    console.error('Error obteniendo detalle de oferta:', error);
    return {
      success: false,
      error: error.response?.data?.error || error.message || 'Error al obtener detalle de oferta'
    };
  }
};

/**
 * Obtiene los mensajes del chat de una oferta
 */
export const obtenerChatOferta = async (ofertaId: string): Promise<ApiResponse<MensajeChat[]>> => {
  try {
    console.log(`📨 [SOLICITUDES SERVICE] Obteniendo chat de oferta: ${ofertaId}`);

    // Usar el endpoint correcto con la acción personalizada por_oferta
    const response = await api.get(`/ordenes/chat-solicitudes/por_oferta/${ofertaId}/`);

    console.log(`✅ [SOLICITUDES SERVICE] Chat obtenido - ${response.data.length} mensajes`);

    let mensajes: MensajeChat[] = [];

    if (response.data && Array.isArray(response.data)) {
      mensajes = response.data;
    } else if (response.data?.results && Array.isArray(response.data.results)) {
      mensajes = response.data.results;
    }

    // Los mensajes ya vienen ordenados del backend por fecha de envío
    console.log(`📨 [SOLICITUDES SERVICE] Mensajes procesados: ${mensajes.length}`);

    return {
      success: true,
      data: mensajes
    };
  } catch (error: any) {
    console.error('❌ [SOLICITUDES SERVICE] Error obteniendo chat de oferta:', error);
    return {
      success: false,
      error: error.response?.data?.error || error.message || 'Error al obtener chat'
    };
  }
};

/**
 * Envía un mensaje en el chat de una oferta
 */
export const enviarMensajeChat = async (
  ofertaId: string,
  mensaje: string,
  attachment?: { uri: string; type: string; name: string } | null
): Promise<ApiResponse<MensajeChat>> => {
  try {
    // Si hay un adjunto, usar FormData
    if (attachment) {
      const formData = new FormData();
      formData.append('oferta', ofertaId);
      formData.append('mensaje', mensaje || ''); // Mensaje puede ser vacío si hay foto
      formData.append('es_proveedor', 'true');

      // Detectar tipo de archivo para asegurar MIME type válido
      let tipoArchivo = attachment.type;
      const nombreArchivo = attachment.name;

      // Si el tipo es genérico "image" o no contiene "/", intentar deducir de la extensión
      if (!tipoArchivo || !tipoArchivo.includes('/')) {
        const nombreLower = nombreArchivo.toLowerCase();
        if (nombreLower.endsWith('.png')) {
          tipoArchivo = 'image/png';
        } else if (nombreLower.endsWith('.jpg') || nombreLower.endsWith('.jpeg')) {
          tipoArchivo = 'image/jpeg';
        } else {
          tipoArchivo = 'image/jpeg'; // Default seguro
        }
      }

      // Adjuntar archivo
      // @ts-ignore - React Native FormData expects this format
      formData.append('archivo_adjunto', {
        uri: attachment.uri,
        name: nombreArchivo,
        type: tipoArchivo,
      });

      console.log('📤 [SOLICITUDES SERVICE] Enviando mensaje con adjunto:', attachment.name);

      // Usar fetch nativo para evitar problemas de Network Error con axios + FormData en RN
      // Obtener URL base de la instancia de axios
      const apiInstance = await getAPI();
      const baseURL = apiInstance.defaults.baseURL;
      const token = await SecureStore.getItemAsync('authToken');

      const response = await fetch(`${baseURL}/ordenes/chat-solicitudes/`, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${token}`,
          // Content-Type se establece automáticamente por fetch para FormData
        },
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Error envío fetch:', response.status, errorText);
        throw new Error(`Error ${response.status}: ${errorText}`);
      }

      const responseData = await response.json();

      return {
        success: true,
        data: responseData
      };
    }

    // Si no hay adjunto, usar JSON normal (comportamiento anterior)
    const response = await api.post('/ordenes/chat-solicitudes/', {
      oferta: ofertaId,
      mensaje: mensaje,
      es_proveedor: true
    });

    return {
      success: true,
      data: response.data
    };
  } catch (error: any) {
    console.error('Error enviando mensaje:', error);
    return {
      success: false,
      error: error.response?.data?.error || error.message || 'Error al enviar mensaje'
    };
  }
};

/**
 * Marca los mensajes de una oferta como leídos
 * NOTA: No es necesario llamar a esto explícitamente ya que el endpoint
 * por_oferta ya marca automáticamente los mensajes como leídos
 * @deprecated Esta función ya no es necesaria
 */
export const marcarMensajesComoLeidos = async (ofertaId: string): Promise<ApiResponse<void>> => {
  try {
    // Ya no es necesario hacer esta llamada porque el endpoint por_oferta
    // marca automáticamente los mensajes como leídos
    console.log('marcarMensajesComoLeidos: No es necesario, por_oferta ya lo hace automáticamente');

    return {
      success: true
    };
  } catch (error: any) {
    console.error('Error marcando mensajes como leídos:', error);
    return {
      success: false,
      error: error.response?.data?.error || error.message || 'Error al marcar mensajes como leídos'
    };
  }
};

/**
 * Rechaza una solicitud con un motivo específico
 */
export const rechazarSolicitud = async (
  solicitudId: string,
  motivo: MotivoRechazo,
  detalle?: string
): Promise<ApiResponse<RechazoSolicitud>> => {
  try {
    const response = await api.post(`/ordenes/solicitudes-publicas/${solicitudId}/rechazar/`, {
      motivo,
      detalle_motivo: detalle || ''
    });

    console.log('✅ Solicitud rechazada exitosamente:', response.data);
    return {
      success: true,
      data: response.data.rechazo || response.data,
      message: response.data.message
    };
  } catch (error: any) {
    console.error('❌ Error rechazando solicitud:', error);
    console.error('❌ Error detallado:', error.response?.data);

    let errorMessage = 'Error al rechazar solicitud';
    if (error.response?.data) {
      if (typeof error.response.data === 'string') {
        errorMessage = error.response.data;
      } else if (error.response.data.error) {
        errorMessage = error.response.data.error;
      } else if (error.response.data.message) {
        errorMessage = error.response.data.message;
      } else if (typeof error.response.data === 'object') {
        const firstKey = Object.keys(error.response.data)[0];
        if (firstKey && firstKey !== 'non_field_errors') {
          const firstError = error.response.data[firstKey];
          if (Array.isArray(firstError) && firstError.length > 0) {
            errorMessage = `${firstKey}: ${firstError[0]}`;
          } else if (typeof firstError === 'string') {
            errorMessage = `${firstKey}: ${firstError}`;
          }
        } else if (error.response.data.non_field_errors) {
          errorMessage = Array.isArray(error.response.data.non_field_errors)
            ? error.response.data.non_field_errors[0]
            : error.response.data.non_field_errors;
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
 * Obtiene la lista de todos los chats del proveedor
 * @returns Promise<ChatItem[]> - Lista de chats con metadata
 */
export const obtenerListaChats = async (): Promise<any[]> => {
  try {
    // Verificar autenticación antes de hacer la llamada
    const token = await SecureStore.getItemAsync('authToken');
    if (!token) {
      console.log('⚠️ [SOLICITUDES SERVICE] No hay token, no se puede obtener lista de chats');
      return [];
    }

    console.log('📨 [SOLICITUDES SERVICE] Obteniendo lista de chats');
    const response = await api.get('/ordenes/chat-solicitudes/lista-chats/');
    console.log('✅ [SOLICITUDES SERVICE] Lista de chats obtenida:', response.data);
    return Array.isArray(response.data) ? response.data : [];
  } catch (error: any) {
    // Si es 401, no hay sesión - no es un error crítico, solo retornar array vacío
    if (error.response?.status === 401) {
      console.log('⚠️ [SOLICITUDES SERVICE] No autenticado (401), retornando lista vacía');
      return [];
    }
    console.error('❌ [SOLICITUDES SERVICE] Error al obtener lista de chats:', error);
    if (error.status === 404 || error.response?.status === 404) {
      return [];
    }
    throw error;
  }
};

/**
 * Crea una oferta secundaria (servicio adicional)
 */
export const crearOfertaSecundaria = async (
  solicitudId: string,
  ofertaOriginalId: string,
  datosOferta: OfertaProveedorData
): Promise<ApiResponse<OfertaProveedor>> => {
  try {
    // Agregar campos específicos de oferta secundaria
    const datosOfertaSecundaria = {
      ...datosOferta,
      solicitud: solicitudId,
      oferta_original: ofertaOriginalId,
      es_oferta_secundaria: true,
    };

    console.log('📤 Enviando oferta secundaria:', JSON.stringify(datosOfertaSecundaria, null, 2));
    const response = await api.post('/ordenes/ofertas/', datosOfertaSecundaria);

    console.log('✅ Oferta secundaria creada exitosamente:', response.data);
    return {
      success: true,
      data: response.data
    };
  } catch (error: any) {
    console.error('❌ Error creando oferta secundaria:', error);
    console.error('❌ Error detallado:', error.response?.data);

    let errorMessage = 'Error al crear oferta secundaria';
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
 * Obtiene las ofertas secundarias de una oferta original
 */
export const obtenerOfertasSecundarias = async (
  ofertaOriginalId: string
): Promise<ApiResponse<OfertaProveedor[]>> => {
  try {
    const response = await api.get(`/ordenes/ofertas/ofertas-secundarias/${ofertaOriginalId}/`);

    let ofertas: OfertaProveedor[] = [];

    if (response.data && Array.isArray(response.data)) {
      ofertas = response.data;
    } else if (response.data?.results && Array.isArray(response.data.results)) {
      ofertas = response.data.results;
    }

    return {
      success: true,
      data: ofertas
    };
  } catch (error: any) {
    console.error('Error obteniendo ofertas secundarias:', error);
    return {
      success: false,
      error: error.response?.data?.error || error.message || 'Error al obtener ofertas secundarias'
    };
  }
};

/**
 * Procesa el pago de una oferta secundaria
 */
export const pagarOfertaSecundaria = async (
  ofertaId: string,
  metodoPago: string = 'mercadopago'
): Promise<ApiResponse<any>> => {
  try {
    const response = await api.post(`/ordenes/ofertas/${ofertaId}/pagar-oferta-secundaria/`, {
      metodo_pago: metodoPago
    });

    return {
      success: true,
      data: response.data
    };
  } catch (error: any) {
    console.error('Error pagando oferta secundaria:', error);
    return {
      success: false,
      error: error.response?.data?.error || error.message || 'Error al procesar el pago'
    };
  }
};

/**
 * Inicia el servicio desde una oferta pagada
 */
export const iniciarServicio = async (ofertaId: string): Promise<ApiResponse<OfertaProveedor> & { solicitud_servicio_id?: number }> => {
  try {
    console.log(`🚀 Iniciando servicio para oferta ${ofertaId}...`);
    const response = await api.post(`/ordenes/ofertas/${ofertaId}/iniciar-servicio/`);

    console.log('✅ Servicio iniciado exitosamente:', response.data);
    return {
      success: true,
      data: response.data.oferta,
      solicitud_servicio_id: response.data.solicitud_servicio_id
    };
  } catch (error: any) {
    console.error('❌ Error iniciando servicio:', error);
    let errorMessage = 'Error al iniciar el servicio';
    if (error.response?.data) {
      if (typeof error.response.data === 'string') {
        errorMessage = error.response.data;
      } else if (error.response.data.error) {
        errorMessage = error.response.data.error;
      } else if (error.response.data.message) {
        errorMessage = error.response.data.message;
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
 * Termina el servicio cuando el checklist está completado
 */
export const terminarServicio = async (ofertaId: string): Promise<ApiResponse<OfertaProveedor>> => {
  try {
    console.log(`✅ Terminando servicio para oferta ${ofertaId}...`);
    const response = await api.post(`/ordenes/ofertas/${ofertaId}/terminar-servicio/`);

    console.log('✅ Servicio terminado exitosamente:', response.data);
    return {
      success: true,
      data: response.data.oferta
    };
  } catch (error: any) {
    console.error('❌ Error terminando servicio:', error);
    let errorMessage = 'Error al terminar el servicio';
    if (error.response?.data) {
      if (typeof error.response.data === 'string') {
        errorMessage = error.response.data;
      } else if (error.response.data.error) {
        errorMessage = error.response.data.error;
      } else if (error.response.data.message) {
        errorMessage = error.response.data.message;
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

const solicitudesService = {
  obtenerSolicitudesDisponibles,
  obtenerDetalleSolicitud,
  crearOferta,
  crearOfertaSecundaria,
  obtenerMisOfertas,
  obtenerDetalleOferta,
  obtenerOfertasSecundarias,
  pagarOfertaSecundaria,
  iniciarServicio,
  terminarServicio,
  obtenerChatOferta,
  enviarMensajeChat,
  marcarMensajesComoLeidos,
  rechazarSolicitud,
  obtenerListaChats,
};

export default solicitudesService;

