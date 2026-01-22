import api from './api';

// Interfaces TypeScript
export interface Commune {
  code: string;
  name: string;
  region_code: string;
  region_name: string;
  province_name: string;
}

export interface Region {
  region_code: string;
  region_name: string;
}

export interface ServiceArea {
  id: string;
  name: string;
  area_type: string;
  commune_names: string[];
  commune_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ServiceAreaStats {
  total_zones: number;
  active_zones: number;
  inactive_zones: number;
  total_communes_covered: number;
  coverage_summary: string;
}

export interface CreateServiceAreaData {
  name?: string;
  commune_names: string[];
  area_type: 'COMMUNE';
  is_active?: boolean;
}

export interface UpdateServiceAreaData {
  name?: string;
  commune_names?: string[];
  is_active?: boolean;
}

class ServiceAreasApi {
  // ===================
  // COMUNAS Y REGIONES
  // ===================

  /**
   * Obtener todas las regiones de Chile
   */
  async getRegions(): Promise<Region[]> {
    try {
      console.log('🗺️ Obteniendo regiones desde API...');
      
      const response = await api.get('/usuarios/chilean-communes/regions/');
      
      console.log('🔍 DEBUG - Response completa:', response);
      console.log('🔍 DEBUG - Response.data:', response.data);
      console.log('🔍 DEBUG - Es array?:', Array.isArray(response.data));
      console.log('🔍 DEBUG - Tipo:', typeof response.data);
      
      console.log('✅ Regiones obtenidas:', response.data?.length || 0);
      return response.data || [];
    } catch (error) {
      console.error('❌ Error obteniendo regiones:', error);
      throw error;
    }
  }

  /**
   * Obtener todas las comunas de Chile
   */
  async getCommunes(regionCode?: string): Promise<Commune[]> {
    try {
      console.log('🏙️ Obteniendo comunas desde API...', regionCode ? `filtradas por región ${regionCode}` : 'todas');
      
      let url = '/usuarios/chilean-communes/';
      if (regionCode) {
        url = `/usuarios/chilean-communes/?region=${regionCode}`;
      }
      
      const response = await api.get(url);
      
      console.log('🔍 DEBUG - Comunas Response completa:', response);
      console.log('🔍 DEBUG - Comunas Response.data:', response.data);
      console.log('🔍 DEBUG - Comunas Es array?:', Array.isArray(response.data));
      console.log('🔍 DEBUG - Comunas Tipo:', typeof response.data);
      
      console.log('✅ Comunas obtenidas:', response.data?.length || 0);
      return response.data || [];
    } catch (error) {
      console.error('❌ Error obteniendo comunas:', error);
      throw error;
    }
  }

  // ===================
  // ZONAS DE SERVICIO
  // ===================

  /**
   * Obtener todas las zonas de servicio del mecánico autenticado
   */
  async getServiceAreas(): Promise<ServiceArea[]> {
    try {
      console.log('🏠 Obteniendo zonas de servicio desde API...');
      
      const response = await api.get('/usuarios/mechanics/me/service-areas/');
      
      // El backend devuelve respuestas paginadas con estructura { count, results }
      const zones = response.data?.results || response.data || [];
      console.log('✅ Zonas de servicio obtenidas:', zones.length);
      return zones;
    } catch (error) {
      console.error('❌ Error obteniendo zonas de servicio:', error);
      throw error;
    }
  }

  /**
   * Crear una nueva zona de servicio
   */
  async createServiceArea(data: CreateServiceAreaData): Promise<ServiceArea> {
    try {
      console.log('➕ Creando zona de servicio:', data);
      
      const response = await api.post('/usuarios/mechanics/me/service-areas/', data);
      
      console.log('✅ Zona de servicio creada:', response.data?.id);
      return response.data;
    } catch (error) {
      console.error('❌ Error creando zona de servicio:', error);
      throw error;
    }
  }

  /**
   * Actualizar una zona de servicio existente
   */
  async updateServiceArea(id: string, data: UpdateServiceAreaData): Promise<ServiceArea> {
    try {
      console.log('✏️ Actualizando zona de servicio:', id, data);
      
      const response = await api.put(`/usuarios/mechanics/me/service-areas/${id}/`, data);
      
      console.log('✅ Zona de servicio actualizada:', response.data?.id);
      return response.data;
    } catch (error) {
      console.error('❌ Error actualizando zona de servicio:', error);
      throw error;
    }
  }

