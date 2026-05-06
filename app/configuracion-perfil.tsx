import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
  Image,
  Modal,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets, SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import {
  perfilAPI,
  documentosAPI,
  type DocumentoOnboarding,
  type ActualizarPerfilRequest,
  type TipoDocumento
} from '@/services/api';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import Header from '@/components/Header';
import { COLORS, SPACING, TYPOGRAPHY, SHADOWS, BORDERS } from '@/app/design-system/tokens';
import { BLANK_GLASS, GLASS_INSET } from '@/app/design-system/blankGlass';
import { InstitutionalScreenTabs } from '@/app/design-system/components/InstitutionalScreenTabs';
import { InstitutionalIcon } from '@/components/ui/InstitutionalIcon';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';

const I = COLORS.institutional;

interface DocumentoLocal extends DocumentoOnboarding {
  esObligatorio: boolean;
  icono: string;
  nombre_amigable: string;
  descripcion: string;
}

interface ModalDocumento {
  visible: boolean;
  documento: DocumentoLocal | null;
  esNuevo: boolean;
}

export default function ConfiguracionPerfilScreen() {
  const insets = useSafeAreaInsets();
  const {
    estadoProveedor,
    usuario,
    refrescarEstadoProveedor,
    obtenerNombreProveedor,
    obtenerDatosCompletosProveedor
  } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const bgPaper = I.canvas;
  const textPrimary = I.ink;
  const textSecondary = I.body;
  const textTertiary = I.muted;
  const borderLight = I.hairline;
  const borderMain = I.hairline;
  const primary500 = I.primary;
  const success500 = I.semanticUp;
  const error500 = I.semanticDown;
  const warning500 = I.accentYellow;
  const info500 = I.primary;
  const primaryLight = I.surfaceSoft;
  const successLight = I.surfaceSoft;
  const errorLight = I.surfaceSoft;
  const warningLight = I.surfaceSoft;
  const infoLight = I.surfaceSoft;
  const neutralGray100 = I.surfaceSoft;
  const neutralGray50 = I.surfaceSoft;

  // Estados para datos del perfil
  const [datosPersonales, setDatosPersonales] = useState({
    nombre: '',
    telefono: '',
    email: '',
    descripcion: '',
    direccion: '',
  });

  const [fotoPerfilUri, setFotoPerfilUri] = useState<string | null>(null);
  const [documentos, setDocumentos] = useState<DocumentoLocal[]>([]);
  const [tiposDocumento, setTiposDocumento] = useState<TipoDocumento[]>([]);

  // Estados para modales
  const [modalDocumento, setModalDocumento] = useState<ModalDocumento>({
    visible: false,
    documento: null,
    esNuevo: false,
  });

  const [tabActiva, setTabActiva] = useState<'datos' | 'documentos'>('datos');

  // Definir tipos de documento con información adicional
  const tiposDocumentoInfo = {
    // Documentos obligatorios
    'dni_frontal': {
      nombre: 'DNI/Cédula (Frontal)',
      icono: 'credit-card',
      descripcion: 'Documento de identidad lado frontal',
      esObligatorio: true,
    },
    'dni_trasero': {
      nombre: 'DNI/Cédula (Trasero)',
      icono: 'credit-card',
      descripcion: 'Documento de identidad lado trasero',
      esObligatorio: true,
    },
    'licencia_conducir': {
      nombre: 'Licencia de Conducir',
      icono: 'drive-eta',
      descripcion: 'Licencia de conducir vigente',
      esObligatorio: true,
    },
    'rut_fiscal': {
      nombre: 'RUT/CUIT Fiscal',
      icono: 'business',
      descripcion: 'Documento fiscal del negocio',
      esObligatorio: true,
    },
    // Documentos opcionales
    'foto_fachada': {
      nombre: 'Foto de Fachada',
      icono: 'store',
      descripcion: 'Foto exterior del taller',
      esObligatorio: false,
    },
    'foto_interior': {
      nombre: 'Foto Interior',
      icono: 'home',
      descripcion: 'Foto del interior del taller',
      esObligatorio: false,
    },
    'foto_equipos': {
      nombre: 'Foto de Equipos',
      icono: 'build',
      descripcion: 'Foto de herramientas y equipos',
      esObligatorio: false,
    },
    'foto_herramientas': {
      nombre: 'Foto de Herramientas',
      icono: 'build',
      descripcion: 'Herramientas portátiles de trabajo',
      esObligatorio: false,
    },
    'foto_vehiculo': {
      nombre: 'Foto del Vehículo',
      icono: 'directions-car',
      descripcion: 'Vehículo de trabajo del mecánico',
      esObligatorio: false,
    },
  };

  useEffect(() => {
    if (estadoProveedor?.estado_verificacion !== 'aprobado') {
      Alert.alert(
        'Acceso Restringido',
        'Solo los proveedores con cuenta aprobada pueden gestionar su perfil.',
        [{ text: 'Entendido', onPress: () => router.back() }]
      );
      return;
    }

    cargarDatos();
  }, [estadoProveedor, usuario]);

  const cargarDatos = async () => {
    try {
      setLoading(true);

      // Usar los datos completos del proveedor con fallbacks robustos
      const datosCompletos = obtenerDatosCompletosProveedor();

      setDatosPersonales({
        nombre: datosCompletos.nombre,
        telefono: datosCompletos.telefono,
        email: datosCompletos.email,
        descripcion: datosCompletos.descripcion,
        direccion: datosCompletos.direccion,
      });

      // Cargar foto de perfil si existe
      if (usuario?.foto_perfil) {
        setFotoPerfilUri(usuario.foto_perfil);
      }

      // MEJORADO: Cargar documentos del proveedor con mejor logging
      try {
        console.log('📄 Cargando documentos del proveedor...');
        const documentosData = await documentosAPI.obtenerMisDocumentos();
        console.log('✅ Documentos obtenidos:', documentosData);

        const tiposData = await documentosAPI.obtenerTiposDocumento();
        console.log('✅ Tipos de documento obtenidos:', tiposData);

        // Arreglar el problema con tipos_documento
        const tiposDocumento = tiposData?.tipos_documento || (Array.isArray(tiposData) ? tiposData : []) || [];
        setTiposDocumento(tiposDocumento);

        // Convertir documentos a formato local con información adicional
        const documentosConInfo = (documentosData || []).map(doc => {
          const tipoDoc = doc?.tipo_documento;
          const info = tipoDoc ? tiposDocumentoInfo[tipoDoc as keyof typeof tiposDocumentoInfo] : null;
          return {
            ...doc,
            ...(info || {}),
            nombre_amigable: info?.nombre || doc?.tipo_documento || 'Documento',
            icono: info?.icono || 'insert-drive-file',
            descripcion: info?.descripcion || '',
            esObligatorio: info?.esObligatorio || false,
          };
        });

        console.log('✅ Documentos procesados:', documentosConInfo);
        setDocumentos(documentosConInfo);

        // Log para depurar los documentos cargados
        const obligatorios = documentosConInfo.filter(doc => doc.esObligatorio);
        const opcionales = documentosConInfo.filter(doc => !doc.esObligatorio);
        console.log(`📊 Documentos cargados: ${obligatorios.length} obligatorios, ${opcionales.length} opcionales`);

      } catch (documentError: any) {
        console.error('❌ Error cargando documentos:', documentError);
        // Mostrar más detalles del error
        if (documentError instanceof Error) {
          console.error('Mensaje de error:', documentError.message);
        }
        if (documentError?.response) {
          console.error('Respuesta del servidor:', documentError.response?.status, documentError.response?.data);
        }

        // Continuar con arrays vacíos para no bloquear la carga
        setDocumentos([]);
        setTiposDocumento([]);
      }

    } catch (error) {
      console.error('❌ Error cargando datos:', error);
      Alert.alert('Error', 'No se pudieron cargar los datos del perfil.');
    } finally {
      setLoading(false);
    }
  };

  const manejarSubidaFoto = async (result: any) => {
    try {
      setUploadingPhoto(true);

      console.log('📷 Resultado de ImagePicker:', result);

      // Validar que result tenga assets y que no esté vacío
      if (!result || !result.assets || result.assets.length === 0) {
        throw new Error('No se seleccionó ninguna imagen');
      }

      // CORREGIDO: Preparar archivo correctamente para React Native
      const asset = result.assets[0];
      if (!asset || !asset.uri) {
        throw new Error('La imagen seleccionada no es válida');
      }

      const archivo = {
        uri: asset.uri,
        type: asset.mimeType || asset.type || 'image/jpeg',
        name: asset.fileName || asset.name || `foto_perfil_${Date.now()}.jpg`,
        fileSize: asset.fileSize,
      };

      console.log('📷 Subiendo foto de perfil (datos completos):', {
        uri: archivo.uri,
        type: archivo.type,
        name: archivo.name,
        fileSize: asset.fileSize,
        width: asset.width,
        height: asset.height,
      });

      // CORREGIDO: Usar perfilAPI correctamente (ahora usa fetch nativo para mejor compatibilidad)
      await perfilAPI.actualizarFotoPerfil(archivo);

      // Actualizar el estado del proveedor para reflejar la nueva foto
      await refrescarEstadoProveedor();

      Alert.alert('Éxito', 'Foto de perfil actualizada exitosamente');
    } catch (error: any) {
      // Log detallado solo en desarrollo
      if (__DEV__) {
        console.error('❌ Error subiendo foto (detalles - solo en desarrollo):', {
          message: error instanceof Error ? error.message : 'Error desconocido',
          code: error.code,
          name: error.name,
        });
      }

      // Mostrar mensaje de error amigable al usuario
      // El mensaje ya viene formateado desde perfilAPI.actualizarFotoPerfil
      const errorMessage = error instanceof Error
        ? error.message
        : 'Error desconocido al subir la foto. Por favor, intenta nuevamente.';

      Alert.alert(
        'Error al subir foto',
        errorMessage,
        [{ text: 'Entendido', style: 'default' }]
      );
    } finally {
      setUploadingPhoto(false);
    }
  };

  const manejarSubidaDocumento = async (
    tipoDocumento: { key: string; label: string },
    archivo: { uri: string; type: string; name: string; fileName: string; fileType: string }
  ) => {
    try {
      setSaving(true);

      // Verificar si ya existe un documento de este tipo
      const documentoExistente = (documentos || []).find(doc => doc?.tipo_documento === tipoDocumento.key);

      if (documentoExistente && documentoExistente.id) {
        // Si es obligatorio, requiere verificación
        if (tiposDocumentoInfo[tipoDocumento.key as keyof typeof tiposDocumentoInfo]?.esObligatorio) {
          Alert.alert(
            'Documento Obligatorio',
            'Este documento requiere verificación del administrador. ¿Desea reemplazarlo?',
            [
              { text: 'Cancelar', style: 'cancel' },
              {
                text: 'Reemplazar',
                onPress: async () => {
                  if (documentoExistente.id) {
                    await perfilAPI.actualizarDocumento(documentoExistente.id, archivo);
                    Alert.alert('Éxito', 'Documento actualizado. Está en proceso de verificación.');
                    await cargarDatos();
                  }
                }
              }
            ]
          );
        } else {
          // Si es opcional, actualizar directamente
          if (documentoExistente.id) {
            await perfilAPI.actualizarDocumento(documentoExistente.id, archivo);
            Alert.alert('Éxito', 'Documento actualizado correctamente.');
            await cargarDatos();
          }
        }
      } else {
        // Subir nuevo documento (CORREGIDO: orden de parámetros)
        await documentosAPI.subirDocumento(archivo, tipoDocumento.key);
        Alert.alert('Éxito', 'Documento subido correctamente.');
        await cargarDatos();
      }

    } catch (error) {
      console.error('❌ Error con documento (detalles):', {
        error: error,
        message: error instanceof Error ? error.message : 'Error desconocido',
        tipo: tipoDocumento.key,
      });
      Alert.alert('Error', `No se pudo subir el documento ${tipoDocumento.label}. Por favor, inténtalo de nuevo.`);
    } finally {
      setSaving(false);
    }
  };

  // Función helper para abrir ImagePicker y manejar documentos
  const abrirGaleriaParaDocumento = async (tipoDocumento: TipoDocumento) => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.9,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        // Preparar archivo correctamente para React Native
        const asset = result.assets[0];
        if (!asset || !asset.uri) {
          Alert.alert('Error', 'La imagen seleccionada no es válida');
          return;
        }

        const archivo = {
          uri: asset.uri,
          type: asset.mimeType || asset.type || 'image/jpeg',
          name: asset.fileName || `documento_${tipoDocumento.key}_${Date.now()}.jpg`,
          fileName: asset.fileName || `documento_${tipoDocumento.key}_${Date.now()}.jpg`,
          fileType: asset.mimeType || asset.type || 'image/jpeg',
        };

        await manejarSubidaDocumento({ key: tipoDocumento.key, label: tipoDocumento.label }, archivo);
      }
    } catch (error) {
      console.error('Error al abrir galería:', error);
      Alert.alert('Error', 'No se pudo abrir la galería de fotos.');
    }
  };

  // Función helper para abrir ImagePicker y manejar foto de perfil
  const abrirGaleriaParaFotoPerfil = async () => {
    try {
      // Solicitar permisos
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        Alert.alert('Permisos Necesarios', 'Necesitas permitir el acceso a la galería para subir fotos.');
        return;
      }

      // Abrir selector de imágenes
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1], // Cuadrado para foto de perfil
        quality: 0.8,
      });

      if (!result.canceled) {
        await manejarSubidaFoto(result);
      }
    } catch (error) {
      console.error('Error al abrir galería:', error);
      Alert.alert('Error', 'No se pudo abrir la galería de fotos.');
    }
  };

  const abrirModalDocumento = (documento: DocumentoLocal | null, esNuevo: boolean) => {
    setModalDocumento({
      visible: true,
      documento,
      esNuevo,
    });
  };

  const cerrarModalDocumento = () => {
    setModalDocumento({
      visible: false,
      documento: null,
      esNuevo: false,
    });
  };

  const guardarDatosPersonales = async () => {
    try {
      setSaving(true);

      const datos: ActualizarPerfilRequest = {
        // Solo incluir campos que han cambiado
        ...(datosPersonales.nombre && { nombre: datosPersonales.nombre }),
        ...(datosPersonales.telefono && { telefono: datosPersonales.telefono }),
        ...(datosPersonales.descripcion && { descripcion: datosPersonales.descripcion }),
        // Solo incluir dirección para mecánicos a domicilio
        ...(estadoProveedor?.tipo_proveedor === 'mecanico' && datosPersonales.direccion && { direccion: datosPersonales.direccion }),
      };

      await perfilAPI.actualizarDatosProveedor(datos);

      Alert.alert('Éxito', 'Datos personales actualizados correctamente.');
      setHasChanges(false);

      // Refrescar estado del proveedor
      await refrescarEstadoProveedor();

    } catch (error: any) {
      console.error('Error actualizando datos:', error);
      Alert.alert(
        'Error',
        error.response?.data?.error || 'No se pudieron actualizar los datos.'
      );
    } finally {
      setSaving(false);
    }
  };

  const formatearFecha = (fecha: string) => {
    try {
      return new Date(fecha).toLocaleDateString('es-CL', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return 'Fecha inválida';
    }
  };

  const obtenerColorEstado = (verificado: boolean | undefined) => {
    return verificado ? I.semanticUp : I.accentYellow;
  };

  const obtenerTextoEstado = (verificado: boolean | undefined) => {
    return verificado ? 'Verificado' : 'Pendiente';
  };

  const getDocumentosObligatorios = () => {
    return (documentos || []).filter(doc => doc?.esObligatorio &&
      getDocumentosSegunTipoProveedor().includes(doc?.tipo_documento)
    );
  };

  const getDocumentosOpcionales = () => {
    return (documentos || []).filter(doc => !doc?.esObligatorio &&
      getDocumentosSegunTipoProveedor().includes(doc?.tipo_documento)
    );
  };

  const getTiposDocumentoFaltantes = () => {
    const tiposExistentes = (documentos || []).map(doc => doc?.tipo_documento).filter(Boolean);
    return Object.keys(tiposDocumentoInfo).filter(tipo => !tiposExistentes.includes(tipo));
  };

  // Filtrar documentos según el tipo de proveedor
  const getDocumentosSegunTipoProveedor = () => {
    const tipoProveedor = estadoProveedor?.tipo_proveedor;

    // Documentos comunes a todos los tipos de proveedor
    const documentosComunes = ['dni_frontal', 'dni_trasero', 'licencia_conducir', 'rut_fiscal'];

    // Documentos específicos según el tipo de proveedor
    const documentosEspecificos = {
      'taller': ['foto_fachada', 'foto_interior', 'foto_equipos'],
      'mecanico': ['foto_vehiculo', 'foto_herramientas'] // Mecánico a domicilio necesita foto del vehículo y herramientas
    };

    const documentosPermitidos = [
      ...documentosComunes,
      ...(documentosEspecificos[tipoProveedor as keyof typeof documentosEspecificos] || [])
    ];

    return documentosPermitidos;
  };

  const getTiposDocumentoFaltantesSegunTipo = () => {
    const tiposExistentes = (documentos || []).map(doc => doc?.tipo_documento).filter(Boolean);
    const documentosPermitidos = getDocumentosSegunTipoProveedor();

    const faltantes = documentosPermitidos.filter(tipo => {
      const tipoInfo = tiposDocumentoInfo[tipo as keyof typeof tiposDocumentoInfo];
      const noExiste = !tiposExistentes.includes(tipo);
      const tieneInfo = !!tipoInfo;

      if (__DEV__) {
        console.log(`📄 Tipo: ${tipo}, Existe: ${!noExiste}, TieneInfo: ${tieneInfo}, Permitido: ${documentosPermitidos.includes(tipo)}`);
      }

      return noExiste && tieneInfo;
    });

    if (__DEV__) {
      console.log('📊 Documentos permitidos:', documentosPermitidos);
      console.log('📊 Tipos existentes:', tiposExistentes);
      console.log('📊 Documentos faltantes:', faltantes);
      console.log('📊 Tipo proveedor:', estadoProveedor?.tipo_proveedor);
    }

    return faltantes;
  };

  const renderDocumentoItem = (documento: DocumentoLocal) => (
    <View key={documento.id} style={styles.documentCard}>
      <View style={styles.documentCardHeader}>
        <View style={styles.documentInfo}>
          <InstitutionalIcon name={documento.icono as any} size={24} color="#2A4065"  strokeWidth={ICON_STROKE_WIDTH} />
          <View style={styles.documentTextContainer}>
            <Text style={styles.documentName}>{documento.nombre_amigable || documento.tipo_documento}</Text>
            <Text style={styles.documentDescription}>{documento.descripcion || ''}</Text>
          </View>
        </View>
        <View style={styles.documentCardStatus}>
          <View style={[styles.statusBadge, { backgroundColor: obtenerColorEstado(documento.verificado) }]}>
            <Text style={styles.statusBadgeText}>{obtenerTextoEstado(documento.verificado)}</Text>
          </View>
        </View>
      </View>

      <View style={styles.documentCardActions}>
        <Text style={styles.documentDate}>
          Subido: {formatearFecha(documento.fecha_subida || '')}
        </Text>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => abrirGaleriaParaDocumento({ key: documento.tipo_documento, label: documento.nombre_amigable || documento.tipo_documento } as TipoDocumento)}
        >
          <InstitutionalIcon name="edit" size={16} color="#2A4065"  strokeWidth={ICON_STROKE_WIDTH} />
          <Text style={styles.actionButtonText}>
            Actualizar
          </Text>
        </TouchableOpacity>
      </View>

      {documento.esObligatorio && !documento.verificado && (
        <View style={styles.verificationNotice}>
          <InstitutionalIcon name="info" size={16} color="#f39c12"  strokeWidth={ICON_STROKE_WIDTH} />
          <Text style={styles.verificationNoticeText}>
            Documento en proceso de verificación por el administrador.
          </Text>
        </View>
      )}
    </View>
  );

  const renderTipoDocumentoFaltante = (tipoDocumento: string) => {
    const info = tiposDocumentoInfo[tipoDocumento as keyof typeof tiposDocumentoInfo];

    return (
      <TouchableOpacity
        key={tipoDocumento}
        style={styles.missingDocumentCard}
        onPress={() => abrirGaleriaParaDocumento({ key: tipoDocumento, label: info.nombre } as TipoDocumento)}
      >
        <InstitutionalIcon name={info.icono as any} size={24} color="#95a5a6"  strokeWidth={ICON_STROKE_WIDTH} />
        <Text style={styles.missingDocumentTitle}>
          {info.nombre}
        </Text>
        <Text style={styles.missingDocumentSubtitle}>
          {info.descripcion}
        </Text>
        <Text style={styles.uploadHint}>
          Tocar para subir
        </Text>
      </TouchableOpacity>
    );
  };

  const screenShell = (children: React.ReactNode) => (
    <View style={styles.screenRoot}>
      <LinearGradient
        colors={BLANK_GLASS.gradient}
        locations={BLANK_GLASS.gradientLocations}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={[styles.container, { backgroundColor: 'transparent' }]} edges={['left', 'right', 'bottom']}>
        {children}
      </SafeAreaView>
    </View>
  );

  if (loading) {
    return screenShell(
      <>
        <Header title="Gestionar perfil" showBack onBackPress={() => router.back()} />
        <LoadingSpinner />
      </>
    );
  }

  return screenShell(
    <>
      <Header title="Gestionar perfil" showBack onBackPress={() => router.back()} />
      <ScrollView
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
      >

        {/* Foto de perfil */}
        <View style={styles.fotoPerfilContainer}>
          <TouchableOpacity style={styles.fotoPerfilTouchable} onPress={abrirGaleriaParaFotoPerfil}>
            {fotoPerfilUri ? (
              <Image source={{ uri: fotoPerfilUri }} style={[styles.fotoPerfil, { borderColor: borderMain }]} />
            ) : (
              <View style={[styles.fotoPerfilPlaceholder, { backgroundColor: neutralGray100, borderColor: borderMain }]}>
                <InstitutionalIcon name="person" size={50} color={textTertiary}  strokeWidth={ICON_STROKE_WIDTH} />
              </View>
            )}
            <View style={[styles.fotoPerfilOverlay, { backgroundColor: I.primary }]}>
              {uploadingPhoto ? (
                <ActivityIndicator size="small" color={I.onPrimary} />
              ) : (
                <InstitutionalIcon name="camera-alt" size={20} color={I.onPrimary} strokeWidth={ICON_STROKE_WIDTH} />
              )}
            </View>
          </TouchableOpacity>
          <Text style={styles.fotoPerfilTexto}>Toca para cambiar foto</Text>
        </View>

        <View style={styles.tabsOuterInstitutional}>
          <InstitutionalScreenTabs
            activeKey={tabActiva}
            onChange={setTabActiva}
            tabs={[
              {
                key: 'datos',
                label: 'Datos personales',
                leading: (
                  <InstitutionalIcon
                    name="person"
                    size={18}
                    color={tabActiva === 'datos' ? I.onPrimary : I.muted}
                   strokeWidth={ICON_STROKE_WIDTH} />
                ),
              },
              {
                key: 'documentos',
                label: 'Documentos',
                leading: (
                  <InstitutionalIcon
                    name="description"
                    size={18}
                    color={tabActiva === 'documentos' ? I.onPrimary : I.muted}
                   strokeWidth={ICON_STROKE_WIDTH} />
                ),
              },
            ]}
          />
        </View>

        {/* Contenido según tab activa */}
        {tabActiva === 'datos' && (
          <View style={styles.contentContainer}>
            <View style={styles.formContainer}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Nombre Completo</Text>
                <TextInput
                  style={styles.formInput}
                  value={datosPersonales.nombre}
                  onChangeText={(value) => {
                    setDatosPersonales(prev => ({ ...prev, nombre: value }));
                    setHasChanges(true);
                  }}
                  placeholder="Ingresa tu nombre completo"
                  placeholderTextColor={textTertiary}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Teléfono</Text>
                <TextInput
                  style={styles.formInput}
                  value={datosPersonales.telefono}
                  onChangeText={(value) => {
                    setDatosPersonales(prev => ({ ...prev, telefono: value }));
                    setHasChanges(true);
                  }}
                  placeholder="Ingresa tu teléfono"
                  keyboardType="phone-pad"
                  placeholderTextColor={textTertiary}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Email</Text>
                <View style={styles.formInputReadOnly}>
                  <InstitutionalIcon
                    name="lock"
                    size={18}
                    color={textTertiary}
                    style={styles.lockIcon}
                   strokeWidth={ICON_STROKE_WIDTH} />
                  <Text
                    style={styles.formInputReadOnlyText}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {datosPersonales.email || 'Sin email registrado'}
                  </Text>
                </View>
                <Text style={[styles.formHint, { color: textTertiary }]}>
                  El email no se puede modificar desde la aplicación
                </Text>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Descripción</Text>
                <TextInput
                  style={[styles.formInput, styles.formInputMultiline]}
                  value={datosPersonales.descripcion}
                  onChangeText={(value) => {
                    setDatosPersonales(prev => ({ ...prev, descripcion: value }));
                    setHasChanges(true);
                  }}
                  placeholder="Describe tu experiencia y servicios"
                  multiline
                  numberOfLines={4}
                  placeholderTextColor={textTertiary}
                />
              </View>

              {/* Campo de dirección solo para mecánicos a domicilio */}
              {estadoProveedor?.tipo_proveedor === 'mecanico' && (
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Dirección</Text>
                  <TextInput
                    style={styles.formInput}
                    value={datosPersonales.direccion}
                    onChangeText={(value) => {
                      setDatosPersonales(prev => ({ ...prev, direccion: value }));
                      setHasChanges(true);
                    }}
                    placeholder="Dirección de tu base de operaciones"
                    placeholderTextColor={textTertiary}
                  />
                  <Text style={[styles.formHint, { color: textTertiary, marginTop: 6 }]}>
                    Los clientes te buscan por distancia. Guarda el perfil y, además, define el punto en el mapa.
                  </Text>
                  <TouchableOpacity
                    style={styles.linkUbicacionBtn}
                    onPress={() => router.push('/actualizar-ubicacion')}
                    activeOpacity={0.8}
                  >
                    <InstitutionalIcon name="my-location" size={20} color={I.ink} strokeWidth={ICON_STROKE_WIDTH} />
                    <Text style={styles.linkUbicacionText}>
                      Mi ubicación en mapa (dirección o GPS)
                    </Text>
                    <InstitutionalIcon name="chevron-right" size={22} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
                  </TouchableOpacity>
                </View>
              )}

              {/* Información para talleres */}
              {estadoProveedor?.tipo_proveedor === 'taller' && (
                <View style={styles.infoCard}>
                  <InstitutionalIcon name="info" size={20} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
                  <Text style={styles.infoText}>
                    Para gestionar la dirección de tu taller, ve a la sección "Servicios y Cobertura" → "Gestionar Taller"
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {tabActiva === 'documentos' && (
          <View style={styles.documentsTabRoot}>
            <View style={styles.documentsTabTitleWrap}>
              <Text style={styles.documentsTabTitle}>Documentos de verificación</Text>
            </View>

            {/* Estadísticas de documentos */}
            <View style={styles.documentsStats}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{getDocumentosObligatorios().length}</Text>
                <Text style={styles.statLabel}>Obligatorios</Text>
                <InstitutionalIcon name="security" size={16} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{getDocumentosOpcionales().length}</Text>
                <Text style={styles.statLabel}>Opcionales</Text>
                <InstitutionalIcon name="star" size={16} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{getTiposDocumentoFaltantesSegunTipo().length}</Text>
                <Text style={styles.statLabel}>Disponibles</Text>
                <InstitutionalIcon name="add-circle" size={16} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
              </View>
            </View>

            {/* Documentos Obligatorios - Sección rediseñada */}
            <View style={styles.documentsSection}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionHeaderLeft}>
                  <InstitutionalIcon name="security" size={22} color={I.ink} strokeWidth={ICON_STROKE_WIDTH} />
                  <Text style={styles.sectionTitle}>Documentos Obligatorios</Text>
                </View>
                <View style={styles.sectionHeaderRight}>
                  <View style={styles.sectionBadge}>
                    <Text style={styles.sectionBadgeText}>Requeridos</Text>
                  </View>
                </View>
              </View>

              <Text style={styles.sectionDescription}>
                Estos documentos son necesarios para la verificación de tu cuenta y poder aparecer en la plataforma.
              </Text>

              {getDocumentosObligatorios().length > 0 ? (
                <View style={styles.documentsGrid}>
                  {getDocumentosObligatorios().map(documento => (
                    <View key={documento.id} style={styles.documentCard}>
                      <View style={styles.documentCardHeader}>
                        <View style={styles.documentIconContainer}>
                          <InstitutionalIcon name={documento.icono as any} size={22} color={I.ink} strokeWidth={ICON_STROKE_WIDTH} />
                        </View>
                        <View style={styles.documentCardStatus}>
                          <View style={styles.statusBadge}>
                            <InstitutionalIcon
                              name={documento.verificado ? 'check-circle' : 'schedule'}
                              size={12}
                              color={documento.verificado ? success500 : warning500}
                              strokeWidth={ICON_STROKE_WIDTH}
                            />
                            <Text
                              style={[
                                styles.statusBadgeText,
                                { color: documento.verificado ? success500 : warning500 },
                              ]}
                            >
                              {documento.verificado ? 'Verificado' : 'Pendiente'}
                            </Text>
                          </View>
                        </View>
                      </View>

                      <View style={styles.documentCardContent}>
                        <Text style={styles.documentName}>{documento.nombre_amigable}</Text>
                        <Text style={styles.documentDescription}>{documento.descripcion}</Text>

                        <View style={styles.documentMeta}>
                          <InstitutionalIcon name="event" size={14} color={textTertiary} strokeWidth={ICON_STROKE_WIDTH} />
                          <Text style={styles.documentDate}>
                            {formatearFecha(documento.fecha_subida || '')}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.documentCardActions}>
                        <TouchableOpacity
                          style={[styles.actionButton, styles.actionButtonPrimary]}
                          onPress={() => abrirGaleriaParaDocumento({
                            key: documento.tipo_documento,
                            label: documento.nombre_amigable
                          } as TipoDocumento)}
                        >
                          <InstitutionalIcon name="camera-alt" size={16} color={I.onPrimary} strokeWidth={ICON_STROKE_WIDTH} />
                          <Text style={[styles.actionButtonText, styles.actionButtonPrimaryText]}>Actualizar</Text>
                        </TouchableOpacity>
                      </View>

                      {documento.esObligatorio && !documento.verificado && (
                        <View style={styles.verificationNotice}>
                          <InstitutionalIcon name="info" size={14} color={warning500} strokeWidth={ICON_STROKE_WIDTH} />
                          <Text style={styles.verificationNoticeText}>
                            En proceso de verificación
                          </Text>
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.emptyStateContainer}>
                  <InstitutionalIcon name="warning" size={48} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
                  <Text style={styles.emptyStateTitle}>Sin documentos obligatorios</Text>
                  <Text style={styles.emptyStateDescription}>
                    Aún no has subido los documentos obligatorios para tu verificación.
                  </Text>
                  <TouchableOpacity style={styles.emptyStateAction}>
                    <InstitutionalIcon name="upload" size={16} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
                    <Text style={styles.emptyStateActionText}>Subir documentos</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Documentos Opcionales - Sección rediseñada */}
            <View style={styles.documentsSection}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionHeaderLeft}>
                  <InstitutionalIcon name="star" size={22} color={I.ink} strokeWidth={ICON_STROKE_WIDTH} />
                  <Text style={styles.sectionTitle}>
                    {estadoProveedor?.tipo_proveedor === 'taller'
                      ? 'Documentos del Establecimiento'
                      : 'Documentos del Vehículo'
                    }
                  </Text>
                </View>
                <View style={styles.sectionHeaderRight}>
                  <View style={styles.sectionBadge}>
                    <Text style={styles.sectionBadgeText}>Opcionales</Text>
                  </View>
                </View>
              </View>

              <Text style={styles.sectionDescription}>
                {estadoProveedor?.tipo_proveedor === 'taller'
                  ? 'Estas fotos ayudan a mostrar tu instalación y generar confianza en los clientes.'
                  : 'Estas fotos muestran tu vehículo de trabajo y generan confianza en los clientes.'
                }
              </Text>

              {getDocumentosOpcionales().length > 0 ? (
                <View style={styles.documentsGrid}>
                  {getDocumentosOpcionales().map(documento => (
                    <View key={documento.id} style={styles.documentCard}>
                      <View style={styles.documentCardHeader}>
                        <View style={styles.documentIconContainer}>
                          <InstitutionalIcon name={documento.icono as any} size={22} color={I.ink} strokeWidth={ICON_STROKE_WIDTH} />
                        </View>
                        <View style={styles.documentCardStatus}>
                          <View style={styles.statusBadge}>
                            <InstitutionalIcon name="star" size={12} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
                            <Text style={[styles.statusBadgeText, { color: I.muted }]}>Opcional</Text>
                          </View>
                        </View>
                      </View>

                      <View style={styles.documentCardContent}>
                        <Text style={styles.documentName}>{documento.nombre_amigable}</Text>
                        <Text style={styles.documentDescription}>{documento.descripcion}</Text>

                        <View style={styles.documentMeta}>
                          <InstitutionalIcon name="event" size={14} color={textTertiary} strokeWidth={ICON_STROKE_WIDTH} />
                          <Text style={styles.documentDate}>
                            {formatearFecha(documento.fecha_subida || '')}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.documentCardActions}>
                        <TouchableOpacity
                          style={[styles.actionButton, styles.actionButtonSecondary]}
                          onPress={() => abrirGaleriaParaDocumento({
                            key: documento.tipo_documento,
                            label: documento.nombre_amigable
                          } as TipoDocumento)}
                        >
                          <InstitutionalIcon name="camera-alt" size={16} color={I.ink} strokeWidth={ICON_STROKE_WIDTH} />
                          <Text style={[styles.actionButtonText, styles.actionButtonSecondaryText]}>
                            Actualizar
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <>
                  {/* Mostrar documentos disponibles para agregar si no hay documentos opcionales subidos */}
                  {getTiposDocumentoFaltantesSegunTipo().filter(tipo => {
                    const info = tiposDocumentoInfo[tipo as keyof typeof tiposDocumentoInfo];
                    return info && !info.esObligatorio;
                  }).length > 0 ? (
                    <View style={styles.documentsGrid}>
                      {getTiposDocumentoFaltantesSegunTipo()
                        .filter(tipo => {
                          const info = tiposDocumentoInfo[tipo as keyof typeof tiposDocumentoInfo];
                          return info && !info.esObligatorio;
                        })
                        .map(tipoDocumento => {
                          const info = tiposDocumentoInfo[tipoDocumento as keyof typeof tiposDocumentoInfo];
                          return (
                            <TouchableOpacity
                              key={tipoDocumento}
                              style={styles.documentCard}
                              onPress={() => abrirGaleriaParaDocumento({
                                key: tipoDocumento,
                                label: info.nombre
                              } as TipoDocumento)}
                            >
                              <View style={styles.documentCardHeader}>
                                <View style={styles.documentIconContainer}>
                                  <InstitutionalIcon name={info.icono as any} size={22} color={I.ink} strokeWidth={ICON_STROKE_WIDTH} />
                                </View>
                                <View style={styles.documentCardStatus}>
                                  <View style={styles.statusBadge}>
                                    <InstitutionalIcon name="add" size={12} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
                                    <Text style={[styles.statusBadgeText, { color: I.primary }]}>Agregar</Text>
                                  </View>
                                </View>
                              </View>

                              <View style={styles.documentCardContent}>
                                <Text style={styles.documentName}>{info.nombre}</Text>
                                <Text style={styles.documentDescription}>{info.descripcion}</Text>
                              </View>

                              <View style={styles.documentCardActions}>
                                <View style={styles.uploadPrompt}>
                                  <InstitutionalIcon name="cloud-upload" size={16} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
                                  <Text style={styles.uploadPromptText}>Tocar para subir</Text>
                                </View>
                              </View>
                            </TouchableOpacity>
                          );
                        })}
                    </View>
                  ) : (
                    <View style={styles.emptyStateContainer}>
                      <InstitutionalIcon name="add-photo-alternate" size={48} color={textTertiary} strokeWidth={ICON_STROKE_WIDTH} />
                      <Text style={styles.emptyStateTitle}>
                        {estadoProveedor?.tipo_proveedor === 'taller'
                          ? 'Sin fotos del taller'
                          : 'Sin fotos del vehículo'
                        }
                      </Text>
                      <Text style={styles.emptyStateDescription}>
                        Agrega fotos para generar más confianza en los clientes.
                      </Text>
                    </View>
                  )}
                </>
              )}
            </View>

            {/* Documentos Disponibles - Solo mostrar documentos obligatorios faltantes */}
            {getTiposDocumentoFaltantesSegunTipo().filter(tipo => {
              const info = tiposDocumentoInfo[tipo as keyof typeof tiposDocumentoInfo];
              return info && info.esObligatorio;
            }).length > 0 && (
                <View style={styles.documentsSection}>
                  <View style={styles.sectionHeader}>
                    <View style={styles.sectionHeaderLeft}>
                      <InstitutionalIcon name="add-circle" size={22} color={I.ink} strokeWidth={ICON_STROKE_WIDTH} />
                      <Text style={styles.sectionTitle}>Documentos Disponibles</Text>
                    </View>
                    <View style={styles.sectionHeaderRight}>
                      <View style={styles.sectionBadge}>
                        <Text style={styles.sectionBadgeText}>Disponibles</Text>
                      </View>
                    </View>
                  </View>

                  <Text style={styles.sectionDescription}>
                    Puedes subir estos documentos adicionales para completar tu perfil.
                  </Text>

                  <View style={styles.documentsGrid}>
                    {getTiposDocumentoFaltantesSegunTipo()
                      .filter(tipo => {
                        const info = tiposDocumentoInfo[tipo as keyof typeof tiposDocumentoInfo];
                        return info && info.esObligatorio;
                      })
                      .map(tipoDocumento => {
                        const info = tiposDocumentoInfo[tipoDocumento as keyof typeof tiposDocumentoInfo];
                        return (
                          <TouchableOpacity
                            key={tipoDocumento}
                            style={styles.documentCard}
                            onPress={() => abrirGaleriaParaDocumento({
                              key: tipoDocumento,
                              label: info.nombre
                            } as TipoDocumento)}
                          >
                            <View style={styles.documentCardHeader}>
                              <View style={styles.documentIconContainer}>
                                <InstitutionalIcon name={info.icono as any} size={22} color={I.ink} strokeWidth={ICON_STROKE_WIDTH} />
                              </View>
                              <View style={styles.documentCardStatus}>
                                <View style={styles.statusBadge}>
                                  <InstitutionalIcon name="add" size={12} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
                                  <Text style={[styles.statusBadgeText, { color: I.primary }]}>Agregar</Text>
                                </View>
                              </View>
                            </View>

                            <View style={styles.documentCardContent}>
                              <Text style={styles.documentName}>{info.nombre}</Text>
                              <Text style={styles.documentDescription}>{info.descripcion}</Text>
                            </View>

                            <View style={styles.documentCardActions}>
                              <View style={styles.uploadPrompt}>
                                <InstitutionalIcon name="cloud-upload" size={16} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
                                <Text style={styles.uploadPromptText}>Tocar para subir</Text>
                              </View>
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                  </View>
                </View>
              )}
          </View>
        )}
      </ScrollView>

      {/* Botón guardar datos personales */}
      {hasChanges && tabActiva === 'datos' && (
        <View style={[styles.saveContainer, { paddingBottom: insets.bottom + SPACING.md, borderTopColor: I.hairline }]}>
          <TouchableOpacity
            style={[
              styles.saveButton,
              { backgroundColor: I.primary },
              saving && styles.saveButtonDisabled,
            ]}
            onPress={guardarDatosPersonales}
            disabled={saving}
            activeOpacity={0.88}
          >
            {saving ? (
              <ActivityIndicator size="small" color={I.onPrimary} />
            ) : (
              <InstitutionalIcon name="save" size={20} color={I.onPrimary} strokeWidth={ICON_STROKE_WIDTH} />
            )}
            <Text style={[styles.saveButtonText, { color: I.onPrimary }]}>
              {saving ? 'Guardando…' : 'Guardar cambios'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </>
  );
}

// Estilos alineados a tokens institucionales / referencia Coinbase (cards, hairline, pills)
const createStyles = () => {
  const Ig = COLORS.institutional;
  const spacingXs = SPACING?.xs || 4;
  const spacingSm = SPACING?.sm || 8;
  const spacingMd = SPACING?.md || 16;
  const spacingLg = SPACING?.lg || 24;
  const containerHorizontal = GLASS_INSET;
  const fontSizeBase = TYPOGRAPHY?.fontSize?.base || 14;
  const fontSizeMd = TYPOGRAPHY?.fontSize?.md || 16;
  const fontSizeLg = TYPOGRAPHY?.fontSize?.lg || 18;
  const fontSizeXl = TYPOGRAPHY?.fontSize?.xl || 20;
  const fontWeightMedium = TYPOGRAPHY?.fontWeight?.medium || '500';
  const fontWeightSemibold = TYPOGRAPHY?.fontWeight?.semibold || '600';
  const fontWeightBold = TYPOGRAPHY?.fontWeight?.bold || '700';
  const radiusMd = BORDERS?.radius?.md || 8;
  const radiusLg = BORDERS?.radius?.lg || 12;
  const radiusXl = BORDERS?.radius?.xl || 16;
  const radius2xl = BORDERS?.radius?.['2xl'] || 20;
  const shadowSm = SHADOWS?.sm || { shadowColor: '#000000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3, elevation: 2 };
  const shadowMd = SHADOWS?.md || { shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 };

  return StyleSheet.create({
    screenRoot: {
      flex: 1,
    },
    container: {
      flex: 1,
    },
    scrollContainer: {
      flex: 1,
    },
    tabsOuterInstitutional: {
      marginHorizontal: containerHorizontal,
      marginTop: spacingLg,
    },
    contentContainer: {
      marginTop: spacingLg,
      paddingHorizontal: containerHorizontal,
    },
    formContainer: {
      borderRadius: BORDERS.radius.lg,
      padding: spacingLg,
      borderWidth: BORDERS.width.thin,
      borderColor: Ig.hairline,
      backgroundColor: Ig.canvas,
      ...SHADOWS.editorial,
    },
    formGroup: {
      marginBottom: spacingLg,
    },
    formLabel: {
      fontSize: TYPOGRAPHY.fontSize.xs,
      fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
      fontWeight: TYPOGRAPHY.fontWeight.semibold as '600',
      letterSpacing: TYPOGRAPHY.letterSpacing.wide,
      textTransform: 'uppercase',
      color: Ig.muted,
      marginBottom: spacingSm,
    },
    formInput: {
      borderWidth: BORDERS.width.thin,
      borderRadius: BORDERS.radius.md,
      paddingHorizontal: spacingMd,
      paddingVertical: 14,
      fontSize: TYPOGRAPHY.fontSize.md,
      fontFamily: TYPOGRAPHY.fontFamily.sansRegular,
      backgroundColor: Ig.surfaceSoft,
      borderColor: Ig.hairline,
      color: Ig.ink,
    },
    formInputMultiline: {
      minHeight: 80,
      textAlignVertical: 'top',
    },
    formInputDisabled: {
      // backgroundColor y color se aplican dinámicamente
    },
    formInputReadOnly: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: BORDERS.width.thin,
      borderRadius: BORDERS.radius.md,
      paddingHorizontal: spacingMd,
      paddingVertical: spacingSm + 2,
      minHeight: 48,
      backgroundColor: Ig.surfaceSoft,
      borderColor: Ig.hairline,
    },
    formInputReadOnlyText: {
      flex: 1,
      fontSize: TYPOGRAPHY.fontSize.md,
      fontFamily: TYPOGRAPHY.fontFamily.sansRegular,
      color: Ig.body,
    },
    lockIcon: {
      marginRight: spacingSm,
    },
    formHint: {
      fontSize: TYPOGRAPHY.fontSize.xs,
      fontFamily: TYPOGRAPHY.fontFamily.sansRegular,
      color: Ig.muted,
      marginTop: spacingXs,
      lineHeight: TYPOGRAPHY.fontSize.xs * 1.45,
    },
    linkUbicacionBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginTop: spacingMd,
      paddingVertical: 12,
      paddingHorizontal: spacingMd,
      borderRadius: BORDERS.radius.pill,
      borderWidth: BORDERS.width.thin,
      borderColor: Ig.hairline,
      backgroundColor: Ig.surfaceStrong,
      minHeight: 44,
    },
    linkUbicacionText: {
      flex: 1,
      fontSize: TYPOGRAPHY.fontSize.sm,
      fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
      fontWeight: TYPOGRAPHY.fontWeight.semibold as '600',
      color: Ig.ink,
    },
    saveContainer: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      paddingHorizontal: containerHorizontal,
      paddingTop: spacingMd,
      backgroundColor: Ig.canvas,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: Ig.hairline,
      ...SHADOWS.editorial,
    } as any,
    saveButton: {
      flexDirection: 'row',
      borderRadius: BORDERS.radius.pill,
      paddingVertical: 12,
      paddingHorizontal: spacingLg,
      minHeight: 44,
      justifyContent: 'center',
      alignItems: 'center',
      gap: spacingSm,
    },
    saveButtonDisabled: {
      opacity: 0.6,
    },
    saveButtonText: {
      fontSize: TYPOGRAPHY.fontSize.md,
      fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
      fontWeight: TYPOGRAPHY.fontWeight.semibold as '600',
    },
    fotoPerfilContainer: {
      alignItems: 'center',
      marginVertical: spacingLg,
      paddingHorizontal: containerHorizontal,
    },
    fotoPerfilTouchable: {
      position: 'relative',
      marginBottom: spacingSm,
    },
    fotoPerfil: {
      width: 100,
      height: 100,
      borderRadius: 50,
      borderWidth: 3,
    },
    fotoPerfilPlaceholder: {
      width: 100,
      height: 100,
      borderRadius: 50,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 3,
    },
    fotoPerfilOverlay: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      width: 32,
      height: 32,
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 2,
      borderColor: Ig.canvas,
    },
    fotoPerfilTexto: {
      fontSize: TYPOGRAPHY.fontSize.xs,
      fontFamily: TYPOGRAPHY.fontFamily.sansRegular,
      color: Ig.muted,
      textAlign: 'center',
    },
    documentsTabRoot: {
      width: '100%',
      overflow: 'hidden',
    },
    documentsTabTitleWrap: {
      paddingHorizontal: containerHorizontal,
      marginTop: spacingMd,
      marginBottom: spacingMd,
    },
    documentsTabTitle: {
      fontSize: TYPOGRAPHY.fontSize.lg,
      fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
      fontWeight: TYPOGRAPHY.fontWeight.semibold as '600',
      color: Ig.ink,
    },
    documentsStats: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      alignItems: 'stretch',
      marginHorizontal: containerHorizontal,
      marginBottom: spacingMd,
      borderRadius: BORDERS.radius.lg,
      paddingVertical: spacingMd,
      paddingHorizontal: spacingSm,
      borderWidth: BORDERS.width.thin,
      borderColor: Ig.hairline,
      backgroundColor: Ig.canvas,
      ...SHADOWS.editorial,
    },
    statItem: {
      alignItems: 'center',
    },
    statNumber: {
      fontSize: TYPOGRAPHY.fontSize.xl,
      fontFamily: TYPOGRAPHY.fontFamily.monoMedium,
      fontWeight: TYPOGRAPHY.fontWeight.semibold as '600',
      color: Ig.ink,
      marginBottom: spacingXs,
    },
    statLabel: {
      fontSize: TYPOGRAPHY.fontSize.xs,
      fontFamily: TYPOGRAPHY.fontFamily.sansRegular,
      color: Ig.muted,
      textAlign: 'center',
    },
    statDivider: {
      width: StyleSheet.hairlineWidth,
      alignSelf: 'stretch',
      backgroundColor: Ig.hairline,
      marginHorizontal: spacingSm + 2,
    },
    documentsSection: {
      marginBottom: spacingLg,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacingSm + 2,
      paddingHorizontal: containerHorizontal,
      maxWidth: '100%',
    },
    sectionHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
      minWidth: 0,
    },
    sectionTitle: {
      fontSize: TYPOGRAPHY.fontSize.md,
      fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
      fontWeight: TYPOGRAPHY.fontWeight.semibold as '600',
      color: Ig.ink,
      marginLeft: spacingSm + 2,
      flexShrink: 1,
    },
    sectionHeaderRight: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    sectionBadge: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: BORDERS.radius.pill,
      backgroundColor: Ig.surfaceStrong,
    },
    sectionBadgeText: {
      fontSize: 10,
      fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
      fontWeight: TYPOGRAPHY.fontWeight.semibold as '600',
      letterSpacing: TYPOGRAPHY.letterSpacing.wider,
      color: Ig.muted,
    },
    sectionDescription: {
      fontSize: TYPOGRAPHY.fontSize.sm,
      fontFamily: TYPOGRAPHY.fontFamily.sansRegular,
      color: Ig.muted,
      lineHeight: TYPOGRAPHY.fontSize.sm * 1.45,
      marginBottom: spacingMd - 2,
      paddingHorizontal: containerHorizontal,
    },
    documentsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      paddingHorizontal: containerHorizontal,
      rowGap: spacingMd,
      columnGap: spacingSm,
      maxWidth: '100%',
    },
    documentCard: {
      width: '47.5%',
      maxWidth: '47.5%',
      borderRadius: BORDERS.radius.lg,
      marginBottom: 0,
      borderWidth: BORDERS.width.thin,
      borderColor: Ig.hairline,
      backgroundColor: Ig.canvas,
      overflow: 'hidden',
      ...SHADOWS.editorial,
    },
    documentCardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: spacingSm + 4,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: Ig.hairline,
    },
    documentIconContainer: {
      width: 40,
      height: 40,
      borderRadius: BORDERS.radius.full,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: Ig.surfaceStrong,
    },
    documentCardStatus: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    statusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: BORDERS.radius.pill,
      backgroundColor: Ig.surfaceStrong,
      gap: 4,
    },
    statusBadgeText: {
      fontSize: TYPOGRAPHY.fontSize.xs,
      fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
      fontWeight: TYPOGRAPHY.fontWeight.semibold as '600',
    },
    documentCardContent: {
      padding: spacingSm + 4,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: Ig.hairline,
    },
    documentName: {
      fontSize: TYPOGRAPHY.fontSize.sm,
      fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
      fontWeight: TYPOGRAPHY.fontWeight.semibold as '600',
      color: Ig.ink,
      marginBottom: spacingXs,
    },
    documentDescription: {
      fontSize: TYPOGRAPHY.fontSize.xs,
      fontFamily: TYPOGRAPHY.fontFamily.sansRegular,
      color: Ig.muted,
      marginBottom: spacingSm,
      lineHeight: TYPOGRAPHY.fontSize.xs * 1.45,
    },
    documentMeta: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    documentDate: {
      fontSize: TYPOGRAPHY.fontSize.xs,
      fontFamily: TYPOGRAPHY.fontFamily.sansRegular,
      color: Ig.muted,
      marginLeft: spacingSm,
    },
    documentCardActions: {
      padding: spacingSm + 4,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: Ig.hairline,
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      paddingHorizontal: spacingMd,
      borderRadius: BORDERS.radius.pill,
      borderWidth: BORDERS.width.thin,
      gap: spacingSm,
      minHeight: 44,
    },
    actionButtonText: {
      fontSize: TYPOGRAPHY.fontSize.sm,
      fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
      fontWeight: TYPOGRAPHY.fontWeight.semibold as '600',
    },
    actionButtonPrimary: {
      backgroundColor: Ig.primary,
      borderColor: Ig.primary,
    },
    actionButtonPrimaryText: {
      color: Ig.onPrimary,
    },
    actionButtonSecondary: {
      backgroundColor: Ig.surfaceStrong,
      borderColor: Ig.hairline,
    },
    actionButtonSecondaryText: {
      color: Ig.ink,
    },
    verificationNotice: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacingSm + 2,
      paddingHorizontal: spacingSm + 4,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: Ig.hairline,
      backgroundColor: Ig.surfaceSoft,
    },
    verificationNoticeText: {
      fontSize: TYPOGRAPHY.fontSize.xs,
      fontFamily: TYPOGRAPHY.fontFamily.sansRegular,
      color: Ig.body,
      marginLeft: spacingSm,
      flex: 1,
    },
    emptyStateContainer: {
      alignItems: 'center',
      paddingVertical: spacingLg,
      paddingHorizontal: containerHorizontal,
    },
    emptyStateTitle: {
      fontSize: TYPOGRAPHY.fontSize.lg,
      fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
      fontWeight: TYPOGRAPHY.fontWeight.semibold as '600',
      color: Ig.ink,
      marginTop: spacingSm + 2,
    },
    emptyStateDescription: {
      fontSize: TYPOGRAPHY.fontSize.sm,
      fontFamily: TYPOGRAPHY.fontFamily.sansRegular,
      color: Ig.muted,
      marginTop: spacingXs,
      textAlign: 'center',
      lineHeight: TYPOGRAPHY.fontSize.sm * 1.45,
    },
    emptyStateAction: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: BORDERS.radius.pill,
      paddingVertical: 12,
      paddingHorizontal: spacingLg,
      marginTop: spacingLg,
      borderWidth: BORDERS.width.thin,
      borderColor: Ig.hairline,
      backgroundColor: Ig.surfaceStrong,
      gap: spacingSm,
      minHeight: 44,
    },
    emptyStateActionText: {
      fontSize: TYPOGRAPHY.fontSize.sm,
      fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
      fontWeight: TYPOGRAPHY.fontWeight.semibold as '600',
      color: Ig.primary,
    },
    infoCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      borderRadius: BORDERS.radius.md,
      padding: spacingMd,
      marginTop: spacingSm,
      borderWidth: BORDERS.width.thin,
      borderColor: Ig.hairline,
      backgroundColor: Ig.surfaceSoft,
    },
    infoText: {
      fontSize: TYPOGRAPHY.fontSize.sm,
      fontFamily: TYPOGRAPHY.fontFamily.sansRegular,
      color: Ig.body,
      marginLeft: spacingSm + 4,
      flex: 1,
      lineHeight: TYPOGRAPHY.fontSize.sm * 1.45,
    },
    uploadPrompt: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
      paddingHorizontal: spacingMd,
      borderRadius: BORDERS.radius.pill,
      borderWidth: BORDERS.width.thin,
      borderColor: Ig.hairline,
      backgroundColor: Ig.surfaceSoft,
      gap: spacingSm,
      minHeight: 44,
    },
    uploadPromptText: {
      fontSize: TYPOGRAPHY.fontSize.sm,
      fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
      fontWeight: TYPOGRAPHY.fontWeight.semibold as '600',
      color: Ig.muted,
    },
    // Nuevos estilos para documentos
    documentInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    documentTextContainer: {
      marginLeft: spacingMd,
      flex: 1,
    },
    missingDocumentCard: {
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacingLg,
      borderRadius: BORDERS.radius.lg,
      borderWidth: BORDERS.width.thin,
      borderColor: Ig.hairline,
      borderStyle: 'dashed',
      marginBottom: spacingMd,
      backgroundColor: Ig.surfaceSoft,
    },
    missingDocumentTitle: {
      fontSize: TYPOGRAPHY.fontSize.md,
      fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
      fontWeight: TYPOGRAPHY.fontWeight.semibold as '600',
      color: Ig.ink,
      marginTop: spacingSm,
      textAlign: 'center',
    },
    missingDocumentSubtitle: {
      fontSize: TYPOGRAPHY.fontSize.sm,
      fontFamily: TYPOGRAPHY.fontFamily.sansRegular,
      color: Ig.muted,
      marginTop: spacingXs,
      textAlign: 'center',
      marginBottom: spacingMd,
    },
    uploadHint: {
      fontSize: TYPOGRAPHY.fontSize.sm,
      fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
      fontWeight: TYPOGRAPHY.fontWeight.semibold as '600',
      color: Ig.primary,
    },
  });
};

const styles = createStyles(); 