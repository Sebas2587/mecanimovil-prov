import api from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ==================== TIPOS E INTERFACES ====================

export interface ChecklistTemplate {
  id: number;
  nombre: string;
  descripcion?: string;
  servicio: number;
  servicio_nombre: string;
  activo: boolean;
  version: string;
  total_items: number;
  items: ChecklistItemTemplate[];
  fecha_creacion: string;
  fecha_actualizacion: string;
}

export interface ChecklistItemTemplate {
  id: number;
  orden_visual: number;
  categoria: string;
  tipo_pregunta: 
    // Tipos básicos
    | 'TEXT' | 'NUMBER' | 'BOOLEAN' | 'SELECT' | 'MULTISELECT' 
    | 'PHOTO' | 'SIGNATURE' | 'LOCATION' | 'DATETIME' | 'RATING'
    // Tipos específicos automotrices
    | 'KILOMETER_INPUT' | 'FUEL_GAUGE' | 'FLUID_LEVEL'
    // Tipos de inventario y verificación
    | 'INVENTORY_CHECKLIST' | 'SERVICE_SELECTION' | 'VEHICLE_CONDITION'
    // Tipos de inspección visual
    | 'VEHICLE_DIAGRAM' | 'DAMAGE_REPORT' | 'EXTERIOR_INSPECTION' 
    | 'INTERIOR_INSPECTION' | 'ENGINE_INSPECTION'
    // Tipos de verificación de sistemas
    | 'ELECTRICAL_CHECK' | 'BRAKE_CHECK' | 'SUSPENSION_CHECK' | 'TIRE_CONDITION'
    // Tipos de finalización
    | 'FINAL_NOTES' | 'CLIENT_CONFIRMATION' | 'WORK_SUMMARY';
  pregunta_texto: string;
  descripcion_ayuda?: string;
  placeholder?: string;
  es_obligatorio?: boolean;
  es_obligatorio_efectivo?: boolean;
  opciones_seleccion?: any;
  valor_minimo?: number;
  valor_maximo?: number;
  max_fotos?: number;
  min_fotos?: number;
  depende_de_item?: number;
  condicion_dependencia?: any;
  catalog_item?: any;
}

export interface ChecklistInstance {
  id: number;
  orden: number;
  orden_info: {
    id: number;
    estado: string;
    fecha_servicio: string;
    hora_servicio: string;
  };
  checklist_template: number;
  checklist_template_info: {
    id: number;
    nombre: string;
    version: string;
    servicio_nombre: string;
  };
  estado: 'PENDIENTE' | 'EN_PROGRESO' | 'PAUSADO' | 'COMPLETADO' | 'CANCELADO';
  fecha_creacion: string;
  fecha_inicio?: string;
  fecha_finalizacion?: string;
  ubicacion_finalizacion?: any;
  firma_tecnico?: string;
  firma_cliente?: string;
  progreso_porcentaje: number;
  progreso_calculado: number;
  tiempo_total_minutos?: number;
  version_offline: number;
  ultima_sincronizacion?: string;
  requiere_sincronizacion: boolean;
  puede_finalizar_check: boolean;
  respuestas: ChecklistItemResponse[];
}

export interface ChecklistItemResponse {
  id?: number;
  item_template: number;
  item_template_info?: {
    orden_visual: number;
    categoria: string;
    tipo_pregunta: string;
    pregunta_texto: string;
    es_obligatorio: boolean;
  };
  item_info?: {
    nombre: string;
    tipo_pregunta: string;
    pregunta_texto: string;
    es_obligatorio: boolean;
    opciones_seleccion?: any;
  };
  respuesta_texto?: string;
  respuesta_numero?: number;
  respuesta_booleana?: boolean;
  respuesta_seleccion?: any;
  respuesta_fecha?: string;
  respuesta_ubicacion?: any;
  completado: boolean;
  fecha_respuesta?: string;
  fotos?: ChecklistPhoto[];
}

export interface ChecklistPhoto {
  id?: number;
  response?: number;
  imagen?: string;
  imagen_url?: string;
  imagen_comprimida?: string;
  imagen_comprimida_url?: string;
  descripcion?: string;
  orden_en_respuesta: number;
  tamaño_archivo_bytes?: number;
  ubicacion_captura?: any;
  fecha_captura?: string;
  sincronizada: boolean;
}

export interface ChecklistFinalizationData {
  firma_tecnico: string;
  firma_cliente: string;
  ubicacion_lat: number;
  ubicacion_lng: number;
}

export interface ServiceResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  isEmpty?: boolean;
  isUnauthorized?: boolean;
}

// ==================== SISTEMA DE CACHE PARA ÓRDENES SIN CHECKLIST ====================

const CHECKLIST_CACHE_KEY = 'ordenes_sin_checklist_cache';
const CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 horas

interface ChecklistCacheData {
  ordenes: number[];
  timestamp: number;
}

class ChecklistCacheManager {
  private static instance: ChecklistCacheManager;
  private ordenesSeChecklist: Set<number> = new Set();
  private cacheInitialized = false;

  static getInstance(): ChecklistCacheManager {
    if (!ChecklistCacheManager.instance) {
      ChecklistCacheManager.instance = new ChecklistCacheManager();
    }
    return ChecklistCacheManager.instance;
  }

