import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Image,
  Linking,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useAuth } from '@/context/AuthContext';
import { documentosAPI, onboardingAPI } from '@/services/api';
import OnboardingHeader from '@/components/OnboardingHeader';
import {
  OnboardingScreenLayout,
  OnboardingPrimaryButton,
} from '@/components/onboarding';
import { Buffer } from 'buffer';
import { InstitutionalIcon } from '@/components/ui/InstitutionalIcon';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import { COLORS } from '@/app/design-system/tokens';
import { onboardingStyles } from '@/app/design-system/styles/onboarding';
import { showAlert, showAlertButtons, showConfirm } from '@/utils/platformAlert';

const I = COLORS.institutional;

interface DocumentoInfo {
  nombre: string;
  descripcion: string;
  tipo: string;
  obligatorio: boolean;
  icono: string;
  acepta: string[];
}

const DOCS_COMUNES: DocumentoInfo[] = [
  {
    nombre: 'Documento de Identidad (Frontal)',
    descripcion: 'Foto clara del frente de tu cédula o DNI',
    tipo: 'dni_frontal',
    obligatorio: true,
    icono: 'card-outline',
    acepta: ['JPG', 'PNG', 'PDF'],
  },
  {
    nombre: 'Documento de Identidad (Trasero)',
    descripcion: 'Foto clara del reverso de tu cédula o DNI',
    tipo: 'dni_trasero',
    obligatorio: true,
    icono: 'card-outline',
    acepta: ['JPG', 'PNG', 'PDF'],
  },
  {
    nombre: 'Licencia de Conducir',
    descripcion: 'Licencia de conducir vigente',
    tipo: 'licencia_conducir',
    obligatorio: true,
    icono: 'car-outline',
    acepta: ['JPG', 'PNG', 'PDF'],
  },
];

const DOCS_TALLER: DocumentoInfo[] = [
  {
    nombre: 'RUT/CUIT Fiscal',
    descripcion: 'Documento tributario oficial del negocio',
    tipo: 'rut_fiscal',
    obligatorio: true,
    icono: 'document-text-outline',
    acepta: ['JPG', 'PNG', 'PDF'],
  },
  {
    nombre: 'Foto de Fachada',
    descripcion: 'Foto exterior de tu taller (opcional)',
    tipo: 'foto_fachada',
    obligatorio: false,
    icono: 'business-outline',
    acepta: ['JPG', 'PNG'],
  },
  {
    nombre: 'Foto Interior',
    descripcion: 'Foto del interior de tu taller (opcional)',
    tipo: 'foto_interior',
    obligatorio: false,
    icono: 'home-outline',
    acepta: ['JPG', 'PNG'],
  },
  {
    nombre: 'Foto de Equipos',
    descripcion: 'Foto de tus herramientas y equipos (opcional)',
    tipo: 'foto_equipos',
    obligatorio: false,
    icono: 'build-outline',
    acepta: ['JPG', 'PNG'],
  },
];

const DOCS_MECANICO: DocumentoInfo[] = [
  {
    nombre: 'Foto de Herramientas',
    descripcion: 'Herramientas portátiles que utilizas (opcional)',
    tipo: 'foto_herramientas',
    obligatorio: false,
    icono: 'build-outline',
    acepta: ['JPG', 'PNG'],
  },
  {
    nombre: 'Foto de Vehículo de Trabajo',
    descripcion: 'Vehículo con el que te desplazas (opcional)',
    tipo: 'foto_vehiculo',
    obligatorio: false,
    icono: 'car-outline',
    acepta: ['JPG', 'PNG'],
  },
];

function tiposDocumentosParaProveedor(tipoProveedor?: string): DocumentoInfo[] {
  if (tipoProveedor === 'mecanico') {
    return [...DOCS_COMUNES, ...DOCS_MECANICO];
  }
  return [...DOCS_COMUNES, ...DOCS_TALLER];
}

