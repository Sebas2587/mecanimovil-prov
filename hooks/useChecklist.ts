import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { 
  checklistService, 
  type ChecklistInstance, 
  type ChecklistTemplate, 
  type ChecklistItemResponse,
  type ChecklistPhoto,
  type ChecklistFinalizationData 
} from '@/services/checklistService';

interface UseChecklistProps {
  ordenId: number;
}

interface ChecklistHookState {
  // Estado del checklist
  template: ChecklistTemplate | null;
  instance: ChecklistInstance | null;
  currentStep: number;
  totalSteps: number;
  progreso: number;
  
  // Estados de carga
  loading: boolean;
  saving: boolean;
  uploading: boolean;
  finalizing: boolean;
  
  // Estados de offline
  isOffline: boolean;
  pendingSync: boolean;
  
  // Error handling
  error: string | null;
}

export const useChecklist = ({ ordenId }: UseChecklistProps) => {
  const [state, setState] = useState<ChecklistHookState>({
    template: null,
    instance: null,
    currentStep: 0,
    totalSteps: 0,
    progreso: 0,
    loading: false,
    saving: false,
    uploading: false,
    finalizing: false,
    isOffline: false,
    pendingSync: false,
    error: null,
  });

  // ==================== UTILIDADES DE CÁLCULO ====================

  const calculateLocalCanFinalize = useCallback(() => {
    if (!state.instance || !state.template) return false;
    
    // Solo se puede finalizar si está en progreso
    if (state.instance.estado !== 'EN_PROGRESO') return false;
    
    // Verificar que haya respuestas completadas
    const respuestas = state.instance.respuestas || [];
    const respuestasCompletadas = respuestas.filter(r => r.completado);
    
    if (respuestasCompletadas.length === 0) return false;
    
    // Verificar items obligatorios
    const itemsObligatorios = state.template.items.filter(item => 
      item.es_obligatorio_efectivo || item.es_obligatorio
    );
    
    // Si no hay items obligatorios definidos, usar el progreso
    if (itemsObligatorios.length === 0) {
      return state.progreso >= 80;
    }
    
    // Verificar que todos los items obligatorios estén completados
    for (const item of itemsObligatorios) {
      const respuesta = respuestas.find(r => r.item_template === item.id && r.completado);
      if (!respuesta) {
        console.log(`❌ Item obligatorio ${item.id} (${item.pregunta_texto}) no completado`);
        return false;
      }
    }
    
    console.log(`✅ Todos los items obligatorios completados. Progreso: ${state.progreso}%`);
    return state.progreso >= 80;
  }, [state.instance, state.template, state.progreso]);

  // ==================== UTILIDADES ====================

  const updateState = useCallback((updates: Partial<ChecklistHookState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  const setLoading = useCallback((loading: boolean) => {
    updateState({ loading });
  }, [updateState]);

  const setError = useCallback((error: string | null) => {
    updateState({ error });
  }, [updateState]);

  // ==================== INICIALIZACIÓN ====================

  const initializeChecklist = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('🔍 Inicializando checklist para orden:', ordenId);
      
      // Verificar si ya existe un checklist para esta orden
      const instanceResponse = await checklistService.getInstanceByOrder(ordenId);
      console.log('📋 Respuesta getInstanceByOrder:', instanceResponse);
      
      if (instanceResponse.success && instanceResponse.data) {
        // Ya existe un checklist
        const instance = instanceResponse.data;
        console.log('✅ Instancia encontrada:', instance);
        console.log('🔍 Template ID del checklist:', instance.checklist_template);
        
        // Intentar obtener el template
        try {
          let templateId: number;
          
          if (typeof instance.checklist_template === 'number') {
            // Es solo el ID
            templateId = instance.checklist_template;
          } else if (typeof instance.checklist_template === 'object' && instance.checklist_template && (instance.checklist_template as any)?.id) {
            // Es el objeto completo, extraer el ID
            templateId = (instance.checklist_template as any).id;
            console.log('🔧 Template ID extraído del objeto:', templateId);
          } else {
            throw new Error('Template ID inválido');
          }
          
          const templateResponse = await checklistService.getTemplate(templateId);
          console.log('📝 Respuesta getTemplate:', templateResponse);
          
          if (templateResponse.success && templateResponse.data) {
            const template = templateResponse.data;
            console.log('✅ Template cargado exitosamente:', template);
            
            if (!Array.isArray(instance.respuestas)) {
              instance.respuestas = [];
              console.log('🔧 Inicializado array de respuestas vacío');
            }
            
            updateState({
              instance,
              template,
              totalSteps: template.items.length,
              progreso: instance.progreso_calculado || instance.progreso_porcentaje || 0,
              isOffline: instanceResponse.message?.includes('local') || false,
            });
            
            console.log('🎯 Estado actualizado correctamente');
          } else {
            console.warn('⚠️ No se pudo obtener template:', templateResponse.message);
            // Aún así establecer la instancia sin template
            updateState({
              instance,
              template: null,
              totalSteps: 0,
              progreso: instance.progreso_calculado || instance.progreso_porcentaje || 0,
              isOffline: instanceResponse.message?.includes('local') || false,
            });
            setError(`Error cargando template: ${templateResponse.message}`);
          }
        } catch (templateError) {
          console.error('❌ Error obteniendo template:', templateError);
          // Aún así establecer la instancia sin template
          updateState({
            instance,
            template: null,
            totalSteps: 0,
            progreso: instance.progreso_calculado || instance.progreso_porcentaje || 0,
            isOffline: instanceResponse.message?.includes('local') || false,
          });
          setError('Error cargando template del checklist');
        }
      } else {
        // No existe checklist para esta orden
        console.log('⚠️ No existe checklist para esta orden:', instanceResponse.message);
        
        // ✅ Manejar el caso cuando no hay checklist (404 o isEmpty)
        // Esto es normal cuando un servicio no tiene checklist configurado
        if (instanceResponse.isEmpty || instanceResponse.message?.includes('404') || instanceResponse.message?.includes('No se encontraron datos')) {
          // Caso específico: no hay checklist pero no es un error
          // 🚀 Intentar crear automáticamente si hay template disponible
          console.log('🔄 Intentando crear checklist automáticamente...');
          
          try {
            // Paso 1: Obtener información de la orden para encontrar el servicio
            console.log('📞 Obteniendo detalles de la orden:', ordenId);
            const ordenResponse = await checklistService.getOrdenInfo(ordenId);
            
            if (ordenResponse.success && ordenResponse.data && ordenResponse.data.lineas.length > 0) {
              console.log('✅ Detalles de orden obtenidos:', ordenResponse.data);
              
              // Usar el primer servicio de la orden (la mayoría de órdenes tienen un servicio principal)
              const primeraLinea = ordenResponse.data.lineas[0];
              const servicioId = primeraLinea.servicio_id;
              
              if (servicioId) {
                console.log('🎯 Intentando crear checklist para servicio ID:', servicioId);
                
                // Paso 2: Verificar si existe template para el servicio
                const templateResponse = await checklistService.getTemplateByService(servicioId);
                console.log('📝 Verificando template para servicio:', templateResponse);
                
                if (templateResponse.success && templateResponse.data) {
                  console.log('✅ Template encontrado, creando instancia...');
                  
                  // Paso 3: Crear la instancia automáticamente
                  const createResult = await checklistService.createInstance(ordenId, templateResponse.data.id);
                  
                  if (createResult.success && createResult.data) {
                    console.log('🎉 Instancia creada automáticamente:', createResult.data);
                    
                    updateState({
                      instance: createResult.data,
                      template: templateResponse.data,
                      totalSteps: templateResponse.data.items.length,
                      progreso: 0,
                    });
                    
                    console.log('✅ Checklist creado automáticamente exitosamente');
                    return; // Salir exitosamente
                  } else {
                    console.warn('⚠️ No se pudo crear la instancia:', createResult.message);
                  }
                } else {
                  // ✅ No hay template disponible - esto es normal, no es un error
                  // El servicio puede continuar sin checklist
                  if (templateResponse.isEmpty) {
                    console.log('💭 No hay template disponible para este servicio. El servicio puede continuar sin checklist.');
                  } else {
                    console.log('💭 No se pudo obtener template:', templateResponse.message);
                  }
                }
              } else {
                console.warn('⚠️ No se pudo obtener servicio_id de la orden');
              }
            } else {
              console.warn('⚠️ No se pudieron obtener detalles de la orden:', ordenResponse.message);
            }
          } catch (autoCreateError) {
            // ✅ Manejar errores de creación automática sin fallar
            console.warn('⚠️ Error en creación automática de checklist:', autoCreateError);
            // No establecer error aquí, permitir que el servicio continúe sin checklist
          }
          
          // Si llegamos aquí, no se pudo crear automáticamente
          // ✅ Esto es normal cuando no hay checklist configurado
          updateState({
            instance: null,
            template: null,
            totalSteps: 0,
            progreso: 0,
          });
          // ✅ No establecer error - simplemente no hay checklist disponible
          // El mensaje se mostrará en ChecklistContainer cuando template es null
        } else {
          // Error al obtener checklist
          setError(instanceResponse.message || 'Error al cargar el checklist');
        }
      }
    } catch (error) {
      console.error('❌ Error inicializando checklist:', error);
      setError('Error al cargar el checklist');
    } finally {
      setLoading(false);
    }
  }, [ordenId, updateState, setLoading, setError]);

  // Crear nuevo checklist desde template
  const createChecklistFromService = useCallback(async (servicioId: number) => {
    setLoading(true);
    setError(null);
    
    try {
      // Obtener template por servicio
      const templateResponse = await checklistService.getTemplateByService(servicioId);
      
      if (templateResponse.success && templateResponse.data) {
        const template = templateResponse.data;
        
        // Crear instancia
        const instanceResponse = await checklistService.createInstance(ordenId, template.id);
        
        if (instanceResponse.success && instanceResponse.data) {
          const instance = instanceResponse.data;
          
          updateState({
            template,
            instance,
            totalSteps: template.items.length,
            progreso: 0,
          });
          
          return { success: true, data: instance };
        } else {
          setError(instanceResponse.message || 'Error creando checklist');
          return { success: false, message: instanceResponse.message };
        }
      } else {
        setError(templateResponse.message || 'No hay template disponible para este servicio');
        return { success: false, message: templateResponse.message };
      }
    } catch (error) {
      const errorMessage = 'Error creando checklist';
      setError(errorMessage);
      return { success: false, message: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [ordenId, updateState, setLoading, setError]);

  // ==================== CONTROL DE FLUJO ====================

  const startChecklist = useCallback(async () => {
    if (!state.instance) return { success: false, message: 'No hay instancia de checklist' };
    
    setLoading(true);
    
    try {
      console.log('🚀 Iniciando checklist con instancia ID:', state.instance.id);
      const response = await checklistService.startInstance(state.instance.id);
      
      if (response.success && response.data) {
        console.log('✅ Checklist iniciado exitosamente:', response.data.id, response.data.estado);
        
        // Validar que la respuesta tenga los datos requeridos
        if (!response.data.id || typeof response.data.id !== 'number') {
          console.error('❌ La respuesta del startInstance no tiene ID válido:', response.data);
          setError('Error: Respuesta inválida del servidor');
          return { success: false, message: 'Respuesta inválida del servidor' };
        }
        
        updateState({
          instance: response.data,
        });
        
        console.log('✅ Estado actualizado con nueva instancia:', response.data.id);
        return { success: true, data: response.data };
      } else {
        console.error('❌ Error iniciando checklist:', response.message);
        setError(response.message || 'Error iniciando checklist');
        return { success: false, message: response.message };
      }
    } catch (error) {
      console.error('❌ Excepción iniciando checklist:', error);
      const errorMessage = 'Error iniciando checklist';
      setError(errorMessage);
      return { success: false, message: errorMessage };
    } finally {
      setLoading(false);
    }
  }, [state.instance, updateState, setLoading, setError]);

  const pauseChecklist = useCallback(async () => {
    if (!state.instance) return { success: false, message: 'No hay instancia de checklist' };
    
    try {
      console.log('⏸️ Pausando checklist con instancia ID:', state.instance.id);
      const response = await checklistService.pauseInstance(state.instance.id);
      
      if (response.success && response.data) {
        updateState({
          instance: response.data,
        });
        return { success: true, data: response.data };
      }
      return { success: false, message: response.message };
    } catch (error) {
      return { success: false, message: 'Error pausando checklist' };
    }
  }, [state.instance, updateState]);

  const resumeChecklist = useCallback(async () => {
    if (!state.instance) return { success: false, message: 'No hay instancia de checklist' };
    
    try {
      console.log('▶️ Reanudando checklist con instancia ID:', state.instance.id);
      const response = await checklistService.resumeInstance(state.instance.id);
      
      if (response.success && response.data) {
        updateState({
          instance: response.data,
        });
        return { success: true, data: response.data };
      }
      return { success: false, message: response.message };
    } catch (error) {
      return { success: false, message: 'Error reanudando checklist' };
    }
  }, [state.instance, updateState]);

  // ==================== RESPUESTAS ====================

  const saveResponse = useCallback(async (itemTemplateId: number, responseData: Partial<ChecklistItemResponse>) => {
    // Validar que tenemos una instancia válida
    if (!state.instance) {
      console.error('❌ saveResponse: No hay instancia de checklist');
      return { success: false, message: 'No hay instancia de checklist' };
    }
    
    if (!state.instance.id || typeof state.instance.id !== 'number') {
      console.error('❌ saveResponse: Instancia ID inválido:', state.instance.id);
      return { success: false, message: 'ID de instancia inválido' };
    }
    
    console.log('💾 Guardando respuesta para instancia ID:', state.instance.id, 'item:', itemTemplateId);
    
    updateState({ saving: true });
    
    try {
      const response: ChecklistItemResponse = {
        item_template: itemTemplateId,
        completado: true,
        ...responseData,
      };
      
      const result = await checklistService.saveResponse(response, state.instance.id);
      
      if (result.success) {
        // Actualizar progreso local
        const updatedInstance = { ...state.instance };
        
        // 🔧 CORRECCIÓN: Asegurar que respuestas sea siempre un array válido
        if (!Array.isArray(updatedInstance.respuestas)) {
          updatedInstance.respuestas = [];
          console.log('🔧 Inicializado array de respuestas en saveResponse');
        }
        
        const existingResponseIndex = updatedInstance.respuestas.findIndex(
          r => r.item_template === itemTemplateId
        );
        
        if (existingResponseIndex >= 0) {
          updatedInstance.respuestas[existingResponseIndex] = result.data;
          console.log('📝 Respuesta actualizada para item:', itemTemplateId);
        } else {
          updatedInstance.respuestas.push(result.data);
          console.log('➕ Nueva respuesta agregada para item:', itemTemplateId);
        }
        
        // Recalcular progreso
        const newProgreso = checklistService.calcularProgreso(
          updatedInstance.respuestas,
          state.template?.total_items || 0
        );
        
        console.log('📊 Progreso actualizado:', newProgreso, '%');
        
        updateState({
          instance: updatedInstance,
          progreso: newProgreso,
          pendingSync: result.message?.includes('localmente') || false,
        });
        
        return { success: true, data: result.data };
      } else {
        console.error('❌ Error guardando respuesta:', result.message);
        return { success: false, message: result.message };
      }
    } catch (error) {
      console.error('❌ Excepción guardando respuesta:', error);
      return { success: false, message: 'Error guardando respuesta' };
    } finally {
      updateState({ saving: false });
    }
  }, [state.instance, state.template, updateState]);

  // ==================== FOTOS ====================

  const takePicture = useCallback(async () => {
    try {
      // Solicitar permisos
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permisos', 'Se necesitan permisos de cámara para continuar');
        return { success: false, message: 'Permisos de cámara denegados' };
      }

      // Abrir cámara
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8, // Comprimir un poco
      });

      if (!result.canceled && result.assets[0]) {
        return { 
          success: true, 
          data: {
            uri: result.assets[0].uri,
            type: 'image/jpeg',
            name: `checklist_photo_${Date.now()}.jpg`,
          }
        };
      }
      
      return { success: false, message: 'Captura cancelada' };
    } catch (error) {
      return { success: false, message: 'Error al tomar foto' };
    }
  }, []);

  const pickFromGallery = useCallback(async () => {
    try {
      // Solicitar permisos
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permisos', 'Se necesitan permisos de galería para continuar');
        return { success: false, message: 'Permisos de galería denegados' };
      }

      // Abrir galería
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        return { 
          success: true, 
          data: {
            uri: result.assets[0].uri,
            type: 'image/jpeg',
            name: `checklist_photo_${Date.now()}.jpg`,
          }
        };
      }
      
      return { success: false, message: 'Selección cancelada' };
    } catch (error) {
      return { success: false, message: 'Error al seleccionar foto' };
    }
  }, []);

  const uploadPhoto = useCallback(async (photoUri: string, responseId: number, descripcion?: string) => {
    updateState({ uploading: true });
    
    try {
      const formData = new FormData();
      formData.append('response', responseId.toString());
      formData.append('imagen', {
        uri: photoUri,
        type: 'image/jpeg',
        name: `checklist_photo_${Date.now()}.jpg`,
      } as any);
      formData.append('orden_en_respuesta', '1');
      
      if (descripcion) {
        formData.append('descripcion', descripcion);
      }
      
      // Obtener ubicación si es posible
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const location = await Location.getCurrentPositionAsync({});
          formData.append('ubicacion_captura', JSON.stringify({
            type: 'Point',
            coordinates: [location.coords.longitude, location.coords.latitude]
          }));
        }
      } catch (locationError) {
        console.log('No se pudo obtener ubicación para la foto');
      }
      
      const result = await checklistService.uploadPhoto(formData);
      
      if (result.success) {
        return { success: true, data: result.data };
      } else {
        return { success: false, message: result.message };
      }
    } catch (error) {
      return { success: false, message: 'Error subiendo foto' };
    } finally {
      updateState({ uploading: false });
    }
  }, [updateState]);

  // ==================== FINALIZACIÓN ====================

  const finalizeChecklist = useCallback(async (finalizationData: ChecklistFinalizationData) => {
    if (!state.instance) return { success: false, message: 'No hay instancia de checklist' };
    
    updateState({ finalizing: true });
    
    try {
      const result = await checklistService.finalizeInstance(state.instance.id, finalizationData);
      
      if (result.success) {
        updateState({
          instance: result.data.checklist,
          progreso: 100,
        });
        
        return { success: true, data: result.data };
      } else {
        return { success: false, message: result.message };
      }
    } catch (error) {
      return { success: false, message: 'Error finalizando checklist' };
    } finally {
      updateState({ finalizing: false });
    }
  }, [state.instance, updateState]);

  // ==================== NAVEGACIÓN ====================

  const goToStep = useCallback((step: number) => {
    if (step >= 0 && step < state.totalSteps) {
      updateState({ currentStep: step });
    }
  }, [state.totalSteps, updateState]);

  const nextStep = useCallback(() => {
    if (state.currentStep < state.totalSteps - 1) {
      updateState({ currentStep: state.currentStep + 1 });
    }
  }, [state.currentStep, state.totalSteps, updateState]);

  const previousStep = useCallback(() => {
    if (state.currentStep > 0) {
      updateState({ currentStep: state.currentStep - 1 });
    }
  }, [state.currentStep, updateState]);

  // ==================== SINCRONIZACIÓN ====================

  const syncOfflineData = useCallback(async () => {
    try {
      const result = await checklistService.syncOfflineData();
      
      if (result.success) {
        updateState({ pendingSync: false });
        return result;
      }
      
      return result;
    } catch (error) {
      return { success: false, message: 'Error sincronizando datos' };
    }
  }, [updateState]);

  // ==================== EFECTOS ====================

  useEffect(() => {
    if (ordenId) {
      initializeChecklist();
    }
  }, [ordenId, initializeChecklist]);

  // ==================== EFECTO DE MONITOREO ====================
  
  useEffect(() => {
    console.log('🔍 Monitoreo de instancia - Cambio detectado:', {
      instanceId: state.instance?.id,
      instanceEstado: state.instance?.estado,
      loading: state.loading,
      error: state.error
    });
    
    // Detectar si la instancia se volvió undefined inesperadamente
    if (state.instance === null && !state.loading && !state.error) {
      console.warn('⚠️ ALERTA: La instancia se volvió null sin estar en loading o error');
    }
    
    if (state.instance?.id === undefined && state.instance !== null) {
      console.error('❌ ALERTA CRÍTICA: La instancia existe pero no tiene ID válido');
    }
  }, [state.instance, state.loading, state.error]);

  // ==================== RETURN ====================

  return {
    // Estado
    ...state,
    
    // Métodos de inicialización
    initializeChecklist,
    createChecklistFromService,
    
    // Control de flujo
    startChecklist,
    pauseChecklist,
    resumeChecklist,
    finalizeChecklist,
    
    // Respuestas
    saveResponse,
    
    // Fotos
    takePicture,
    pickFromGallery,
    uploadPhoto,
    
    // Navegación
    goToStep,
    nextStep,
    previousStep,
    canGoNext: state.currentStep < state.totalSteps - 1,
    canGoPrevious: state.currentStep > 0,
    
    // Sincronización
    syncOfflineData,
    
    // Utilidades
    currentItem: state.template?.items[state.currentStep] || null,
    currentResponse: state.instance?.respuestas && Array.isArray(state.instance.respuestas) 
      ? state.instance.respuestas.find(
          r => r.item_template === state.template?.items[state.currentStep]?.id
        ) || null
      : null,
    
    // Estado del checklist
    canStart: state.instance?.estado === 'PENDIENTE',
    canPause: state.instance?.estado === 'EN_PROGRESO',
    canResume: state.instance?.estado === 'PAUSADO',
    canFinalize: calculateLocalCanFinalize(),
    isCompleted: state.instance?.estado === 'COMPLETADO',
  };
};

export default useChecklist; 