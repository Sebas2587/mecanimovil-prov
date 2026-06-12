import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useChecklist } from '@/hooks/useChecklist';
import { ChecklistProgressBar } from '@/components/checklist/ChecklistProgressBar';
import { ChecklistSignatureModal } from '@/components/checklist/ChecklistSignatureModal';
import { ChecklistCompletedView } from '@/components/checklist/ChecklistCompletedView';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { COLORS, SPACING, TYPOGRAPHY, BORDERS, withOpacity } from '@/app/design-system/tokens';
import { InstitutionalIcon } from '@/components/ui/InstitutionalIcon';
import { ICON_STROKE_WIDTH, ICON_SIZE } from '@/app/design-system/iconography';
import { ChecklistDiffModal } from '@/components/checklist/ChecklistDiffModal';
import { EstadoBanner } from '@/components/solicitudes/EstadoBanner';
import { showAlert, showConfirm, showAlertButtons } from '@/utils/platformAlert';

const I = COLORS.institutional;
const FF = TYPOGRAPHY.fontFamily;

function labelEstadoChecklist(estado?: string): string {
  switch (estado) {
    case 'PENDIENTE':
      return 'Pendiente';
    case 'EN_PROGRESO':
      return 'En progreso';
    case 'PAUSADO':
      return 'Pausado';
    case 'PENDIENTE_FIRMA_CLIENTE':
      return 'Esperando firma del cliente';
    case 'COMPLETADO':
      return 'Completado';
    default:
      return estado ?? '—';
  }
}

interface ChecklistContainerProps {
  ordenId: number;
  onComplete?: () => void;
  onCancel?: () => void;
}