  async initializeCache(): Promise<void> {
    if (this.cacheInitialized) return;
    
    try {
      const stored = await AsyncStorage.getItem(CHECKLIST_CACHE_KEY);
      if (stored) {
        const cache: ChecklistCacheData = JSON.parse(stored);
        const now = Date.now();
        
        // Verificar si el cache no ha expirado
        if (now - cache.timestamp < CACHE_EXPIRY) {
          this.ordenesSeChecklist = new Set(cache.ordenes);
          console.log('📦 Cache de checklist inicializado:', this.ordenesSeChecklist.size, 'órdenes sin checklist');
        } else {
          console.log('🕐 Cache de checklist expirado, limpiando...');
          await this.clearCache();
        }
      }
      this.cacheInitialized = true;
    } catch (error) {
      console.error('❌ Error inicializando cache de checklist:', error);
      this.cacheInitialized = true; // Continuar sin cache
    }
  }

  async addToCache(ordenId: number): Promise<void> {
    await this.initializeCache();
    
    if (!this.ordenesSeChecklist.has(ordenId)) {
      this.ordenesSeChecklist.add(ordenId);
      await this.saveCache();
      console.log('➕ Orden', ordenId, 'agregada al cache (sin checklist)');
    }
  }

  async isInCache(ordenId: number): Promise<boolean> {
    await this.initializeCache();
    return this.ordenesSeChecklist.has(ordenId);
  }

  async removeFromCache(ordenId: number): Promise<void> {
    await this.initializeCache();
    
    console.log('🧹 Intentando remover orden', ordenId, 'del cache. Cache actual tiene', this.ordenesSeChecklist.size, 'órdenes');
    
    if (this.ordenesSeChecklist.has(ordenId)) {
      this.ordenesSeChecklist.delete(ordenId);
      await this.saveCache();
      console.log('➖ Orden', ordenId, 'removida del cache (ahora tiene checklist). Cache restante:', this.ordenesSeChecklist.size, 'órdenes');
    } else {
      console.log('ℹ️ Orden', ordenId, 'no estaba en el cache para remover');
    }
  }

  private async saveCache(): Promise<void> {
    try {
      const cache: ChecklistCacheData = {
        ordenes: Array.from(this.ordenesSeChecklist),
        timestamp: Date.now()
      };
      await AsyncStorage.setItem(CHECKLIST_CACHE_KEY, JSON.stringify(cache));
    } catch (error) {
      console.error('❌ Error guardando cache de checklist:', error);
    }
  }

  async clearCache(): Promise<void> {
    try {
      this.ordenesSeChecklist.clear();
      await AsyncStorage.removeItem(CHECKLIST_CACHE_KEY);
      console.log('🧹 Cache de checklist limpiado');
    } catch (error) {
      console.error('❌ Error limpiando cache de checklist:', error);
    }
  }

  getCacheSize(): number {
    return this.ordenesSeChecklist.size;
  }
}

// ==================== UTILIDADES PARA TIPOS ====================

export const CATEGORIA_DISPLAY_NAMES: Record<string, string> = {
  'INFORMACION_GENERAL': 'Información General',
  'DATOS_VEHICULO': 'Datos del Vehículo',
  'INVENTARIO_VEHICULO': 'Inventario del Vehículo',
  'ACCESORIOS_HERRAMIENTAS': 'Accesorios y Herramientas',
  'DOCUMENTOS_VEHICULO': 'Documentos del Vehículo',
  'CARROCERIA_EXTERIOR': 'Carrocería Exterior',
  'CRISTALES_ESPEJOS': 'Cristales y Espejos',
  'LUCES_SENALIZACION': 'Luces y Señalización',
  'NEUMATICOS_LLANTAS': 'Neumáticos y Llantas',
  'INTERIOR_CABINA': 'Interior de Cabina',
  'TABLERO_CONTROLES': 'Tablero y Controles',
  'ASIENTOS_TAPICERIA': 'Asientos y Tapicería',
  'MOTOR_COMPARTIMIENTO': 'Motor y Compartimiento',
  'FLUIDOS_NIVELES': 'Fluidos y Niveles',
  'SISTEMA_ELECTRICO': 'Sistema Eléctrico',
  'SISTEMA_FRENOS': 'Sistema de Frenos',
  'SUSPENSION_DIRECCION': 'Suspensión y Dirección',
  'TRANSMISION_EMBRAGUE': 'Transmisión y Embrague',
  'TIPO_TRABAJO': 'Tipo de Trabajo Realizado',
  'SERVICIOS_APLICADOS': 'Servicios Aplicados',
  'REPUESTOS_UTILIZADOS': 'Repuestos Utilizados',
  'OBSERVACIONES_TECNICO': 'Observaciones del Técnico',
  'RECOMENDACIONES': 'Recomendaciones',
  'FOTOS_FINALES': 'Fotos Finales',
  'FIRMAS_CONFORMIDAD': 'Firmas de Conformidad',
};

