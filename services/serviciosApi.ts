/**
 * API para gestión de servicios de proveedores
 */

import { getAPI } from './api';

// Interfaces para TypeScript
export interface ServicioOferta {
  id: number;
  servicio?: number;
  servicio_info: {
    id: number;
    nombre: string;
    descripcion: string;
    requiere_repuestos: boolean;
    foto: string | null;
  };
  tipo_servicio: 'con_repuestos' | 'sin_repuestos';
  disponible: boolean;
  duracion_estimada?: string;
  incluye_garantia: boolean;
  duracion_garantia: number;
  detalles_adicionales: string;
  repuestos_seleccionados: RepuestoSeleccionado[];
  repuestos_info: Repuesto[];
  costo_mano_de_obra_sin_iva: number;
  costo_repuestos_sin_iva: number;
  fotos_urls: string[];
  precio_publicado_cliente: number;
  comision_mecanmovil: number;
  iva_sobre_comision: number;
  ganancia_neta_proveedor: number;
  desglose_precios: DesglosePrecios;
  fecha_creacion: string;
  ultima_actualizacion: string;
}

export interface RepuestoSeleccionado {
  id: number;
  cantidad?: number;
  precio?: number;
}

export interface Repuesto {
  id: number;
  nombre: string;
  descripcion: string;
  codigo_fabricante?: string;
  marca: string;
  precio_referencia: number;
  foto?: string;
  categoria_repuesto: string;
  activo: boolean;
  fecha_creacion: string;
  cantidad_estimada?: number;
  es_opcional?: boolean;
}

export interface RepuestoDetallado {
  id: number;
  nombre: string;
  descripcion: string;
  precio_referencia: number;
  cantidad_estimada?: number;
  marca?: string;
  categoria_repuesto?: string;
  codigo_fabricante?: string;
  foto?: string | null;
  precio?: number | null; // Precio personalizado configurado por el proveedor (si difiere del precio_referencia)
}

export interface ServicioConfiguradoParaOferta {
  id: number;
  servicio: number;
  servicio_info: {
    id: number;
    nombre: string;
    descripcion: string;
    requiere_repuestos: boolean;
    foto: string | null;
  };
  marca_vehiculo_seleccionada: number | null;
  marca_vehiculo_info: {
    id: number;
    nombre: string;
    logo: string | null;
  } | null;
  tipo_servicio: 'con_repuestos' | 'sin_repuestos';
  repuestos_seleccionados: RepuestoSeleccionado[];
  repuestos_info: Repuesto[];
  repuestos_info_detallado: RepuestoDetallado[];
  costo_mano_de_obra_sin_iva: string;
  costo_repuestos_sin_iva: string;
  detalles_adicionales: string | null;
  disponible: boolean;
  duracion_estimada?: string | null;
  incluye_garantia: boolean;
  duracion_garantia: number;
  fotos_urls: string[];
  precio_publicado_cliente: string;
  comision_mecanmovil: string;
  iva_sobre_comision: string;
  ganancia_neta_proveedor: string;
  desglose_precios: DesglosePrecios;
  fecha_creacion: string;
  ultima_actualizacion: string;
}

export interface ServicioParaSolicitudResponse {
  servicio_configurado: ServicioConfiguradoParaOferta | null;
  mensaje: string;
}

export interface MarcaVehiculo {
  id: number;
  nombre: string;
  logo?: string;
}

export interface Servicio {
  id: number;
  nombre: string;
  descripcion: string;
  duracion_estimada_base?: string;
  calificacion_promedio: number;
  foto?: string;
  requiere_repuestos: boolean;
  precio_referencia: number;
}

export interface DesglosePrecios {
  costo_total_sin_iva: number;
  iva_19_porciento: number;
  precio_final_cliente: number;
  comision_mecanmovil_20_porciento: number;
  iva_sobre_comision: number;
  ganancia_neta_proveedor: number;
  monto_transferido: number;
}

export interface EstadisticasProveedor {
  total_ofertas: number;
  ofertas_activas: number;
  ofertas_con_repuestos: number;
  ofertas_sin_repuestos: number;
  ganancia_potencial_total: number;
}

