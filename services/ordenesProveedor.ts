import api from './api';

// Tipos para información protegida del cliente
export interface ClienteProtegido {
  id: number;
  nombre_ofuscado: string;
  telefono_ofuscado: string;
  foto_perfil?: string | null; // URL completa de la foto de perfil
}

export interface ClienteCompleto {
  id: number;
  nombre: string;
  apellido: string;
  email: string;
  telefono: string;
  direccion?: string;
  foto_perfil?: string | null; // URL completa de la foto de perfil
}

export interface InformacionDisponible {
  nivel_acceso: 'completo' | 'parcial' | 'restringido';
  puede_contactar: boolean;
  razon_restriccion?: string;
}

export interface TiempoRespuestaRequerido {
  tiempo_limite: string;
  horas_restantes: number;
  expirado: boolean;
}

export interface Orden {
  id: number;
  cliente_detail: ClienteProtegido | ClienteCompleto;
  vehiculo_detail: {
    marca: string;
    modelo: string;
    año: number;
    placa?: string;
    color?: string;
    numero_motor?: string;
    numero_chasis?: string;
  };
  fecha_hora_solicitud: string;
  ubicacion_servicio_segura?: string; // Campo seguro en lugar de ubicacion_servicio
  tipo_servicio: 'taller' | 'domicilio';
  fecha_servicio: string;
  hora_servicio: string;
  total: string;
  estado: string;
  estado_display: string;
  metodo_pago?: string;
  notas_cliente?: string;
  lineas: Array<{
    servicio_nombre: string;
    con_repuestos: boolean;
    precio_final: string;
  }>;
  tiempo_respuesta_requerido?: TiempoRespuestaRequerido;
  informacion_disponible: InformacionDisponible;
  puede_gestionar: boolean;
  motivo_rechazo?: string;
  notas_proveedor?: string;
  oferta_proveedor_id?: string | null; // ID de la oferta asociada
}

// Funciones de utilidad para verificar el tipo de cliente
export const esClienteCompleto = (cliente: ClienteProtegido | ClienteCompleto): cliente is ClienteCompleto => {
  return 'nombre' in cliente && 'telefono' in cliente;
};

export const esClienteProtegido = (cliente: ClienteProtegido | ClienteCompleto): cliente is ClienteProtegido => {
  return 'nombre_ofuscado' in cliente && 'telefono_ofuscado' in cliente;
};

// Funciones para obtener información segura del cliente
export const obtenerNombreSeguro = (cliente: ClienteProtegido | ClienteCompleto): string => {
  if (esClienteCompleto(cliente)) {
    return `${cliente.nombre} ${cliente.apellido || ''}`.trim();
  }
  return cliente.nombre_ofuscado;
};

export const obtenerTelefonoSeguro = (cliente: ClienteProtegido | ClienteCompleto): string => {
  if (esClienteCompleto(cliente)) {
    return cliente.telefono;
  }
  return cliente.telefono_ofuscado;
};

export const puedeContactarCliente = (orden: Orden): boolean => {
  return orden.informacion_disponible.puede_contactar;
};

// Interfaz para las estadísticas del proveedor
export interface EstadisticasProveedor {
  total_ordenes: number;
  ordenes_pendientes: number;
  ordenes_completadas: number;
  ordenes_rechazadas: number;
  ingresos_mes_actual: string;
  calificacion_promedio: string;
}

export interface AcceptOrderRequest {
  notas?: string;
}

export interface RejectOrderRequest {
  motivo_rechazo: string;
  notas?: string;
}

export interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

class OrdenesProveedorService {
  private baseUrl = '/ordenes/proveedor-ordenes';

  private handleServiceError(error: any, action: string): ServiceResponse<any> {
    console.error(`Error en ${action}:`, error);
    
    if (error.response) {
      return {
        success: false,
        message: error.response.data?.message || error.response.data?.error || `Error al ${action}`,
        error: error.response.data
      };
    } else if (error.request) {
      return {
        success: false,
        message: 'Error de conexión. Verifica tu conexión a internet.',
        error: error.message
      };
    } else {
      return {
        success: false,
        message: error.message || `Error inesperado al ${action}`,
        error: error.message
      };
    }
  }

