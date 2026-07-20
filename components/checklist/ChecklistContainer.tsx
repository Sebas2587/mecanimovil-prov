import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  Share,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useChecklist } from '@/hooks/useChecklist';
import { itemChecklistCompleto } from '@/hooks/fetchChecklistBundle';
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
import { useOrdenSignatureDisplay } from '@/hooks/useOrdenSignatureDisplay';
import { InstitutionalButton } from '@/app/design-system/components/InstitutionalButton';
import { MecanicoAsignadoCard } from '@/components/equipo/MecanicoAsignadoCard';
import { useAuth } from '@/context/AuthContext';

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
    case 'PENDIENTE_FIRMA_SUPERVISOR':
      return 'Esperando firma del supervisor';
    case 'PENDIENTE_FIRMA_CLIENTE':
      return 'Esperando firma del cliente';
    case 'COMPLETADO':
      return 'Completado';
    default:
      return estado ?? '—';
  }
}

interface ChecklistContainerProps {
  ordenId?: number;
  citaPersonalId?: number;
  /** Mandante o supervisor del taller puede rectificar (cita personal taller). */
  puedeFirmarSupervisor?: boolean;
  onComplete?: () => void;
  onCancel?: () => void;
}

export const ChecklistContainer: React.FC<ChecklistContainerProps> = ({
  ordenId,
  citaPersonalId,
  puedeFirmarSupervisor = false,
  onComplete,
  onCancel,
}) => {
  console.log('🚀 ChecklistContainer montado', { ordenId, citaPersonalId });

  const insets = useSafeAreaInsets();
  const { estadoProveedor } = useAuth();
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
    refetch,

    // Métodos
    startChecklist,
    pauseChecklist,
    resumeChecklist,
    finalizeChecklist,
    firmarSupervisorChecklist,
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
  } = useChecklist({ ordenId, citaPersonalId });

  const esperandoFirmaSupervisor = instance?.estado === 'PENDIENTE_FIRMA_SUPERVISOR';
  const esperandoFirmaCliente = instance?.estado === 'PENDIENTE_FIRMA_CLIENTE';
  const ordenSignatureDisplay = useOrdenSignatureDisplay(instance?.orden);

  const ubicacionPreferida = useMemo(() => {
    const lat = estadoProveedor?.datos_proveedor?.ubicacion_lat;
    const lng = estadoProveedor?.datos_proveedor?.ubicacion_lng;
    if (lat == null || lng == null) return null;
    const latN = Number(lat);
    const lngN = Number(lng);
    if (!Number.isFinite(latN) || !Number.isFinite(lngN)) return null;
    if (latN === 0 && lngN === 0) return null;
    return { lat: latN, lng: lngN };
  }, [estadoProveedor?.datos_proveedor?.ubicacion_lat, estadoProveedor?.datos_proveedor?.ubicacion_lng]);

  const modoUbicacionFirma = useMemo<'taller' | 'domicilio'>(() => {
    const tipoCita = instance?.cita_personal_info?.tipo_servicio;
    if (tipoCita === 'taller') return 'taller';
    if (tipoCita === 'domicilio') return 'domicilio';
    // Marketplace / sin cita: preferir GPS, con fallback a ubicación del proveedor.
    return 'domicilio';
  }, [instance?.cita_personal_info?.tipo_servicio]);

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
  const [showSupervisorSignatureModal, setShowSupervisorSignatureModal] = useState(false);
  const [showCompletedView, setShowCompletedView] = useState(false);
  const [showDiffModal, setShowDiffModal] = useState(false);
  const [informeLink, setInformeLink] = useState<string | null>(null);
  const [informeEnvio, setInformeEnvio] = useState<{ enviado?: boolean; via?: string } | null>(null);
  const [autoStarting, setAutoStarting] = useState(false);
  const autoStartTriedRef = useRef(false);
  const healedPhotoItemsRef = useRef<Set<number>>(new Set());

  // Restaurar enlace del informe si el checklist ya está esperando firma del cliente.
  useEffect(() => {
    const informe = instance?.informe_publico;
    if (!informe?.url) return;
    setInformeLink(informe.url);
    if (informe.enviado_via) {
      setInformeEnvio({
        enviado: informe.enviado_via !== 'manual_link',
        via: informe.enviado_via,
      });
    }
  }, [instance?.informe_publico?.url, instance?.informe_publico?.enviado_via]);

  // Inicio autónomo: al abrir un checklist PENDIENTE, pasarlo a EN_PROGRESO.
  useEffect(() => {
    if (loading || !instance || !template) return;
    if (instance.estado !== 'PENDIENTE') return;
    if (autoStartTriedRef.current) return;

    autoStartTriedRef.current = true;
    setAutoStarting(true);
    void startChecklist()
      .then((result) => {
        if (!result.success) {
          showAlert('Error', result.message || 'No se pudo iniciar el checklist');
          autoStartTriedRef.current = false;
        }
      })
      .finally(() => setAutoStarting(false));
  }, [loading, instance, template, startChecklist]);

  const sortedItems = useMemo(() => {
    if (!template?.items || !instance) return [];
    return [...template.items].sort((a, b) => {
      const aDone = itemChecklistCompleto(instance.respuestas, a);
      const bDone = itemChecklistCompleto(instance.respuestas, b);
      if (aDone !== bDone) return aDone ? 1 : -1;
      return (a.orden_visual || 0) - (b.orden_visual || 0);
    });
  }, [template?.items, instance]);

  const totalCompletados = useMemo(() => {
    if (!template?.items?.length || !instance) return 0;
    return template.items.filter((item) => itemChecklistCompleto(instance.respuestas, item)).length;
  }, [template?.items, instance]);

  const pendientesObligatorios = useMemo(() => {
    if (!template?.items?.length || !instance) return [];
    return template.items.filter((item) => {
      const required = item.es_obligatorio_efectivo || item.es_obligatorio;
      return required && !itemChecklistCompleto(instance.respuestas, item);
    });
  }, [template?.items, instance]);

  // Autocorregir PHOTO con fotos en servidor pero flag completado=false
  useEffect(() => {
    if (!instance?.id || !template?.items?.length) return;
    if (instance.estado !== 'EN_PROGRESO' && instance.estado !== 'PAUSADO') return;

    const toHeal = template.items.filter((item) => {
      if (item.tipo_pregunta !== 'PHOTO') return false;
      if (healedPhotoItemsRef.current.has(item.id)) return false;
      const resp = instance.respuestas?.find(
        (r) => r.item_template === item.id || String(r.item_template) === String(item.id),
      );
      if (!resp?.id || resp.completado) return false;
      const minFotos = item.min_fotos && item.min_fotos > 0 ? item.min_fotos : 1;
      return (resp.fotos?.length ?? 0) >= minFotos;
    });

    if (toHeal.length === 0) return;

    void (async () => {
      for (const item of toHeal) {
        healedPhotoItemsRef.current.add(item.id);
        const resp = instance.respuestas?.find(
          (r) => r.item_template === item.id || String(r.item_template) === String(item.id),
        );
        if (!resp?.id) continue;
        await saveResponse(
          item.id,
          {
            id: resp.id,
            completado: true,
            respuesta_texto: `${resp.fotos?.length ?? 0} foto(s) de evidencia`,
          },
          { skipInvalidate: true },
        );
      }
    })();
  }, [instance?.id, instance?.estado, instance?.respuestas, template?.items, saveResponse]);

  // ==================== HANDLERS ====================

  const handleStart = async () => {
    setAutoStarting(true);
    const result = await startChecklist();
    setAutoStarting(false);
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
      const camposIncompletos = template?.items.filter((item) => {
        const esObligatorio = item.es_obligatorio_efectivo !== undefined
          ? item.es_obligatorio_efectivo
          : item.es_obligatorio;
        return esObligatorio && !itemChecklistCompleto(instance?.respuestas, item);
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

    // Citas personales no tienen FK a Vehiculo: el preview-impacto falla con
    // "La orden no tiene vehículo asociado". El impacto real se comunica en el
    // informe público (IA) tras la firma del supervisor; aquí vamos directo a firma.
    if (citaPersonalId) {
      console.log('✅ Cita personal: saltando preview de impacto → firmas');
      setShowSignatureModal(true);
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

  const copiarEnlaceInforme = async (url: string) => {
    try {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        showAlert('Enlace copiado', 'El enlace del informe quedó en el portapapeles.');
        return;
      }
      await Share.share({ message: url, url });
    } catch {
      showAlert('Enlace del informe', url);
    }
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
        const requiereFirmaSupervisor = result.requiere_firma_supervisor;
        const requiereFirmaCliente = !firmaCliente && !requiereFirmaSupervisor;

        if (requiereFirmaSupervisor) {
          showAlert(
            'Firma enviada',
            'Tu firma quedó registrada. El supervisor del taller debe rectificar el trabajo para generar el informe al cliente.',
          );
          // Quedar en el checklist: banner de espera + resumen disponible.
          setShowCompletedView(true);
        } else if (requiereFirmaCliente) {
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

  const handleSupervisorSignatureComplete = async (
    firmaSupervisor: string,
    _firmaCliente: string | null,
    _ubicacion: { lat: number; lng: number },
  ) => {
    setShowSupervisorSignatureModal(false);

    try {
      const result = await firmarSupervisorChecklist(firmaSupervisor);
      if (result.success) {
        const informe = result.data?.informe;
        if (informe?.url) {
          setInformeLink(informe.url);
          setInformeEnvio({ enviado: informe.enviado, via: informe.via });
        }
        const enviadoMsg = informe?.enviado
          ? `Se envió el informe al cliente por ${informe.via || 'canal conectado'}.`
          : 'Comparte el enlace del informe para que el cliente firme sin necesidad de cuenta.';
        showAlert('Informe generado', enviadoMsg);
      } else {
        showAlert('Error', result.message || 'No se pudo registrar la firma del supervisor');
      }
    } catch {
      showAlert('Error', 'Ocurrió un error al firmar como supervisor');
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
    const preparando = error.toLowerCase().includes('preparando');
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <InstitutionalIcon
            name={preparando ? 'assignment' : 'error'}
            size={64}
            color={preparando ? I.muted : I.semanticDown}
            strokeWidth={ICON_STROKE_WIDTH}
          />
          <Text style={styles.errorTitle}>
            {preparando ? 'Preparando checklist…' : 'No se pudo cargar'}
          </Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <InstitutionalButton
            label="Reintentar"
            onPress={() => {
              autoStartTriedRef.current = false;
              void refetch?.();
            }}
            variant="primary"
            style={{ minWidth: 160 }}
          />
          <InstitutionalButton
            label="Volver"
            onPress={() => onCancel?.()}
            variant="secondary"
            style={{ minWidth: 160, marginTop: SPACING.fixed.sm }}
          />
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
          <InstitutionalButton
            label="Volver"
            onPress={() => onCancel?.()}
            variant="primary"
            style={{ minWidth: 160 }}
          />
        </View>
      </SafeAreaView>
    );
  }

  // ==================== RENDER PRINCIPAL ====================

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header Coinbase: canvas blanco + hairline */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleCancel} style={styles.closeButton} accessibilityLabel="Cerrar checklist">
          <InstitutionalIcon name="close" size={ICON_SIZE.md} color={I.ink} strokeWidth={ICON_STROKE_WIDTH} />
        </TouchableOpacity>

        <View style={styles.headerContent}>
          <Text style={styles.headerTitle} numberOfLines={1}>{template.nombre}</Text>
          <Text style={styles.headerSubtitle}>
            {totalCompletados}/{totalSteps} · {labelEstadoChecklist(instance.estado)}
          </Text>
        </View>
      </View>

      {/* Progress Bar Section */}
      {instance.estado === 'EN_PROGRESO' && (
        <ChecklistProgressBar
          currentStep={totalCompletados}
          totalSteps={totalSteps}
          progreso={progreso}
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
        {instance.mecanico_asignado ? (
          <View style={styles.mecanicoHeaderWrap}>
            <MecanicoAsignadoCard mecanico={instance.mecanico_asignado} />
          </View>
        ) : null}

        {esperandoFirmaSupervisor && (
          <View style={styles.bannerWrap}>
            <EstadoBanner
              type="info"
              title={
                puedeFirmarSupervisor
                  ? 'Rectificación del supervisor'
                  : 'Esperando firma del supervisor'
              }
              message={
                puedeFirmarSupervisor
                  ? 'El técnico finalizó el checklist. Revisa el trabajo y firma para generar el informe al cliente.'
                  : 'El técnico ya firmó. El supervisor del taller debe rectificar el servicio para continuar.'
              }
              icon="verified-user"
            />
            {puedeFirmarSupervisor ? (
              <InstitutionalButton
                label="Firmar como supervisor"
                onPress={() => setShowSupervisorSignatureModal(true)}
                variant="primary"
                leading={
                  <InstitutionalIcon name="draw" size={18} color={I.onPrimary} strokeWidth={ICON_STROKE_WIDTH} />
                }
                style={{ alignSelf: 'stretch' }}
              />
            ) : (
              <TouchableOpacity
                style={styles.secondaryOutlineButton}
                onPress={() => setShowCompletedView(true)}
              >
                <InstitutionalIcon name="visibility" size={18} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
                <Text style={styles.secondaryOutlineButtonText}>Ver resumen del checklist</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {esperandoFirmaCliente && citaPersonalId && (informeLink || informeEnvio) && (
          <View style={styles.informeLinkCard}>
            <Text style={styles.informeLinkTitle}>Informe para el cliente</Text>
            {informeEnvio?.enviado ? (
              <Text style={styles.informeLinkHint}>
                Enviado automáticamente por {informeEnvio.via || 'canal conectado'}.
              </Text>
            ) : (
              <Text style={styles.informeLinkHint}>
                Comparte este enlace para que el cliente revise y firme el servicio.
              </Text>
            )}
            {informeLink ? (
              <TouchableOpacity
                style={styles.secondaryOutlineButton}
                onPress={() => void copiarEnlaceInforme(informeLink)}
              >
                <InstitutionalIcon name="link" size={18} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
                <Text style={styles.secondaryOutlineButtonText}>Copiar enlace del informe</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        )}

        {esperandoFirmaCliente && (
          <View style={styles.bannerWrap}>
            <EstadoBanner
              type="info"
              title="Esperando firma del cliente"
              message={
                citaPersonalId
                  ? 'El informe fue enviado al cliente (o comparte el enlace). Debe firmar desde la página pública para cerrar el servicio.'
                  : 'Ya registraste tu firma como técnico. El cliente debe firmar desde su app para cerrar el servicio.'
              }
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
            <Text style={styles.onboardingTitle}>
              {autoStarting ? 'Iniciando checklist…' : 'Listo para iniciar'}
            </Text>
            <Text style={styles.onboardingDescription}>
              Completa el checklist paso a paso antes de finalizar el servicio.
            </Text>
            {autoStarting ? (
              <ActivityIndicator color={I.primary} style={{ marginTop: SPACING.fixed.sm }} />
            ) : (
              <InstitutionalButton
                label="Iniciar checklist"
                onPress={handleStart}
                variant="primary"
                leading={
                  <InstitutionalIcon name="play-arrow" size={18} color={I.onPrimary} strokeWidth={ICON_STROKE_WIDTH} />
                }
                style={{ alignSelf: 'stretch' }}
              />
            )}
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
            <InstitutionalButton
              label="Continuar checklist"
              onPress={handleResume}
              variant="primary"
              leading={
                <InstitutionalIcon name="play-circle-filled" size={18} color={I.onPrimary} strokeWidth={ICON_STROKE_WIDTH} />
              }
              style={{ alignSelf: 'stretch' }}
            />
          </View>
        )}

        {instance.estado === 'EN_PROGRESO' && !isCompleted && template.items && (
          <View style={styles.checklistItemsList}>
            {!canFinalize && pendientesObligatorios.length > 0 && (
              <EstadoBanner
                type="warning"
                title="Ítems pendientes"
                message={
                  pendientesObligatorios.length === 1
                    ? `Falta: ${pendientesObligatorios[0].pregunta_texto}`
                    : `Faltan ${pendientesObligatorios.length} obligatorios. El primero: ${pendientesObligatorios[0].pregunta_texto}`
                }
                icon="assignment"
              />
            )}
            <View style={styles.checklistSummary}>
              <Text style={styles.checklistSummaryText}>
                {totalCompletados} de {totalSteps} completados
              </Text>
            </View>
            {sortedItems.map((item) => {
                const itemCompleted = itemChecklistCompleto(instance.respuestas, item);
                const isRequired = !!(item.es_obligatorio_efectivo || item.es_obligatorio);

                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.checklistItem,
                      itemCompleted && styles.checklistItemCompleted,
                      isRequired && !itemCompleted && styles.checklistItemRequired,
                    ]}
                    onPress={() => {
                      if (citaPersonalId) {
                        router.push({
                          pathname: '/checklist-item/[ordenId]/[itemId]',
                          params: {
                            // citaId va en el path para no perderse al abrir el picker de fotos (web).
                            ordenId: `cita-${citaPersonalId}`,
                            itemId: String(item.id),
                            citaId: String(citaPersonalId),
                          },
                        });
                        return;
                      }
                      if (ordenId) {
                        router.push(`/checklist-item/${ordenId}/${item.id}`);
                      }
                    }}
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
            <InstitutionalButton
              label="Ver resumen"
              onPress={() => setShowCompletedView(true)}
              variant="primary"
              leading={
                <InstitutionalIcon name="visibility" size={18} color={I.onPrimary} strokeWidth={ICON_STROKE_WIDTH} />
              }
              style={{ alignSelf: 'stretch' }}
            />
          </View>
        )}
      </ScrollView>

      {instance.estado === 'EN_PROGRESO' && !isCompleted && canFinalize && (
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <InstitutionalButton
            label="Finalizar checklist"
            onPress={handleFinalize}
            variant="primary"
            disabled={finalizing}
            loading={finalizing}
            leading={
              !finalizing ? (
                <InstitutionalIcon name="done-all" size={20} color={I.onPrimary} strokeWidth={ICON_STROKE_WIDTH} />
              ) : undefined
            }
            style={styles.footerPrimaryButton}
          />
        </View>
      )}

      {/* Modal de firma del supervisor (rectificación taller) */}
      <ChecklistSignatureModal
        visible={showSupervisorSignatureModal}
        onClose={() => setShowSupervisorSignatureModal(false)}
        onComplete={handleSupervisorSignatureComplete}
        signatureMode="supervisor_only"
        ordenInfo={{
          id: instance.orden,
          cliente: ordenSignatureDisplay.cliente,
          vehiculo: ordenSignatureDisplay.vehiculo,
        }}
        mecanicoAsignado={instance.mecanico_asignado ?? null}
        ubicacionPreferida={ubicacionPreferida}
        modoUbicacion="taller"
      />

      {/* Modal de firma del técnico (firma diferida del cliente) */}
      <ChecklistSignatureModal
        visible={showSignatureModal}
        onClose={() => setShowSignatureModal(false)}
        onComplete={handleSignaturesComplete}
        signatureMode="tecnico_only"
        ordenInfo={{
          id: instance.orden,
          cliente: ordenSignatureDisplay.cliente,
          vehiculo: ordenSignatureDisplay.vehiculo,
        }}
        mecanicoAsignado={instance.mecanico_asignado ?? null}
        ubicacionPreferida={ubicacionPreferida}
        modoUbicacion={modoUbicacionFirma}
      />

      {/* Vista de checklist completado (resumen para técnico y usuario) */}
      <ChecklistCompletedView
        visible={showCompletedView}
        onClose={() => setShowCompletedView(false)}
        ordenId={ordenId}
        citaPersonalId={citaPersonalId}
        instanceId={instance?.id ?? null}
      />

      {/* Modal de diff de salud (solo marketplace con Vehiculo real) */}
      {!citaPersonalId ? (
        <ChecklistDiffModal
          visible={showDiffModal}
          instanceId={instance?.id ?? null}
          onCancel={() => setShowDiffModal(false)}
          onConfirm={handleDiffConfirm}
          finalizing={finalizing}
        />
      ) : null}
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
    paddingVertical: SPACING.fixed.xs,
    minHeight: 48,
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
    fontSize: TYPOGRAPHY.fontSize.base,
    fontFamily: FF.sansSemiBold,
    color: I.ink,
  },
  headerSubtitle: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontFamily: FF.sansMedium,
    color: I.muted,
    marginTop: 1,
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
  mecanicoHeaderWrap: {
    paddingHorizontal: SPACING.fixed.md,
    paddingTop: SPACING.fixed.md,
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
  informeLinkCard: {
    marginHorizontal: SPACING.fixed.md,
    marginTop: SPACING.fixed.md,
    padding: SPACING.fixed.md,
    borderRadius: BORDERS.radius.lg,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    backgroundColor: I.surfaceSoft,
    gap: SPACING.fixed.sm,
  },
  informeLinkTitle: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontFamily: FF.sansSemiBold,
    color: I.ink,
  },
  informeLinkHint: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansRegular,
    color: I.body,
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