export interface CrearServicioData {
  tipo_servicio: 'con_repuestos' | 'sin_repuestos';
  servicio?: number;
  detalles_adicionales: string;
  costo_mano_de_obra_sin_iva: number;
  costo_repuestos_sin_iva: number;
  repuestos_seleccionados: RepuestoSeleccionado[];
  fotos_urls: string[];
  disponible: boolean;
  incluye_garantia?: boolean;
  duracion_garantia?: number;
  duracion_estimada?: string;
}

// =====================================
// API de Servicios para Proveedores
// =====================================

export const serviciosProveedorAPI = {
  /**
   * Obtiene todos los servicios del proveedor autenticado
   */
  obtenerMisServicios: async (): Promise<ServicioOferta[]> => {
    console.log('🔧 Obteniendo servicios del proveedor...');

    try {
      const api = await getAPI();
      const response = await api.get('/servicios/proveedor/mis-servicios/');
      console.log(`✅ Servicios obtenidos: ${response.data.length} servicios`);
      return response.data;
    } catch (error) {
      console.error('❌ Error obteniendo servicios del proveedor:', error);
      throw error;
    }
  },

  /**
   * Obtiene estadísticas resumen del proveedor
   */
  obtenerEstadisticas: async (): Promise<EstadisticasProveedor> => {
    console.log('📊 Obteniendo estadísticas del proveedor...');

    try {
      const api = await getAPI();
      const response = await api.get('/servicios/proveedor/mis-servicios/resumen_estadisticas/');
      console.log('✅ Estadísticas obtenidas:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error obteniendo estadísticas:', error);
      throw error;
    }
  },

  /**
   * Crea un nuevo servicio
   */
  crearServicio: async (datos: CrearServicioData): Promise<ServicioOferta> => {
    console.log('🚀 Creando nuevo servicio:', datos);

    try {
      const api = await getAPI();
      const response = await api.post('/servicios/proveedor/mis-servicios/', datos);
      console.log('✅ Servicio creado exitosamente:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error creando servicio:', error);
      throw error;
    }
  },

  /**
   * Actualiza un servicio existente
   */
  actualizarServicio: async (id: number, datos: Partial<CrearServicioData>): Promise<ServicioOferta> => {
    console.log('📝 Actualizando servicio:', { id, datos });

    try {
      const api = await getAPI();
      const response = await api.patch(`/servicios/proveedor/mis-servicios/${id}/`, datos);
      console.log('✅ Servicio actualizado exitosamente');
      return response.data;
    } catch (error: any) {
      console.error('❌ Error actualizando servicio:', error);
      if (error.response) {
        console.error('❌ Datos del error response:', JSON.stringify(error.response.data, null, 2));
        console.error('❌ Status:', error.response.status);
      }
      throw error;
    }
  },

  /**
   * Cambia la disponibilidad de un servicio
   */
  cambiarDisponibilidad: async (id: number, disponible: boolean): Promise<{ mensaje: string; disponible: boolean }> => {
    console.log(`🔄 Cambiando disponibilidad del servicio ${id} a ${disponible ? 'activo' : 'inactivo'}`);

    try {
      const api = await getAPI();
      const response = await api.post(
        `/servicios/proveedor/mis-servicios/${id}/cambiar_disponibilidad/`,
        { disponible }
      );
      console.log('✅ Disponibilidad cambiada:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error cambiando disponibilidad:', error);
      throw error;
    }
  },

  /**
   * Elimina un servicio
   */
  eliminarServicio: async (id: number): Promise<void> => {
    console.log(`🗑️ Eliminando servicio ${id}`);

    try {
      const api = await getAPI();
      await api.delete(`/servicios/proveedor/mis-servicios/${id}/`);
      console.log('✅ Servicio eliminado exitosamente');
    } catch (error) {
      console.error('❌ Error eliminando servicio:', error);
      throw error;
    }
  },

  /**
   * Calcula preview de precios sin guardar
   */
  calcularPreview: async (costoManoObra: number, costoRepuestos: number = 0): Promise<DesglosePrecios> => {
    try {
      const api = await getAPI();
      const response = await api.get(
        `/servicios/proveedor/mis-servicios/calcular_preview/?costo_mano_obra=${costoManoObra}&costo_repuestos=${costoRepuestos}`
      );
      return response.data;
    } catch (error) {
      console.error('❌ Error calculando preview de precios:', error);
      throw error;
    }
  },

  /**
   * Obtiene un servicio específico por ID
   */
  obtenerServicioPorId: async (id: number): Promise<ServicioOferta> => {
    console.log(`🔍 Obteniendo servicio ${id}`);

    try {
      const api = await getAPI();
      const response = await api.get(`/servicios/proveedor/mis-servicios/${id}/`);
      console.log('✅ Servicio obtenido:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error obteniendo servicio:', error);
      throw error;
    }
  },

  /**
   * Obtiene el servicio configurado del proveedor para una solicitud específica.
   * Busca OfertaServicio que coincida con el servicio solicitado y la marca del vehículo.
   * 
   * @param solicitudId - UUID de la solicitud pública
   * @param servicioId - ID del servicio solicitado
   * @returns Servicio configurado o null si no existe
   */
  obtenerServicioParaSolicitud: async (
    solicitudId: string,
    servicioId: number
  ): Promise<ServicioConfiguradoParaOferta | null> => {
    console.log(`🔍 Obteniendo servicio configurado para solicitud ${solicitudId}, servicio ${servicioId} (tipo: ${typeof servicioId})`);

    try {
      const api = await getAPI();
      const url = `/servicios/proveedor/mis-servicios/para_solicitud/?solicitud_id=${solicitudId}&servicio_id=${servicioId}`;
      console.log(`📡 URL de petición: ${url}`);

      const response = await api.get<ServicioParaSolicitudResponse>(url);

      console.log(`📥 Respuesta del servidor:`, {
        tiene_servicio_configurado: !!response.data.servicio_configurado,
        mensaje: response.data.mensaje,
        debug_info: response.data.debug_info || null
      });

      if (response.data.servicio_configurado) {
        console.log('✅ Servicio configurado encontrado:', {
          id: response.data.servicio_configurado.id,
          nombre: response.data.servicio_configurado.servicio_info.nombre,
          tipo: response.data.servicio_configurado.tipo_servicio,
          marca: response.data.servicio_configurado.marca_vehiculo_info?.nombre || 'Genérico'
        });
        return response.data.servicio_configurado;
      } else {
        console.log('ℹ️ No se encontró servicio configurado para esta combinación');
        if (response.data.debug_info) {
          console.log('🔍 Información de debug:', response.data.debug_info);
        }
        return null;
      }
    } catch (error: any) {
      console.error('❌ Error obteniendo servicio para solicitud:', {
        error: error.message,
        status: error.response?.status,
        data: error.response?.data,
        url: error.config?.url
      });
      // Si el error es 404 o 400, retornar null en lugar de lanzar error
      if (error.response?.status === 404 || error.response?.status === 400) {
        console.log('ℹ️ Servicio configurado no encontrado (error esperado)');
        if (error.response?.data?.debug_info) {
          console.log('🔍 Información de debug del error:', error.response.data.debug_info);
        }
        return null;
      }
      throw error;
    }
  },
};