export const TIPO_PREGUNTA_DISPLAY_NAMES: Record<string, string> = {
  // Tipos básicos
  'TEXT': 'Texto',
  'NUMBER': 'Número',
  'BOOLEAN': 'Sí/No',
  'SELECT': 'Selección única',
  'MULTISELECT': 'Selección múltiple',
  'PHOTO': 'Fotografía',
  'SIGNATURE': 'Firma digital',
  'LOCATION': 'Ubicación GPS',
  'DATETIME': 'Fecha y hora',
  'RATING': 'Calificación',
  
  // Tipos específicos automotrices
  'KILOMETER_INPUT': 'Kilometraje',
  'FUEL_GAUGE': 'Medidor de combustible',
  'FLUID_LEVEL': 'Nivel de fluidos',
  
  // Tipos de inventario y verificación
  'INVENTORY_CHECKLIST': 'Lista de inventario',
  'SERVICE_SELECTION': 'Selección de servicios',
  'VEHICLE_CONDITION': 'Estado del vehículo',
  
  // Tipos de inspección visual
  'VEHICLE_DIAGRAM': 'Diagrama del vehículo',
  'DAMAGE_REPORT': 'Reporte de daños',
  'EXTERIOR_INSPECTION': 'Inspección exterior',
  'INTERIOR_INSPECTION': 'Inspección interior',
  'ENGINE_INSPECTION': 'Inspección del motor',
  
  // Tipos de verificación de sistemas
  'ELECTRICAL_CHECK': 'Verificación eléctrica',
  'BRAKE_CHECK': 'Verificación de frenos',
  'SUSPENSION_CHECK': 'Verificación de suspensión',
  'TIRE_CONDITION': 'Estado de neumáticos',
  
  // Tipos de finalización
  'FINAL_NOTES': 'Notas finales',
  'CLIENT_CONFIRMATION': 'Confirmación del cliente',
  'WORK_SUMMARY': 'Resumen del trabajo',
};

export const getDisplayNameForCategoria = (categoria: string): string => {
  return CATEGORIA_DISPLAY_NAMES[categoria] || categoria;
};

export const getDisplayNameForTipoPregunta = (tipo: string): string => {
  return TIPO_PREGUNTA_DISPLAY_NAMES[tipo] || tipo;
};

// ==================== GESTIÓN OFFLINE ====================

const STORAGE_KEYS = {
  CHECKLIST_INSTANCES: 'checklist_instances',
  CHECKLIST_RESPONSES: 'checklist_responses',
  CHECKLIST_PHOTOS: 'checklist_photos',
  OFFLINE_VERSION: 'checklist_offline_version',
  PENDING_SYNC: 'checklist_pending_sync',
};

class ChecklistOfflineManager {
  
