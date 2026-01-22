import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { documentosAPI, type TipoDocumento } from '@/services/api';
import OnboardingHeader from '@/components/OnboardingHeader';
import { Buffer } from 'buffer';

interface DocumentoLocal {
  uri: string;
  tipo: string;
  nombre: string;
  fileName?: string;
  fileType?: string;
}

export default function DocumentacionScreen() {
  const { tipo, especialidades, marcas, ...otherParams } = useLocalSearchParams();
  const router = useRouter();
  
  const [tiposDocumento, setTiposDocumento] = useState<TipoDocumento[]>([]);
  const [documentos, setDocumentos] = useState<{ [key: string]: DocumentoLocal }>({});
  const [isLoadingTipos, setIsLoadingTipos] = useState(true);

  useEffect(() => {
    cargarTiposDocumento();
    // Cargar documentos existentes desde parámetros si vienen de navegación hacia atrás
    const documentosParam = otherParams.documentos as string;
    if (documentosParam) {
      try {
        const documentosGuardados = JSON.parse(documentosParam);
        setDocumentos(documentosGuardados);
      } catch (error) {
        console.error('Error parseando documentos:', error);
      }
    }
  }, []);

  const cargarTiposDocumento = async () => {
    try {
      setIsLoadingTipos(true);
      const tiposData = await documentosAPI.obtenerTiposDocumento();
      
      console.log('Tipos de documento cargados:', tiposData);
      setTiposDocumento(tiposData.tipos_documento || []);
      
    } catch (error) {
      console.error('Error cargando tipos de documento:', error);
      Alert.alert('Error', 'No se pudieron cargar los tipos de documento');
    } finally {
      setIsLoadingTipos(false);
    }
  };

  const getIconoParaTipo = (tipoKey: string): any => {
    const iconMap: { [key: string]: any } = {
      'dni_frontal': 'card',
      'dni_trasero': 'card',
      'rut_fiscal': 'document-text',
      'licencia_conducir': 'car',
      'foto_fachada': 'storefront',
      'foto_interior': 'home',
      'foto_equipos': 'construct',
      'foto_herramientas': 'build',
      'foto_vehiculo': 'car-sport',
    };
    return iconMap[tipoKey] || 'document';
  };

  const solicitarPermisos = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permisos Requeridos',
        'Necesitamos acceso a tu galería para seleccionar documentos.'
      );
      return false;
    }
    return true;
  };

  const seleccionarImagen = async (tipoDoc: string, nombreDoc: string) => {
    const tienePermisos = await solicitarPermisos();
    if (!tienePermisos) return;

    Alert.alert(
      'Seleccionar Imagen',
      '¿Cómo quieres agregar la imagen?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Galería', onPress: () => abrirGaleria(tipoDoc, nombreDoc) },
        { text: 'Cámara', onPress: () => abrirCamara(tipoDoc, nombreDoc) },
      ]
    );
  };

  const abrirGaleria = async (tipoDoc: string, nombreDoc: string) => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'Images' as any,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        guardarDocumentoLocal(tipoDoc, nombreDoc, asset);
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo seleccionar la imagen');
    }
  };

  const abrirCamara = async (tipoDoc: string, nombreDoc: string) => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Error', 'Se necesita permiso para usar la cámara');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        guardarDocumentoLocal(tipoDoc, nombreDoc, asset);
      }
    } catch (error) {
      Alert.alert('Error', 'No se pudo tomar la foto');
    }
  };

  const guardarDocumentoLocal = (tipoDoc: string, nombreDoc: string, asset: any) => {
    // Guardar documento localmente (se subirá al final del onboarding)
    setDocumentos(prev => ({
      ...prev,
      [tipoDoc]: {
        uri: asset.uri,
        tipo: tipoDoc,
        nombre: nombreDoc,
        fileName: asset.fileName || `${tipoDoc}_${Date.now()}.jpg`,
        fileType: asset.type || 'image/jpeg',
      }
    }));
  };

  const eliminarDocumento = (tipoDoc: string) => {
    setDocumentos(prev => {
      const nuevos = { ...prev };
      delete nuevos[tipoDoc];
      return nuevos;
    });
  };

  const validarDocumentos = () => {
    // Solo documentos básicos son obligatorios
    const obligatorios = ['dni_frontal', 'dni_trasero'];
    
    if (tipo === 'taller') {
      obligatorios.push('rut_fiscal');
    } else {
      obligatorios.push('licencia_conducir');
    }
    
    const faltantes = obligatorios.filter(tipoKey => !documentos[tipoKey]);
    
    if (faltantes.length > 0) {
      const nombresDoc = faltantes.map(key => {
        const tipoEncontrado = tiposDocumento.find(t => t.key === key);
        return tipoEncontrado ? tipoEncontrado.label : key;
      });
      
      Alert.alert(
        'Documentos Obligatorios Faltantes',
        `Debes seleccionar los siguientes documentos:\n${nombresDoc.map(nombre => `• ${nombre}`).join('\n')}`
      );
      return false;
    }
    
    return true;
  };

  const handleContinuar = () => {
    if (!validarDocumentos()) {
      return;
    }
    
    // Navegar a finalizar pasando todos los datos
    const params = new URLSearchParams();
    Object.entries(otherParams).forEach(([key, value]) => {
      if (value) params.append(key, value as string);
    });
    params.append('tipo', tipo as string);
    
    // Incluir especialidades si existen
    if (especialidades) {
      params.append('especialidades', especialidades as string);
    }
    
    // Incluir marcas si existen
    if (marcas) {
      params.append('marcas', marcas as string);
    }
    
    // Serializar documentos de forma más robusta usando base64
    if (Object.keys(documentos).length > 0) {
      try {
        const documentosJson = JSON.stringify(documentos);
        // Usar base64 para evitar problemas con caracteres especiales
        const documentosBase64 = Buffer.from(documentosJson, 'utf-8').toString('base64');
        console.log('Documentos a enviar:', Object.keys(documentos));
        console.log('Documentos codificados en base64 (longitud):', documentosBase64.length);
        params.append('documentos', documentosBase64);
      } catch (error) {
        console.error('Error serializando documentos:', error);
        console.log('Documentos:', documentos);
        
        // Mostrar alerta si falla la serialización
        Alert.alert(
          'Error al Preparar Documentos',
          'Hubo un problema preparando tus documentos. Por favor, intenta nuevamente.',
          [{ text: 'OK' }]
        );
        return;
      }
    }
    
    router.push(`/(onboarding)/finalizar?${params.toString()}`);
  };

  const getBackPath = () => {
    const params = new URLSearchParams();
    Object.entries(otherParams).forEach(([key, value]) => {
      if (value) params.append(key, value as string);
    });
    params.append('tipo', tipo as string);
    if (especialidades) params.append('especialidades', especialidades as string);
    return `/(onboarding)/marcas?${params.toString()}`;
  };

  const renderDocumento = (tipoDoc: TipoDocumento) => {
    const documentoGuardado = documentos[tipoDoc.key];
    const esOpcional = !['dni_frontal', 'dni_trasero', 'rut_fiscal', 'licencia_conducir'].includes(tipoDoc.key);
    const icono = getIconoParaTipo(tipoDoc.key);

    return (
      <View key={tipoDoc.key} style={styles.documentoItem}>
        <View style={styles.documentoHeader}>
          <Ionicons name={icono} size={24} color="#3498db" />
          <View style={styles.documentoInfo}>
            <Text style={styles.documentoNombre}>{tipoDoc.label}</Text>
            {esOpcional && <Text style={styles.opcionalText}>Opcional</Text>}
          </View>
          {documentoGuardado && (
            <Ionicons name="checkmark-circle" size={20} color="#27ae60" />
          )}
        </View>

        {documentoGuardado ? (
          <View style={styles.documentoSubido}>
            <Image source={{ uri: documentoGuardado.uri }} style={styles.imagenPreview} />
            <View style={styles.documentoAcciones}>
              <TouchableOpacity
                style={styles.botonCambiar}
                onPress={() => seleccionarImagen(tipoDoc.key, tipoDoc.label)}
              >
                <Ionicons name="refresh" size={16} color="#3498db" />
                <Text style={styles.textoBotonCambiar}>Cambiar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.botonEliminar}
                onPress={() => eliminarDocumento(tipoDoc.key)}
              >
                <Ionicons name="trash" size={16} color="#e74c3c" />
                <Text style={styles.textoBotonEliminar}>Eliminar</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.botonSubir}
            onPress={() => seleccionarImagen(tipoDoc.key, tipoDoc.label)}
          >
            <Ionicons name="cloud-upload" size={32} color="#7f8c8d" />
            <Text style={styles.textoSubir}>Seleccionar Documento</Text>
            <Text style={styles.textoSubirSecundario}>Toca para elegir imagen</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  if (isLoadingTipos) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3498db" />
          <Text style={styles.loadingText}>Cargando tipos de documento...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <OnboardingHeader
          title="Documentación"
          subtitle={`Selecciona los documentos requeridos para verificar tu ${tipo === 'taller' ? 'taller' : 'servicio'}`}
          currentStep={5}
          totalSteps={6}
          icon="document-text"
          backPath={getBackPath()}
        />

        <View style={styles.documentosContainer}>
          {tiposDocumento.map(renderDocumento)}
        </View>

        <View style={styles.infoContainer}>
          <Ionicons name="information-circle" size={20} color="#f39c12" />
          <Text style={styles.infoText}>
            Las imágenes se subirán al completar el registro. Asegúrate de que sean claras y legibles.
          </Text>
        </View>

        <TouchableOpacity
          style={styles.continueButton}
          onPress={handleContinuar}
        >
          <Text style={styles.continueButtonText}>Continuar</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContainer: {
    flexGrow: 1,
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#7f8c8d',
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f4fd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  infoText: {
    marginLeft: 12,
    fontSize: 14,
    color: '#2980b9',
    flex: 1,
  },
  documentosContainer: {
    gap: 12,
    marginBottom: 20,
  },
  documentoItem: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e1e8ed',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  documentoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  documentoInfo: {
    flex: 1,
    marginLeft: 12,
  },
  documentoNombre: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    flex: 1,
  },
  opcionalText: {
    fontSize: 12,
    color: '#95a5a6',
    fontStyle: 'italic',
  },
  botonSubir: {
    borderWidth: 2,
    borderColor: '#e1e8ed',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 24,
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  textoSubir: {
    fontSize: 16,
    fontWeight: '600',
    color: '#7f8c8d',
    marginTop: 8,
  },
  textoSubirSecundario: {
    fontSize: 12,
    color: '#95a5a6',
    marginTop: 4,
  },
  documentoSubido: {
    alignItems: 'center',
  },
  imagenPreview: {
    width: 120,
    height: 90,
    borderRadius: 8,
    marginBottom: 12,
  },
  documentoAcciones: {
    flexDirection: 'row',
    gap: 12,
  },
  botonCambiar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#ecf0f1',
  },
  textoBotonCambiar: {
    fontSize: 12,
    color: '#3498db',
    marginLeft: 4,
    fontWeight: '600',
  },
  botonEliminar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#fadbd8',
  },
  textoBotonEliminar: {
    fontSize: 12,
    color: '#e74c3c',
    marginLeft: 4,
    fontWeight: '600',
  },
  continueButton: {
    backgroundColor: '#27ae60',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#bdc3c7',
  },
  continueButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
}); 