export const ChecklistContainer: React.FC<ChecklistContainerProps> = ({
  ordenId,
  onComplete,
  onCancel,
}) => {
  console.log('🚀 ChecklistContainer montado para orden:', ordenId);

  const insets = useSafeAreaInsets();
  const {
    // Estado
    template,
    instance,
    currentStep,
    totalSteps,
    progreso,
    loading,
    saving,
    finalizing,
    isOffline,
    pendingSync,
    error,

    // Métodos
    startChecklist,
    pauseChecklist,
    resumeChecklist,
    finalizeChecklist,
    saveResponse,

    // Navegación
    nextStep,
    previousStep,
    canGoNext,
    canGoPrevious,

    // Utilidades
    currentItem,
    currentResponse,
    canStart,
    canPause,
    canResume,
    canFinalize,
    isCompleted,
    takePicture,
    pickFromGallery,
    uploadPhoto,
  } = useChecklist({ ordenId });

  const esperandoFirmaCliente = instance?.estado === 'PENDIENTE_FIRMA_CLIENTE';

  console.log('📊 Estado del hook useChecklist:', {
    template: template ? `Template cargado: ${template.nombre}` : 'No template',
    instance: instance ? `Instance ID: ${instance.id}, estado: ${instance.estado}` : 'No instance',
    loading,
    error,
    totalSteps,
    currentStep,
    canStart,
    canResume,
    canFinalize,
    progreso
  });

  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [showCompletedView, setShowCompletedView] = useState(false);
  const [showDiffModal, setShowDiffModal] = useState(false);

  // ==================== HANDLERS ====================

  const handleStart = async () => {
    const result = await startChecklist();
    if (!result.success) {
      showAlert('Error', result.message || 'No se pudo iniciar el checklist');
    }
  };

  const handlePause = async () => {
    showConfirm(
      'Pausar Checklist',
      '¿Estás seguro de que quieres pausar el checklist? Podrás continuar más tarde.',
      {
        confirmText: 'Pausar',
        onConfirm: async () => {
          const result = await pauseChecklist();
          if (!result.success) {
            showAlert('Error', result.message || 'No se pudo pausar el checklist');
          }
        },
      },
    );
  };

  const handleResume = async () => {
    const result = await resumeChecklist();
    if (!result.success) {
      showAlert('Error', result.message || 'No se pudo reanudar el checklist');
    }
  };

  const handleSaveResponse = async (responseData: any) => {
    if (!currentItem) return;

    const result = await saveResponse(currentItem.id, responseData);

    if (result.success) {
      // Auto-avanzar al siguiente paso si no es obligatorio quedarse
      if (canGoNext && currentItem.tipo_pregunta !== 'PHOTO') {
        setTimeout(() => {
          nextStep();
        }, 500);
      }
    } else {
      showAlert('Error', result.message || 'No se pudo guardar la respuesta');
    }
  };

  const handleNext = () => {
    // Verificar que el step actual esté completo si es obligatorio
    if (currentItem?.es_obligatorio && !currentResponse?.completado) {
      showAlert('Campo obligatorio', 'Debes completar este campo antes de continuar.');
      return;
    }

    nextStep();
  };

  const handleFinalize = () => {
    console.log('🎯 Intentando finalizar checklist:', {
      canFinalize,
      currentStep,
      totalSteps,
      progreso,
      instanceId: instance?.id,
      estado: instance?.estado,
      puede_finalizar_check: instance?.puede_finalizar_check
    });

    // Si el checklist ya está completado, mostrar resumen en lugar de "incompleto"
    if (instance?.estado === 'COMPLETADO') {
      setShowCompletedView(true);
      return;
    }

    if (!canFinalize) {
      console.log('❌ No se puede finalizar - canFinalize es false');
      console.log('🔍 Analizando campos para depuración:', {
        instance_estado: instance?.estado,
        progreso: progreso,
        totalItems: template?.items?.length,
        respuestasCompletadas: instance?.respuestas?.filter(r => r.completado)?.length,
        puede_finalizar_check: instance?.puede_finalizar_check
      });

      // Revisar qué campos faltan por completar usando el campo correcto
      const camposIncompletos = template?.items.filter((item, index) => {
        const respuesta = instance?.respuestas.find(r => r.item_template === item.id);
        // Usar es_obligatorio_efectivo que viene del catálogo
        const esObligatorio = item.es_obligatorio_efectivo !== undefined
          ? item.es_obligatorio_efectivo
          : item.es_obligatorio;
        return esObligatorio && (!respuesta || !respuesta.completado);
      }) || [];

      console.log('📋 Campos incompletos encontrados:', camposIncompletos.map(item => ({
        id: item.id,
        pregunta: item.pregunta_texto,
        es_obligatorio_efectivo: item.es_obligatorio_efectivo,
        orden_visual: item.orden_visual
      })));

      const mensaje = camposIncompletos.length > 0
        ? `Debes completar estos campos obligatorios:\n${camposIncompletos.map(item => `• ${item.pregunta_texto}`).join('\n')}`
        : 'Debes completar todos los campos obligatorios antes de finalizar.';

      showAlert('Checklist incompleto', mensaje);
      return;
    }

    console.log('✅ Abriendo modal de impacto de salud antes de firmas');
    setShowDiffModal(true);
  };

  const handleDiffConfirm = () => {
    console.log('✅ Diff confirmado, abriendo modal de firmas');
    setShowDiffModal(false);
    setShowSignatureModal(true);
  };

  const handleSignaturesComplete = async (
    firmaTecnico: string,
    firmaCliente: string | null,
    ubicacion: { lat: number; lng: number }
  ) => {
    // Firma diferida (change firma-cliente-diferida-checklist):
    // por defecto el cliente firma desde su app. Si el técnico optó por
    // capturar también la firma del cliente en sitio (modo legacy 'both'),
    // `firmaCliente` viene como string y el backend cierra el flujo de
    // inmediato.
    console.log('🏁 Enviando firma del técnico al backend...', {
      firmaCliente: firmaCliente ? 'presente (legacy 2 firmas)' : 'diferida (cliente firmará desde su app)',
    });
    setShowSignatureModal(false);

    try {
      const result = await finalizeChecklist({
        firma_tecnico: firmaTecnico,
        firma_cliente: firmaCliente ?? null,
        ubicacion_lat: ubicacion.lat,
        ubicacion_lng: ubicacion.lng,
      });

      console.log('🎊 Resultado de finalización:', result);

      if (result.success) {
        const requiereFirmaCliente = !firmaCliente;

        if (requiereFirmaCliente) {
          showAlert(
            'Firma enviada',
            'Tu firma quedó registrada. El cliente recibirá una notificación para firmar desde su app y cerrar el servicio.',
          );
          onComplete?.();
        } else {
          showAlert(
            'Checklist completado',
            'El checklist ha sido finalizado exitosamente. Las firmas digitales y la ubicación GPS han sido registradas.',
          );
          onComplete?.();
        }
      } else {
        console.error('❌ Error en finalización:', result.message);
        showAlert(
          'Error al Finalizar',
          result.message || 'No se pudo finalizar el checklist. Por favor, intenta nuevamente.',
        );
      }
    } catch (error: any) {
      console.error('❌ Error inesperado en finalización:', error);
      showAlert(
        'Error Inesperado',
        'Ocurrió un error al finalizar el checklist. Verifica tu conexión e intenta nuevamente.',
      );
    }
  };

  const handleCancel = () => {
    showAlertButtons(
      'Salir del checklist',
      '¿Estás seguro de que quieres salir? Se guardará tu progreso.',
      [
        { text: 'Continuar', style: 'cancel' },
        {
          text: 'Salir',
          style: 'destructive',
          onPress: () => onCancel?.(),
        },
      ],
    );
  };

  // ==================== RENDER STATES ====================

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <LoadingSpinner />
          <Text style={styles.loadingText}>Cargando checklist…</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <InstitutionalIcon name="error" size={64} color={I.semanticDown} strokeWidth={ICON_STROKE_WIDTH} />
          <Text style={styles.errorTitle}>No se pudo cargar</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity style={styles.primaryButton} onPress={() => onCancel?.()}>
            <Text style={styles.primaryButtonText}>Volver</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!template || !instance) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <InstitutionalIcon name="assignment" size={64} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
          <Text style={styles.errorTitle}>Sin checklist configurado</Text>
          <Text style={styles.errorMessage}>
            Este servicio no tiene checklist. Puedes continuar con el servicio normalmente.
          </Text>
          <TouchableOpacity style={styles.primaryButton} onPress={() => onCancel?.()}>
            <Text style={styles.primaryButtonText}>Volver</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ==================== RENDER PRINCIPAL ====================

  const totalCompletados = instance.respuestas?.filter(r => r.completado).length || 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header Coinbase: canvas blanco + hairline */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleCancel} style={styles.closeButton} accessibilityLabel="Cerrar checklist">
          <InstitutionalIcon name="close" size={ICON_SIZE.lg} color={I.ink} strokeWidth={ICON_STROKE_WIDTH} />
        </TouchableOpacity>

        <View style={styles.headerContent}>
          <Text style={styles.headerTitle} numberOfLines={2}>{template.nombre}</Text>
          <View style={styles.headerSubtitleRow}>
            <Text style={styles.headerSubtitle}>
              {totalCompletados} de {totalSteps} completados
            </Text>
            <View style={styles.headerStatusBadge}>
              <Text style={styles.headerStatusBadgeText}>
                {labelEstadoChecklist(instance.estado)}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Progress Bar Section */}
      {instance.estado === 'EN_PROGRESO' && (
        <ChecklistProgressBar
          currentStep={totalCompletados}
          totalSteps={totalSteps}
          progreso={progreso}
          items={template.items}
          completedItemIds={instance.respuestas?.filter(r => r.completado).map(r => r.item_template) || []}
        />
      )}

      {/* Offline/Sync Status */}
      {(isOffline || pendingSync) && (
        <View style={styles.bannerWrapCompact}>
          <EstadoBanner
          type="warning"
          title={isOffline ? 'Modo sin conexión' : 'Sincronización pendiente'}
          message={
            isOffline
              ? 'Tus respuestas se guardarán localmente hasta recuperar conexión.'
              : 'Hay cambios por sincronizar con el servidor.'
          }
          icon={isOffline ? 'cloud-off' : 'sync'}
        />
        </View>
      )}

      {/* Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={[
          styles.contentContainer,
          instance.estado === 'EN_PROGRESO' && !isCompleted && { paddingBottom: 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {esperandoFirmaCliente && (
          <View style={styles.bannerWrap}>
            <EstadoBanner
              type="info"
              title="Esperando firma del cliente"
              message="Ya registraste tu firma como técnico. El cliente debe firmar desde su app para cerrar el servicio."
              icon="schedule"
            />
            <TouchableOpacity
              style={styles.secondaryOutlineButton}
              onPress={() => setShowCompletedView(true)}
            >
              <InstitutionalIcon name="visibility" size={18} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
              <Text style={styles.secondaryOutlineButtonText}>Ver resumen del checklist</Text>
            </TouchableOpacity>
          </View>
        )}

        {canStart && (
          <View style={styles.onboardingCard}>
            <View style={styles.onboardingIconWrap}>
              <InstitutionalIcon name="play-arrow" size={28} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
            </View>
            <Text style={styles.onboardingTitle}>Listo para iniciar</Text>
            <Text style={styles.onboardingDescription}>
              Completa el checklist paso a paso antes de finalizar el servicio. El cliente firmará al cierre.
            </Text>
            <TouchableOpacity style={styles.primaryButton} onPress={handleStart}>
              <InstitutionalIcon name="play-arrow" size={18} color={I.onPrimary} strokeWidth={ICON_STROKE_WIDTH} />
              <Text style={styles.primaryButtonText}>Iniciar checklist</Text>
            </TouchableOpacity>
          </View>
        )}

        {canResume && (
          <View style={styles.onboardingCard}>
            <View style={[styles.onboardingIconWrap, styles.onboardingIconWrapWarning]}>
              <InstitutionalIcon name="pause-circle" size={28} color={I.accentYellow} strokeWidth={ICON_STROKE_WIDTH} />
            </View>
            <Text style={styles.onboardingTitle}>Checklist pausado</Text>
            <Text style={styles.onboardingDescription}>
              Puedes continuar donde lo dejaste. Revisa los ítems pendientes antes de finalizar.
            </Text>
            <TouchableOpacity style={styles.primaryButton} onPress={handleResume}>
              <InstitutionalIcon name="play-circle-filled" size={18} color={I.onPrimary} strokeWidth={ICON_STROKE_WIDTH} />
              <Text style={styles.primaryButtonText}>Continuar checklist</Text>
            </TouchableOpacity>
          </View>
        )}

        {instance.estado === 'EN_PROGRESO' && !isCompleted && template.items && (
          <View style={styles.checklistItemsList}>
            {!canFinalize && totalCompletados > 0 && (
              <EstadoBanner
                type="warning"
                title="Ítems pendientes"
                message="Completa todos los campos obligatorios para habilitar la finalización."
                icon="assignment"
              />
            )}
            <View style={styles.checklistSummary}>
              <Text style={styles.checklistSummaryText}>
                {totalCompletados} de {totalSteps} completados
              </Text>
            </View>
            {template.items
              .sort((a, b) => (a.orden_visual || 0) - (b.orden_visual || 0))
              .map((item) => {
                const response = instance.respuestas?.find(r => r.item_template === item.id);
                const itemCompleted = response?.completado || false;
                const isRequired = item.es_obligatorio_efectivo;

                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.checklistItem,
                      itemCompleted && styles.checklistItemCompleted,
                      isRequired && !itemCompleted && styles.checklistItemRequired,
                    ]}
                    onPress={() => router.push(`/checklist-item/${ordenId}/${item.id}`)}
                  >
                    <View style={[styles.checkbox, itemCompleted && styles.checkboxCompleted]}>
                      {itemCompleted ? (
                        <InstitutionalIcon name="check" size={16} color={I.onPrimary} strokeWidth={ICON_STROKE_WIDTH} />
                      ) : null}
                    </View>

                    <View style={styles.checklistItemInfo}>
                      <Text style={[styles.checklistItemTitle, itemCompleted && styles.checklistItemTitleCompleted]}>
                        {item.pregunta_texto}
                      </Text>
                      {item.descripcion_ayuda ? (
                        <Text style={styles.checklistItemDescription} numberOfLines={2}>
                          {item.descripcion_ayuda}
                        </Text>
                      ) : null}
                    </View>

                    {isRequired ? (
                      <View style={styles.requiredBadge}>
                        <Text style={styles.requiredBadgeText}>Req.</Text>
                      </View>
                    ) : null}

                    <InstitutionalIcon name="chevron-right" size={20} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
                  </TouchableOpacity>
                );
              })}
          </View>
        )}

        {isCompleted && (
          <View style={styles.completedCard}>
            <InstitutionalIcon name="check-circle" size={48} color={I.semanticUp} strokeWidth={ICON_STROKE_WIDTH} />
            <Text style={styles.completedTitle}>Checklist completado</Text>
            <Text style={styles.completedDescription}>
              El checklist fue finalizado correctamente.
            </Text>
            {instance.tiempo_total_minutos ? (
              <Text style={styles.completedTime}>
                Tiempo total: {instance.tiempo_total_minutos} min
              </Text>
            ) : null}
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => setShowCompletedView(true)}
            >
              <InstitutionalIcon name="visibility" size={18} color={I.onPrimary} strokeWidth={ICON_STROKE_WIDTH} />
              <Text style={styles.primaryButtonText}>Ver resumen</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {instance.estado === 'EN_PROGRESO' && !isCompleted && canFinalize && (
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <TouchableOpacity
            style={[styles.primaryButton, styles.footerPrimaryButton, finalizing && styles.buttonDisabled]}
            onPress={handleFinalize}
            disabled={finalizing}
            activeOpacity={0.85}
          >
            {finalizing ? (
              <ActivityIndicator size="small" color={I.onPrimary} />
            ) : (
              <>
                <InstitutionalIcon name="done-all" size={20} color={I.onPrimary} strokeWidth={ICON_STROKE_WIDTH} />
                <Text style={styles.primaryButtonText}>Finalizar checklist</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Modal de firma del técnico (firma diferida del cliente) */}
      <ChecklistSignatureModal
        visible={showSignatureModal}
        onClose={() => setShowSignatureModal(false)}
        onComplete={handleSignaturesComplete}
        signatureMode="tecnico_only"
        ordenInfo={{
          id: instance.orden,
          cliente: `Orden #${instance.orden}`,
          vehiculo: 'Vehículo de la orden',
        }}
      />

      {/* Vista de checklist completado (resumen para técnico y usuario) */}
      <ChecklistCompletedView
        visible={showCompletedView}
        onClose={() => setShowCompletedView(false)}
        ordenId={ordenId}
      />

      {/* Modal de diff de salud antes de finalizar */}
      <ChecklistDiffModal
        visible={showDiffModal}
        instanceId={instance?.id ?? null}
        onCancel={() => setShowDiffModal(false)}
        onConfirm={handleDiffConfirm}
        finalizing={finalizing}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: I.canvas,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.fixed.md,
    paddingVertical: SPACING.fixed.sm,
    backgroundColor: I.canvas,
    borderBottomWidth: BORDERS.width.thin,
    borderBottomColor: I.hairline,
  },
  closeButton: {
    padding: SPACING.fixed.xs,
    marginRight: SPACING.fixed.sm,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as const } : {}),
  },
  headerContent: {
    flex: 1,
    minWidth: 0,
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontFamily: FF.sansBold,
    color: I.ink,
    marginBottom: SPACING.fixed.xxs,
  },
  headerSubtitle: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansMedium,
    color: I.muted,
  },
  headerSubtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.fixed.sm,
  },
  headerStatusBadge: {
    paddingHorizontal: SPACING.fixed.sm,
    paddingVertical: SPACING.fixed.xxs,
    borderRadius: BORDERS.radius.pill,
    backgroundColor: I.surfaceStrong,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
  },
  headerStatusBadgeText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontFamily: FF.sansSemiBold,
    color: I.primary,
  },
  content: {
    flex: 1,
    backgroundColor: I.canvas,
  },
  contentContainer: {
    paddingBottom: SPACING.fixed.xl,
    paddingTop: SPACING.fixed.xs,
  },
  bannerWrap: {
    paddingHorizontal: SPACING.fixed.md,
    paddingTop: SPACING.fixed.md,
    gap: SPACING.fixed.sm,
  },
  bannerWrapCompact: {
    paddingHorizontal: SPACING.fixed.md,
    paddingTop: SPACING.fixed.sm,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.fixed.xl,
  },
  loadingText: {
    textAlign: 'center',
    fontSize: TYPOGRAPHY.fontSize.md,
    fontFamily: FF.sansMedium,
    color: I.muted,
    marginTop: SPACING.fixed.md,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.fixed.xl,
    gap: SPACING.fixed.sm,
  },
  errorTitle: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontFamily: FF.sansSemiBold,
    color: I.ink,
    marginTop: SPACING.fixed.sm,
  },
  errorMessage: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontFamily: FF.sansRegular,
    color: I.body,
    textAlign: 'center',
    marginBottom: SPACING.fixed.lg,
  },
  onboardingCard: {
    backgroundColor: I.canvas,
    borderRadius: BORDERS.radius.lg,
    padding: SPACING.fixed.lg,
    marginHorizontal: SPACING.fixed.md,
    marginTop: SPACING.fixed.md,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    gap: SPACING.fixed.sm,
  },
  onboardingIconWrap: {
    width: 52,
    height: 52,
    borderRadius: BORDERS.radius.lg,
    backgroundColor: withOpacity(I.primary, 0.08),
    justifyContent: 'center',
    alignItems: 'center',
  },
  onboardingIconWrapWarning: {
    backgroundColor: withOpacity(I.accentYellow, 0.15),
  },
  onboardingTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontFamily: FF.sansBold,
    color: I.ink,
  },
  onboardingDescription: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansRegular,
    color: I.body,
    lineHeight: Math.round(TYPOGRAPHY.fontSize.sm * TYPOGRAPHY.lineHeight.normal),
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: I.primary,
    paddingVertical: SPACING.fixed.md,
    paddingHorizontal: SPACING.fixed.lg,
    borderRadius: BORDERS.radius.pill,
    gap: SPACING.fixed.xs,
    minHeight: 48,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as const } : {}),
  },
  primaryButtonText: {
    color: I.onPrimary,
    fontSize: TYPOGRAPHY.fontSize.base,
    fontFamily: FF.sansSemiBold,
  },
  secondaryOutlineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.fixed.xs,
    paddingVertical: SPACING.fixed.md,
    paddingHorizontal: SPACING.fixed.lg,
    borderRadius: BORDERS.radius.pill,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    backgroundColor: I.surfaceSoft,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as const } : {}),
  },
  secondaryOutlineButtonText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansSemiBold,
    color: I.primary,
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  completedCard: {
    backgroundColor: withOpacity(I.semanticUp, 0.08),
    borderRadius: BORDERS.radius.lg,
    padding: SPACING.fixed.lg,
    marginHorizontal: SPACING.fixed.md,
    marginTop: SPACING.fixed.md,
    alignItems: 'center',
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    gap: SPACING.fixed.sm,
  },
  completedTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontFamily: FF.sansBold,
    color: I.ink,
  },
  completedDescription: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansRegular,
    color: I.body,
    textAlign: 'center',
  },
  completedTime: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansSemiBold,
    color: I.semanticUp,
  },
  footer: {
    backgroundColor: I.canvas,
    borderTopWidth: BORDERS.width.thin,
    borderTopColor: I.hairline,
    paddingHorizontal: SPACING.fixed.md,
    paddingTop: SPACING.fixed.md,
  },
  footerPrimaryButton: {
    width: '100%',
  },
  checklistItemsList: {
    paddingHorizontal: SPACING.fixed.md,
    paddingTop: SPACING.fixed.sm,
    gap: SPACING.fixed.sm,
  },
  checklistSummary: {
    marginBottom: SPACING.fixed.xxs,
  },
  checklistSummaryText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansMedium,
    color: I.muted,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.fixed.md,
    backgroundColor: I.canvas,
    borderRadius: BORDERS.radius.lg,
    gap: SPACING.fixed.sm,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    ...(Platform.OS === 'web' ? { cursor: 'pointer' as const } : {}),
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    backgroundColor: I.canvas,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxCompleted: {
    backgroundColor: I.semanticUp,
    borderColor: I.semanticUp,
  },
  checklistItemCompleted: {
    backgroundColor: withOpacity(I.semanticUp, 0.06),
    borderColor: withOpacity(I.semanticUp, 0.35),
  },
  checklistItemRequired: {},
  checklistItemInfo: {
    flex: 1,
    minWidth: 0,
  },
  checklistItemTitle: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontFamily: FF.sansSemiBold,
    color: I.ink,
  },
  checklistItemTitleCompleted: {
    color: I.muted,
    textDecorationLine: 'line-through',
  },
  checklistItemDescription: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansRegular,
    color: I.body,
    marginTop: 2,
  },
  requiredBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BORDERS.radius.sm,
    backgroundColor: withOpacity(I.accentYellow, 0.15),
    borderWidth: BORDERS.width.thin,
    borderColor: withOpacity(I.accentYellow, 0.4),
  },
  requiredBadgeText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontFamily: FF.sansSemiBold,
    color: I.body,
  },
}); 