import React, { useState, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  ScrollView,
} from 'react-native';
import SignaturePad, { type SignaturePadRef } from '@/components/signature/SignaturePad';
import * as Location from 'expo-location';
import { InstitutionalIcon } from '@/components/ui/InstitutionalIcon';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import { COLORS, SPACING, TYPOGRAPHY, BORDERS } from '@/app/design-system/tokens';
import { institutionalStatusColors } from '@/app/design-system/styles/institutionalSemantic';
import { InstitutionalButton } from '@/app/design-system/components/InstitutionalButton';
import { showAlert, showAlertButtons } from '@/utils/platformAlert';
import { MecanicoAsignadoCard, type MecanicoAsignadoInfo } from '@/components/equipo/MecanicoAsignadoCard';

const I = COLORS.institutional;
const FF = TYPOGRAPHY.fontFamily;

export type SignatureMode = 'both' | 'tecnico_only' | 'cliente_only' | 'supervisor_only';

interface ChecklistSignatureModalProps {
  visible: boolean;
  onClose: () => void;
  /**
   * - `firmaTecnico`: Base64 de la firma del técnico (siempre presente al
   *   confirmar).
   * - `firmaCliente`: Base64 de la firma del cliente o `null` cuando se
   *   captura sólo la del técnico (firma diferida del cliente).
   */
  onComplete: (
    firmaTecnico: string,
    firmaCliente: string | null,
    ubicacion: { lat: number; lng: number },
  ) => void;
  ordenInfo: {
    id: number;
    cliente: string;
    vehiculo: string;
  };
  /** Si es un item de "solo técnico" o "solo cliente", capturar una sola firma. Por defecto 'both'. */
  signatureMode?: SignatureMode;
  mecanicoAsignado?: MecanicoAsignadoInfo | null;
  /**
   * Ubicación del taller o última registrada del proveedor.
   * Evita depender del GPS live (timeouts en web / talleres sin permiso).
   */
  ubicacionPreferida?: { lat: number; lng: number } | null;
  /**
   * - taller: usa ubicacionPreferida de inmediato (sin GPS live)
   * - domicilio: última GPS conocida → GPS corto → ubicacionPreferida
   */
  modoUbicacion?: 'taller' | 'domicilio';
}

