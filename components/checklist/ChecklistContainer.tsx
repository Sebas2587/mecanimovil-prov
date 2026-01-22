import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useChecklist } from '@/hooks/useChecklist';
import { ChecklistProgressBar } from '@/components/checklist/ChecklistProgressBar';
import { ChecklistSignatureModal } from '@/components/checklist/ChecklistSignatureModal';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { COLORS, SPACING, TYPOGRAPHY, BORDERS, SHADOWS } from '@/app/design-system/tokens';

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

  const colorScheme = useColorScheme();
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
    initializeChecklist,

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

  // Recargar datos cuando la pantalla recibe foco (cuando se regresa del detalle)
  useFocusEffect(
    React.useCallback(() => {
      if (ordenId) {
        initializeChecklist();
      }
    }, [ordenId, initializeChecklist])
  );

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

  // ==================== HANDLERS ====================

  const handleStart = async () => {
    const result = await startChecklist();
    if (!result.success) {
      Alert.alert('Error', result.message || 'No se pudo iniciar el checklist');
    }
  };

  const handlePause = async () => {
    Alert.alert(
      'Pausar Checklist',
      '¿Estás seguro de que quieres pausar el checklist? Podrás continuar más tarde.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Pausar',
          onPress: async () => {
            const result = await pauseChecklist();
            if (!result.success) {
              Alert.alert('Error', result.message || 'No se pudo pausar el checklist');
            }
          },
        },
      ]
    );
  };

  const handleResume = async () => {
    const result = await resumeChecklist();
    if (!result.success) {
      Alert.alert('Error', result.message || 'No se pudo reanudar el checklist');
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
      Alert.alert('Error', result.message || 'No se pudo guardar la respuesta');
    }
  };

  const handleNext = () => {
    // Verificar que el step actual esté completo si es obligatorio
    if (currentItem?.es_obligatorio && !currentResponse?.completado) {
      Alert.alert(
        'Campo Obligatorio',
        'Debes completar este campo antes de continuar.'
      );
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

      Alert.alert('Checklist Incompleto', mensaje);
      return;
    }

    console.log('✅ Abriendo modal de firmas para finalización');
    setShowSignatureModal(true);
  };

  const handleSignaturesComplete = async (firmaTecnico: string, firmaCliente: string, ubicacion: { lat: number; lng: number }) => {
    console.log('🏁 Procesando finalización con firmas digitales...');
    setShowSignatureModal(false);

    try {
      const result = await finalizeChecklist({
        firma_tecnico: firmaTecnico,
        firma_cliente: firmaCliente,
        ubicacion_lat: ubicacion.lat,
        ubicacion_lng: ubicacion.lng,
      });

      console.log('🎊 Resultado de finalización:', result);

      if (result.success) {
        Alert.alert(
          '🎉 Checklist Completado',
          'El checklist ha sido finalizado exitosamente. Las firmas digitales y la ubicación GPS han sido registradas.',
          [
            {
              text: 'Excelente',
              onPress: () => {
                console.log('✅ Usuario confirmó finalización exitosa');
                onComplete?.();
              },
            },
          ]
        );
      } else {
        console.error('❌ Error en finalización:', result.message);
        Alert.alert(
          'Error al Finalizar',
          result.message || 'No se pudo finalizar el checklist. Por favor, intenta nuevamente.'
        );
      }
    } catch (error: any) {
      console.error('❌ Error inesperado en finalización:', error);
      Alert.alert(
        'Error Inesperado',
        'Ocurrió un error al finalizar el checklist. Verifica tu conexión e intenta nuevamente.'
      );
    }
  };

  const handleCancel = () => {
    Alert.alert(
      'Cancelar Checklist',
      '¿Estás seguro de que quieres salir? Se guardará tu progreso.',
      [
        { text: 'Continuar', style: 'cancel' },
        {
          text: 'Salir',
          style: 'destructive',
          onPress: () => {
            onCancel?.();
          },
        },
      ]
    );
  };

  // ==================== RENDER STATES ====================

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <LoadingSpinner />
        <Text style={styles.loadingText}>Cargando checklist...</Text>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <MaterialIcons name="error" size={64} color="#dc3545" />
          <Text style={styles.errorTitle}>Error</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => onCancel?.()}>
            <Text style={styles.retryButtonText}>Volver</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!template || !instance) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <MaterialIcons name="assignment" size={64} color="#6c757d" />
          <Text style={styles.errorTitle}>No hay checklist disponible</Text>
          <Text style={styles.errorMessage}>
            Este servicio no tiene checklist configurado. Puedes continuar con el servicio normalmente.
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => onCancel?.()}>
            <Text style={styles.retryButtonText}>Volver</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // ==================== RENDER PRINCIPAL ====================

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: COLORS.background.default }]} edges={[]}>
      {/* Header Minimalista */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleCancel} style={styles.closeButton}>
          <MaterialIcons name="close" size={24} color="#212529" />
        </TouchableOpacity>

        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>{template.nombre}</Text>
          <Text style={styles.headerSubtitle}>
            {instance.respuestas?.filter(r => r.completado).length || 0} de {totalSteps} completados
          </Text>
        </View>
      </View>

      {/* Progress Bar Section */}
      {instance.estado === 'EN_PROGRESO' && (
        <View style={styles.progressSection}>
          <ChecklistProgressBar
            currentStep={instance.respuestas?.filter(r => r.completado).length || 0}
            totalSteps={totalSteps}
            progreso={progreso}
            items={template.items}
            completedItemIds={instance.respuestas?.filter(r => r.completado).map(r => r.item_template) || []}
          />
        </View>
      )}

      {/* Offline/Sync Status */}
      {(isOffline || pendingSync) && (
        <View style={styles.statusBanner}>
          <MaterialIcons
            name={isOffline ? "cloud-off" : "sync"}
            size={16}
            color="#856404"
          />
          <Text style={styles.statusText}>
            {isOffline ? 'Modo offline' : 'Pendiente de sincronización'}
          </Text>
        </View>
      )}

      {/* Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={[
          styles.contentContainer,
          instance.estado === 'EN_PROGRESO' && !isCompleted && { paddingBottom: 100 }
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Estado del checklist */}
        {canStart && (
          <View style={styles.startCard}>
            <View style={styles.startIconContainer}>
              <MaterialIcons name="play-arrow" size={40} color="#619FF0" />
            </View>
            <Text style={styles.startTitle}>Listo para iniciar</Text>
            <Text style={styles.startDescription}>
              Presiona "Iniciar" para comenzar con el checklist de pre-servicio.
            </Text>
            <TouchableOpacity style={styles.startButton} onPress={handleStart}>
              <Text style={styles.startButtonText}>Iniciar Checklist</Text>
            </TouchableOpacity>
          </View>
        )}

        {canResume && (
          <View style={styles.resumeCard}>
            <View style={styles.resumeIconContainer}>
              <MaterialIcons name="play-arrow" size={40} color="#619FF0" />
            </View>
            <Text style={styles.resumeTitle}>Checklist pausado</Text>
            <Text style={styles.resumeDescription}>
              Puedes continuar donde lo dejaste.
            </Text>
            <TouchableOpacity style={styles.resumeButton} onPress={handleResume}>
              <Text style={styles.resumeButtonText}>Continuar</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Lista de items del checklist - diseño to-do list */}
        {instance.estado === 'EN_PROGRESO' && !isCompleted && template.items && (
          <View style={styles.checklistItemsList}>
            {template.items
              .sort((a, b) => (a.orden_visual || 0) - (b.orden_visual || 0))
              .map((item) => {
                const response = instance.respuestas?.find(r => r.item_template === item.id);
                const isCompleted = response?.completado || false;

                return (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.checklistItem}
                    onPress={() => router.push(`/checklist-item/${ordenId}/${item.id}`)}
                  >
                    {/* Checkbox */}
                    <View style={[styles.checkbox, isCompleted && styles.checkboxCompleted]}>
                      {isCompleted && (
                        <MaterialIcons name="check" size={20} color="#ffffff" />
                      )}
                    </View>

                    {/* Info del item */}
                    <View style={styles.checklistItemInfo}>
                      <Text style={styles.checklistItemTitle}>
                        {item.pregunta_texto}
                      </Text>
                      {item.descripcion_ayuda && (
                        <Text style={styles.checklistItemDescription} numberOfLines={1}>
                          {item.descripcion_ayuda}
                        </Text>
                      )}
                    </View>

                    {/* Badge obligatorio si aplica */}
                    {item.es_obligatorio_efectivo && (
                      <View style={styles.requiredBadge}>
                        <MaterialIcons name="star" size={14} color="#dc3545" />
                      </View>
                    )}

                    {/* Icono de flecha */}
                    <MaterialIcons name="chevron-right" size={24} color="#6c757d" />
                  </TouchableOpacity>
                );
              })}
          </View>
        )}

        {/* Checklist completado */}
        {isCompleted && (
          <View style={styles.completedCard}>
            <View style={styles.completedIconContainer}>
              <MaterialIcons name="check-circle" size={64} color="#28a745" />
            </View>
            <Text style={styles.completedTitle}>Checklist Completado</Text>
            <Text style={styles.completedDescription}>
              El checklist ha sido finalizado exitosamente.
            </Text>
            {instance.tiempo_total_minutos && (
              <Text style={styles.completedTime}>
                Tiempo total: {instance.tiempo_total_minutos} minutos
              </Text>
            )}
            <TouchableOpacity
              style={styles.finalizeButton}
              onPress={handleFinalize}
            >
              <MaterialIcons name="done-all" size={20} color="#fff" />
              <Text style={styles.finalizeButtonText}>Finalizar Checklist</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Footer con botón finalizar - Solo cuando todos están completos */}
      {instance.estado === 'EN_PROGRESO' && !isCompleted && canFinalize && (
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <TouchableOpacity
            style={[styles.finalizeButton, finalizing && styles.finalizeButtonDisabled]}
            onPress={handleFinalize}
            disabled={finalizing}
            activeOpacity={0.7}
          >
            {finalizing ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <MaterialIcons name="done-all" size={20} color="#fff" />
                <Text style={styles.finalizeButtonText}>Finalizar Checklist</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Modal de firmas */}
      <ChecklistSignatureModal
        visible={showSignatureModal}
        onClose={() => setShowSignatureModal(false)}
        onComplete={handleSignaturesComplete}
        ordenInfo={{
          id: instance.orden,
          cliente: `Orden #${instance.orden}`,
          vehiculo: 'Vehículo de la orden',
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.default,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs, // Reducido de 12 a xs (4-8px) para fix gap
    backgroundColor: COLORS.background.paper,
    borderBottomWidth: BORDERS.width.thin,
    borderBottomColor: COLORS.border.light,
  },
  closeButton: {
    padding: SPACING.xs,
    marginRight: SPACING.sm,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.text.primary,
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: TYPOGRAPHY.fontSize.sm - 1,
    color: COLORS.text.secondary,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
  progressSection: {
    backgroundColor: COLORS.background.paper,
    borderBottomWidth: BORDERS.width.thin,
    borderBottomColor: COLORS.border.light,
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background.warning,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.md,
    borderBottomWidth: BORDERS.width.thin,
    borderBottomColor: COLORS.warning.light,
  },
  statusText: {
    marginLeft: SPACING.xs,
    fontSize: TYPOGRAPHY.fontSize.sm - 1,
    color: COLORS.warning.text,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
  content: {
    flex: 1,
    backgroundColor: COLORS.background.default,
  },
  contentContainer: {
    paddingBottom: SPACING.xl,
    paddingTop: SPACING.xs, // Reducido para minimizar gap
  },
  loadingText: {
    textAlign: 'center',
    fontSize: TYPOGRAPHY.fontSize.md,
    color: COLORS.text.secondary,
    marginTop: SPACING.md,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING['2xl'],
  },
  errorTitle: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.primary,
    marginTop: SPACING.md,
  },
  errorMessage: {
    fontSize: TYPOGRAPHY.fontSize.md,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginTop: SPACING.xs,
    marginBottom: SPACING.xl,
  },
  retryButton: {
    backgroundColor: COLORS.primary[500],
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.sm + SPACING.xs,
    borderRadius: BORDERS.radius.md,
  },
  retryButtonText: {
    color: COLORS.text.onPrimary,
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
  // Cards compactas - diseño claro
  startCard: {
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.xl,
    padding: SPACING.xl,
    margin: SPACING.lg,
    alignItems: 'center',
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
    ...SHADOWS.sm,
  },
  startIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.accent[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  startTitle: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.text.primary,
    marginBottom: SPACING.xs,
  },
  startDescription: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginBottom: SPACING.lg,
    lineHeight: 20,
  },
  startButton: {
    backgroundColor: COLORS.accent[500],
    paddingHorizontal: SPACING.xl + SPACING.xs,
    paddingVertical: SPACING.sm + SPACING.xs,
    borderRadius: BORDERS.radius.lg,
    minWidth: 180,
  },
  startButtonText: {
    color: COLORS.text.onAccent,
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
  resumeCard: {
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.xl,
    padding: SPACING.xl,
    margin: SPACING.lg,
    alignItems: 'center',
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
    ...SHADOWS.sm,
  },
  resumeIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.accent[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  resumeTitle: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.text.primary,
    marginBottom: SPACING.xs,
  },
  resumeDescription: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginBottom: SPACING.lg,
    lineHeight: 20,
  },
  resumeButton: {
    backgroundColor: COLORS.accent[500],
    paddingHorizontal: SPACING.xl + SPACING.xs,
    paddingVertical: SPACING.sm + SPACING.xs,
    borderRadius: BORDERS.radius.lg,
    minWidth: 180,
  },
  resumeButtonText: {
    color: COLORS.text.onAccent,
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
  completedCard: {
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.xl,
    padding: SPACING.xl,
    margin: SPACING.lg,
    alignItems: 'center',
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
    ...SHADOWS.sm,
  },
  completedIconContainer: {
    marginBottom: SPACING.md,
  },
  completedTitle: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.text.primary,
    marginBottom: SPACING.xs,
  },
  completedDescription: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
    textAlign: 'center',
    marginBottom: SPACING.sm,
    lineHeight: 20,
  },
  completedTime: {
    fontSize: TYPOGRAPHY.fontSize.sm - 1,
    color: COLORS.success.main,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    marginTop: SPACING.xs,
  },
  footer: {
    backgroundColor: COLORS.background.paper,
    borderTopWidth: BORDERS.width.thin,
    borderTopColor: COLORS.border.light,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    ...SHADOWS.md,
  },
  navigationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: SPACING.sm + SPACING.xs,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm + SPACING.xs / 2,
    borderRadius: BORDERS.radius.lg,
    backgroundColor: COLORS.background.default,
    borderWidth: BORDERS.width.medium,
    borderColor: COLORS.border.main,
    gap: SPACING.xs,
    minHeight: 52,
  },
  navButtonDisabled: {
    backgroundColor: COLORS.background.default,
    borderColor: COLORS.border.light,
    opacity: 0.5,
  },
  navButtonText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.primary,
  },
  navButtonTextDisabled: {
    color: COLORS.text.disabled,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.sm + SPACING.xs / 2,
    borderRadius: BORDERS.radius.lg,
    backgroundColor: COLORS.accent[500],
    gap: SPACING.xs,
    minHeight: 52,
    ...SHADOWS.md,
  },
  nextButtonText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.onAccent,
  },
  finalizeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.sm + SPACING.xs / 2,
    borderRadius: BORDERS.radius.lg,
    backgroundColor: COLORS.success.main,
    gap: SPACING.xs,
    minHeight: 52,
    ...SHADOWS.md,
  },
  finalizeButtonDisabled: {
    backgroundColor: COLORS.neutral.gray[400],
    ...SHADOWS.sm,
  },
  finalizeButtonText: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.text.onSuccess,
  },
  // Estilos para lista tipo to-do
  checklistItemsList: {
    padding: SPACING.lg,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.md,
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.xl,
    marginBottom: SPACING.sm + SPACING.xs,
    gap: SPACING.sm + SPACING.xs,
    ...SHADOWS.sm,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: COLORS.border.main,
    backgroundColor: COLORS.background.paper,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxCompleted: {
    backgroundColor: COLORS.success.main,
    borderColor: COLORS.success.main,
  },
  checklistItemInfo: {
    flex: 1,
  },
  checklistItemTitle: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.text.primary,
    marginBottom: SPACING.xs,
  },
  checklistItemDescription: {
    fontSize: TYPOGRAPHY.fontSize.sm - 1,
    color: COLORS.text.secondary,
  },
  requiredBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.error.light,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.error[200],
  },
}); 