  // Guardar instancia de checklist localmente
  async saveChecklistInstance(instance: ChecklistInstance): Promise<void> {
    try {
      console.log('💾 saveChecklistInstance llamado con:', {
        instanceType: typeof instance,
        instanceId: instance?.id,
        instanceEstado: instance?.estado,
        instanceKeys: instance ? Object.keys(instance).slice(0, 5) : 'N/A'
      });
      
      // Validar que la instancia tiene las propiedades básicas requeridas
      if (!instance || typeof instance !== 'object') {
        console.error('❌ saveChecklistInstance: instance es null, undefined o no es un objeto');
        console.error('❌ Instancia recibida:', instance);
        return;
      }
      
      if (!instance.id || typeof instance.id !== 'number') {
        console.error('❌ saveChecklistInstance: instance.id es inválido:', instance.id);
        console.error('❌ Instancia completa recibida:', JSON.stringify(instance, null, 2));
        return;
      }
      
      // Validaciones adicionales opcionales pero recomendadas
      if (!instance.orden) {
        console.warn('⚠️ saveChecklistInstance: instance.orden está vacío');
      }
      
      if (!instance.estado) {
        console.warn('⚠️ saveChecklistInstance: instance.estado está vacío');
      }
      
      console.log('✅ Instancia válida, procediendo a guardar:', {
        id: instance.id,
        estado: instance.estado,
        orden: instance.orden
      });
      
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.CHECKLIST_INSTANCES);
      const instances: ChecklistInstance[] = stored ? JSON.parse(stored) : [];
      
      const existingIndex = instances.findIndex(i => i.id === instance.id);
      if (existingIndex >= 0) {
        instances[existingIndex] = instance;
        console.log('📝 Checklist instance actualizada offline:', instance.id);
      } else {
        instances.push(instance);
        console.log('➕ Checklist instance agregada offline:', instance.id);
      }
      
      await AsyncStorage.setItem(STORAGE_KEYS.CHECKLIST_INSTANCES, JSON.stringify(instances));
      console.log('✅ Checklist instance saved offline:', {
        id: instance.id,
        estado: instance.estado,
        orden: instance.orden,
        totalInstances: instances.length
      });
    } catch (error) {
      console.error('❌ Error saving checklist offline:', error);
      console.error('❌ Instance data that failed:', {
        instanceType: typeof instance,
        instanceId: instance?.id,
        instanceKeys: instance ? Object.keys(instance) : 'N/A'
      });
      // No relanzar el error para evitar romper el flujo
    }
  }

  // Obtener instancia de checklist local
  async getChecklistInstance(instanceId: number): Promise<ChecklistInstance | null> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.CHECKLIST_INSTANCES);
      if (stored) {
        const instances: ChecklistInstance[] = JSON.parse(stored);
        return instances.find(i => i.id === instanceId) || null;
      }
      return null;
    } catch (error) {
      console.error('❌ Error getting checklist offline:', error);
      return null;
    }
  }

  // Guardar respuesta localmente
  async saveResponse(response: ChecklistItemResponse, instanceId: number): Promise<void> {
    try {
      // Validar que la respuesta tiene las propiedades básicas requeridas
      if (!response || typeof response !== 'object') {
        console.error('❌ saveResponse: response es null, undefined o no es un objeto');
        return;
      }
      
      if (!response.item_template || typeof response.item_template !== 'number') {
        console.error('❌ saveResponse: response.item_template es inválido:', response.item_template);
        return;
      }
      
      if (!instanceId || typeof instanceId !== 'number') {
        console.error('❌ saveResponse: instanceId es inválido:', instanceId);
        return;
      }
      
      // Validación adicional de completado
      if (typeof response.completado !== 'boolean') {
        console.warn('⚠️ saveResponse: response.completado no es boolean:', response.completado);
        response.completado = false; // Default seguro
      }
      
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.CHECKLIST_RESPONSES);
      const responses: (ChecklistItemResponse & { instanceId: number })[] = stored ? JSON.parse(stored) : [];
      
      const responseWithInstance = { ...response, instanceId };
      const existingIndex = responses.findIndex(
        r => r.instanceId === instanceId && r.item_template === response.item_template
      );
      
      if (existingIndex >= 0) {
        responses[existingIndex] = responseWithInstance;
        console.log('📝 Response actualizada offline:', { instanceId, item_template: response.item_template });
      } else {
        responses.push(responseWithInstance);
        console.log('➕ Response agregada offline:', { instanceId, item_template: response.item_template });
      }
      
      await AsyncStorage.setItem(STORAGE_KEYS.CHECKLIST_RESPONSES, JSON.stringify(responses));
      
      // Marcar como pendiente de sincronización
      await this.markPendingSync(instanceId);
      
      console.log('✅ Response saved offline:', {
        instanceId,
        item_template: response.item_template,
        completado: response.completado,
        totalResponses: responses.length
      });
    } catch (error) {
      console.error('❌ Error saving response offline:', error);
      console.error('❌ Response data that failed:', {
        responseType: typeof response,
        item_template: response?.item_template,
        instanceId,
        responseKeys: response ? Object.keys(response) : 'N/A'
      });
    }
  }

  // Obtener respuestas locales de una instancia
  async getInstanceResponses(instanceId: number): Promise<ChecklistItemResponse[]> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.CHECKLIST_RESPONSES);
      if (stored) {
        const responses: (ChecklistItemResponse & { instanceId: number })[] = JSON.parse(stored);
        return responses.filter(r => r.instanceId === instanceId);
      }
      return [];
    } catch (error) {
      console.error('❌ Error getting responses offline:', error);
      return [];
    }
  }

  // Marcar instancia como pendiente de sincronización
  async markPendingSync(instanceId: number): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.PENDING_SYNC);
      const pending: number[] = stored ? JSON.parse(stored) : [];
      
      if (!pending.includes(instanceId)) {
        pending.push(instanceId);
        await AsyncStorage.setItem(STORAGE_KEYS.PENDING_SYNC, JSON.stringify(pending));
      }
    } catch (error) {
      console.error('❌ Error marking pending sync:', error);
    }
  }

  // Obtener instancias pendientes de sincronización
  async getPendingSync(): Promise<number[]> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.PENDING_SYNC);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('❌ Error getting pending sync:', error);
      return [];
    }
  }

  // Limpiar datos sincronizados
  async clearSyncedData(instanceId: number): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.PENDING_SYNC);
      if (stored) {
        const pending: number[] = JSON.parse(stored);
        const filtered = pending.filter(id => id !== instanceId);
        await AsyncStorage.setItem(STORAGE_KEYS.PENDING_SYNC, JSON.stringify(filtered));
      }
    } catch (error) {
      console.error('❌ Error clearing synced data:', error);
    }
  }

  // Incrementar versión offline
  async incrementOfflineVersion(): Promise<number> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.OFFLINE_VERSION);
      const currentVersion = stored ? parseInt(stored) : 0;
      const newVersion = currentVersion + 1;
      await AsyncStorage.setItem(STORAGE_KEYS.OFFLINE_VERSION, newVersion.toString());
      return newVersion;
    } catch (error) {
      console.error('❌ Error incrementing offline version:', error);
      return 1;
    }
  }
}

// ==================== SERVICIO PRINCIPAL ====================

class ChecklistService {
  private offlineManager = new ChecklistOfflineManager();
  private cacheManager = ChecklistCacheManager.getInstance();
  private baseUrl = 'checklists';

  // Manejo de errores
  private handleServiceError(error: any, context: string): ServiceResponse<any> {
    console.error(`❌ Error en ${context}:`, error);
    
    if (error.response) {
      const status = error.response.status;
      const data = error.response.data;
      
      switch (status) {
        case 403:
          return {
            success: false,
            data: null,
            message: 'No tienes permisos para esta funcionalidad.',
            isUnauthorized: true
          };
        case 404:
          return {
            success: false,
            data: null,
            message: 'No se encontraron datos',
            isEmpty: true
          };
        case 400:
          return {
            success: false,
            data: null,
            message: data?.message || data?.error || 'Datos inválidos'
          };
        default:
          return {
            success: false,
            data: null,
            message: `Error del servidor (${status})`
          };
      }
    }
    
    return {
      success: false,
      data: null,
      message: 'Error de conexión. Verifica tu internet.'
    };
  }