  // Función auxiliar para manejar respuestas paginadas del backend
  private extractDataFromResponse(responseData: any): Orden[] {
    // Si la respuesta tiene 'results', es una respuesta paginada de Django REST Framework
    if (responseData && typeof responseData === 'object' && Array.isArray(responseData.results)) {
      console.log(`📄 Respuesta paginada detectada: ${responseData.results.length} elementos de ${responseData.count} total`);
      return responseData.results;
    }
    
    // Si la respuesta es directamente un array
    if (Array.isArray(responseData)) {
      console.log(`📋 Respuesta directa: ${responseData.length} elementos`);
      return responseData;
    }
    
    // Si no es ninguno de los casos anteriores, devolver array vacío
    console.log('⚠️ Formato de respuesta no reconocido, devolviendo array vacío');
    return [];
  }

  // Función para detectar si es una orden urgente (tiempo limitado)
  esOrdenUrgente(orden: Orden): boolean {
    if (!orden.tiempo_respuesta_requerido) return false;
    
    return orden.tiempo_respuesta_requerido.horas_restantes <= 2 && !orden.tiempo_respuesta_requerido.expirado;
  }

  // Función para obtener el color del estado de manera segura
  obtenerColorEstado(estado: string): string {
    switch (estado) {
      case 'pendiente_aceptacion_proveedor':
        return '#ffc107';
      case 'aceptada_por_proveedor':
        return '#17a2b8';
      case 'servicio_iniciado':
        return '#20c997';
      case 'checklist_en_progreso':
        return '#fd7e14';
      case 'checklist_completado':
        return '#20c997';
      case 'en_proceso':
        return '#fd7e14';
      case 'completado':
        return '#28a745';
      case 'cancelado':
        return '#6c757d';
      case 'rechazada_por_proveedor':
        return '#dc3545';
      default:
        return '#6c757d';
    }
  }

  // Función para obtener el mensaje de restricción de información
  obtenerMensajeRestriccion(orden: Orden): string | null {
    if (!orden.informacion_disponible.razon_restriccion) return null;
    
    const restricciones: Record<string, string> = {
      'completo': '',  // Sin restricción
      'parcial': '🔒 Información completa disponible después de aceptar la orden',
      'restringido': '🚫 Información no disponible para órdenes cerradas o expiradas'
    };
    
    const mensaje = restricciones[orden.informacion_disponible.nivel_acceso];
    return mensaje || orden.informacion_disponible.razon_restriccion;
  }

  // Función para verificar si puede mostrar botón de contacto
  puedeContactar(orden: Orden): boolean {
    return puedeContactarCliente(orden);
  }

  // Función para formatear tiempo restante
  formatearTiempoRestante(tiempo: TiempoRespuestaRequerido): string {
    if (tiempo.expirado) {
      return 'Tiempo agotado';
    }
    
    if (tiempo.horas_restantes < 1) {
      const minutos = Math.floor(tiempo.horas_restantes * 60);
      return `${minutos}min restantes`;
    }
    
    const horas = Math.floor(tiempo.horas_restantes);
    const minutos = Math.floor((tiempo.horas_restantes - horas) * 60);
    
    if (minutos > 0) {
      return `${horas}h ${minutos}min restantes`;
    }
    return `${horas}h restantes`;
  }

  async obtenerTodas(filtros?: { estado?: string }): Promise<ServiceResponse<Orden[]>> {
    try {
      const params = new URLSearchParams();
      if (filtros?.estado) {
        params.append('estado', filtros.estado);
      }
      
      const url = `${this.baseUrl}/${params.toString() ? `?${params.toString()}` : ''}`;
      const response = await api.get(url);
      
      return {
        success: true,
        data: this.extractDataFromResponse(response.data)
      };
    } catch (error) {
      return this.handleServiceError(error, 'obtener órdenes');
    }
  }

  async obtenerPendientes(): Promise<ServiceResponse<Orden[]>> {
    try {
      const response = await api.get(`${this.baseUrl}/pendientes/`);
      
      return {
        success: true,
        data: this.extractDataFromResponse(response.data)
      };
    } catch (error) {
      console.log('❌ Error obteniendo órdenes pendientes:', error);
      return this.handleServiceError(error, 'obtener órdenes pendientes');
    }
  }

