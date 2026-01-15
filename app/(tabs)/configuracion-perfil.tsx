import React, { useState, useEffect, useMemo } from 'react';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
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
import { useTheme } from '@/app/design-system/theme/useTheme';
import { COLORS, SPACING, TYPOGRAPHY, SHADOWS, BORDERS } from '@/app/design-system/tokens';

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
  const theme = useTheme();
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

  // Obtener valores del sistema de diseño
  const safeColors = useMemo(() => theme?.colors || COLORS || {}, [theme]);
  const safeSpacing = useMemo(() => theme?.spacing || SPACING || {}, [theme]);
  const safeTypography = useMemo(() => theme?.typography || TYPOGRAPHY || {}, [theme]);
  const safeShadows = useMemo(() => theme?.shadows || SHADOWS || {}, [theme]);
  const safeBorders = useMemo(() => theme?.borders || BORDERS || {}, [theme]);

  // Colores del sistema de diseño
  const bgPaper = (safeColors?.background as any)?.paper || (safeColors?.base as any)?.white || '#FFFFFF';
  const bgDefault = (safeColors?.background as any)?.default || '#EEEEEE';
  const textPrimary = safeColors?.text?.primary || '#000000';
  const textSecondary = safeColors?.text?.secondary || '#666666';
  const textTertiary = safeColors?.text?.tertiary || '#999999';
  const borderLight = (safeColors?.border as any)?.light || '#EEEEEE';
  const borderMain = (safeColors?.border as any)?.main || '#D0D0D0';
  const primary500 = (safeColors?.primary as any)?.['500'] || '#4E4FEB';
  const secondary500 = (safeColors?.secondary as any)?.['500'] || '#068FFF';
  const success500 = (safeColors?.success as any)?.main || (safeColors?.success as any)?.['500'] || '#3DB6B1';
  const error500 = (safeColors?.error as any)?.main || (safeColors?.error as any)?.['500'] || '#FF5555';
  const warning500 = (safeColors?.warning as any)?.main || (safeColors?.warning as any)?.['500'] || '#FFB84D';
  const info500 = (safeColors?.info as any)?.main || (safeColors?.info as any)?.['500'] || secondary500;
  const primaryLight = (safeColors?.primary as any)?.['50'] || (safeColors?.primary as any)?.light || '#E6F2FF';
  const successLight = (safeColors?.success as any)?.light || (safeColors?.success as any)?.['50'] || '#E6F7F4';
  const errorLight = (safeColors?.error as any)?.light || (safeColors?.error as any)?.['50'] || '#FFEBEE';
  const warningLight = (safeColors?.warning as any)?.light || (safeColors?.warning as any)?.['50'] || '#FFF8E6';
  const infoLight = (safeColors?.info as any)?.light || (safeColors?.info as any)?.['50'] || '#E6F5F9';
  const neutralGray100 = ((safeColors?.neutral as any)?.gray as any)?.['100'] || '#F5F5F5';
  const neutralGray50 = ((safeColors?.neutral as any)?.gray as any)?.['50'] || '#F9F9F9';

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
    if (!estadoProveedor?.verificado) {
      Alert.alert(
        'Acceso Restringido',
        'Solo los proveedores verificados pueden gestionar su perfil.',
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
    return verificado ? success500 : warning500;
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
    <View key={documento.id} style={styles.documentoItem}>
      <View style={styles.documentoHeader}>
        <View style={styles.documentoInfo}>
          <MaterialIcons name={documento.icono as any} size={24} color="#2A4065" />
          <View style={styles.documentoTexto}>
            <Text style={styles.documentoNombre}>{documento.nombre_amigable || documento.tipo_documento}</Text>
            <Text style={styles.documentoDescripcion}>{documento.descripcion || ''}</Text>
          </View>
        </View>
        <View style={styles.documentoEstado}>
          <View style={[styles.estadoBadge, { backgroundColor: obtenerColorEstado(documento.verificado) }]}>
            <Text style={styles.estadoTexto}>{obtenerTextoEstado(documento.verificado)}</Text>
          </View>
        </View>
      </View>
      
      <View style={styles.documentoFooter}>
        <Text style={styles.documentoFecha}>
          Subido: {formatearFecha(documento.fecha_subida || '')}
        </Text>
        <TouchableOpacity
          style={styles.actualizarButton}
          onPress={() => abrirGaleriaParaDocumento({ key: documento.tipo_documento, label: documento.nombre_amigable || documento.tipo_documento } as TipoDocumento)}
        >
          <MaterialIcons name="edit" size={16} color="#2A4065" />
          <Text style={styles.actualizarButtonText}>
            Actualizar
          </Text>
        </TouchableOpacity>
      </View>
      
      {documento.esObligatorio && !documento.verificado && (
        <View style={styles.avisoVerificacion}>
          <MaterialIcons name="info" size={16} color="#f39c12" />
          <Text style={styles.avisoTexto}>
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
        style={styles.documentoFaltante}
        onPress={() => abrirGaleriaParaDocumento({ key: tipoDocumento, label: info.nombre } as TipoDocumento)}
      >
        <MaterialIcons name={info.icono as any} size={24} color="#95a5a6" />
        <Text style={styles.documentoFaltanteText}>
          {info.nombre}
        </Text>
        <Text style={styles.documentoFaltanteSubtext}>
          {info.descripcion}
        </Text>
        <Text style={styles.subirText}>
          Tocar para subir
        </Text>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: bgPaper }]}>
        <Header
          title="Gestionar Perfil"
          showBack={true}
          onBackPress={() => router.back()}
        />
        <LoadingSpinner />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: bgPaper }]}>
      <Header
        title="Gestionar Perfil"
        showBack={true}
        onBackPress={() => router.back()}
      />
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
                <MaterialIcons name="person" size={50} color={textTertiary} />
              </View>
            )}
            <View style={[styles.fotoPerfilOverlay, { backgroundColor: primary500 }]}>
              {uploadingPhoto ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <MaterialIcons name="camera-alt" size={20} color="#FFFFFF" />
              )}
            </View>
          </TouchableOpacity>
          <Text style={[styles.fotoPerfilTexto, { color: textTertiary }]}>Toca para cambiar foto</Text>
        </View>

        {/* Tabs */}
        <View style={[styles.tabsContainer, { backgroundColor: bgPaper, borderColor: borderLight }]}>
          <TouchableOpacity
            style={[styles.tab, tabActiva === 'datos' && [styles.tabActive, { backgroundColor: neutralGray50 }]]}
            onPress={() => setTabActiva('datos')}
          >
            <MaterialIcons 
              name="person" 
              size={20} 
              color={tabActiva === 'datos' ? primary500 : textTertiary} 
            />
            <Text style={[styles.tabText, { color: tabActiva === 'datos' ? primary500 : textTertiary }, tabActiva === 'datos' && styles.tabTextActive]}>
              Datos Personales
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.tab, tabActiva === 'documentos' && [styles.tabActive, { backgroundColor: neutralGray50 }]]}
            onPress={() => setTabActiva('documentos')}
          >
            <MaterialIcons 
              name="description" 
              size={20} 
              color={tabActiva === 'documentos' ? primary500 : textTertiary} 
            />
            <Text style={[styles.tabText, { color: tabActiva === 'documentos' ? primary500 : textTertiary }, tabActiva === 'documentos' && styles.tabTextActive]}>
              Documentos
            </Text>
          </TouchableOpacity>
        </View>

        {/* Contenido según tab activa */}
        {tabActiva === 'datos' && (
          <View style={styles.contentContainer}>
            <View style={[styles.formContainer, { backgroundColor: bgPaper, borderColor: borderLight }]}>
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: textPrimary }]}>Nombre Completo</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: neutralGray50, borderColor: borderLight, color: textPrimary }]}
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
                <Text style={[styles.formLabel, { color: textPrimary }]}>Teléfono</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: neutralGray50, borderColor: borderLight, color: textPrimary }]}
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
                <Text style={[styles.formLabel, { color: textPrimary }]}>Email</Text>
                <View style={[
                  styles.formInputReadOnly, 
                  { 
                    backgroundColor: neutralGray100 || '#F5F5F5', 
                    borderColor: borderLight,
                  }
                ]}>
                  <MaterialIcons 
                    name="lock" 
                    size={18} 
                    color={textTertiary} 
                    style={styles.lockIcon} 
                  />
                  <Text 
                    style={[
                      styles.formInputReadOnlyText, 
                      { color: textSecondary }
                    ]}
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
                <Text style={[styles.formLabel, { color: textPrimary }]}>Descripción</Text>
                <TextInput
                  style={[styles.formInput, styles.formInputMultiline, { backgroundColor: neutralGray50, borderColor: borderLight, color: textPrimary }]}
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
                  <Text style={[styles.formLabel, { color: textPrimary }]}>Dirección</Text>
                  <TextInput
                    style={[styles.formInput, { backgroundColor: neutralGray50, borderColor: borderLight, color: textPrimary }]}
                    value={datosPersonales.direccion}
                    onChangeText={(value) => {
                      setDatosPersonales(prev => ({ ...prev, direccion: value }));
                      setHasChanges(true);
                    }}
                    placeholder="Dirección de tu base de operaciones"
                    placeholderTextColor={textTertiary}
                  />
                </View>
              )}
              
              {/* Información para talleres */}
              {estadoProveedor?.tipo_proveedor === 'taller' && (
                <View style={[styles.infoCard, { backgroundColor: infoLight, borderColor: info500 }]}>
                  <MaterialIcons name="info" size={20} color={info500} />
                  <Text style={[styles.infoText, { color: textPrimary }]}>
                    Para gestionar la dirección de tu taller, ve a la sección "Servicios y Cobertura" → "Gestionar Taller"
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {tabActiva === 'documentos' && (
          <View>
            {/* Header mejorado del tab de documentos */}
            <View style={[styles.documentsHeader, { backgroundColor: bgPaper, borderColor: borderLight }]}>
              <View style={[styles.documentsHeaderIconContainer, { backgroundColor: primaryLight }]}>
                <MaterialIcons name="folder" size={28} color={primary500} />
              </View>
              <View style={styles.documentsHeaderTextContainer}>
                <Text style={[styles.documentsHeaderTitle, { color: textPrimary }]}>Documentos de Verificación</Text>
                <Text style={[styles.documentsHeaderSubtitle, { color: textTertiary }]}>
                  {estadoProveedor?.tipo_proveedor === 'taller' 
                    ? 'Gestiona los documentos de tu taller mecánico'
                    : 'Gestiona los documentos de tu servicio móvil'
                  }
                </Text>
              </View>
            </View>

            {/* Información del tipo de proveedor mejorada */}
            <View style={[styles.providerTypeCard, { backgroundColor: bgPaper, borderColor: borderLight }]}>
              <View style={[styles.providerTypeIconContainer, { backgroundColor: primaryLight }]}>
                <MaterialIcons 
                  name={estadoProveedor?.tipo_proveedor === 'taller' ? 'business' : 'engineering'} 
                  size={24} 
                  color={primary500} 
                />
              </View>
              <View style={styles.providerTypeTextContainer}>
                <Text style={[styles.providerTypeTitle, { color: textPrimary }]}>
                  {estadoProveedor?.tipo_proveedor === 'taller' ? 'Taller Mecánico' : 'Mecánico a Domicilio'}
                </Text>
                <Text style={[styles.providerTypeDescription, { color: textTertiary }]}>
                  {estadoProveedor?.tipo_proveedor === 'taller' 
                    ? 'Documentos requeridos para talleres con ubicación física'
                    : 'Documentos requeridos para servicios móviles y domiciliarios'
                  }
                </Text>
              </View>
            </View>

            {/* Estadísticas de documentos */}
            <View style={[styles.documentsStats, { backgroundColor: bgPaper, borderColor: borderLight }]}>
              <View style={styles.statItem}>
                <Text style={[styles.statNumber, { color: textPrimary }]}>{getDocumentosObligatorios().length}</Text>
                <Text style={[styles.statLabel, { color: textTertiary }]}>Obligatorios</Text>
                <MaterialIcons name="security" size={16} color={error500} />
              </View>
              <View style={[styles.statDivider, { backgroundColor: borderLight }]} />
              <View style={styles.statItem}>
                <Text style={[styles.statNumber, { color: textPrimary }]}>{getDocumentosOpcionales().length}</Text>
                <Text style={[styles.statLabel, { color: textTertiary }]}>Opcionales</Text>
                <MaterialIcons name="star" size={16} color={info500} />
              </View>
              <View style={[styles.statDivider, { backgroundColor: borderLight }]} />
              <View style={styles.statItem}>
                <Text style={[styles.statNumber, { color: textPrimary }]}>{getTiposDocumentoFaltantesSegunTipo().length}</Text>
                <Text style={[styles.statLabel, { color: textTertiary }]}>Disponibles</Text>
                <MaterialIcons name="add-circle" size={16} color={success500} />
              </View>
            </View>

            {/* Documentos Obligatorios - Sección rediseñada */}
            <View style={styles.documentsSection}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionHeaderLeft}>
                  <MaterialIcons name="security" size={24} color={error500} />
                  <Text style={[styles.sectionTitle, { color: textPrimary }]}>Documentos Obligatorios</Text>
                </View>
                <View style={styles.sectionHeaderRight}>
                  <View style={[styles.sectionBadge, { backgroundColor: error500 }]}>
                    <Text style={styles.sectionBadgeText}>Requeridos</Text>
                  </View>
                </View>
              </View>
              
              <Text style={[styles.sectionDescription, { color: textTertiary }]}>
                Estos documentos son necesarios para la verificación de tu cuenta y poder aparecer en la plataforma.
              </Text>
              
              {getDocumentosObligatorios().length > 0 ? (
                <View style={styles.documentsGrid}>
                  {getDocumentosObligatorios().map(documento => (
                    <View key={documento.id} style={[styles.documentCard, { backgroundColor: bgPaper, borderColor: error500 }]}>
                      <View style={[styles.documentCardHeader, { borderBottomColor: borderLight }]}>
                        <View style={[styles.documentIconContainer, { backgroundColor: primaryLight }]}>
                          <MaterialIcons name={documento.icono as any} size={24} color={primary500} />
                        </View>
                        <View style={styles.documentCardStatus}>
                          <View style={[
                            styles.statusBadge, 
                            { backgroundColor: documento.verificado ? success500 : warning500 }
                          ]}>
                            <MaterialIcons 
                              name={documento.verificado ? 'check-circle' : 'schedule'} 
                              size={12} 
                              color="#FFFFFF" 
                            />
                            <Text style={styles.statusBadgeText}>
                              {documento.verificado ? 'Verificado' : 'Pendiente'}
                            </Text>
                          </View>
                        </View>
                      </View>
                      
                      <View style={[styles.documentCardContent, { borderBottomColor: borderLight }]}>
                        <Text style={[styles.documentName, { color: textPrimary }]}>{documento.nombre_amigable}</Text>
                        <Text style={[styles.documentDescription, { color: textTertiary }]}>{documento.descripcion}</Text>
                        
                        <View style={styles.documentMeta}>
                          <MaterialIcons name="event" size={14} color={textTertiary} />
                          <Text style={[styles.documentDate, { color: textTertiary }]}>
                            {formatearFecha(documento.fecha_subida || '')}
                          </Text>
                        </View>
                      </View>
                      
                      <View style={styles.documentCardActions}>
                        <TouchableOpacity
                          style={[styles.actionButton, { backgroundColor: primary500, borderColor: primary500 }]}
                          onPress={() => abrirGaleriaParaDocumento({ 
                            key: documento.tipo_documento, 
                            label: documento.nombre_amigable 
                          } as TipoDocumento)}
                        >
                          <MaterialIcons name="camera-alt" size={16} color="#FFFFFF" />
                          <Text style={styles.actionButtonText}>Actualizar</Text>
                        </TouchableOpacity>
                      </View>
                      
                      {documento.esObligatorio && !documento.verificado && (
                        <View style={[styles.verificationNotice, { backgroundColor: warningLight, borderColor: warning500 }]}>
                          <MaterialIcons name="info" size={14} color={warning500} />
                          <Text style={[styles.verificationNoticeText, { color: textPrimary }]}>
                            En proceso de verificación
                          </Text>
                        </View>
                      )}
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.emptyStateContainer}>
                  <MaterialIcons name="warning" size={48} color={warning500} />
                  <Text style={[styles.emptyStateTitle, { color: textPrimary }]}>Sin documentos obligatorios</Text>
                  <Text style={[styles.emptyStateDescription, { color: textTertiary }]}>
                    Aún no has subido los documentos obligatorios para tu verificación.
                  </Text>
                  <TouchableOpacity style={[styles.emptyStateAction, { backgroundColor: neutralGray50, borderColor: primary500 }]}>
                    <MaterialIcons name="upload" size={16} color={primary500} />
                    <Text style={[styles.emptyStateActionText, { color: primary500 }]}>Subir documentos</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Documentos Opcionales - Sección rediseñada */}
            <View style={styles.documentsSection}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionHeaderLeft}>
                  <MaterialIcons name="star" size={24} color={info500} />
                  <Text style={[styles.sectionTitle, { color: textPrimary }]}>
                    {estadoProveedor?.tipo_proveedor === 'taller' 
                      ? 'Documentos del Establecimiento'
                      : 'Documentos del Vehículo'
                    }
                  </Text>
                </View>
                <View style={styles.sectionHeaderRight}>
                  <View style={[styles.sectionBadge, { backgroundColor: info500 }]}>
                    <Text style={styles.sectionBadgeText}>Opcionales</Text>
                  </View>
                </View>
              </View>
              
              <Text style={[styles.sectionDescription, { color: textTertiary }]}>
                {estadoProveedor?.tipo_proveedor === 'taller' 
                  ? 'Estas fotos ayudan a mostrar tu instalación y generar confianza en los clientes.'
                  : 'Estas fotos muestran tu vehículo de trabajo y generan confianza en los clientes.'
                }
              </Text>
              
              {getDocumentosOpcionales().length > 0 ? (
                <View style={styles.documentsGrid}>
                  {getDocumentosOpcionales().map(documento => (
                    <View key={documento.id} style={[styles.documentCard, { backgroundColor: bgPaper, borderColor: info500 }]}>
                      <View style={[styles.documentCardHeader, { borderBottomColor: borderLight }]}>
                        <View style={[styles.documentIconContainer, { backgroundColor: infoLight }]}>
                          <MaterialIcons name={documento.icono as any} size={24} color={info500} />
                        </View>
                        <View style={styles.documentCardStatus}>
                          <View style={[styles.statusBadge, { backgroundColor: info500 }]}>
                            <MaterialIcons name="star" size={12} color="#FFFFFF" />
                            <Text style={styles.statusBadgeText}>Opcional</Text>
                          </View>
                        </View>
                      </View>
                      
                      <View style={[styles.documentCardContent, { borderBottomColor: borderLight }]}>
                        <Text style={[styles.documentName, { color: textPrimary }]}>{documento.nombre_amigable}</Text>
                        <Text style={[styles.documentDescription, { color: textTertiary }]}>{documento.descripcion}</Text>
                        
                        <View style={styles.documentMeta}>
                          <MaterialIcons name="event" size={14} color={textTertiary} />
                          <Text style={[styles.documentDate, { color: textTertiary }]}>
                            {formatearFecha(documento.fecha_subida || '')}
                          </Text>
                        </View>
                      </View>
                      
                      <View style={styles.documentCardActions}>
                        <TouchableOpacity
                          style={[styles.actionButton, { backgroundColor: bgPaper, borderColor: info500 }]}
                          onPress={() => abrirGaleriaParaDocumento({ 
                            key: documento.tipo_documento, 
                            label: documento.nombre_amigable 
                          } as TipoDocumento)}
                        >
                          <MaterialIcons name="camera-alt" size={16} color={info500} />
                          <Text style={[styles.actionButtonText, { color: info500 }]}>
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
                              style={[styles.documentCard, { backgroundColor: bgPaper, borderColor: success500 }]}
                              onPress={() => abrirGaleriaParaDocumento({ 
                                key: tipoDocumento, 
                                label: info.nombre 
                              } as TipoDocumento)}
                            >
                              <View style={[styles.documentCardHeader, { borderBottomColor: borderLight }]}>
                                <View style={[styles.documentIconContainer, { backgroundColor: successLight }]}>
                                  <MaterialIcons name={info.icono as any} size={24} color={success500} />
                                </View>
                                <View style={styles.documentCardStatus}>
                                  <View style={[styles.statusBadge, { backgroundColor: success500 }]}>
                                    <MaterialIcons name="add" size={12} color="#FFFFFF" />
                                    <Text style={styles.statusBadgeText}>Agregar</Text>
                                  </View>
                                </View>
                              </View>
                              
                              <View style={styles.documentCardContent}>
                                <Text style={[styles.documentName, { color: textPrimary }]}>{info.nombre}</Text>
                                <Text style={[styles.documentDescription, { color: textTertiary }]}>{info.descripcion}</Text>
                              </View>
                              
                              <View style={styles.documentCardActions}>
                                <View style={[styles.uploadPrompt, { backgroundColor: neutralGray50, borderColor: success500 }]}>
                                  <MaterialIcons name="cloud-upload" size={16} color={success500} />
                                  <Text style={[styles.uploadPromptText, { color: success500 }]}>Tocar para subir</Text>
                                </View>
                              </View>
                            </TouchableOpacity>
                          );
                        })}
                    </View>
                  ) : (
                    <View style={styles.emptyStateContainer}>
                      <MaterialIcons name="add-photo-alternate" size={48} color={textTertiary} />
                      <Text style={[styles.emptyStateTitle, { color: textPrimary }]}>
                        {estadoProveedor?.tipo_proveedor === 'taller' 
                          ? 'Sin fotos del taller'
                          : 'Sin fotos del vehículo'
                        }
                      </Text>
                      <Text style={[styles.emptyStateDescription, { color: textTertiary }]}>
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
                    <MaterialIcons name="add-circle" size={24} color={success500} />
                    <Text style={[styles.sectionTitle, { color: textPrimary }]}>Documentos Disponibles</Text>
                  </View>
                  <View style={styles.sectionHeaderRight}>
                    <View style={[styles.sectionBadge, { backgroundColor: success500 }]}>
                      <Text style={styles.sectionBadgeText}>Disponibles</Text>
                    </View>
                  </View>
                </View>
                
                <Text style={[styles.sectionDescription, { color: textTertiary }]}>
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
                          style={[styles.documentCard, { backgroundColor: bgPaper, borderColor: success500 }]}
                          onPress={() => abrirGaleriaParaDocumento({ 
                            key: tipoDocumento, 
                            label: info.nombre 
                          } as TipoDocumento)}
                        >
                          <View style={[styles.documentCardHeader, { borderBottomColor: borderLight }]}>
                            <View style={[styles.documentIconContainer, { backgroundColor: successLight }]}>
                              <MaterialIcons name={info.icono as any} size={24} color={success500} />
                            </View>
                            <View style={styles.documentCardStatus}>
                              <View style={[styles.statusBadge, { backgroundColor: success500 }]}>
                                <MaterialIcons name="add" size={12} color="#FFFFFF" />
                                <Text style={styles.statusBadgeText}>Agregar</Text>
                              </View>
                            </View>
                          </View>
                          
                          <View style={styles.documentCardContent}>
                            <Text style={[styles.documentName, { color: textPrimary }]}>{info.nombre}</Text>
                            <Text style={[styles.documentDescription, { color: textTertiary }]}>{info.descripcion}</Text>
                          </View>
                          
                          <View style={styles.documentCardActions}>
                            <View style={[styles.uploadPrompt, { backgroundColor: neutralGray50, borderColor: success500 }]}>
                              <MaterialIcons name="cloud-upload" size={16} color={success500} />
                              <Text style={[styles.uploadPromptText, { color: success500 }]}>Tocar para subir</Text>
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
        <View style={[styles.saveContainer, { paddingBottom: insets.bottom + spacingMd }]}>
          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: primary500 }, saving && styles.saveButtonDisabled]}
            onPress={guardarDatosPersonales}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <MaterialIcons name="save" size={20} color="#FFFFFF" />
            )}
            <Text style={styles.saveButtonText}>
              {saving ? 'Guardando...' : 'Guardar Cambios'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

// Crear estilos usando tokens del sistema de diseño
const createStyles = () => {
  const spacingXs = SPACING?.xs || 4;
  const spacingSm = SPACING?.sm || 8;
  const spacingMd = SPACING?.md || 16;
  const spacingLg = SPACING?.lg || 24;
  const containerHorizontal = SPACING?.container?.horizontal || SPACING?.content?.horizontal || 18;
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
    container: {
      flex: 1,
    },
    scrollContainer: {
      flex: 1,
    },
    tabsContainer: {
      flexDirection: 'row',
      marginHorizontal: containerHorizontal,
      marginTop: spacingLg,
      borderRadius: radiusXl,
      padding: spacingXs,
      borderWidth: 1,
    },
    tab: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacingSm + 4,
      paddingHorizontal: spacingMd,
      borderRadius: radiusLg,
    },
    tabActive: {
      // backgroundColor se aplica dinámicamente
    },
    tabText: {
      fontSize: fontSizeBase,
      marginLeft: spacingSm,
      fontWeight: fontWeightMedium,
    },
    tabTextActive: {
      fontWeight: fontWeightSemibold,
    },
    contentContainer: {
      marginTop: spacingLg,
      paddingHorizontal: containerHorizontal,
    },
    formContainer: {
      borderRadius: radiusXl,
      padding: spacingLg,
      borderWidth: 1,
      ...shadowSm,
    },
    formGroup: {
      marginBottom: spacingLg,
    },
    formLabel: {
      fontSize: fontSizeBase,
      fontWeight: fontWeightSemibold,
      marginBottom: spacingSm,
    },
    formInput: {
      borderWidth: 1,
      borderRadius: radiusXl,
      paddingHorizontal: spacingMd,
      paddingVertical: spacingSm + 4,
      fontSize: fontSizeBase,
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
      borderWidth: 1,
      borderRadius: radiusMd,
      paddingHorizontal: spacingMd,
      paddingVertical: spacingSm + 2,
      minHeight: 48,
    },
    formInputReadOnlyText: {
      flex: 1,
      fontSize: fontSizeBase,
    },
    lockIcon: {
      marginRight: spacingSm,
    },
    formHint: {
      fontSize: fontSizeBase - 2,
      marginTop: spacingXs,
    },
    saveContainer: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      paddingHorizontal: containerHorizontal,
      paddingTop: spacingMd,
      backgroundColor: bgPaper,
      ...shadowMd,
      borderTopWidth: 1,
      borderTopColor: borderLight,
    },
    saveButton: {
      flexDirection: 'row',
      borderRadius: radiusXl,
      padding: spacingMd,
      justifyContent: 'center',
      alignItems: 'center',
      gap: spacingSm,
    },
    saveButtonDisabled: {
      opacity: 0.6,
    },
    saveButtonText: {
      color: '#FFFFFF',
      fontSize: fontSizeBase,
      fontWeight: fontWeightSemibold,
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
      borderColor: '#FFFFFF',
    },
    fotoPerfilTexto: {
      fontSize: fontSizeBase - 2,
      textAlign: 'center',
    },
    documentsHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginHorizontal: containerHorizontal,
      marginTop: spacingLg,
      marginBottom: spacingLg,
      borderRadius: radiusXl,
      padding: spacingMd,
      borderWidth: 1,
    },
    documentsHeaderIconContainer: {
      width: 50,
      height: 50,
      borderRadius: 25,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: spacingMd - 1,
    },
    documentsHeaderTextContainer: {
      flex: 1,
    },
    documentsHeaderTitle: {
      fontSize: fontSizeLg,
      fontWeight: fontWeightSemibold,
      marginBottom: spacingXs,
    },
    documentsHeaderSubtitle: {
      fontSize: fontSizeBase - 2,
    },
    providerTypeCard: {
      flexDirection: 'row',
      alignItems: 'center',
      marginHorizontal: containerHorizontal,
      marginBottom: spacingLg,
      borderRadius: radiusXl,
      padding: spacingMd,
      borderWidth: 1,
    },
    providerTypeIconContainer: {
      width: 50,
      height: 50,
      borderRadius: 25,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: spacingMd - 1,
    },
    providerTypeTextContainer: {
      flex: 1,
    },
    providerTypeTitle: {
      fontSize: fontSizeBase,
      fontWeight: fontWeightSemibold,
      marginBottom: spacingXs,
    },
    providerTypeDescription: {
      fontSize: fontSizeBase - 2,
    },
    documentsStats: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      marginHorizontal: containerHorizontal,
      marginBottom: spacingLg,
      borderRadius: radiusXl,
      padding: spacingMd,
      borderWidth: 1,
    },
    statItem: {
      alignItems: 'center',
    },
    statNumber: {
      fontSize: fontSizeXl + 4,
      fontWeight: fontWeightBold,
      marginBottom: spacingXs,
    },
    statLabel: {
      fontSize: fontSizeBase - 2,
    },
    statDivider: {
      width: 1,
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
    },
    sectionHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    sectionTitle: {
      fontSize: fontSizeLg,
      fontWeight: fontWeightSemibold,
      marginLeft: spacingSm + 2,
    },
    sectionHeaderRight: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    sectionBadge: {
      paddingHorizontal: spacingSm,
      paddingVertical: spacingXs,
      borderRadius: radiusMd,
    },
    sectionBadgeText: {
      fontSize: fontSizeBase - 2,
      fontWeight: fontWeightSemibold,
      color: '#FFFFFF',
    },
    sectionDescription: {
      fontSize: fontSizeBase - 2,
      marginBottom: spacingMd - 2,
      paddingHorizontal: containerHorizontal,
    },
    documentsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      paddingHorizontal: containerHorizontal,
      gap: spacingSm,
    },
    documentCard: {
      width: '48%',
      borderRadius: radiusXl,
      marginBottom: spacingMd,
      borderWidth: 2,
      overflow: 'hidden',
    },
    documentCardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: spacingSm + 4,
      borderBottomWidth: 1,
    },
    documentIconContainer: {
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
    },
    documentCardStatus: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    statusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacingSm,
      paddingVertical: spacingXs,
      borderRadius: radiusMd,
    },
    statusBadgeText: {
      fontSize: fontSizeBase - 2,
      fontWeight: fontWeightSemibold,
      color: '#FFFFFF',
      marginLeft: spacingXs,
    },
    documentCardContent: {
      padding: spacingSm + 4,
      borderBottomWidth: 1,
    },
    documentName: {
      fontSize: fontSizeBase,
      fontWeight: fontWeightSemibold,
      marginBottom: spacingXs,
    },
    documentDescription: {
      fontSize: fontSizeBase - 1,
      marginBottom: spacingSm,
    },
    documentMeta: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    documentDate: {
      fontSize: fontSizeBase - 2,
      marginLeft: spacingSm,
    },
    documentCardActions: {
      padding: spacingSm + 4,
      borderTopWidth: 1,
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacingSm + 2,
      paddingHorizontal: spacingMd - 1,
      borderRadius: radiusLg,
      borderWidth: 1,
      gap: spacingSm,
    },
    actionButtonText: {
      fontSize: fontSizeBase - 2,
      fontWeight: fontWeightSemibold,
    },
    verificationNotice: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: radiusLg,
      padding: spacingSm + 4,
      marginTop: spacingSm + 4,
      borderWidth: 1,
    },
    verificationNoticeText: {
      fontSize: fontSizeBase - 1,
      marginLeft: spacingSm,
    },
    emptyStateContainer: {
      alignItems: 'center',
      paddingVertical: spacingLg,
      paddingHorizontal: containerHorizontal,
    },
    emptyStateTitle: {
      fontSize: fontSizeLg,
      fontWeight: fontWeightSemibold,
      marginTop: spacingSm + 2,
    },
    emptyStateDescription: {
      fontSize: fontSizeBase - 2,
      marginTop: spacingXs,
      textAlign: 'center',
    },
    emptyStateAction: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: radiusLg,
      paddingVertical: spacingSm + 4,
      paddingHorizontal: spacingLg,
      marginTop: spacingLg,
      borderWidth: 1,
      gap: spacingSm,
    },
    emptyStateActionText: {
      fontSize: fontSizeBase - 2,
      fontWeight: fontWeightSemibold,
    },
    infoCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      borderRadius: radiusLg,
      padding: spacingMd,
      marginTop: spacingSm,
      borderWidth: 1,
    },
    infoText: {
      fontSize: fontSizeBase - 2,
      marginLeft: spacingSm + 4,
      flex: 1,
      lineHeight: fontSizeBase + 6,
    },
    uploadPrompt: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacingSm + 2,
      paddingHorizontal: spacingMd - 1,
      borderRadius: radiusLg,
      borderWidth: 1,
      gap: spacingSm,
    },
    uploadPromptText: {
      fontSize: fontSizeBase - 2,
      fontWeight: fontWeightSemibold,
    },
  });
};

const styles = createStyles(); 