  // ==================== TEMPLATES ====================

  async getTemplateByService(servicioId: number): Promise<ServiceResponse<ChecklistTemplate>> {
    try {
      const response = await api.get(`${this.baseUrl}/templates/by_service/?servicio_id=${servicioId}`);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return this.handleServiceError(error, 'obtener template por servicio');
    }
  }

  async getTemplate(templateId: number): Promise<ServiceResponse<ChecklistTemplate>> {
    try {
      const response = await api.get(`${this.baseUrl}/templates/${templateId}/`);
      const template = response.data;
      
      console.log('📝 Respuesta getTemplate:', { data: template, success: true });
      
      return {
        success: true,
        data: template
      };
    } catch (error: any) {
      console.error('❌ Error en getTemplate:', error);
      return this.handleServiceError(error, 'obtener template');
    }
  }

  // ==================== INSTANCIAS ====================

  async createInstance(ordenId: number, templateId: number): Promise<ServiceResponse<ChecklistInstance>> {
    try {
      const response = await api.post(`${this.baseUrl}/instances/`, {
        orden: ordenId,
        checklist_template: templateId
      });
      
      const instance = response.data;
      
      // Guardar offline
      await this.offlineManager.saveChecklistInstance(instance);
      
      // Remover del cache de "sin checklist" si estaba allí
      await this.cacheManager.removeFromCache(ordenId);
      
      return {
        success: true,
        data: instance
      };
    } catch (error) {
      return this.handleServiceError(error, 'crear instancia de checklist');
    }
  }

  async getInstance(instanceId: number): Promise<ServiceResponse<ChecklistInstance>> {
    try {
      // Intentar obtener online primero
      const response = await api.get(`${this.baseUrl}/instances/${instanceId}/`);
      const instance = response.data;
      
      // Guardar offline
      await this.offlineManager.saveChecklistInstance(instance);
      
      return {
        success: true,
        data: instance
      };
    } catch (error) {
      // Si falla online, intentar offline
      console.log('⚠️ Falling back to offline data...');
      const offlineInstance = await this.offlineManager.getChecklistInstance(instanceId);
      
      if (offlineInstance) {
        return {
          success: true,
          data: offlineInstance,
          message: 'Datos cargados desde almacenamiento local'
        };
      }
      
      return this.handleServiceError(error, 'obtener instancia de checklist');
    }
  }

  async getInstanceByOrder(ordenId: number): Promise<ServiceResponse<ChecklistInstance>> {
    try {
      console.log('🔍 getInstanceByOrder llamado para orden:', ordenId);
      
      // ✅ NUEVA LÓGICA: NO MÁS CACHE PROBLEMÁTICO
      // Hacer siempre llamada HTTP fresca para órdenes en estados que pueden tener checklist
      console.log('🌐 Haciendo llamada HTTP directa para orden:', ordenId);
      
      const response = await api.get(`/checklists/instances/by_order/${ordenId}/`);
      console.log('✅ Checklist encontrado para orden:', ordenId, '- ID:', response.data.id);
      
      return {
        success: true,
        data: response.data,
        message: 'Checklist encontrado exitosamente',
        isEmpty: false
      };
      
    } catch (error: any) {
      console.log('❌ Error obteniendo checklist para orden:', ordenId, '- Error:', error.response?.status);
      
      // No contaminar cache en casos de 404 temporal durante creación
      return {
        success: false,
        data: null as any,
        message: 'No hay checklist para esta orden',
        isEmpty: true
      };
    }
  }

  async startInstance(instanceId: number): Promise<ServiceResponse<ChecklistInstance>> {
    try {
      console.log('🚀 startInstance llamado para ID:', instanceId);
      const response = await api.post(`${this.baseUrl}/instances/${instanceId}/start/`);
      const instance = response.data;
      
      console.log('✅ Respuesta del backend startInstance:', {
        id: instance?.id,
        estado: instance?.estado,
        orden: instance?.orden,
        raw: instance
      });
      
      // Si el backend solo devuelve un mensaje, recuperar la instancia actualizada
      if (!instance || !instance.id) {
        console.warn('⚠️ startInstance: backend no devolvió instancia, intentando obtenerla por GET...');
        try {
          const getResp = await api.get(`${this.baseUrl}/instances/${instanceId}/`);
          const fetched = getResp.data;
          if (!fetched || !fetched.id) {
            console.error('❌ startInstance: GET posterior tampoco devolvió instancia válida:', fetched);
            return {
              success: false,
              data: null as any,
              message: response.data?.message || 'Checklist iniciado, pero no se pudo obtener la instancia actualizada'
            };
          }
          // Guardar offline y retornar
          await this.offlineManager.saveChecklistInstance(fetched);
          return {
            success: true,
            data: fetched
          };
        } catch (followUpError) {
          console.error('❌ startInstance: error al recuperar instancia después de iniciar:', followUpError);
          return {
            success: false,
            data: null as any,
            message: 'Checklist iniciado, pero falló la recuperación de la instancia'
          };
        }
      }
      
      // Guardar offline cuando la respuesta ya trae la instancia
      await this.offlineManager.saveChecklistInstance(instance);
      
      return {
        success: true,
        data: instance
      };
    } catch (error) {
      console.error('❌ Error en startInstance:', error);
      return this.handleServiceError(error, 'iniciar checklist');
    }
  }