  async obtenerActivas(): Promise<ServiceResponse<Orden[]>> {
    try {
      const response = await api.get(`${this.baseUrl}/activas/`);
      
      return {
        success: true,
        data: this.extractDataFromResponse(response.data)
      };
    } catch (error) {
      console.log('❌ Error obteniendo órdenes activas:', error);
      return this.handleServiceError(error, 'obtener órdenes activas');
    }
  }

  async obtenerCompletadas(): Promise<ServiceResponse<Orden[]>> {
    try {
      const response = await api.get(`${this.baseUrl}/completadas/`);
      
      return {
        success: true,
        data: this.extractDataFromResponse(response.data)
      };
    } catch (error) {
      console.log('❌ Error obteniendo órdenes completadas:', error);
      return this.handleServiceError(error, 'obtener órdenes completadas');
    }
  }

  async obtenerDetalle(id: number): Promise<ServiceResponse<Orden>> {
    try {
      const response = await api.get(`${this.baseUrl}/${id}/`);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return this.handleServiceError(error, 'obtener detalle de orden');
    }
  }

  async aceptarOrden(id: number, data: AcceptOrderRequest): Promise<ServiceResponse<{ message: string; orden: Orden }>> {
    try {
      const response = await api.post(`${this.baseUrl}/${id}/aceptar/`, data);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return this.handleServiceError(error, 'aceptar orden');
    }
  }

  async rechazarOrden(id: number, data: RejectOrderRequest): Promise<ServiceResponse<{ message: string }>> {
    try {
      const response = await api.post(`${this.baseUrl}/${id}/rechazar/`, data);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return this.handleServiceError(error, 'rechazar orden');
    }
  }

  async actualizarEstado(id: number, nuevoEstado: string): Promise<ServiceResponse<{ message: string; orden: Orden }>> {
    try {
      console.log(`🔄 Actualizando estado de orden ${id} a: ${nuevoEstado}`);
      const response = await api.post(`${this.baseUrl}/${id}/actualizar_estado/`, {
        estado: nuevoEstado
      });
      
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error(`❌ Error actualizando estado de orden ${id}:`, error);
      return this.handleServiceError(error, 'actualizar estado de orden');
    }
  }

  async iniciarServicio(id: number): Promise<ServiceResponse<{ message: string; orden: Orden }>> {
    try {
      console.log(`🚀 Iniciando servicio para orden ${id}`);
      const response = await api.post(`${this.baseUrl}/${id}/iniciar_servicio/`);
      
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error(`❌ Error iniciando servicio para orden ${id}:`, error);
      return this.handleServiceError(error, 'iniciar servicio');
    }
  }

  async finalizarServicio(id: number, data?: { notas?: string }): Promise<ServiceResponse<{ message: string; orden: Orden }>> {
    try {
      console.log(`✅ Finalizando servicio para orden ${id}`);
      const response = await api.post(`${this.baseUrl}/${id}/finalizar_servicio/`, data || {});
      
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error(`❌ Error finalizando servicio para orden ${id}:`, error);
      return this.handleServiceError(error, 'finalizar servicio');
    }
  }

  async obtenerEstadisticas(): Promise<ServiceResponse<EstadisticasProveedor>> {
    try {
      const response = await api.get(`${this.baseUrl}/estadisticas/`);
      
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.log('❌ Error obteniendo estadísticas:', error);
      return this.handleServiceError(error, 'obtener estadísticas');
    }
  }

  // Funciones auxiliares de formateo
  formatearFecha(fecha: string): string {
    try {
      return new Date(fecha).toLocaleDateString('es-CL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return fecha;
    }
  }

  formatearHora(hora: string): string {
    return hora.substring(0, 5); // HH:MM
  }

  formatearFechaHora(fechaHora: string): string {
    try {
      return new Date(fechaHora).toLocaleString('es-CL', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return fechaHora;
    }
  }
}

export const ordenesProveedorService = new OrdenesProveedorService(); 