  /**
   * Eliminar una zona de servicio
   */
  async deleteServiceArea(id: string): Promise<void> {
    try {
      console.log('🗑️ Eliminando zona de servicio:', id);
      
      await api.delete(`/usuarios/mechanics/me/service-areas/${id}/`);
      
      console.log('✅ Zona de servicio eliminada');
    } catch (error) {
      console.error('❌ Error eliminando zona de servicio:', error);
      throw error;
    }
  }

  /**
   * Activar/Desactivar una zona de servicio
   */
  async toggleServiceAreaActive(id: string): Promise<ServiceArea> {
    try {
      console.log('🔄 Cambiando estado de zona de servicio:', id);
      
      const response = await api.patch(`/usuarios/mechanics/me/service-areas/${id}/toggle_active/`);
      
      console.log('✅ Estado de zona cambiado:', response.data?.zona?.id);
      return response.data?.zona || response.data;
    } catch (error) {
      console.error('❌ Error cambiando estado de zona:', error);
      throw error;
    }
  }

  /**
   * Obtener estadísticas de las zonas de servicio
   */
  async getServiceAreaStats(): Promise<ServiceAreaStats> {
    try {
      console.log('📊 Obteniendo estadísticas de zonas de servicio...');
      
      const response = await api.get('/usuarios/mechanics/me/service-areas/stats/');
      
      console.log('✅ Estadísticas obtenidas:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ Error obteniendo estadísticas:', error);
      throw error;
    }
  }

  // ===================
  // UTILIDADES
  // ===================

  /**
   * Validar datos de zona de servicio antes de enviar
   */
  validateServiceAreaData(data: CreateServiceAreaData | UpdateServiceAreaData): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Validar commune_names si está presente
    if ('commune_names' in data && data.commune_names) {
      if (!Array.isArray(data.commune_names)) {
        errors.push('commune_names debe ser un array');
      } else if (data.commune_names.length === 0) {
        errors.push('Debe seleccionar al menos una comuna');
      } else if (data.commune_names.length > 50) {
        errors.push('No puede seleccionar más de 50 comunas');
      } else {
        // Validar cada comuna
        data.commune_names.forEach((commune, index) => {
          if (typeof commune !== 'string') {
            errors.push(`Comuna en posición ${index + 1} debe ser texto`);
          } else if (commune.trim().length < 2) {
            errors.push(`Comuna "${commune}" es demasiado corta`);
          } else if (commune.trim().length > 100) {
            errors.push(`Comuna "${commune}" es demasiado larga`);
          }
        });
      }
    }

    // Validar name si está presente
    if ('name' in data && data.name) {
      if (typeof data.name !== 'string') {
        errors.push('name debe ser texto');
      } else if (data.name.trim().length < 3) {
        errors.push('El nombre debe tener al menos 3 caracteres');
      } else if (data.name.trim().length > 100) {
        errors.push('El nombre no puede exceder 100 caracteres');
      }
    }

    // Validar area_type si está presente
    if ('area_type' in data && data.area_type !== 'COMMUNE') {
      errors.push('area_type debe ser "COMMUNE"');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Formatear datos de comuna para mostrar
   */
  formatCommuneDisplay(commune: Commune): string {
    return `${commune.name}, ${commune.region_name}`;
  }

  /**
   * Formatear fecha para mostrar
   */
  formatDate(dateString: string): string {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('es-CL', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      return dateString;
    }
  }

  /**
   * Agrupar comunas por región
   */
  groupCommunesByRegion(communes: Commune[]): Record<string, Commune[]> {
    return communes.reduce((groups, commune) => {
      const regionKey = `${commune.region_code}-${commune.region_name}`;
      if (!groups[regionKey]) {
        groups[regionKey] = [];
      }
      groups[regionKey].push(commune);
      return groups;
    }, {} as Record<string, Commune[]>);
  }
}

// Exportar instancia singleton
const serviceAreasApi = new ServiceAreasApi();
export default serviceAreasApi; 