  async pauseInstance(instanceId: number): Promise<ServiceResponse<ChecklistInstance>> {
    try {
      const response = await api.post(`${this.baseUrl}/instances/${instanceId}/pause/`);
      const instance = response.data;
      
      // Actualizar offline
      await this.offlineManager.saveChecklistInstance(instance);
      
      return {
        success: true,
        data: instance
      };
    } catch (error) {
      return this.handleServiceError(error, 'pausar checklist');
    }
  }

  async resumeInstance(instanceId: number): Promise<ServiceResponse<ChecklistInstance>> {
    try {
      const response = await api.post(`${this.baseUrl}/instances/${instanceId}/resume/`);
      const instance = response.data;
      
      // Actualizar offline
      await this.offlineManager.saveChecklistInstance(instance);
      
      return {
        success: true,
        data: instance
      };
    } catch (error) {
      return this.handleServiceError(error, 'reanudar checklist');
    }
  }

  async finalizeInstance(instanceId: number, finalizationData: ChecklistFinalizationData): Promise<ServiceResponse<{ message: string; checklist: ChecklistInstance }>> {
    try {
      console.log('🏁 Finalizando instancia de checklist:', { instanceId, finalizationData });
      
      const response = await api.post(`${this.baseUrl}/instances/${instanceId}/finalize/`, finalizationData);
      
      console.log('✅ Respuesta del backend para finalización:', response.data);
      
      // El backend devuelve solo { message: "..." }, no incluye el checklist completo
      // Necesitamos obtener la instancia actualizada por separado
      let updatedInstance: ChecklistInstance | null = null;
      
      try {
        const instanceResponse = await api.get(`${this.baseUrl}/instances/${instanceId}/`);
        updatedInstance = instanceResponse.data;
        console.log('✅ Instancia actualizada obtenida:', updatedInstance);
        
        // Guardar offline la instancia actualizada
        if (updatedInstance) {
          await this.offlineManager.saveChecklistInstance(updatedInstance);
          console.log('✅ Instancia guardada offline exitosamente');
        }
      } catch (getInstanceError) {
        console.warn('⚠️ No se pudo obtener la instancia actualizada:', getInstanceError);
      }
      
      // Limpiar datos pendientes de sincronización
      await this.offlineManager.clearSyncedData(instanceId);
      
      return {
        success: true,
        data: {
          message: response.data.message || 'Checklist finalizado correctamente',
          checklist: updatedInstance as ChecklistInstance
        }
      };
    } catch (error) {
      console.error('❌ Error finalizando instancia:', error);
      return this.handleServiceError(error, 'finalizar checklist');
    }
  }

  // ==================== RESPUESTAS ====================

  async saveResponse(response: ChecklistItemResponse, instanceId: number): Promise<ServiceResponse<ChecklistItemResponse>> {
    try {
      // Guardar offline primero (offline-first)
      await this.offlineManager.saveResponse(response, instanceId);
      
      // Intentar guardar online
      try {
        let apiResponse;
        if (response.id) {
          // Ya existe: actualizar con PATCH para evitar error de unicidad
          console.log('🔄 Actualizando respuesta existente ID:', response.id);
          const { id, ...updateData } = response;
          apiResponse = await api.patch(`${this.baseUrl}/responses/${id}/`, {
            checklist_instance: instanceId,
            ...updateData,
          });
        } else {
          // Nueva respuesta: crear con POST
          apiResponse = await api.post(`${this.baseUrl}/responses/`, {
            checklist_instance: instanceId,
            ...response,
          });
        }
        
        console.log('✅ Response saved online');
        return {
          success: true,
          data: apiResponse.data
        };
      } catch (onlineError: any) {
        console.log('⚠️ Saved offline only, will sync later');
        return {
          success: true,
          data: response,
          message: 'Respuesta guardada localmente, se sincronizará cuando tengas conexión'
        };
      }
    } catch (error) {
      return this.handleServiceError(error, 'guardar respuesta');
    }
  }

  async updateResponse(responseId: number, response: ChecklistItemResponse, instanceId: number): Promise<ServiceResponse<ChecklistItemResponse>> {
    try {
      // Actualizar offline primero
      await this.offlineManager.saveResponse({ ...response, id: responseId }, instanceId);
      
      // Intentar actualizar online
      try {
        const apiResponse = await api.put(`${this.baseUrl}/responses/${responseId}/`, response);
        
        console.log('✅ Response updated online');
        return {
          success: true,
          data: apiResponse.data
        };
      } catch (onlineError) {
        console.log('⚠️ Updated offline only, will sync later');
        return {
          success: true,
          data: response,
          message: 'Respuesta actualizada localmente, se sincronizará cuando tengas conexión'
        };
      }
    } catch (error) {
      return this.handleServiceError(error, 'actualizar respuesta');
    }
  }

  // ==================== FOTOS ====================