interface SignatureData {
  tecnico?: string;
  cliente?: string;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
// Altura responsiva para el lienzo de firma (máximo 420)
const CANVAS_HEIGHT = Math.min(Math.round(SCREEN_HEIGHT * 0.5), 420);

export const ChecklistSignatureModal: React.FC<ChecklistSignatureModalProps> = ({
  visible,
  onClose,
  onComplete,
  ordenInfo,
  signatureMode = 'both',
  mecanicoAsignado = null,
  ubicacionPreferida = null,
  modoUbicacion = 'domicilio',
}) => {
  const initialStep: 'tecnico' | 'cliente' =
    signatureMode === 'cliente_only' ? 'cliente' : 'tecnico';
  const [currentStep, setCurrentStep] = useState<'tecnico' | 'cliente'>(initialStep);
  const [signatures, setSignatures] = useState<SignatureData>({});
  const [obtainingLocation, setObtainingLocation] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [hasDrawnSignature, setHasDrawnSignature] = useState(false);
  
  const signatureRef = useRef<SignaturePadRef>(null);

  // Al abrir el modal, resetear estado y paso según modo
  React.useEffect(() => {
    if (visible) {
      const step = signatureMode === 'cliente_only' ? 'cliente' : 'tecnico';
      setCurrentStep(step);
      setSignatures({});
      setLocation(null);
      setHasDrawnSignature(false);
      setTimeout(() => signatureRef.current?.clearSignature(), 150);
    }
  }, [visible, signatureMode]);

  // Configuración de la firma - ocultar botones nativos pero mantener footer para no afectar canvas
  const signatureStyle = `
    body,html {
      width: 100%; height: 100%;
    }
    .m-signature-pad {
      --width: 100%;
      --height: ${CANVAS_HEIGHT}px;
      position: relative;
      font-size: 10px;
      width: var(--width);
      height: var(--height);
      padding: 16px;
      border: 1px dashed ${I.hairline};
      border-radius: 12px;
      background-color: ${I.surfaceSoft};
    }
    .m-signature-pad--body {
      border: none;
      background-color: ${I.canvas};
      border-radius: 6px;
      height: calc(100% - 40px) !important;
    }
    .m-signature-pad--body canvas {
      width: 100% !important;
      height: 100% !important;
      touch-action: none;
    }
    .m-signature-pad--footer {
      display: flex;
      justify-content: space-between;
      gap: 8px;
      margin: 8px 0 0 0;
      height: 0;
      padding: 0;
      overflow: hidden;
      visibility: hidden;
    }
    .m-signature-pad--footer button {
      display: none !important;
      visibility: hidden !important;
      opacity: 0 !important;
      pointer-events: none !important;
      height: 0 !important;
      width: 0 !important;
      padding: 0 !important;
      margin: 0 !important;
      border: none !important;
    }
  `;

  // Manejar firma capturada
  const handleSignature = (signature: string) => {
    console.log('✍️ Firma capturada para:', currentStep, 'modo:', signatureMode);
    const cleanSignature = signature.replace('data:image/png;base64,', '');
    
    const newSignatures = {
      ...signatures,
      [currentStep]: cleanSignature
    };
    
    setSignatures(newSignatures);
    setHasDrawnSignature(false);

    // Modo una sola firma: ir directo a ubicación
    if (signatureMode === 'tecnico_only' || signatureMode === 'cliente_only' || signatureMode === 'supervisor_only') {
      console.log('🎯 Firma única completada, obteniendo ubicación');
      obtenerUbicacion(newSignatures);
      return;
    }

    // Modo ambas: avanzar al siguiente paso o finalizar
    if (currentStep === 'tecnico') {
      console.log('➡️ Avanzando a firma del cliente');
      setCurrentStep('cliente');
      setTimeout(() => signatureRef.current?.clearSignature(), 100);
    } else {
      console.log('🎯 Ambas firmas completadas, obteniendo ubicación');
      obtenerUbicacion(newSignatures);
    }
  };

  // Detectar cuando se empieza a dibujar
  const handleBeginDraw = () => {
    setHasDrawnSignature(true);
    console.log('✏️ Usuario comenzó a dibujar firma');
  };

  // Detectar cuando el canvas está vacío
  const handleEmpty = () => {
    setHasDrawnSignature(false);
    showAlert('Firma requerida', 'Por favor firma antes de continuar');
  };

  const completarConUbicacion = (
    finalSignatures: SignatureData,
    coords: { lat: number; lng: number },
  ) => {
    setLocation(coords);
    const firmaTecnico = finalSignatures.tecnico || '';
    const firmaCliente = finalSignatures.cliente || null;
    if (firmaTecnico || firmaCliente) {
      onComplete(firmaTecnico, firmaCliente, coords);
    }
  };

  /**
   * Resuelve ubicación sin bloquear la firma con alerts de GPS.
   * Taller → ubicación registrada del local.
   * Domicilio → última GPS conocida, intento corto, o última del proveedor.
   */
  const obtenerUbicacion = async (finalSignatures: SignatureData) => {
    setObtainingLocation(true);

    try {
      const preferida =
        ubicacionPreferida
        && Number.isFinite(ubicacionPreferida.lat)
        && Number.isFinite(ubicacionPreferida.lng)
        && !(ubicacionPreferida.lat === 0 && ubicacionPreferida.lng === 0)
          ? ubicacionPreferida
          : null;

      // Servicio en taller (o firma de supervisor): no pedir GPS live.
      if (modoUbicacion === 'taller' || signatureMode === 'supervisor_only') {
        if (preferida) {
          console.log('📍 Usando ubicación del taller:', preferida);
          completarConUbicacion(finalSignatures, preferida);
          return;
        }
      }

      // Última ubicación conocida del dispositivo (rápida, típica en domicilio).
      try {
        const last = await Location.getLastKnownPositionAsync({
          maxAge: 30 * 60 * 1000,
          requiredAccuracy: 500,
        });
        if (last?.coords) {
          const coords = {
            lat: last.coords.latitude,
            lng: last.coords.longitude,
          };
          console.log('📍 Usando última ubicación conocida:', coords);
          completarConUbicacion(finalSignatures, coords);
          return;
        }
      } catch (e) {
        console.warn('No hay última ubicación conocida:', e);
      }

      // Intento corto de GPS actual (sin alert si falla).
      try {
        const enabled = await Location.hasServicesEnabledAsync();
        if (enabled) {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === 'granted') {
            const currentLocation = (await Promise.race([
              Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
              }),
              new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Timeout ubicacion')), 5000);
              }),
            ])) as Location.LocationObject;

            const coords = {
              lat: currentLocation.coords.latitude,
              lng: currentLocation.coords.longitude,
            };
            console.log('📍 GPS actual:', coords);
            completarConUbicacion(finalSignatures, coords);
            return;
          }
        }
      } catch (e) {
        console.warn('GPS live no disponible, usando fallback:', e);
      }

      if (preferida) {
        console.log('📍 Fallback a ubicación del proveedor:', preferida);
        completarConUbicacion(finalSignatures, preferida);
        return;
      }

      console.log('📍 Sin ubicación disponible; continuando con (0,0)');
      completarConUbicacion(finalSignatures, { lat: 0, lng: 0 });
    } finally {
      setObtainingLocation(false);
    }
  };

  // Limpiar firma actual
  const limpiarFirma = () => {
    signatureRef.current?.clearSignature();
  };

  // Regresar al paso anterior
  const regresarPaso = () => {
    if (currentStep === 'cliente') {
      setCurrentStep('tecnico');
      signatureRef.current?.clearSignature();
    }
  };

  // Cancelar y cerrar modal
  const cancelar = () => {
    showAlertButtons(
      'Cancelar firmas',
      '¿Estás seguro de que quieres cancelar? Se perderán las firmas capturadas.',
      [
        { text: 'Continuar firmando', style: 'cancel' },
        {
          text: 'Cancelar',
          style: 'destructive',
          onPress: () => {
            setSignatures({});
            setCurrentStep(signatureMode === 'cliente_only' ? 'cliente' : 'tecnico');
            setLocation(null);
            onClose();
          },
        },
      ],
    );
  };

  // Información del paso actual
  const getStepInfo = () => {
    if (signatureMode === 'supervisor_only') {
      return {
        title: 'Firma del Supervisor / Taller',
        subtitle:
          'Rectifica y certifica el trabajo del técnico. Se generará el informe para que el cliente firme.',
        icon: 'verified-user',
        color: I.primaryActive,
      };
    }
    if (signatureMode === 'tecnico_only') {
      return {
        title: 'Firma del Técnico Responsable',
        subtitle:
          'Firma para enviar el cierre del servicio. El cliente recibirá una notificación para confirmar con su firma desde su app.',
        icon: 'engineering',
        color: I.primaryActive,
      };
    }
    if (signatureMode === 'cliente_only') {
      return {
        title: 'Firma del Cliente',
        subtitle: 'El cliente debe firmar para confirmar la recepción del servicio',
        icon: 'person',
        color: I.semanticUp,
      };
    }
    switch (currentStep) {
      case 'tecnico':
        return {
          title: 'Firma del Técnico',
          subtitle: 'Como técnico responsable, confirma que has realizado el servicio',
          icon: 'engineering',
          color: I.primaryActive,
        };
      case 'cliente':
        return {
          title: 'Firma del Cliente',
          subtitle: 'Como cliente, confirma que autorizas o recibes el servicio',
          icon: 'person',
          color: I.semanticUp,
        };
      default:
        return {
          title: '',
          subtitle: '',
          icon: 'edit',
          color: I.muted,
        };
    }
  };

  const stepInfo = getStepInfo();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="formSheet"
      onRequestClose={cancelar}
    >
      <View style={styles.container}>
        {/* Header minimalista */}
        <View style={styles.header}>
          <TouchableOpacity onPress={cancelar} style={styles.cancelButton}>
            <InstitutionalIcon name="arrow-back" size={24} color={I.ink} strokeWidth={ICON_STROKE_WIDTH} />
          </TouchableOpacity>
          
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Firmas Digitales</Text>
          </View>
          
          <View style={styles.headerRight} />
        </View>

        {/* Progress indicator: solo ambos pasos cuando signatureMode === 'both' */}
        {signatureMode === 'both' && (
          <View style={styles.progressContainer}>
            <View style={styles.progressStep}>
              <View style={[
                styles.progressCircle,
                signatures.tecnico ? styles.progressCircleCompleted : 
                (currentStep === 'tecnico' ? styles.progressCircleCurrent : styles.progressCirclePending)
              ]}>
                {signatures.tecnico ? (
                  <InstitutionalIcon name="check" size={18} color={I.onPrimary} strokeWidth={ICON_STROKE_WIDTH} />
                ) : (
                  <Text style={[styles.progressNumber, currentStep === 'tecnico' && styles.progressNumberCurrent]}>1</Text>
                )}
              </View>
              <Text style={styles.progressLabel}>Técnico</Text>
            </View>
            <View style={styles.progressLine} />
            <View style={styles.progressStep}>
              <View style={[
                styles.progressCircle,
                signatures.cliente ? styles.progressCircleCompleted : 
                (currentStep === 'cliente' ? styles.progressCircleCurrent : styles.progressCirclePending)
              ]}>
                {signatures.cliente ? (
                  <InstitutionalIcon name="check" size={18} color={I.onPrimary} strokeWidth={ICON_STROKE_WIDTH} />
                ) : (
                  <Text style={[styles.progressNumber, currentStep === 'cliente' && styles.progressNumberCurrent]}>2</Text>
                )}
              </View>
              <Text style={styles.progressLabel}>Cliente</Text>
            </View>
          </View>
        )}

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={styles.contentContainer}>
          {/* Información del paso actual - minimalista */}
          <View style={styles.stepInfo}>
            <Text style={styles.stepTitle}>{stepInfo.title}</Text>
            <Text style={styles.stepSubtitle}>{stepInfo.subtitle}</Text>
          </View>

          {currentStep === 'tecnico' && mecanicoAsignado ? (
            <View style={styles.mecanicoWrap}>
              <MecanicoAsignadoCard mecanico={mecanicoAsignado} compact />
            </View>
          ) : null}

          {/* Información de la orden - minimalista */}
          <View style={styles.orderInfo}>
            <View style={[styles.orderInfoRow, styles.orderInfoRowFirst]}>
              <Text style={styles.orderInfoLabel}>Cliente</Text>
              <Text style={styles.orderInfoValue}>{ordenInfo.cliente}</Text>
            </View>
            <View style={[styles.orderInfoRow, styles.orderInfoRowLast]}>
              <Text style={styles.orderInfoLabel}>Vehículo</Text>
              <Text style={styles.orderInfoValue}>{ordenInfo.vehiculo}</Text>
            </View>
          </View>

          {/* Estado de obtención de ubicación */}
          {obtainingLocation && (
            <View style={styles.locationContainer}>
              <ActivityIndicator size="small" color={institutionalStatusColors('warning').text} />
              <Text style={styles.locationText}>Obteniendo ubicación GPS...</Text>
            </View>
          )}
        </ScrollView>

        {/* Canvas de firma */}
        <View style={styles.signatureContainer}>
          <View style={[styles.signatureCanvas, { height: CANVAS_HEIGHT }]}>
            <SignaturePad
              ref={signatureRef}
              onOK={handleSignature}
              onEmpty={handleEmpty}
              onBegin={handleBeginDraw}
              webStyle={signatureStyle}
              backgroundColor="rgba(255,255,255,0)"
              penColor={I.ink}
              height={CANVAS_HEIGHT}
              style={{ flex: 1 }}
            />
          </View>

          {/* Botones de control - minimalista */}
          <View style={styles.signatureControls}>
            <TouchableOpacity style={styles.clearButton} onPress={limpiarFirma}>
              <InstitutionalIcon name="refresh" size={20} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
              <Text style={styles.clearButtonText}>Limpiar</Text>
            </TouchableOpacity>
            
            {currentStep === 'cliente' && signatures.tecnico && (
              <TouchableOpacity style={styles.backButton} onPress={regresarPaso}>
                <InstitutionalIcon name="arrow-back" size={20} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
              </TouchableOpacity>
            )}
            
            {/* Botón manual para confirmar */}
            {hasDrawnSignature && (
              <InstitutionalButton
                label="Confirmar"
                onPress={() => signatureRef.current?.readSignature()}
                variant="primary"
                size="compact"
                leading={
                  <InstitutionalIcon name="arrow-forward" size={20} color={I.onPrimary} strokeWidth={ICON_STROKE_WIDTH} />
                }
                style={styles.manualConfirmButton}
              />
            )}
          </View>
        </View>
      </View>
    </Modal>
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
    paddingHorizontal: SPACING.fixed.lg,
    paddingVertical: SPACING.fixed.md,
    backgroundColor: I.canvas,
    borderBottomWidth: BORDERS.width.thin,
    borderBottomColor: I.hairline,
  },
  cancelButton: {
    padding: 8,
    marginRight: 8,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontFamily: FF.sansBold,
    color: I.ink,
  },
  headerRight: {
    width: 40,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    backgroundColor: I.canvas,
    borderBottomWidth: BORDERS.width.thin,
    borderBottomColor: I.hairline,
  },
  progressStep: {
    alignItems: 'center',
  },
  progressCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  progressCircleCompleted: {
    backgroundColor: I.semanticUp,
    borderColor: I.semanticUp,
  },
  progressCircleCurrent: {
    backgroundColor: I.primary,
    borderColor: I.primary,
  },
  progressCirclePending: {
    backgroundColor: I.canvas,
    borderColor: I.hairline,
  },
  progressNumber: {
    fontSize: 16,
    fontFamily: FF.sansBold,
    color: I.muted,
  },
  progressNumberCurrent: {
    color: I.onPrimary,
  },
  progressLabel: {
    fontSize: 12,
    color: I.muted,
    marginTop: 6,
    fontFamily: FF.sansMedium,
  },
  progressLine: {
    width: 60,
    height: 2,
    backgroundColor: I.hairline,
    marginHorizontal: 16,
    borderRadius: 1,
  },
  content: {
    flex: 1,
    backgroundColor: I.canvas,
  },
  contentContainer: {
    paddingBottom: 20,
  },
  stepInfo: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: I.canvas,
    marginTop: 20,
  },
  mecanicoWrap: {
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: I.ink,
    marginBottom: 6,
  },
  stepSubtitle: {
    fontSize: 14,
    color: I.muted,
    lineHeight: 20,
  },
  orderInfo: {
    backgroundColor: I.canvas,
    marginHorizontal: 20,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: I.hairline,
  },
  orderInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  orderInfoRowFirst: {
    borderBottomWidth: 1,
    borderBottomColor: I.surfaceSoft,
  },
  orderInfoRowLast: {
    borderBottomWidth: 0,
  },
  orderInfoLabel: {
    fontSize: 14,
    color: I.muted,
    fontWeight: '500',
  },
  orderInfoValue: {
    fontSize: 14,
    color: I.ink,
    fontWeight: '600',
  },
  signatureContainer: {
    backgroundColor: I.canvas,
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: I.hairline,
  },
  signatureCanvas: {
    borderWidth: 1,
    borderColor: I.hairline,
    borderStyle: 'dashed',
    borderRadius: 12,
    backgroundColor: I.surfaceSoft,
    marginBottom: 16,
  },
  signatureControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: I.surfaceSoft,
    borderWidth: 1,
    borderColor: I.hairline,
  },
  clearButtonText: {
    marginLeft: 6,
    fontSize: 14,
    color: I.muted,
    fontWeight: '500',
  },
  backButton: {
    padding: 10,
    borderRadius: 10,
    backgroundColor: I.surfaceSoft,
    borderWidth: 1,
    borderColor: I.hairline,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    marginHorizontal: 20,
    marginTop: 16,
    backgroundColor: institutionalStatusColors('warning').bg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: institutionalStatusColors('warning').border,
  },
  locationText: {
    marginLeft: 8,
    fontSize: 13,
    color: institutionalStatusColors('warning').text,
    fontWeight: '500',
  },
  manualConfirmButton: {
    flex: 1,
  },
}); 