import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useChecklist } from '@/hooks/useChecklist';
import { ChecklistItemRenderer } from '@/components/checklist/ChecklistItemRenderer';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { InstitutionalIcon } from '@/components/ui/InstitutionalIcon';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import { COLORS } from '@/app/design-system/tokens';
import { checklistQueryKeys } from '@/hooks/checklistQueryKeys';
import { checklistService } from '@/services/checklistService';
import { showAlert, showAlertButtons } from '@/utils/platformAlert';

const I = COLORS.institutional;

export default function ChecklistItemDetailScreen() {
  const { ordenId, itemId } = useLocalSearchParams<{ ordenId: string; itemId: string }>();
  const insets = useSafeAreaInsets();

  const ordenIdNum = parseInt(ordenId || '0', 10);
  const itemIdNum = parseInt(itemId || '0', 10);

  const {
    template,
    instance,
    loading,
    saving,
    saveResponse,
    takePicture,
    pickFromGallery,
    uploadPhoto,
    deletePhoto,
    finalizeChecklist,
  } = useChecklist({ ordenId: ordenIdNum });

  const item = useMemo(
    () => template?.items?.find((i) => i.id === itemIdNum) ?? null,
    [template, itemIdNum],
  );

  const response = useMemo(() => {
    if (!instance?.respuestas) return null;
    return instance.respuestas.find((r) => r.item_template === itemIdNum) ?? null;
  }, [instance, itemIdNum]);

  const { data: snapshotRoot } = useQuery({
    queryKey: checklistQueryKeys.saludSnapshot(instance?.id ?? 0),
    queryFn: async () => {
      const res = await checklistService.getSaludSnapshot(instance!.id);
      if (!res.success || !res.data) {
        throw new Error(res.message || 'No se pudo cargar el snapshot de salud');
      }
      return res.data;
    },
    staleTime: 60_000,
    enabled: !!instance?.id,
  });

  const kmActual = snapshotRoot?.kilometraje_actual ?? null;

  const saludSnapshot = useMemo(() => {
    if (!snapshotRoot?.items || !item) return null;
    return (
      snapshotRoot.items.find(
        (s) => Number(s.item_template_id) === Number(item.id),
      ) ?? null
    );
  }, [snapshotRoot, item]);

  const [localResponse, setLocalResponse] = useState<typeof response>(null);

  useEffect(() => {
    setLocalResponse(response);
  }, [response]);

  // Para items de tipo FOTO: asegurar que exista una respuesta en backend
  // antes de intentar subir fotos, de modo que se puedan asociar múltiples evidencias.
  useEffect(() => {
    const ensurePhotoResponse = async () => {
      if (!item || !instance) return;
      if (item.tipo_pregunta !== 'PHOTO') return;
      if (localResponse) return;

      const result = await saveResponse(item.id, { completado: false });
      if (result.success) {
        setLocalResponse(result.data ?? null);
      } else {
        console.error('❌ No se pudo inicializar respuesta para item PHOTO:', result.message);
      }
    };

    ensurePhotoResponse();
  }, [item, instance, localResponse, saveResponse]);

  const handleSave = async (responseData: Record<string, unknown>, options?: { silent?: boolean }) => {
    if (!item) return { success: false, message: 'Item no disponible' };

    const result = await saveResponse(item.id, responseData);

    if (result.success) {
      if (result.data) {
        setLocalResponse(result.data ?? null);
      }
      if (!options?.silent) {
        showAlertButtons(
          'Guardado',
          'Tu respuesta ha sido guardada exitosamente.',
          [{ text: 'OK', onPress: () => router.back() }],
        );
      }
    } else if (!options?.silent) {
      showAlert('Error', result.message || 'No se pudo guardar la respuesta');
    }
    return result;
  };

  const handleGoBack = () => {
    router.back();
  };

  if (loading && !instance) {
    return (
      <SafeAreaView style={styles.container}>
        <LoadingSpinner />
        <Text style={styles.loadingText}>Cargando item del checklist...</Text>
      </SafeAreaView>
    );
  }

  if (!template || !instance) {
    return (
      <SafeAreaView style={styles.container}>
        <LoadingSpinner />
        <Text style={styles.loadingText}>Cargando item del checklist...</Text>
      </SafeAreaView>
    );
  }

  if (!item) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <InstitutionalIcon
            name="error"
            size={64}
            color={I.semanticDown}
            strokeWidth={ICON_STROKE_WIDTH}
          />
          <Text style={styles.errorTitle}>Item no encontrado</Text>
          <Text style={styles.errorMessage}>
            No se pudo encontrar el item del checklist solicitado.
          </Text>
          <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
            <Text style={styles.backButtonText}>Volver</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleGoBack} style={styles.closeButton}>
          <InstitutionalIcon
            name="arrow-back"
            size={24}
            color={I.ink}
            strokeWidth={ICON_STROKE_WIDTH}
          />
        </TouchableOpacity>

        <View style={styles.headerContent}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {item.pregunta_texto}
          </Text>
          <Text style={styles.headerSubtitle}>
            Item {item.orden_visual || 'N/A'} de {template.items?.length || 0}
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={[
          styles.contentContainer,
          { paddingBottom: Math.max(insets.bottom, 20) + 20 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.rendererWrapper}>
          <ChecklistItemRenderer
            item={item}
            response={localResponse}
            onSave={handleSave}
            saving={saving}
            instance={instance}
            finalizeChecklist={finalizeChecklist}
            takePicture={takePicture}
            pickFromGallery={pickFromGallery}
            uploadPhoto={uploadPhoto}
            deletePhoto={deletePhoto}
            saludSnapshot={saludSnapshot}
            kmActual={kmActual}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: I.canvas,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: I.canvas,
    borderBottomWidth: 1,
    borderBottomColor: I.hairline,
  },
  closeButton: {
    padding: 6,
    marginRight: 10,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: I.ink,
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 13,
    color: I.muted,
  },
  content: {
    flex: 1,
    backgroundColor: I.canvas,
  },
  contentContainer: {
    paddingTop: 8,
  },
  rendererWrapper: {
    paddingHorizontal: 20,
  },
  loadingText: {
    textAlign: 'center',
    fontSize: 16,
    color: I.muted,
    marginTop: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: I.ink,
    marginTop: 16,
  },
  errorMessage: {
    fontSize: 16,
    color: I.muted,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  backButton: {
    backgroundColor: I.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  backButtonText: {
    color: I.onPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
});