  async uploadPhoto(photoData: FormData): Promise<ServiceResponse<ChecklistPhoto>> {
    try {
      const response = await api.post(`${this.baseUrl}/photos/`, photoData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return this.handleServiceError(error, 'subir foto');
    }
  }

  async deletePhoto(photoId: number): Promise<ServiceResponse<void>> {
    try {
      await api.delete(`${this.baseUrl}/photos/${photoId}/`);
      
      return {
        success: true,
        data: undefined
      };
    } catch (error) {
      return this.handleServiceError(error, 'eliminar foto');
    }
  }

  // ==================== SINCRONIZACIÓN ====================

  async syncOfflineData(): Promise<ServiceResponse<{ synced: number; failed: number }>> {
    try {
      const pendingIds = await this.offlineManager.getPendingSync();
      let synced = 0;
      let failed = 0;
      
      for (const instanceId of pendingIds) {
        try {
          const responses = await this.offlineManager.getInstanceResponses(instanceId);
          const version = await this.offlineManager.incrementOfflineVersion();
          
          const syncResponse = await api.post(`${this.baseUrl}/instances/${instanceId}/sync_offline/`, {
            responses,
            version_offline: version
          });
          
          if (syncResponse.status === 200) {
            await this.offlineManager.clearSyncedData(instanceId);
            synced++;
            console.log(`✅ Synced instance ${instanceId}`);
          } else {
            failed++;
          }
        } catch (syncError) {
          console.error(`❌ Failed to sync instance ${instanceId}:`, syncError);
          failed++;
        }
      }
      
      return {
        success: true,
        data: { synced, failed },
        message: `Sincronizados: ${synced}, Fallidos: ${failed}`
      };
    } catch (error) {
      return this.handleServiceError(error, 'sincronizar datos offline');
    }
  }

  // ==================== UTILIDADES DE CACHE ====================

  async clearChecklistCache(): Promise<void> {
    console.log('🧹 Limpiando cache de checklist (simplificado)');
    // Ya no necesitamos cache complejo, solo notificar que se limpió
  }

  async getCacheStats(): Promise<{ size: number; lastUpdate: string }> {
    await this.cacheManager.initializeCache();
    return {
      size: this.cacheManager.getCacheSize(),
      lastUpdate: new Date().toISOString()
    };
  }

  async forceRefreshChecklist(ordenId: number): Promise<ServiceResponse<ChecklistInstance>> {
    console.log('🔄 Forzando refresh de checklist para orden:', ordenId);
    
    // ✅ NUEVA LÓGICA SIMPLE: Solo hacer llamada HTTP directa
    return this.getInstanceByOrder(ordenId);
  }

  // ==================== UTILIDADES ====================

  formatearFecha(fecha: string): string {
    return new Date(fecha).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  }

  formatearHora(hora: string): string {
    return hora.substring(0, 5); // HH:MM
  }

  formatearFechaHora(fechaHora: string): string {
    return new Date(fechaHora).toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  obtenerColorEstado(estado: string): string {
    switch (estado) {
      case 'PENDIENTE':
        return '#FFC107'; // Amarillo
      case 'EN_PROGRESO':
        return '#007BFF'; // Azul
      case 'PAUSADO':
        return '#6C757D'; // Gris
      case 'COMPLETADO':
        return '#28A745'; // Verde
      case 'CANCELADO':
        return '#DC3545'; // Rojo
      default:
        return '#6C757D'; // Gris por defecto
    }
  }

  calcularProgreso(responses: ChecklistItemResponse[], totalItems: number): number {
    if (totalItems === 0) return 100;
    
    const completadas = responses.filter(r => r.completado).length;
    return Math.round((completadas / totalItems) * 100);
  }

  // ==================== FINALIZACIÓN CON FIRMAS ====================

  async finalizeChecklist(
    instanceId: number, 
    firmaTecnico: string, 
    firmaCliente: string, 
    ubicacion: { lat: number; lng: number }
  ): Promise<ServiceResponse<ChecklistInstance>> {
    try {
      console.log('🏁 Finalizando checklist con firmas digitales:', {
        instanceId,
        firmaTecnico: firmaTecnico.substring(0, 20) + '...',
        firmaCliente: firmaCliente.substring(0, 20) + '...',
        ubicacion
      });

      const response = await api.post(`${this.baseUrl}/instances/${instanceId}/finalize/`, {
        firma_tecnico: firmaTecnico,
        firma_cliente: firmaCliente,
        ubicacion_lat: ubicacion.lat,
        ubicacion_lng: ubicacion.lng
      });

      console.log('✅ Respuesta del backend para finalización:', response.data);

      // El backend devuelve solo { message: "..." }, no incluye el checklist completo
      // Necesitamos obtener la instancia actualizada por separado
      let updatedInstance: ChecklistInstance | null = null;
      
      try {
        console.log('🔄 Obteniendo instancia actualizada...');
        const instanceResponse = await api.get(`${this.baseUrl}/instances/${instanceId}/`);
        updatedInstance = instanceResponse.data;
        console.log('✅ Instancia actualizada obtenida:', {
          id: updatedInstance?.id,
          estado: updatedInstance?.estado,
          progreso: updatedInstance?.progreso_porcentaje
        });
        
        // Guardar offline la instancia actualizada
        if (updatedInstance && updatedInstance.id) {
          await this.offlineManager.saveChecklistInstance(updatedInstance);
          console.log('✅ Instancia guardada offline exitosamente');
        } else {
          console.warn('⚠️ La instancia actualizada no tiene ID válido');
        }
      } catch (getInstanceError) {
        console.error('❌ Error obteniendo instancia actualizada:', getInstanceError);
        // No fallar completamente, solo advertir
      }

      // Limpiar datos pendientes de sincronización
      await this.offlineManager.clearSyncedData(instanceId);

      return {
        success: true,
        data: updatedInstance as ChecklistInstance,
        message: response.data.message || 'Checklist finalizado correctamente'
      };
    } catch (error: any) {
      console.error('❌ Error finalizando checklist:', error);
      return this.handleServiceError(error, 'finalizar checklist');
    }
  }

  // ==================== UTILIDADES DE ÓRDENES ====================

  async getOrdenInfo(ordenId: number): Promise<ServiceResponse<{ 
    id: number; 
    lineas: Array<{ 
      servicio_id: number; 
      servicio_nombre: string; 
    }>; 
  }>> {
    try {
      console.log('📞 Obteniendo información de orden:', ordenId);
      
      // Usar el endpoint de órdenes del proveedor que ya está configurado
      const response = await api.get(`/ordenes/proveedor-ordenes/${ordenId}/`);
      
      console.log('📋 Respuesta de orden:', response.data);
      
      // Extraer la información que necesitamos
      const orden = response.data;
      const lineasConServicioId = orden.lineas_detail?.map((linea: any) => {
        // Intentar diferentes rutas para obtener el servicio_id
        let servicioId = null;
        let servicioNombre = linea.servicio_nombre || 'Servicio sin nombre';
        
        // Ruta 1: servicio_info.id (estructura actual del serializer)
        if (linea.oferta_servicio_detail?.servicio_info?.id) {
          servicioId = linea.oferta_servicio_detail.servicio_info.id;
          console.log('✅ servicio_id encontrado via servicio_info:', servicioId);
        }
        // Ruta 2: servicio (ID directo)
        else if (linea.oferta_servicio_detail?.servicio) {
          servicioId = typeof linea.oferta_servicio_detail.servicio === 'number' 
            ? linea.oferta_servicio_detail.servicio 
            : linea.oferta_servicio_detail.servicio.id;
          console.log('✅ servicio_id encontrado via servicio:', servicioId);
        }
        // Ruta 3: Buscar en oferta_servicio_detail directamente
        else if (linea.oferta_servicio_detail && linea.oferta_servicio_detail.id) {
          console.log('⚠️ No se encontró servicio_id, usando estructura completa para debug:', 
            JSON.stringify(linea.oferta_servicio_detail, null, 2));
        }
        
        return {
          servicio_id: servicioId,
          servicio_nombre: servicioNombre
        };
      }) || [];
      
      console.log('🔍 Líneas procesadas:', lineasConServicioId);
      
      return {
        success: true,
        data: {
          id: orden.id,
          lineas: lineasConServicioId
        }
      };
    } catch (error) {
      console.error('❌ Error obteniendo información de orden:', error);
      return this.handleServiceError(error, 'obtener información de orden');
    }
  }

  // ==================== UTILIDADES DE DEBUG ====================

  async debugChecklistStatus(ordenId: number): Promise<void> {
    console.log('🔍 DEBUG: Estado completo del checklist para orden:', ordenId);
    
    try {
      // 1. Verificar cache
      const isInCache = await this.cacheManager.isInCache(ordenId);
      console.log('📋 En cache de "sin checklist":', isInCache);
      
      // 2. Verificar offline
      const stored = await AsyncStorage.getItem(STORAGE_KEYS.CHECKLIST_INSTANCES);
      const instances: ChecklistInstance[] = stored ? JSON.parse(stored) : [];
      const offlineInstance = instances.find(i => i.orden === ordenId);
      console.log('💾 Instancia offline:', offlineInstance ? {
        id: offlineInstance.id,
        estado: offlineInstance.estado,
        orden: offlineInstance.orden
      } : 'No encontrada');
      
      // 3. Verificar online
      try {
        const onlineResponse = await api.get(`/checklists/instances/by_order/${ordenId}/`);
        console.log('🌐 Instancia online:', {
          id: onlineResponse.data?.id,
          estado: onlineResponse.data?.estado,
          orden: onlineResponse.data?.orden
        });
      } catch (onlineError: any) {
        console.log('🌐 No hay instancia online:', onlineError.response?.status);
      }
      
    } catch (error) {
      console.error('❌ Error en debug:', error);
    }
  }

  async clearOfflineData(): Promise<void> {
    console.log('🧹 Limpiando todos los datos offline del checklist...');
    
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.CHECKLIST_INSTANCES);
      await AsyncStorage.removeItem(STORAGE_KEYS.CHECKLIST_RESPONSES);
      await AsyncStorage.removeItem(STORAGE_KEYS.CHECKLIST_PHOTOS);
      await AsyncStorage.removeItem(STORAGE_KEYS.PENDING_SYNC);
      await AsyncStorage.removeItem(STORAGE_KEYS.OFFLINE_VERSION);
      
      // También limpiar cache
      await this.cacheManager.clearCache();
      
      console.log('✅ Datos offline limpiados exitosamente');
    } catch (error) {
      console.error('❌ Error limpiando datos offline:', error);
    }
  }
}

export const checklistService = new ChecklistService();
export const checklistCacheManager = ChecklistCacheManager.getInstance();
export { ChecklistOfflineManager, ChecklistCacheManager }; 