// =====================================
// API de Catálogos (Marcas, Servicios, Repuestos)
// =====================================

export const catalogosAPI = {
  /**
   * Obtiene todas las marcas de vehículos
   */
  obtenerMarcas: async (): Promise<MarcaVehiculo[]> => {
    console.log('🚗 Obteniendo marcas de vehículos...');

    try {
      const api = await getAPI();
      const response = await api.get('/vehiculos/marcas/');
      const marcas = response.data.results || response.data;
      console.log(`✅ Marcas obtenidas: ${marcas.length} marcas`);
      return marcas;
    } catch (error) {
      console.error('❌ Error obteniendo marcas:', error);
      throw error;
    }
  },

  /**
   * Obtiene servicios disponibles (opcionalmente filtrados por marca)
   */
  obtenerServicios: async (marcaId?: number): Promise<Servicio[]> => {
    console.log('⚙️ Obteniendo servicios disponibles...', { marcaId });

    try {
      const api = await getAPI();
      const params = marcaId ? `?marca=${marcaId}` : '';
      const response = await api.get(`/servicios/servicios/${params}`);
      const servicios = response.data.results || response.data;
      console.log(`✅ Servicios obtenidos: ${servicios.length} servicios`);
      return servicios;
    } catch (error) {
      console.error('❌ Error obteniendo servicios:', error);
      throw error;
    }
  },

  /**
   * Obtiene repuestos asociados a un servicio específico
   */
  obtenerRepuestosPorServicio: async (servicioId: number): Promise<Repuesto[]> => {
    console.log('🔩 Obteniendo repuestos para servicio:', servicioId);

    try {
      const api = await getAPI();
      const response = await api.get(`/servicios/repuestos/por_servicio/?servicio=${servicioId}`);
      console.log(`✅ Repuestos obtenidos: ${response.data.length} repuestos`);
      return response.data;
    } catch (error) {
      console.error('❌ Error obteniendo repuestos:', error);
      throw error;
    }
  },

  /**
   * Obtiene todos los repuestos (con filtros opcionales)
   */
  obtenerRepuestos: async (categoria?: string, busqueda?: string): Promise<Repuesto[]> => {
    console.log('🔩 Obteniendo catálogo de repuestos...', { categoria, busqueda });

    try {
      const api = await getAPI();
      let url = '/servicios/repuestos/';
      const params = new URLSearchParams();

      if (categoria) params.append('categoria', categoria);
      if (busqueda) params.append('search', busqueda);

      if (params.toString()) url += `?${params.toString()}`;

      const response = await api.get(url);
      const repuestos = response.data.results || response.data;
      console.log(`✅ Repuestos obtenidos: ${repuestos.length} repuestos`);
      return repuestos;
    } catch (error) {
      console.error('❌ Error obteniendo repuestos:', error);
      throw error;
    }
  },

  /**
   * Obtiene repuestos por categoría específica
   */
  obtenerRepuestosPorCategoria: async (categoria: string): Promise<Repuesto[]> => {
    console.log('📦 Obteniendo repuestos por categoría:', categoria);

    try {
      const api = await getAPI();
      const response = await api.get(`/servicios/repuestos/por_categoria/?categoria=${categoria}`);
      console.log(`✅ Repuestos de categoría obtenidos: ${response.data.length} repuestos`);
      return response.data;
    } catch (error) {
      console.error('❌ Error obteniendo repuestos por categoría:', error);
      throw error;
    }
  },
};

