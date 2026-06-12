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
import { ICON_STROKE_WIDTH, ICON_SIZE } from '@/app/design-system/iconography';
import { COLORS, SPACING, TYPOGRAPHY, BORDERS } from '@/app/design-system/tokens';
import { checklistQueryKeys } from '@/hooks/checklistQueryKeys';
import { checklistService } from '@/services/checklistService';
import { showAlert, showAlertButtons } from '@/utils/platformAlert';

const I = COLORS.institutional;
const FF = TYPOGRAPHY.fontFamily;

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
            size={48}
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
            size={ICON_SIZE.md}
            color={I.ink}
            strokeWidth={ICON_STROKE_WIDTH}
          />
        </TouchableOpacity>

        <View style={styles.headerContent}>
          <Text style={styles.headerTitle} numberOfLines={2}>
            {item.pregunta_texto}
          </Text>
          <Text style={styles.headerSubtitle}>
            Ítem {item.orden_visual || '—'} de {template.items?.length || 0}
          </Text>
        </View>
      </View>

      {item.descripcion_ayuda ? (
        <View style={styles.helpBanner}>
          <Text style={styles.helpText}>{item.descripcion_ayuda}</Text>
        </View>
      ) : null}

      <ScrollView
        style={styles.content}
        contentContainerStyle={[
          styles.contentContainer,
          { paddingBottom: Math.max(insets.bottom, 20) + 20 },
        ]}
        showsVerticalScrollIndicator={false}
      >
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
          hideHeader
        />
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
    paddingHorizontal: SPACING.fixed.md,
    paddingVertical: SPACING.fixed.xs,
    minHeight: 48,
    backgroundColor: I.canvas,
    borderBottomWidth: BORDERS.width.thin,
    borderBottomColor: I.hairline,
  },
  closeButton: {
    padding: SPACING.fixed.xxs,
    marginRight: SPACING.fixed.sm,
  },
  headerContent: {
    flex: 1,
    minWidth: 0,
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontFamily: FF.sansSemiBold,
    color: I.ink,
    lineHeight: Math.round(TYPOGRAPHY.fontSize.base * TYPOGRAPHY.lineHeight.normal),
  },
  headerSubtitle: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontFamily: FF.sansMedium,
    color: I.muted,
    marginTop: 1,
  },
  helpBanner: {
    paddingHorizontal: SPACING.fixed.md,
    paddingVertical: SPACING.fixed.xs,
    backgroundColor: I.surfaceSoft,
    borderBottomWidth: BORDERS.width.thin,
    borderBottomColor: I.hairlineSoft,
  },
  helpText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansRegular,
    color: I.body,
    lineHeight: Math.round(TYPOGRAPHY.fontSize.sm * TYPOGRAPHY.lineHeight.normal),
  },
  content: {
    flex: 1,
    backgroundColor: I.canvas,
  },
  contentContainer: {
    paddingHorizontal: SPACING.fixed.md,
    paddingTop: SPACING.fixed.sm,
  },
  loadingText: {
    textAlign: 'center',
    fontSize: TYPOGRAPHY.fontSize.base,
    fontFamily: FF.sansMedium,
    color: I.muted,
    marginTop: SPACING.fixed.md,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.fixed.xl,
  },
  errorTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontFamily: FF.sansSemiBold,
    color: I.ink,
    marginTop: SPACING.fixed.sm,
  },
  errorMessage: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontFamily: FF.sansRegular,
    color: I.muted,
    textAlign: 'center',
    marginTop: SPACING.fixed.xs,
    marginBottom: SPACING.fixed.lg,
  },
  backButton: {
    backgroundColor: I.primary,
    paddingHorizontal: SPACING.fixed.lg,
    paddingVertical: SPACING.fixed.sm,
    borderRadius: BORDERS.radius.pill,
    minHeight: 44,
    justifyContent: 'center',
  },
  backButtonText: {
    color: I.onPrimary,
    fontSize: TYPOGRAPHY.fontSize.base,
    fontFamily: FF.sansSemiBold,
  },
});