interface DocumentoSubido {
  tipo: string;
  uri: string;
  fileName: string;
  fileType: string;
  subido: boolean;
  subiendose: boolean;
  error?: string;
}

export default function SubirDocumentosScreen() {
  const router = useRouter();
  const { estadoProveedor, refrescarEstadoProveedor } = useAuth();
  
  const [documentosSubidos, setDocumentosSubidos] = useState<{ [key: string]: DocumentoSubido }>({});
  const [modalVisible, setModalVisible] = useState(false);
  const [tipoDocumentoActual, setTipoDocumentoActual] = useState<DocumentoInfo | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isFinalizando, setIsFinalizando] = useState(false);
  const [progreso, setProgreso] = useState('');

  const tiposDocumentos = useMemo(
    () => tiposDocumentosParaProveedor(estadoProveedor?.tipo_proveedor),
    [estadoProveedor?.tipo_proveedor],
  );

  useEffect(() => {
    refrescarEstadoProveedor();
  }, [refrescarEstadoProveedor]);

  useEffect(() => {
    if (__DEV__) {
      console.log('🔍 SubirDocumentosScreen - Estado del proveedor:', estadoProveedor);
    }

    if (!estadoProveedor?.tiene_perfil) {
      router.replace('/(onboarding)/tipo-cuenta');
      return;
    }

    if (estadoProveedor?.estado_verificacion === 'aprobado') {
      router.replace('/(onboarding)/cuenta-en-revision');
    }
  }, [estadoProveedor, router]);

  const abrirSelectorDocumento = (documentoInfo: DocumentoInfo) => {
    setTipoDocumentoActual(documentoInfo);
    
    if (Platform.OS === 'web') {
      seleccionarImagen(documentoInfo);
      return;
    }

    // En iOS con Expo Go, el Modal puede bloquear launchCameraAsync
    if (Platform.OS === 'ios') {
      showAlertButtons(
        `Seleccionar ${documentoInfo.nombre}`,
        '¿Cómo quieres agregar el documento?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Tomar Foto', onPress: () => tomarFoto(documentoInfo) },
          { text: 'Galería', onPress: () => seleccionarImagen(documentoInfo) },
          ...(documentoInfo.acepta.includes('PDF')
            ? [{ text: 'PDF', onPress: () => seleccionarDocumento(documentoInfo) }]
            : []),
        ],
      );
    } else {
      setModalVisible(true);
    }
  };

  const seleccionarImagen = async (documentoInfo?: DocumentoInfo) => {
    // Usar el documento pasado como parámetro o el estado actual
    const docInfo = documentoInfo || tipoDocumentoActual;
    if (!docInfo) {
      console.error('❌ No hay tipo de documento especificado');
      return;
    }

    if (Platform.OS === 'android') {
      setModalVisible(false);
    }
    
    try {
      // Solicitar permisos de galería
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        showAlertButtons(
          'Permisos Requeridos',
          'Necesitamos acceso a tu galería para seleccionar documentos. Por favor, permite el acceso en la configuración de la app.',
          [
            { text: 'Cancelar', style: 'cancel' },
            {
              text: 'Abrir Configuración',
              onPress: async () => {
                try {
                  if (Platform.OS === 'ios') {
                    await Linking.openURL('app-settings:');
                  } else {
                    await Linking.openSettings();
                  }
                } catch (error) {
                  if (__DEV__) {
                    console.error('Error abriendo configuración:', error);
                  }
                }
              },
            },
          ],
        );
        return;
      }

      // No especificar mediaTypes para evitar problemas de compatibilidad
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        procesarDocumento(asset.uri, asset.fileName || 'imagen.jpg', 'image/jpeg', docInfo);
      }
    } catch (error: any) {
      if (__DEV__) {
        console.error('Error seleccionando imagen:', error);
      }
      showAlert(
        'Error', 
        error.message || 'No se pudo seleccionar la imagen. Verifica que tengas permisos de galería.'
      );
    }
  };

  const tomarFoto = async (documentoInfo?: DocumentoInfo) => {
    // Usar el documento pasado como parámetro o el estado actual
    const docInfo = documentoInfo || tipoDocumentoActual;
    if (!docInfo) {
      console.error('❌ No hay tipo de documento especificado');
      return;
    }

    console.log('📸 [DEBUG] Iniciando tomarFoto para:', docInfo.tipo);
    
    // Cerrar modal si está abierto (solo en Android)
    if (Platform.OS === 'android') {
      setModalVisible(false);
      // Pequeño delay para Android
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    try {
      console.log('📸 [DEBUG] Solicitando permisos de cámara...');
      
      // Solicitar permisos de cámara - exactamente como documentacion.tsx
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      
      console.log('📸 [DEBUG] Estado de permisos:', status);
      
      if (status !== 'granted') {
        console.log('📸 [DEBUG] Permisos denegados');
        showAlertButtons(
          'Permisos Requeridos',
          'Necesitamos acceso a tu cámara para tomar fotos de documentos. Por favor, permite el acceso en la configuración de la app.',
          [
            { text: 'Cancelar', style: 'cancel' },
            {
              text: 'Abrir Configuración',
              onPress: async () => {
                try {
                  if (Platform.OS === 'ios') {
                    await Linking.openURL('app-settings:');
                  } else {
                    await Linking.openSettings();
                  }
                } catch (error) {
                  console.error('❌ [DEBUG] Error abriendo configuración:', error);
                }
              },
            },
          ],
        );
        return;
      }

      console.log('📸 [DEBUG] Permisos otorgados, ejecutando launchCameraAsync...');
      
      // Ejecutar directamente - sin delays adicionales en iOS ya que no hay Modal
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      console.log('📸 [DEBUG] Resultado recibido de launchCameraAsync');
      console.log('📸 [DEBUG] Resultado cancelado:', result.canceled);
      console.log('📸 [DEBUG] Assets:', result.assets?.length || 0);

      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        console.log('📸 [DEBUG] Procesando documento con URI:', asset.uri, 'para tipo:', docInfo.tipo);
        procesarDocumento(asset.uri, asset.fileName || 'foto.jpg', 'image/jpeg', docInfo);
      } else {
        console.log('📸 [DEBUG] Usuario canceló o no hay assets');
      }
      
    } catch (error: any) {
      console.error('❌ [DEBUG] Error en tomarFoto:', error);
      console.error('❌ [DEBUG] Detalles del error:', {
        message: error?.message,
        stack: error?.stack,
        name: error?.name,
        code: error?.code
      });
      showAlert(
        'Error', 
        error?.message || 'No se pudo tomar la foto. Verifica que tengas permisos de cámara.'
      );
    }
  };

  const seleccionarDocumento = async (documentoInfo?: DocumentoInfo) => {
    // Usar el documento pasado como parámetro o el estado actual
    const docInfo = documentoInfo || tipoDocumentoActual;
    if (!docInfo) {
      console.error('❌ No hay tipo de documento especificado');
      return;
    }

    if (Platform.OS === 'android') {
      setModalVisible(false);
    }
    
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        procesarDocumento(asset.uri, asset.name, asset.mimeType || 'application/pdf', docInfo);
      }
    } catch (error) {
      console.error('Error seleccionando documento:', error);
      showAlert('Error', 'No se pudo seleccionar el documento');
    }
    setModalVisible(false);
  };

  const procesarDocumento = (uri: string, fileName: string, fileType: string, documentoInfo?: DocumentoInfo) => {
    // Usar el documento pasado como parámetro o el estado actual
    const docInfo = documentoInfo || tipoDocumentoActual;
    if (!docInfo) {
      console.error('❌ No hay tipo de documento especificado para procesar');
      return;
    }

    console.log('📄 Procesando documento:', { tipo: docInfo.tipo, fileName, fileType });

    const documento: DocumentoSubido = {
      tipo: docInfo.tipo,
      uri,
      fileName,
      fileType,
      subido: false,
      subiendose: false,
    };

    setDocumentosSubidos(prev => ({
      ...prev,
      [docInfo.tipo]: documento
    }));

    // Subir inmediatamente
    subirDocumento(documento);
  };

  const subirDocumento = async (documento: DocumentoSubido) => {
    console.log('📤 Subiendo documento:', documento.tipo);
    
    // Marcar como "subiéndose"
    setDocumentosSubidos(prev => ({
      ...prev,
      [documento.tipo]: { ...documento, subiendose: true, error: undefined }
    }));

    try {
      const archivo = {
        uri: documento.uri,
        type: documento.fileType,
        name: documento.fileName,
      };

      const resultado = await documentosAPI.subirDocumento(archivo, documento.tipo);
      console.log('✅ Documento subido exitosamente:', resultado);

      // Marcar como subido
      setDocumentosSubidos(prev => ({
        ...prev,
        [documento.tipo]: { ...documento, subido: true, subiendose: false }
      }));

      // Mostrar mensaje de éxito
      showAlert('✅ Documento Subido', `${getTipoDocumentoInfo(documento.tipo)?.nombre} se subió correctamente`);

    } catch (error: any) {
      console.error('❌ Error subiendo documento:', error);

      let mensajeError = 'No se pudo subir el archivo. Intenta de nuevo.';
      if (error?.message) {
        mensajeError = error.message;
      } else if (error.response?.data?.error) {
        mensajeError = error.response.data.error;
      }

      // Marcar como error
      setDocumentosSubidos(prev => ({
        ...prev,
        [documento.tipo]: { ...documento, subiendose: false, error: mensajeError }
      }));

      showAlert('❌ Error al Subir', `No se pudo subir ${getTipoDocumentoInfo(documento.tipo)?.nombre}:\n${mensajeError}`);
    }
  };

  const reintentarDocumento = (tipo: string) => {
    const documento = documentosSubidos[tipo];
    if (documento) {
      subirDocumento(documento);
    }
  };

  const getTipoDocumentoInfo = useCallback(
    (tipo: string): DocumentoInfo | undefined => tiposDocumentos.find((doc) => doc.tipo === tipo),
    [tiposDocumentos],
  );

  const getDocumentosObligatorios = useCallback(
    () => tiposDocumentos.filter((doc) => doc.obligatorio),
    [tiposDocumentos],
  );

  const getDocumentosOpcionales = useCallback(
    () => tiposDocumentos.filter((doc) => !doc.obligatorio),
    [tiposDocumentos],
  );

  const getDocumentosObligatoriosSubidos = () => {
    return getDocumentosObligatorios().filter(doc => 
      documentosSubidos[doc.tipo]?.subido === true
    );
  };

  const getDocumentosObligatoriosFaltantes = () => {
    return getDocumentosObligatorios().filter(doc => 
      !documentosSubidos[doc.tipo]?.subido
    );
  };

  const puedeCompletar = () => {
    return getDocumentosObligatoriosFaltantes().length === 0;
  };

  const completarDocumentacion = async () => {
    if (!puedeCompletar()) {
      showAlert('Documentos Faltantes', 'Debes subir todos los documentos obligatorios antes de continuar');
      return;
    }

    setIsFinalizando(true);
    setProgreso('Completando documentación...');

    try {
      // Avisar al backend que ya se subieron documentos (evita refrescarEstadoProveedor que hace 2 requests + reintentos)
      console.log('📋 Confirmando documentación en backend...');
      await onboardingAPI.completarOnboardingDocumentos();

      // Refresco en background (no bloqueante) para que la app se ponga al día sin alargar el loading.
      refrescarEstadoProveedor().catch(() => null);
      
      // Mostrar mensaje de éxito
      showAlertButtons(
        '🎉 Documentación Completada',
        'Todos tus documentos han sido subidos exitosamente. Tu cuenta está ahora en revisión por nuestro equipo.',
        [
          {
            text: 'Continuar',
            onPress: () => router.replace('/(onboarding)/cuenta-en-revision'),
          },
        ],
      );

    } catch (error: any) {
      console.error('❌ Error completando documentación:', error);
      showAlert('Error', 'No se pudo completar la documentación. Intenta nuevamente.');
    } finally {
      setIsFinalizando(false);
      setProgreso('');
    }
  };

  const omitirDocumentosOpcionales = () => {
    showConfirm(
      'Omitir Documentos Opcionales',
      'Puedes agregar documentos opcionales más tarde desde tu perfil. ¿Deseas continuar?',
      {
        confirmText: 'Continuar',
        onConfirm: completarDocumentacion,
      },
    );
  };

  const renderDocumento = (documentoInfo: DocumentoInfo) => {
    const documento = documentosSubidos[documentoInfo.tipo];
    const isObligatorio = documentoInfo.obligatorio;
    
    return (
      <View key={documentoInfo.tipo} style={styles.documentoContainer}>
        <View style={styles.documentoHeader}>
          <View style={styles.documentoIcono}>
            <InstitutionalIcon 
              name={documentoInfo.icono as any} 
              size={24} 
              color={isObligatorio ? I.semanticDown : I.primary} 
             strokeWidth={ICON_STROKE_WIDTH} />
            {isObligatorio && (
              <View style={styles.obligatorioIndicador}>
                <Text style={styles.obligatorioTexto}>*</Text>
              </View>
            )}
          </View>
          <View style={styles.documentoInfo}>
            <Text style={styles.documentoNombre}>{documentoInfo.nombre}</Text>
            <Text style={styles.documentoDescripcion}>{documentoInfo.descripcion}</Text>
            <Text style={styles.documentoFormatos}>
              Formatos: {documentoInfo.acepta.join(', ')}
            </Text>
          </View>
        </View>

        <View style={styles.documentoEstado}>
          {documento?.subiendose ? (
            <View style={styles.subiendose}>
              <ActivityIndicator size="small" color={I.primary} />
              <Text style={styles.subiendoseTexto}>Subiendo...</Text>
            </View>
          ) : documento?.subido ? (
            <View style={styles.subido}>
              <InstitutionalIcon name="checkmark-circle" size={24} color={I.semanticUp}  strokeWidth={ICON_STROKE_WIDTH} />
              <Text style={styles.subidoTexto}>Subido</Text>
            </View>
          ) : documento?.error ? (
            <View style={styles.error}>
              <InstitutionalIcon name="alert-circle" size={24} color={I.semanticDown}  strokeWidth={ICON_STROKE_WIDTH} />
              <Text style={styles.errorTexto}>Error</Text>
              <TouchableOpacity 
                style={styles.reintentarButton}
                onPress={() => reintentarDocumento(documentoInfo.tipo)}
              >
                <Text style={styles.reintentarTexto}>Reintentar</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.subirButton, isObligatorio && styles.subirButtonObligatorio]}
              onPress={() => abrirSelectorDocumento(documentoInfo)}
            >
              <InstitutionalIcon name="cloud-upload-outline" size={20} color="white"  strokeWidth={ICON_STROKE_WIDTH} />
              <Text style={styles.subirButtonTexto}>Subir</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const renderProgreso = () => {
    const obligatoriosTotal = getDocumentosObligatorios().length;
    const obligatoriosSubidos = getDocumentosObligatoriosSubidos().length;
    const opcionalesTotal = getDocumentosOpcionales().length;
    const opcionalesSubidos = getDocumentosOpcionales().filter(doc => 
      documentosSubidos[doc.tipo]?.subido === true
    ).length;

    return (
      <View style={styles.progresoContainer}>
        <Text style={styles.progresoTitulo}>Progreso de Documentación</Text>
        
        <View style={styles.progresoItem}>
          <Text style={styles.progresoLabel}>Documentos Obligatorios:</Text>
          <Text style={styles.progresoValor}>{obligatoriosSubidos}/{obligatoriosTotal}</Text>
        </View>
        
        <View style={styles.progresoItem}>
          <Text style={styles.progresoLabel}>Documentos Opcionales:</Text>
          <Text style={styles.progresoValor}>{opcionalesSubidos}/{opcionalesTotal}</Text>
        </View>

        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill, 
              { width: `${(obligatoriosSubidos / obligatoriosTotal) * 100}%` }
            ]} 
          />
        </View>
      </View>
    );
  };

  const renderModalSelector = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={modalVisible}
      onRequestClose={() => setModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <Text style={styles.modalTitulo}>Seleccionar {tipoDocumentoActual?.nombre}</Text>
          
          <TouchableOpacity style={styles.modalOpcion} onPress={() => tipoDocumentoActual && tomarFoto(tipoDocumentoActual)}>
            <InstitutionalIcon name="camera" size={24} color={I.primary}  strokeWidth={ICON_STROKE_WIDTH} />
            <Text style={styles.modalOpcionTexto}>Tomar Foto</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.modalOpcion} onPress={() => tipoDocumentoActual && seleccionarImagen(tipoDocumentoActual)}>
            <InstitutionalIcon name="image" size={24} color={I.primary}  strokeWidth={ICON_STROKE_WIDTH} />
            <Text style={styles.modalOpcionTexto}>Seleccionar de Galería</Text>
          </TouchableOpacity>
          
          {tipoDocumentoActual?.acepta.includes('PDF') && (
            <TouchableOpacity style={styles.modalOpcion} onPress={() => tipoDocumentoActual && seleccionarDocumento(tipoDocumentoActual)}>
              <InstitutionalIcon name="document" size={24} color={I.primary}  strokeWidth={ICON_STROKE_WIDTH} />
              <Text style={styles.modalOpcionTexto}>Seleccionar PDF</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity 
            style={styles.modalCancelar} 
            onPress={() => setModalVisible(false)}
          >
            <Text style={styles.modalCancelarTexto}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  const footer = puedeCompletar() ? (
    <OnboardingPrimaryButton
      label={isFinalizando ? 'Completando…' : 'Completar documentación'}
      onPress={completarDocumentacion}
      disabled={isFinalizando}
      loading={isFinalizando}
    />
  ) : (
    <View>
      <Text style={styles.ayudaTexto}>
        Faltan {getDocumentosObligatoriosFaltantes().length} documentos obligatorios
      </Text>
      <TouchableOpacity
        style={styles.ayudaButton}
        onPress={omitirDocumentosOpcionales}
        disabled={!puedeCompletar()}
      >
        <Text style={styles.ayudaButtonTexto}>Continuar sin documentos opcionales</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <>
      <OnboardingScreenLayout footer={footer}>
        <OnboardingHeader
          title="Subir Documentos"
          subtitle="Completa tu documentación para activar tu cuenta"
          currentStep={1}
          totalSteps={1}
          canGoBack={false}
          icon="cloud-upload-outline"
        />

        {renderProgreso()}

        <View style={styles.seccionContainer}>
          <View style={styles.seccionHeader}>
            <InstitutionalIcon name="alert-circle" size={24} color={I.semanticDown}  strokeWidth={ICON_STROKE_WIDTH} />
            <Text style={styles.seccionTitulo}>Documentos Obligatorios</Text>
          </View>
          <Text style={styles.seccionDescripcion}>
            Estos documentos son requeridos para verificar tu identidad y activar tu cuenta.
          </Text>
          {getDocumentosObligatorios().map(renderDocumento)}
        </View>

        <View style={styles.seccionContainer}>
          <View style={styles.seccionHeader}>
            <InstitutionalIcon name="information-circle" size={24} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
            <Text style={styles.seccionTitulo}>Documentos Opcionales</Text>
          </View>
          <Text style={styles.seccionDescripcion}>
            Estos documentos ayudan a generar más confianza con los clientes.
          </Text>
          {getDocumentosOpcionales().map(renderDocumento)}
        </View>

        {isFinalizando && progreso && (
          <View style={styles.progresoSubida}>
            <ActivityIndicator size="small" color={I.primary} />
            <Text style={styles.progresoTexto}>{progreso}</Text>
          </View>
        )}

      </OnboardingScreenLayout>
      {renderModalSelector()}
    </>
  );
}

const styles = StyleSheet.create({
  progresoContainer: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  progresoTitulo: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 15,
  },
  progresoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  progresoLabel: {
    fontSize: 14,
    color: '#5d6d7e',
  },
  progresoValor: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#ecf0f1',
    borderRadius: 4,
    marginTop: 10,
  },
  progressFill: {
    height: '100%',
    backgroundColor: I.primary,
    borderRadius: 4,
  },
  seccionContainer: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  seccionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  seccionTitulo: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginLeft: 10,
  },
  seccionDescripcion: {
    fontSize: 14,
    color: '#5d6d7e',
    marginBottom: 20,
    lineHeight: 20,
  },
  documentoContainer: {
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
    paddingBottom: 20,
    marginBottom: 20,
  },
  documentoHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  documentoIcono: {
    position: 'relative',
    marginRight: 15,
  },
  obligatorioIndicador: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#e74c3c',
    borderRadius: 8,
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  obligatorioTexto: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  documentoInfo: {
    flex: 1,
  },
  documentoNombre: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 5,
  },
  documentoDescripcion: {
    fontSize: 14,
    color: '#5d6d7e',
    marginBottom: 5,
  },
  documentoFormatos: {
    fontSize: 12,
    color: '#95a5a6',
    fontStyle: 'italic',
  },
  documentoEstado: {
    alignItems: 'flex-end',
  },
  subiendose: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  subiendoseTexto: {
    color: I.primary,
    marginLeft: 10,
    fontSize: 14,
  },
  subido: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  subidoTexto: {
    color: I.semanticUp,
    marginLeft: 10,
    fontSize: 14,
    fontWeight: 'bold',
  },
  error: {
    alignItems: 'center',
  },
  errorTexto: {
    color: '#e74c3c',
    fontSize: 14,
    marginTop: 5,
  },
  reintentarButton: {
    backgroundColor: '#e74c3c',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 6,
    marginTop: 8,
  },
  reintentarTexto: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  subirButton: {
    backgroundColor: I.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  subirButtonObligatorio: {
    backgroundColor: '#e74c3c',
  },
  subirButtonTexto: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  botonesContainer: {
    marginTop: 20,
  },
  completarButton: {
    backgroundColor: I.primary,
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  completarButtonTexto: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  ayudaContainer: {
    alignItems: 'center',
  },
  ayudaTexto: {
    fontSize: 14,
    color: '#e74c3c',
    textAlign: 'center',
    marginBottom: 15,
  },
  ayudaButton: {
    backgroundColor: '#95a5a6',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  ayudaButtonTexto: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  progresoSubida: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
  },
  progresoTexto: {
    marginLeft: 10,
    fontSize: 14,
    color: I.primary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    width: '80%',
    maxWidth: 300,
  },
  modalTitulo: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalOpcion: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ecf0f1',
  },
  modalOpcionTexto: {
    fontSize: 16,
    color: '#2c3e50',
    marginLeft: 15,
  },
  modalCancelar: {
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  modalCancelarTexto: {
    fontSize: 16,
    color: '#e74c3c',
    fontWeight: 'bold',
  },
}); 