import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
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
  const { ordenId, itemId, citaId } = useLocalSearchParams<{
    ordenId: string;
    itemId: string;
    citaId?: string;
  }>();
  const insets = useSafeAreaInsets();

  const itemIdNum = parseInt(itemId || '0', 10);
  const citaPersonalIdNum =
    citaId && /^\d+$/.test(citaId) ? parseInt(citaId, 10) : undefined;
  const ordenIdNum =
    ordenId && ordenId !== 'cita' && /^\d+$/.test(ordenId)
      ? parseInt(ordenId, 10)
      : undefined;

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
  } = useChecklist({
    ordenId: ordenIdNum,
    citaPersonalId: citaPersonalIdNum,
  });

  const item = useMemo(
    () => template?.items?.find((i) => i.id === itemIdNum) ?? null,
    [template, itemIdNum],
  );

  const response = useMemo(() => {
    if (!instance?.respuestas) return null;
    return instance.respuestas.find((r) => r.item_template === itemIdNum) ?? null;
  }, [instance, itemIdNum]);

  const hasOrdenVehiculo = !!instance?.orden;

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
    enabled: !!instance?.id && hasOrdenVehiculo,
    retry: false,
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

  const handleGoBack = () => {
    router.back();
  };

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

  if (!ordenIdNum && !citaPersonalIdNum) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <InstitutionalIcon
            name="error"
            size={48}
            color={I.semanticDown}
            strokeWidth={ICON_STROKE_WIDTH}
          />
          <Text style={styles.errorTitle}>Ruta inválida</Text>
          <Text style={styles.errorMessage}>
            No se pudo identificar la orden o cita del checklist.
          </Text>
          <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
            <Text style={styles.backButtonText}>Volver</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (loading && !instance) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingWrap}>
          <LoadingSpinner />
          <Text style={styles.loadingText}>Cargando ítem…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!template || !instance) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <InstitutionalIcon
            name="error"
            size={48}
            color={I.semanticDown}
            strokeWidth={ICON_STROKE_WIDTH}
          />
          <Text style={styles.errorTitle}>No se pudo cargar</Text>
          <Text style={styles.errorMessage}>
            No encontramos el checklist asociado a este ítem.
          </Text>
          <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
            <Text style={styles.backButtonText}>Volver</Text>
          </TouchableOpacity>
        </View>
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
          <Text style={styles.errorTitle}>Ítem no encontrado</Text>
          <Text style={styles.errorMessage}>
            No se pudo encontrar el ítem del checklist solicitado.
          </Text>
          <TouchableOpacity style={styles.backButton} onPress={handleGoBack}>
            <Text style={styles.backButtonText}>Volver</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const stepLabel = `Paso ${item.orden_visual || '—'} de ${template.items?.length || 0}`;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.topBar}>
          <TouchableOpacity onPress={handleGoBack} style={styles.closeButton} hitSlop={12}>
            <InstitutionalIcon
              name="arrow-back"
              size={ICON_SIZE.md}
              color={I.ink}
              strokeWidth={ICON_STROKE_WIDTH}
            />
          </TouchableOpacity>
          <Text style={styles.topBarStep}>{stepLabel}</Text>
          <View style={styles.topBarSpacer} />
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={[
            styles.contentContainer,
            { paddingBottom: Math.max(insets.bottom, 24) + 32 },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.heroTitle}>{item.pregunta_texto}</Text>
          {item.descripcion_ayuda ? (
            <Text style={styles.heroSupport}>{item.descripcion_ayuda}</Text>
          ) : null}

          <View style={styles.answerBlock}>
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
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: I.surfaceSoft,
  },
  flex: { flex: 1 },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.fixed.md,
    paddingVertical: SPACING.fixed.sm,
    backgroundColor: I.surfaceSoft,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: I.canvas,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
  },
  topBarStep: {
    flex: 1,
    textAlign: 'center',
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansMedium,
    color: I.muted,
  },
  topBarSpacer: { width: 40 },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: SPACING.fixed.lg,
    paddingTop: SPACING.fixed.md,
  },
  heroTitle: {
    fontSize: 28,
    fontFamily: FF.sansSemiBold,
    color: I.ink,
    lineHeight: 34,
    letterSpacing: -0.4,
    marginBottom: SPACING.fixed.sm,
  },
  heroSupport: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontFamily: FF.sansRegular,
    color: I.body,
    lineHeight: Math.round(TYPOGRAPHY.fontSize.base * 1.45),
    marginBottom: SPACING.fixed.lg,
  },
  answerBlock: {
    backgroundColor: I.canvas,
    borderRadius: BORDERS.radius.xl,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    padding: SPACING.fixed.lg,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.fixed.sm,
  },
  loadingText: {
    textAlign: 'center',
    fontSize: TYPOGRAPHY.fontSize.base,
    fontFamily: FF.sansMedium,
    color: I.muted,
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
    borderRadius: BORDERS.radius.lg,
    minHeight: 48,
    justifyContent: 'center',
  },
  backButtonText: {
    color: I.onPrimary,
    fontSize: TYPOGRAPHY.fontSize.base,
    fontFamily: FF.sansSemiBold,
  },
});