// =====================================
// Utilidades y Helpers
// =====================================

export const serviciosUtils = {
  /**
   * Formatea el precio para mostrar
   */
  formatearPrecio: (precio: number): string => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
    }).format(precio);
  },

  /**
   * Calcula el ahorro total por ofrecer un servicio
   */
  calcularAhorro: (precioOriginal: number, precioOferta: number): number => {
    return Math.max(0, precioOriginal - precioOferta);
  },

  /**
   * Calcula el porcentaje de descuento
   */
  calcularPorcentajeDescuento: (precioOriginal: number, precioOferta: number): number => {
    if (precioOriginal <= 0) return 0;
    return Math.round(((precioOriginal - precioOferta) / precioOriginal) * 100);
  },

  /**
   * Valida los datos de creación de servicio
   */
  validarDatosServicio: (datos: CrearServicioData): string[] => {
    const errores: string[] = [];

    if (!datos.costo_mano_de_obra_sin_iva || datos.costo_mano_de_obra_sin_iva <= 0) {
      errores.push('El costo de mano de obra debe ser mayor a 0');
    }

    if (datos.tipo_servicio === 'con_repuestos') {
      if (!datos.servicio) {
        errores.push('Debe seleccionar un tipo de servicio para servicios con repuestos');
      }
    }

    if (!datos.detalles_adicionales || datos.detalles_adicionales.trim().length < 10) {
      errores.push('La descripción debe tener al menos 10 caracteres');
    }

    if (datos.tipo_servicio === 'sin_repuestos' && datos.costo_repuestos_sin_iva > 0) {
      errores.push('Los servicios sin repuestos no pueden tener costo de repuestos');
    }

    return errores;
  },

  /**
   * Obtiene el texto descriptivo del tipo de servicio
   */
  obtenerTextoTipoServicio: (tipo: 'con_repuestos' | 'sin_repuestos'): string => {
    return tipo === 'con_repuestos' ? 'Con repuestos incluidos' : 'Solo mano de obra';
  },

  /**
   * Obtiene el color para el estado del servicio
   */
  obtenerColorEstado: (disponible: boolean): string => {
    return disponible ? '#10B981' : '#EF4444';
  },

  /**
   * Formatea la fecha de creación del servicio
   */
  formatearFecha: (fecha: string): string => {
    return new Date(fecha).toLocaleDateString('es-CL', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  },
};

export default {
  serviciosProveedorAPI,
  catalogosAPI,
  serviciosUtils,
};
