import React, { useState, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Dimensions,
  ScrollView,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import SignatureScreen from 'react-native-signature-canvas';
import * as Location from 'expo-location';

interface ChecklistSignatureModalProps {
  visible: boolean;
  onClose: () => void;
  onComplete: (firmaTecnico: string, firmaCliente: string, ubicacion: { lat: number; lng: number }) => void;
  ordenInfo: {
    id: number;
    cliente: string;
    vehiculo: string;
  };
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
}) => {
  const [currentStep, setCurrentStep] = useState<'tecnico' | 'cliente'>('tecnico');
  const [signatures, setSignatures] = useState<SignatureData>({});
  const [obtainingLocation, setObtainingLocation] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [hasDrawnSignature, setHasDrawnSignature] = useState(false);
  
  const signatureRef = useRef<any>(null);

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
      border: 1px dashed #e9ecef;
      border-radius: 12px;
      background-color: #f8f9fa;
    }
    .m-signature-pad--body {
      border: none;
      background-color: white;
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
    console.log('✍️ Firma capturada para:', currentStep);
    const cleanSignature = signature.replace('data:image/png;base64,', '');
    
    const newSignatures = {
      ...signatures,
      [currentStep]: cleanSignature
    };
    
    setSignatures(newSignatures);
    setHasDrawnSignature(false); // Resetear para el siguiente paso
    console.log('📝 Firma guardada, avanzando al siguiente paso');
    
    // Automaticamente avanzar al siguiente paso o finalizar
    if (currentStep === 'tecnico') {
      console.log('➡️ Avanzando a firma del cliente');
      setCurrentStep('cliente');
      // Limpiar canvas para la siguiente firma
      setTimeout(() => {
        signatureRef.current?.clearSignature();
      }, 100);
    } else if (currentStep === 'cliente') {
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
    Alert.alert('Firma requerida', 'Por favor firma antes de continuar');
  };

  // Obtener ubicación GPS
  const obtenerUbicacion = async (finalSignatures: SignatureData) => {
    setObtainingLocation(true);
    
    try {
      console.log('📍 Iniciando proceso de obtención de ubicación GPS...');
      
      // Verificar que los servicios de ubicación están habilitados
      const enabled = await Location.hasServicesEnabledAsync();
      if (!enabled) {
        console.log('⚠️ Servicios de ubicación deshabilitados');
        Alert.alert(
          'Servicios de Ubicación',
          'Los servicios de ubicación están deshabilitados. ¿Deseas continuar sin ubicación GPS?',
          [
            { text: 'Ir a Configuración', onPress: () => Location.enableNetworkProviderAsync() },
            { text: 'Continuar sin GPS', onPress: () => finalizarSinUbicacion(finalSignatures) }
          ]
        );
        return;
      }

      // Solicitar permisos explícitamente
      console.log('🔐 Solicitando permisos de ubicación...');
      const { status } = await Location.requestForegroundPermissionsAsync();
      console.log('📋 Estado de permisos:', status);
      
      if (status !== 'granted') {
        console.log('❌ Permisos de ubicación denegados:', status);
        Alert.alert(
          'Permisos de Ubicación',
          'Se requieren permisos de ubicación para finalizar el checklist. Sin ubicación GPS, el checklist se guardará con coordenadas por defecto.',
          [
            { text: 'Reintentar', onPress: () => obtenerUbicacion(finalSignatures) },
            { text: 'Continuar sin GPS', onPress: () => finalizarSinUbicacion(finalSignatures) }
          ]
        );
        return;
      }

      console.log('✅ Permisos otorgados, obteniendo ubicación...');

      // Crear una promesa con timeout para evitar que se cuelgue
      const locationPromise = Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout obteniendo ubicación')), 15000)
      );

      // Race entre obtener ubicación y timeout
      const currentLocation = await Promise.race([locationPromise, timeoutPromise]) as any;

      const coords = {
        lat: currentLocation.coords.latitude,
        lng: currentLocation.coords.longitude,
      };

      console.log('🎯 Ubicación obtenida exitosamente:', coords);
      setLocation(coords);
      
      // Finalizar con ubicación
      if (finalSignatures.tecnico && finalSignatures.cliente) {
        console.log('🏁 Finalizando checklist con ubicación GPS');
        onComplete(finalSignatures.tecnico, finalSignatures.cliente, coords);
      }
      
    } catch (error: any) {
      console.error('❌ Error obteniendo ubicación:', error);
      
      let errorMessage = 'No se pudo obtener la ubicación GPS.';
      if (error.message?.includes('Timeout')) {
        errorMessage = 'Tiempo de espera agotado al obtener la ubicación GPS.';
      } else if (error.message?.includes('denied') || error.message?.includes('permission')) {
        errorMessage = 'Permisos de ubicación denegados.';
      } else if (error.message?.includes('unavailable')) {
        errorMessage = 'Servicios de ubicación no disponibles.';
      }
      
      Alert.alert(
        'Error de Ubicación',
        `${errorMessage}\n\n¿Deseas continuar sin ubicación GPS? El checklist se guardará con coordenadas por defecto.`,
        [
          { 
            text: 'Reintentar', 
            onPress: () => {
              console.log('🔄 Usuario eligió reintentar obtención de ubicación');
              obtenerUbicacion(finalSignatures);
            }
          },
          { 
            text: 'Continuar sin GPS', 
            onPress: () => {
              console.log('⚠️ Usuario eligió continuar sin GPS');
              finalizarSinUbicacion(finalSignatures);
            }
          }
        ]
      );
    } finally {
      setObtainingLocation(false);
    }
  };

  // Finalizar sin ubicación GPS
  const finalizarSinUbicacion = (finalSignatures: SignatureData) => {
    console.log('📍 Finalizando checklist sin ubicación GPS (usando coordenadas por defecto)');
    if (finalSignatures.tecnico && finalSignatures.cliente) {
      // Usar coordenadas por defecto (0,0) si no hay GPS
      onComplete(finalSignatures.tecnico, finalSignatures.cliente, { lat: 0, lng: 0 });
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
    Alert.alert(
      'Cancelar Firmas',
      '¿Estás seguro de que quieres cancelar? Se perderán las firmas capturadas.',
      [
        { text: 'Continuar firmando', style: 'cancel' },
        { 
          text: 'Cancelar', 
          style: 'destructive',
          onPress: () => {
            setSignatures({});
            setCurrentStep('tecnico');
            setLocation(null);
            onClose();
          }
        }
      ]
    );
  };

  // Información del paso actual
  const getStepInfo = () => {
    switch (currentStep) {
      case 'tecnico':
        return {
          title: 'Firma del Técnico',
          subtitle: 'Como técnico responsable, confirma que has iniciado el servicio',
          icon: 'engineering',
          color: '#2A4065',
        };
      case 'cliente':
        return {
          title: 'Firma del Cliente',
          subtitle: 'Como cliente, confirma que autorizas el inicio del servicio',
          icon: 'person',
          color: '#28a745',
        };
      default:
        return {
          title: '',
          subtitle: '',
          icon: 'edit',
          color: '#6c757d',
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
            <MaterialIcons name="arrow-back" size={24} color="#212529" />
          </TouchableOpacity>
          
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Firmas Digitales</Text>
          </View>
          
          <View style={styles.headerRight} />
        </View>

        {/* Progress indicator minimalista */}
        <View style={styles.progressContainer}>
          <View style={styles.progressStep}>
            <View style={[
              styles.progressCircle,
              signatures.tecnico ? styles.progressCircleCompleted : 
              (currentStep === 'tecnico' ? styles.progressCircleCurrent : styles.progressCirclePending)
            ]}>
              {signatures.tecnico ? (
                <MaterialIcons name="check" size={18} color="#fff" />
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
                <MaterialIcons name="check" size={18} color="#fff" />
              ) : (
                <Text style={[styles.progressNumber, currentStep === 'cliente' && styles.progressNumberCurrent]}>2</Text>
              )}
            </View>
            <Text style={styles.progressLabel}>Cliente</Text>
          </View>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={styles.contentContainer}>
          {/* Información del paso actual - minimalista */}
          <View style={styles.stepInfo}>
            <Text style={styles.stepTitle}>{stepInfo.title}</Text>
            <Text style={styles.stepSubtitle}>{stepInfo.subtitle}</Text>
          </View>

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
              <ActivityIndicator size="small" color="#856404" />
              <Text style={styles.locationText}>Obteniendo ubicación GPS...</Text>
            </View>
          )}
        </ScrollView>

        {/* Canvas de firma */}
        <View style={styles.signatureContainer}>
          <View style={[styles.signatureCanvas, { height: CANVAS_HEIGHT }]}>
            <SignatureScreen
              ref={signatureRef}
              onOK={handleSignature}
              onEmpty={handleEmpty}
              onBegin={handleBeginDraw}
              descriptionText=""
              clearText=""
              confirmText=""
              webStyle={signatureStyle}
              autoClear={false}
              backgroundColor="rgba(255,255,255,0)"
              penColor="#000"
              minWidth={3}
              maxWidth={5}
            />
          </View>

          {/* Botones de control - minimalista */}
          <View style={styles.signatureControls}>
            <TouchableOpacity style={styles.clearButton} onPress={limpiarFirma}>
              <MaterialIcons name="refresh" size={20} color="#6c757d" />
              <Text style={styles.clearButtonText}>Limpiar</Text>
            </TouchableOpacity>
            
            {currentStep === 'cliente' && signatures.tecnico && (
              <TouchableOpacity style={styles.backButton} onPress={regresarPaso}>
                <MaterialIcons name="arrow-back" size={20} color="#6c757d" />
              </TouchableOpacity>
            )}
            
            {/* Botón manual para confirmar */}
            {hasDrawnSignature && (
              <TouchableOpacity 
                style={styles.manualConfirmButton} 
                onPress={() => signatureRef.current?.readSignature()}
              >
                <Text style={styles.manualConfirmButtonText}>Confirmar</Text>
                <MaterialIcons name="arrow-forward" size={20} color="#fff" />
              </TouchableOpacity>
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
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
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
    fontSize: 18,
    fontWeight: '700',
    color: '#212529',
  },
  headerRight: {
    width: 40,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
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
    backgroundColor: '#28a745',
    borderColor: '#28a745',
  },
  progressCircleCurrent: {
    backgroundColor: '#619FF0',
    borderColor: '#619FF0',
  },
  progressCirclePending: {
    backgroundColor: '#ffffff',
    borderColor: '#e9ecef',
  },
  progressNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: '#6c757d',
  },
  progressNumberCurrent: {
    color: '#ffffff',
  },
  progressLabel: {
    fontSize: 12,
    color: '#6c757d',
    marginTop: 6,
    fontWeight: '500',
  },
  progressLine: {
    width: 60,
    height: 2,
    backgroundColor: '#e9ecef',
    marginHorizontal: 16,
    borderRadius: 1,
  },
  content: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  contentContainer: {
    paddingBottom: 20,
  },
  stepInfo: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    marginTop: 20,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#212529',
    marginBottom: 6,
  },
  stepSubtitle: {
    fontSize: 14,
    color: '#6c757d',
    lineHeight: 20,
  },
  orderInfo: {
    backgroundColor: '#ffffff',
    marginHorizontal: 20,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  orderInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  orderInfoRowFirst: {
    borderBottomWidth: 1,
    borderBottomColor: '#f8f9fa',
  },
  orderInfoRowLast: {
    borderBottomWidth: 0,
  },
  orderInfoLabel: {
    fontSize: 14,
    color: '#6c757d',
    fontWeight: '500',
  },
  orderInfoValue: {
    fontSize: 14,
    color: '#212529',
    fontWeight: '600',
  },
  signatureContainer: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
  },
  signatureCanvas: {
    // Altura dinámica aplicada en tiempo de render
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderStyle: 'dashed',
    borderRadius: 12,
    backgroundColor: '#f8f9fa',
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
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  clearButtonText: {
    marginLeft: 6,
    fontSize: 14,
    color: '#6c757d',
    fontWeight: '500',
  },
  backButton: {
    padding: 10,
    borderRadius: 10,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    marginHorizontal: 20,
    marginTop: 16,
    backgroundColor: '#fff8e1',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#ffe08a',
  },
  locationText: {
    marginLeft: 8,
    fontSize: 13,
    color: '#856404',
    fontWeight: '500',
  },
  manualConfirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#619FF0',
    gap: 8,
    flex: 1,
    justifyContent: 'center',
  },
  manualConfirmButtonText: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '700',
  },
}); 