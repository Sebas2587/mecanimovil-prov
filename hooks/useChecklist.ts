import { useState, useCallback, useMemo } from 'react';
import { Alert, Platform } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import {
  checklistService,
  type ChecklistInstance,
  type ChecklistItemResponse,
  type ChecklistFinalizationData,
} from '@/services/checklistService';
import { checklistQueryKeys } from '@/hooks/checklistQueryKeys';
import { invalidateProveedorMarketplaceQueries } from '@/utils/invalidateProveedorMarketplace';
import {
  fetchChecklistBundle,
  fetchChecklistBundleForCita,
  calcProgreso,
  respuestaCompletadaParaItem,
  type ChecklistBundle,
} from '@/hooks/fetchChecklistBundle';

interface UseChecklistProps {
  ordenId?: number;
  citaPersonalId?: number;
}

interface ChecklistUiState {
  currentStep: number;
  saving: boolean;
  uploading: boolean;
  finalizing: boolean;
  pendingSync: boolean;
  localError: string | null;
}

export const useChecklist = ({ ordenId, citaPersonalId }: UseChecklistProps) => {
  const queryClient = useQueryClient();
  const entityKey = citaPersonalId
    ? checklistQueryKeys.instanceCita(citaPersonalId)
    : checklistQueryKeys.instance(ordenId ?? 0);

  const [uiState, setUiState] = useState<ChecklistUiState>({
    currentStep: 0,
    saving: false,
    uploading: false,
    finalizing: false,
    pendingSync: false,
    localError: null,
  });

  const {
    data: bundle,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: entityKey,
    queryFn: () =>
      citaPersonalId
        ? fetchChecklistBundleForCita(citaPersonalId)
        : fetchChecklistBundle(ordenId!),
    staleTime: 30_000,
    gcTime: 5 * 60 * 1000,
    enabled: !!(citaPersonalId || ordenId),
  });

  const instance = bundle?.instance ?? null;
  const template = bundle?.template ?? null;
  const isOffline = bundle?.isOffline ?? false;
  const totalSteps = template?.items?.length ?? 0;
  const progreso = useMemo(() => calcProgreso(instance, template), [instance, template]);
  const error = uiState.localError ?? bundle?.fetchError ?? null;
  const loading = isLoading;

  const updateUi = useCallback((updates: Partial<ChecklistUiState>) => {
    setUiState((prev) => ({ ...prev, ...updates }));
  }, []);

  const invalidateChecklist = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: entityKey });
  }, [queryClient, entityKey]);

  const patchBundle = useCallback(
    (updater: (current: ChecklistBundle) => ChecklistBundle) => {
      queryClient.setQueryData<ChecklistBundle>(entityKey, (old) => {
        if (!old) return old;
        return updater(old);
      });
    },
    [queryClient, entityKey],
  );

  const patchInstance = useCallback(
    (updatedInstance: ChecklistInstance) => {
      patchBundle((old) => ({ ...old, instance: updatedInstance }));
    },
    [patchBundle],
  );

  const calculateLocalCanFinalize = useCallback(() => {
    if (!instance || !template) return false;

    if (instance.estado !== 'EN_PROGRESO' && instance.estado !== 'PAUSADO') return false;

    const respuestas = instance.respuestas || [];
    const respuestasCompletadas = respuestas.filter((r) => r.completado);

    if (respuestasCompletadas.length === 0) return false;

    const totalItems = template.items?.length ?? template.total_items ?? 0;
    const progresoLocal =
      totalItems > 0
        ? checklistService.calcularProgreso(respuestas, totalItems)
        : progreso;

    const itemsObligatorios = template.items.filter(
      (item) => item.es_obligatorio_efectivo || item.es_obligatorio,
    );

    if (itemsObligatorios.length === 0) {
      return progresoLocal >= 80;
    }

    for (const item of itemsObligatorios) {
      if (!respuestaCompletadaParaItem(respuestas, item.id)) {
        return false;
      }
    }

    if (progresoLocal >= 80) return true;

    // Fallback: confiar en flag del backend tras guardar respuestas
    return instance.puede_finalizar_check === true;
  }, [instance, template, progreso]);

  const initializeChecklist = useCallback(async () => {
    updateUi({ localError: null });
    const result = await refetch();
    return result;
  }, [refetch, updateUi]);

  const createChecklistFromService = useCallback(
    async (servicioId: number) => {
      updateUi({ localError: null });

      try {
        const templateResponse = await checklistService.getTemplateByService(servicioId);

        if (templateResponse.success && templateResponse.data) {
          const newTemplate = templateResponse.data;
          const instanceResponse = await checklistService.createInstance(ordenId, newTemplate.id);

          if (instanceResponse.success && instanceResponse.data) {
            const newInstance = instanceResponse.data;
            const newBundle: ChecklistBundle = {
              instance: newInstance,
              template: newTemplate,
              isOffline: false,
              fetchError: null,
            };
            queryClient.setQueryData(checklistQueryKeys.instance(ordenId), newBundle);
            await invalidateChecklist();
            return { success: true, data: newInstance };
          }

          updateUi({ localError: instanceResponse.message || 'Error creando checklist' });
          return { success: false, message: instanceResponse.message };
        }

        updateUi({
          localError: templateResponse.message || 'No hay template disponible para este servicio',
        });
        return { success: false, message: templateResponse.message };
      } catch {
        const errorMessage = 'Error creando checklist';
        updateUi({ localError: errorMessage });
        return { success: false, message: errorMessage };
      }
    },
    [ordenId, queryClient, invalidateChecklist, updateUi],
  );

  const startChecklist = useCallback(async () => {
    if (!instance) return { success: false, message: 'No hay instancia de checklist' };

    try {
      const response = await checklistService.startInstance(instance.id);

      if (response.success && response.data) {
        if (!response.data.id || typeof response.data.id !== 'number') {
          updateUi({ localError: 'Error: Respuesta inválida del servidor' });
          return { success: false, message: 'Respuesta inválida del servidor' };
        }

        patchInstance(response.data);
        await invalidateChecklist();
        return { success: true, data: response.data };
      }

      updateUi({ localError: response.message || 'Error iniciando checklist' });
      return { success: false, message: response.message };
    } catch {
      const errorMessage = 'Error iniciando checklist';
      updateUi({ localError: errorMessage });
      return { success: false, message: errorMessage };
    }
  }, [instance, patchInstance, invalidateChecklist, updateUi]);

  const pauseChecklist = useCallback(async () => {
    if (!instance) return { success: false, message: 'No hay instancia de checklist' };

    try {
      const response = await checklistService.pauseInstance(instance.id);

      if (response.success && response.data) {
        patchInstance(response.data);
        await invalidateChecklist();
        return { success: true, data: response.data };
      }
      return { success: false, message: response.message };
    } catch {
      return { success: false, message: 'Error pausando checklist' };
    }
  }, [instance, patchInstance, invalidateChecklist]);

  const resumeChecklist = useCallback(async () => {
    if (!instance) return { success: false, message: 'No hay instancia de checklist' };

    try {
      const response = await checklistService.resumeInstance(instance.id);

      if (response.success && response.data) {
        patchInstance(response.data);
        await invalidateChecklist();
        return { success: true, data: response.data };
      }
      return { success: false, message: response.message };
    } catch {
      return { success: false, message: 'Error reanudando checklist' };
    }
  }, [instance, patchInstance, invalidateChecklist]);

  const saveResponse = useCallback(
    async (itemTemplateId: number, responseData: Partial<ChecklistItemResponse>) => {
      if (!instance) {
        return { success: false, message: 'No hay instancia de checklist' };
      }

      if (!instance.id || typeof instance.id !== 'number') {
        return { success: false, message: 'ID de instancia inválido' };
      }

      updateUi({ saving: true });

      try {
        const existingInState = Array.isArray(instance.respuestas)
          ? instance.respuestas.find((r) => r.item_template === itemTemplateId)
          : undefined;
        const resolvedId = (responseData as { id?: number }).id || existingInState?.id;

        const response: ChecklistItemResponse = {
          item_template: itemTemplateId,
          completado: responseData.completado ?? true,
          ...responseData,
          ...(resolvedId ? { id: resolvedId } : {}),
        };

        const result = await checklistService.saveResponse(response, instance.id);

        if (result.success) {
          const updatedInstance = { ...instance };

          if (!Array.isArray(updatedInstance.respuestas)) {
            updatedInstance.respuestas = [];
          }

          const existingResponseIndex = updatedInstance.respuestas.findIndex(
            (r) => r.item_template === itemTemplateId,
          );

          if (existingResponseIndex >= 0) {
            updatedInstance.respuestas[existingResponseIndex] = result.data;
          } else {
            updatedInstance.respuestas.push(result.data);
          }

          const totalItems =
            template?.items?.length ?? template?.total_items ?? 0;
          if (totalItems > 0) {
            updatedInstance.progreso_porcentaje = checklistService.calcularProgreso(
              updatedInstance.respuestas,
              totalItems,
            );
          }

          patchInstance(updatedInstance);
          updateUi({ pendingSync: result.message?.includes('localmente') || false });
          await invalidateChecklist();

          return { success: true, data: result.data };
        }

        return { success: false, message: result.message };
      } catch {
        return { success: false, message: 'Error guardando respuesta' };
      } finally {
        updateUi({ saving: false });
      }
    },
    [instance, template, patchInstance, invalidateChecklist, updateUi],
  );

  const takePicture = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permisos', 'Se necesitan permisos de cámara para continuar');
        return { success: false, message: 'Permisos de cámara denegados' };
      }

      const result = await ImagePicker.launchCameraAsync({
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
          },
        };
      }

      return { success: false, message: 'Captura cancelada' };
    } catch {
      return { success: false, message: 'Error al tomar foto' };
    }
  }, []);

  const pickFromGallery = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permisos', 'Se necesitan permisos de galería para continuar');
        return { success: false, message: 'Permisos de galería denegados' };
      }

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
          },
        };
      }

      return { success: false, message: 'Selección cancelada' };
    } catch {
      return { success: false, message: 'Error al seleccionar foto' };
    }
  }, []);

  const uploadPhoto = useCallback(
    async (
      photoUri: string,
      responseId: number,
      ordenEnRespuesta: number,
      descripcion?: string,
    ) => {
      updateUi({ uploading: true });

      try {
        const formData = new FormData();
        formData.append('response', responseId.toString());
        const fileName = `checklist_photo_${Date.now()}.jpg`;

        if (Platform.OS === 'web') {
          // En web el patrón { uri, type, name } NO produce un archivo real:
          // se serializa como "[object Object]" y el backend recibe FILES vacío.
          // Convertir el URI (blob:/data:/http) a Blob real antes de adjuntar.
          const resp = await fetch(photoUri);
          const blob = await resp.blob();
          const file = new File([blob], fileName, {
            type: blob.type || 'image/jpeg',
          });
          formData.append('imagen', file);
        } else {
          formData.append('imagen', {
            uri: photoUri,
            type: 'image/jpeg',
            name: fileName,
          } as unknown as Blob);
        }
        formData.append('orden_en_respuesta', String(ordenEnRespuesta));

        if (descripcion) {
          formData.append('descripcion', descripcion);
        }

        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === 'granted') {
            const location = await Location.getCurrentPositionAsync({});
            formData.append(
              'ubicacion_captura',
              JSON.stringify({
                type: 'Point',
                coordinates: [location.coords.longitude, location.coords.latitude],
              }),
            );
          }
        } catch {
          // ubicación opcional
        }

        const result = await checklistService.uploadPhoto(formData);

        if (result.success) {
          return { success: true, data: result.data };
        }

        return { success: false, message: result.message };
      } catch {
        return { success: false, message: 'Error subiendo foto' };
      } finally {
        updateUi({ uploading: false });
      }
    },
    [updateUi],
  );

  const deletePhoto = useCallback(async (photoId: number) => {
    try {
      return await checklistService.deletePhoto(photoId);
    } catch {
      return { success: false, message: 'Error eliminando foto' };
    }
  }, []);

  const finalizeChecklist = useCallback(
    async (finalizationData: ChecklistFinalizationData) => {
      if (!instance) return { success: false, message: 'No hay instancia de checklist' };

      updateUi({ finalizing: true });

      try {
        const pendingPhotos = await checklistService.getOfflinePhotosByInstance(instance.id);
        const toSync = pendingPhotos.filter((p) => !p.synced);
        if (toSync.length > 0) {
          for (const photo of toSync) {
            try {
              const uploadResult = await uploadPhoto(
                photo.uri,
                photo.responseId,
                photo.orden_en_respuesta,
                photo.descripcion,
              );
              if (uploadResult.success && uploadResult.data) {
                await checklistService.markOfflinePhotoSynced(photo.local_id, uploadResult.data);
              }
            } catch (e) {
              console.warn('No se pudo subir foto pendiente:', photo.local_id, e);
            }
          }
        }

        const result = await checklistService.finalizeInstance(instance.id, finalizationData);

        if (result.success) {
          patchInstance(result.data.checklist);
          await invalidateChecklist();
          invalidateProveedorMarketplaceQueries(queryClient);
          return { success: true, data: result.data };
        }

        return { success: false, message: result.message };
      } catch {
        return { success: false, message: 'Error finalizando checklist' };
      } finally {
        updateUi({ finalizing: false });
      }
    },
    [instance, uploadPhoto, patchInstance, invalidateChecklist, queryClient, updateUi],
  );

  const goToStep = useCallback(
    (step: number) => {
      if (step >= 0 && step < totalSteps) {
        updateUi({ currentStep: step });
      }
    },
    [totalSteps, updateUi],
  );

  const nextStep = useCallback(() => {
    if (uiState.currentStep < totalSteps - 1) {
      updateUi({ currentStep: uiState.currentStep + 1 });
    }
  }, [uiState.currentStep, totalSteps, updateUi]);

  const previousStep = useCallback(() => {
    if (uiState.currentStep > 0) {
      updateUi({ currentStep: uiState.currentStep - 1 });
    }
  }, [uiState.currentStep, updateUi]);

  const syncOfflineData = useCallback(async () => {
    try {
      const result = await checklistService.syncOfflineData();

      if (result.success) {
        updateUi({ pendingSync: false });
        await invalidateChecklist();
        return result;
      }

      return result;
    } catch {
      return { success: false, message: 'Error sincronizando datos' };
    }
  }, [invalidateChecklist, updateUi]);

  const currentStep = uiState.currentStep;

  return {
    template,
    instance,
    currentStep,
    totalSteps,
    progreso,
    loading,
    saving: uiState.saving,
    uploading: uiState.uploading,
    finalizing: uiState.finalizing,
    isOffline,
    pendingSync: uiState.pendingSync,
    error,
    refetch,

    initializeChecklist,
    createChecklistFromService,

    startChecklist,
    pauseChecklist,
    resumeChecklist,
    finalizeChecklist,

    saveResponse,

    takePicture,
    pickFromGallery,
    uploadPhoto,
    deletePhoto,

    goToStep,
    nextStep,
    previousStep,
    canGoNext: currentStep < totalSteps - 1,
    canGoPrevious: currentStep > 0,

    syncOfflineData,

    currentItem: template?.items[currentStep] || null,
    currentResponse:
      instance?.respuestas && Array.isArray(instance.respuestas)
        ? instance.respuestas.find(
            (r) => r.item_template === template?.items[currentStep]?.id,
          ) || null
        : null,

    canStart: instance?.estado === 'PENDIENTE',
    canPause: instance?.estado === 'EN_PROGRESO',
    canResume: instance?.estado === 'PAUSADO',
    canFinalize: calculateLocalCanFinalize(),
    isCompleted: instance?.estado === 'COMPLETADO',
  };
};

export default useChecklist;
