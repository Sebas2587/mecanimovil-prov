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
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { perfilAPI } from '@/services/api';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import Header from '@/components/Header';

const { width: screenWidth } = Dimensions.get('window');

interface DatosTaller {
  nombre: string;
  descripcion: string;
  direccion: string;
  comuna: string;
  ciudad: string;
  region: string;
  fotos: string[];
  latitud?: number;
  longitud?: number;
}

interface DireccionResultado {
  display_name: string;
  lat: string;
  lon: string;
  address: {
    road?: string;
    house_number?: string;
    suburb?: string;
    city?: string;
    state?: string;
    country?: string;
    postcode?: string;
    neighbourhood?: string;
    district?: string;
  };
}

export default function GestionarTallerScreen() {
  const { estadoProveedor, refrescarEstadoProveedor } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Estados para datos del taller
  const [datosTaller, setDatosTaller] = useState<DatosTaller>({
    nombre: '',
    descripcion: '',
    direccion: '',
    comuna: '',
    ciudad: '',
    region: '',
    fotos: [],
  });

  // Estados para búsqueda de direcciones
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<DireccionResultado[]>([]);
  const [searching, setSearching] = useState(false);
  const [direccionManual, setDireccionManual] = useState('');

  // Estados para validación en tiempo real
  const [isValidating, setIsValidating] = useState(false);
  const [validationStatus, setValidationStatus] = useState<'idle' | 'validating' | 'valid' | 'invalid'>('idle');

  // Estados para fotos
  const [fotosLocales, setFotosLocales] = useState<string[]>([]);

  useEffect(() => {
    cargarDatosTaller();
  }, []);

  // ✅ VALIDACIÓN EN TIEMPO REAL CON DEBOUNCE
  useEffect(() => {
    if (!searchQuery.trim()) {
      setValidationStatus('idle');
      setSearchResults([]);
      return;
    }

    // Validar que tenga al menos 8 caracteres y un número
    if (searchQuery.length < 8 || !/\d+/.test(searchQuery)) {
      setValidationStatus('invalid');
      setSearchResults([]);
      return;
    }

    // Debounce de 500ms para evitar demasiadas llamadas
    const timeoutId = setTimeout(async () => {
      try {
        setIsValidating(true);
        setValidationStatus('validating');

        // ✅ BÚSQUEDA INTELIGENTE: Buscar tanto dirección como comuna
        const resultados = await buscarDireccionesInteligentes(searchQuery.trim());

        if (resultados.length > 0) {
          setSearchResults(resultados);
          setValidationStatus('valid');
        } else {
          setSearchResults([]);
          setValidationStatus('invalid');
        }
      } catch (error) {
        console.error('Error en validación automática:', error);
        setValidationStatus('invalid');
        setSearchResults([]);
      } finally {
        setIsValidating(false);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const cargarDatosTaller = async () => {
    try {
      setLoading(true);

      // Cargar datos del proveedor desde el contexto
      if (estadoProveedor?.datos_proveedor) {
        console.log('📋 Cargando datos del taller desde contexto:', {
          nombre: estadoProveedor.nombre,
          descripcion: estadoProveedor.datos_proveedor.descripcion,
          direccion_fisica: estadoProveedor.datos_proveedor.direccion_fisica,
        });

        // Obtener dirección desde la nueva estructura
        const direccionCompleta = estadoProveedor.datos_proveedor.direccion_fisica?.direccion_completa || '';
        const comuna = estadoProveedor.datos_proveedor.direccion_fisica?.comuna || '';
        const ciudad = estadoProveedor.datos_proveedor.direccion_fisica?.ciudad || '';
        const region = estadoProveedor.datos_proveedor.direccion_fisica?.region || '';

        setDatosTaller({
          nombre: estadoProveedor.nombre || '',
          descripcion: estadoProveedor.datos_proveedor.descripcion || '',
          direccion: direccionCompleta,
          comuna: comuna,
          ciudad: ciudad,
          region: region,
          fotos: [], // Las fotos se cargarán desde el backend
        });

        console.log('📍 Datos de dirección cargados:', {
          direccion_completa: direccionCompleta,
          comuna: comuna,
          ciudad: ciudad,
          region: region
        });

        // Si ya hay una dirección, no necesitamos extraer información adicional
        // porque ya viene estructurada desde el backend
      }
    } catch (error) {
      console.error('Error cargando datos del taller:', error);
      Alert.alert('Error', 'No se pudieron cargar los datos del taller');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof DatosTaller, value: string) => {
    setDatosTaller(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  // ✅ MANEJAR CAMBIOS EN LA BÚSQUEDA DE DIRECCIÓN
  const handleSearchQueryChange = (value: string) => {
    setSearchQuery(value);

    // ✅ LOG DE CAMBIO DE BÚSQUEDA
    if (value.trim()) {
      const numeroMatch = value.match(/\d+/);
      const textoLimpio = value.replace(/\d+/g, '').trim();
      console.log('🔍 Cambio en búsqueda:', {
        valor: value,
        tiene_numero: !!numeroMatch,
        numero: numeroMatch ? numeroMatch[0] : 'No',
        texto_limpio: textoLimpio,
        longitud_texto: textoLimpio.length
      });
    }

    // Resetear estado de validación
    if (!value.trim()) {
      setValidationStatus('idle');
      setSearchResults([]);
    }
  };

  // Función para buscar direcciones reales en Chile usando OpenStreetMap
  const buscarDireccionesReales = async (query: string): Promise<DireccionResultado[]> => {
    try {
      // Construir URL de búsqueda para Chile
      const searchUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query + ', Chile')}&countrycodes=cl&limit=10&addressdetails=1&accept-language=es`;

      console.log('🔍 Buscando dirección:', searchUrl);

      const response = await fetch(searchUrl);
      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }

      const data = await response.json();
      console.log('📍 Resultados de búsqueda:', data);

      // ✅ FILTRADO INTELIGENTE: Aceptar direcciones Y comunas de Chile
      const resultadosFiltrados = data.filter((item: any) => {
        const { address, addresstype, class: itemClass } = item;

        // ✅ DEBE SER DE CHILE
        if (!address || address.country !== 'Chile') return false;

        // ✅ DEBE TENER UBICACIÓN (ciudad, estado, suburb, neighbourhood)
        const tieneUbicacion = address.city || address.state || address.suburb || address.neighbourhood;
        if (!tieneUbicacion) return false;

        // ✅ ACEPTAR MÚLTIPLES TIPOS DE DIRECCIONES:
        // 1. Direcciones específicas con calle (road)
        if (address.road) return true;

        // 2. Comunas/suburbios (suburb, neighbourhood)
        if (addresstype === 'suburb' || addresstype === 'neighbourhood') return true;

        // 3. Límites administrativos (boundary) que representan comunas
        if (itemClass === 'boundary' && (address.suburb || address.neighbourhood)) return true;

        // 4. Lugares (place) que pueden ser comunas
        if (addresstype === 'place' && (address.suburb || address.neighbourhood)) return true;

        return false;
      });

      console.log('🔍 Direcciones filtradas (válidas):', resultadosFiltrados.length);

      // ✅ LOG DETALLADO DE FILTRADO
      resultadosFiltrados.forEach((item: any, index: number) => {
        console.log(`🔍 Item ${index + 1}:`, {
          addresstype: item.addresstype,
          class: item.class,
          road: item.address.road,
          suburb: item.address.suburb,
          neighbourhood: item.address.neighbourhood,
          city: item.address.city,
          state: item.address.state,
          display_name: item.display_name
        });
      });

      // ✅ ENRIQUECER RESULTADOS CON NÚMERO EXTRAÍDO DEL QUERY
      const resultadosEnriquecidos = resultadosFiltrados.map((item: any) => {
        // ✅ EXTRAER NÚMERO DEL QUERY ORIGINAL (PRIORIDAD ALTA)
        const numeroExtraido = query.match(/\d+/)?.[0] || '';

        console.log('🔍 Enriqueciendo resultado:', {
          road: item.address.road,
          numeroExtraido: numeroExtraido,
          house_number_original: item.address.house_number,
          postcode: item.address.postcode,
          addresstype: item.addresstype,
          class: item.class,
          suburb: item.address.suburb,
          neighbourhood: item.address.neighbourhood
        });

        return {
          ...item,
          address: {
            ...item.address,
            // ✅ PRIORIDAD: Número del query > house_number original > vacío
            house_number: numeroExtraido || item.address.house_number || '',
            // ✅ ENRIQUECER CON INFORMACIÓN ADICIONAL
            road: item.address.road || item.address.suburb || item.address.neighbourhood || '',
          }
        };
      });

      console.log('🔍 Resultados enriquecidos con número:', resultadosEnriquecidos.length);

      return resultadosEnriquecidos.map((item: any) => ({
        display_name: item.display_name,
        lat: item.lat,
        lon: item.lon,
        address: item.address
      }));

    } catch (error) {
      console.error('❌ Error buscando direcciones:', error);
      throw error;
    }
  };

  // ✅ VALIDACIÓN AUTOMÁTICA - NO SE NECESITA BOTÓN
  const handleBuscarDireccion = () => {
    // Solo mostrar el modal si hay resultados válidos
    if (validationStatus === 'valid' && searchResults.length > 0) {
      setShowAddressModal(true);
    }
  };

  // ✅ FUNCIÓN PARA GEOCODIFICAR DIRECCIONES
  const geocodificarDireccion = async (direccion: string): Promise<{ lat: number, lng: number } | null> => {
    try {
      const searchUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(direccion + ', Chile')}&countrycodes=cl&limit=1&addressdetails=1&accept-language=es`;
      console.log('📍 Geocodificando dirección:', searchUrl);

      const response = await fetch(searchUrl);
      if (response.ok) {
        const data = await response.json();

        if (data && data.length > 0) {
          const resultado = data[0];
          const lat = parseFloat(resultado.lat);
          const lng = parseFloat(resultado.lon);

          console.log('📍 Coordenadas obtenidas:', { lat, lng, direccion });
          return { lat, lng };
        }
      }

      console.log('❌ No se pudo geocodificar la dirección:', direccion);
      return null;
    } catch (error) {
      console.error('❌ Error en geocodificación:', error);
      return null;
    }
  };

  // ✅ BÚSQUEDA INTELIGENTE: Buscar tanto dirección como comuna
  const buscarDireccionesInteligentes = async (query: string): Promise<DireccionResultado[]> => {
    try {
      console.log('🧠 Búsqueda inteligente iniciada para:', query);

      // ✅ EXTRAER COMPONENTES DE LA BÚSQUEDA
      const numeroMatch = query.match(/\d+/);
      const numero = numeroMatch ? numeroMatch[0] : '';
      const textoLimpio = query.replace(/\d+/g, '').trim();

      console.log('🧠 Componentes extraídos:', {
        query_original: query,
        numero: numero,
        texto_limpio: textoLimpio
      });

      // ✅ BÚSQUEDA 1: Dirección completa (como antes)
      const resultadosDireccion = await buscarDireccionesReales(query);
      console.log('🧠 Resultados de dirección completa:', resultadosDireccion.length);

      // ✅ BÚSQUEDA 2: Solo comuna/barrio (sin número)
      let resultadosComuna: DireccionResultado[] = [];
      if (textoLimpio.length >= 3) {
        try {
          const searchUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(textoLimpio + ', Chile')}&countrycodes=cl&limit=5&addressdetails=1&accept-language=es`;
          console.log('🧠 Buscando comuna:', searchUrl);

          const response = await fetch(searchUrl);
          if (response.ok) {
            const data = await response.json();

            // ✅ FILTRAR SOLO COMUNAS/SUBURBIOS
            const comunasFiltradas = data.filter((item: any) => {
              const { address, addresstype, class: itemClass } = item;

              if (!address || address.country !== 'Chile') return false;

              // ✅ ACEPTAR COMUNAS, BARRIOS Y LÍMITES ADMINISTRATIVOS
              return (
                addresstype === 'suburb' ||
                addresstype === 'neighbourhood' ||
                addresstype === 'place' ||
                (itemClass === 'boundary' && (address.suburb || address.neighbourhood))
              );
            });

            // ✅ ENRIQUECER COMUNAS CON NÚMERO DEL QUERY
            resultadosComuna = comunasFiltradas.map((item: any) => ({
              ...item,
              address: {
                ...item.address,
                house_number: numero, // ✅ USAR NÚMERO DEL QUERY
                road: item.address.suburb || item.address.neighbourhood || item.address.road || '',
              }
            }));

            console.log('🧠 Resultados de comuna encontrados:', resultadosComuna.length);
          }
        } catch (error) {
          console.log('🧠 Error buscando comuna:', error);
        }
      }

      // ✅ COMBINAR Y DEDUPLICAR RESULTADOS
      const todosLosResultados = [...resultadosDireccion, ...resultadosComuna];

      // ✅ DEDUPLICAR POR display_name
      const resultadosUnicos = todosLosResultados.filter((item, index, self) =>
        index === self.findIndex(t => t.display_name === item.display_name)
      );

      console.log('🧠 Resultados finales combinados:', {
        direccion: resultadosDireccion.length,
        comuna: resultadosComuna.length,
        total: resultadosUnicos.length
      });

      return resultadosUnicos;

    } catch (error) {
      console.error('Error en búsqueda inteligente:', error);
      // ✅ FALLBACK: Usar búsqueda original si falla la inteligente
      return await buscarDireccionesReales(query);
    }
  };

  // ✅ FUNCIÓN CORREGIDA: Ahora captura la dirección COMPLETA con número
  const handleSeleccionarDireccion = (resultado: DireccionResultado) => {
    const { address } = resultado;

    // ✅ EXTRAER DIRECCIÓN COMPLETA CON NÚMERO (MANEJO INTELIGENTE)
    const numeroCasa = address.house_number || '';

    // ✅ DETERMINAR CALLE/UBICACIÓN PRINCIPAL
    let calle = '';
    if (address.road && address.road !== address.suburb && address.road !== address.neighbourhood) {
      calle = address.road; // ✅ Calle específica (diferente de comuna)
    } else if (address.suburb) {
      calle = address.suburb; // ✅ Comuna como ubicación principal
    } else if (address.neighbourhood) {
      calle = address.neighbourhood; // ✅ Barrio como ubicación principal
    }

    console.log('🧠 Ubicación principal determinada:', {
      road: address.road,
      suburb: address.suburb,
      neighbourhood: address.neighbourhood,
      calle_final: calle
    });

    // ✅ DETERMINAR COMUNA, CIUDAD Y REGIÓN
    const comuna = address.suburb || address.neighbourhood || address.city || '';
    const ciudad = address.city || address.state || '';
    const region = address.state || '';

    // ✅ CONSTRUIR DIRECCIÓN EN FORMATO GOOGLE MAPS: Calle + Número + Comuna + Ciudad + País
    const direccionCompleta = `${calle} ${numeroCasa}`.trim();

    // ✅ FORMATO SIMPLIFICADO: Calle Número, Comuna, Ciudad, Chile
    const direccionSimplificada = `${direccionCompleta}, ${comuna}, ${ciudad}, Chile`.replace(/,\s*,/g, ',').replace(/^,\s*/, '').replace(/,\s*$/, '');

    // ✅ FORMATO COMPLETO (para debugging)
    const direccionCompletaConDetalles = `${direccionCompleta}, ${comuna}, ${ciudad}, ${region}`.replace(/,\s*,/g, ',').replace(/^,\s*/, '').replace(/,\s*$/, '');

    console.log('📍 Dirección seleccionada (FORMATO GOOGLE MAPS):', {
      numero_casa: numeroCasa,
      calle: calle,
      direccion_completa: direccionCompleta,
      direccion_simplificada: direccionSimplificada, // ✅ FORMATO FINAL
      direccion_completa_debug: direccionCompletaConDetalles, // ✅ PARA DEBUGGING
      comuna,
      ciudad,
      region,
      display_name_original: resultado.display_name,
      // ✅ INFORMACIÓN ADICIONAL PARA DEBUGGING
      numero_extraido_del_query: searchQuery.match(/\d+/)?.[0] || 'No encontrado',
      query_original: searchQuery
    });

    // ✅ ACTUALIZAR ESTADO LOCAL INMEDIATAMENTE (INCLUYENDO COORDENADAS)
    setDatosTaller(prev => {
      const nuevoEstado = {
        ...prev,
        direccion: direccionSimplificada, // ✅ FORMATO GOOGLE MAPS: Calle Número, Comuna, Ciudad, Chile
        comuna,
        ciudad,
        region,
        latitud: parseFloat(resultado.lat), // ✅ CAPTURAR COORDENADAS
        longitud: parseFloat(resultado.lon), // ✅ CAPTURAR COORDENADAS
      };

      console.log('🔄 Estado del taller actualizado (CON DIRECCIÓN COMPLETA Y COORDENADAS):', {
        anterior: prev.direccion,
        nuevo: nuevoEstado.direccion,
        numero_casa: numeroCasa,
        calle: calle,
        comuna: nuevoEstado.comuna,
        ciudad: nuevoEstado.ciudad,
        region: nuevoEstado.region,
        latitud: nuevoEstado.latitud,
        longitud: nuevoEstado.longitud
      });

      return nuevoEstado;
    });

    // ✅ MARCAR QUE HAY CAMBIOS PENDIENTES
    setHasChanges(true);

    setShowAddressModal(false);
    setSearchQuery('');

    // ✅ MOSTRAR CONFIRMACIÓN CON FORMATO GOOGLE MAPS
    const mensajeConfirmacion = numeroCasa
      ? `Se ha seleccionado la dirección:\n\n${direccionSimplificada}\n\n📍 Número: ${numeroCasa}\n🏢 Calle: ${calle}\n🏘️ Comuna: ${comuna || 'No especificada'}\n🏙️ Ciudad: ${ciudad || 'No especificada'}\n🌍 País: Chile`
      : `Se ha seleccionado la dirección:\n\n${direccionSimplificada}\n\n🏢 Calle: ${calle}\n🏘️ Comuna: ${comuna || 'No especificada'}\n🏙️ Ciudad: ${ciudad || 'No especificada'}\n🌍 País: Chile\n\n⚠️ Nota: El número de casa se extrajo de tu búsqueda`;

    Alert.alert(
      numeroCasa ? '✅ Dirección Seleccionada' : '📍 Dirección Seleccionada',
      mensajeConfirmacion,
      [{ text: 'Perfecto', style: 'default' }]
    );
  };

  // ✅ FUNCIÓN MEJORADA: Extraer información de ubicación con dirección completa
  const extraerInformacionUbicacion = async (direccion: string) => {
    try {
      console.log('🔍 Extrayendo información de ubicación de dirección existente:', direccion);

      // ✅ EXTRAER NÚMERO DEL QUERY ORIGINAL
      const numeroExtraido = direccion.match(/\d+/)?.[0] || '';

      const resultados = await buscarDireccionesReales(direccion);
      if (resultados.length > 0) {
        const resultado = resultados[0];
        const { address } = resultado;

        // ✅ EXTRAER INFORMACIÓN COMPLETA (MANEJO INTELIGENTE)
        const numeroCasa = address.house_number || numeroExtraido || '';

        // ✅ DETERMINAR CALLE/UBICACIÓN PRINCIPAL
        let calle = '';
        if (address.road) {
          calle = address.road; // ✅ Calle específica
        } else if (address.suburb) {
          calle = address.suburb; // ✅ Comuna como ubicación principal
        } else if (address.neighbourhood) {
          calle = address.neighbourhood; // ✅ Barrio como ubicación principal
        }

        const comuna = address.suburb || address.neighbourhood || address.city || '';
        const ciudad = address.city || address.state || '';
        const region = address.state || '';

        // ✅ CONSTRUIR DIRECCIÓN EN FORMATO GOOGLE MAPS
        const direccionCompleta = `${calle} ${numeroCasa}`.trim();
        const direccionSimplificada = `${direccionCompleta}, ${comuna}, ${ciudad}, Chile`.replace(/,\s*,/g, ',').replace(/^,\s*/, '').replace(/,\s*$/, '');
        const direccionCompletaConDetalles = `${direccionCompleta}, ${comuna}, ${ciudad}, ${region}`.replace(/,\s*,/g, ',').replace(/^,\s*/, '').replace(/,\s*$/, '');

        console.log('📍 Información de ubicación extraída:', {
          numero_casa: numeroCasa,
          calle: calle,
          direccion_completa: direccionCompleta,
          direccion_simplificada: direccionSimplificada, // ✅ FORMATO FINAL
          direccion_completa_debug: direccionCompletaConDetalles, // ✅ PARA DEBUGGING
          comuna,
          ciudad,
          region,
          numero_extraido_del_query: numeroExtraido
        });

        setDatosTaller(prev => ({
          ...prev,
          direccion: direccionSimplificada, // ✅ FORMATO GOOGLE MAPS: Calle Número, Comuna, Ciudad, Chile
          comuna,
          ciudad,
          region,
        }));
      } else {
        console.log('⚠️ No se encontraron resultados para extraer información de ubicación');
      }
    } catch (error) {
      console.log('❌ No se pudo extraer información de ubicación de la dirección existente:', error);
    }
  };

  // ✅ FUNCIÓN MEJORADA: Validación de dirección manual con número
  const validarDireccionManual = async () => {
    if (!direccionManual.trim()) {
      Alert.alert('Error', 'Por favor ingresa una dirección para validar');
      return;
    }

    // ✅ VALIDACIÓN MEJORADA: Debe incluir número de casa
    const query = direccionManual.trim();
    if (query.length < 8) {
      Alert.alert(
        'Dirección muy corta',
        'Por favor ingresa una dirección más específica que incluya el número de casa (ej: "Manuel de Amat 2960")'
      );
      return;
    }

    // ✅ VERIFICAR QUE TENGA NÚMERO
    const tieneNumero = /\d+/.test(query);
    if (!tieneNumero) {
      Alert.alert(
        'Falta número de casa',
        'La dirección debe incluir el número de casa para ser válida (ej: "Manuel de Amat 2960")'
      );
      return;
    }

    try {
      setSearching(true);

      const resultados = await buscarDireccionesReales(query);

      if (resultados.length === 0) {
        Alert.alert(
          'Dirección no válida',
          'La dirección ingresada no se encontró en Chile o no tiene número de casa. Por favor, ingresa una dirección válida y existente con número.',
          [{ text: 'Entendido', style: 'default' }]
        );
        return;
      }

      // ✅ Si hay resultados, mostrar el modal para seleccionar
      setSearchResults(resultados);
      setShowAddressModal(true);

    } catch (error) {
      console.error('Error validando dirección:', error);
      Alert.alert(
        'Error de validación',
        'No se pudo validar la dirección. Verifica tu conexión a internet e intenta nuevamente.'
      );
    } finally {
      setSearching(false);
    }
  };

  const handleSeleccionarFoto = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const nuevaFoto = result.assets[0].uri;
        setFotosLocales(prev => [...prev, nuevaFoto]);
        setHasChanges(true);
      }
    } catch (error) {
      console.error('Error seleccionando foto:', error);
      Alert.alert('Error', 'No se pudo seleccionar la foto');
    }
  };

  const handleEliminarFoto = (index: number) => {
    setFotosLocales(prev => prev.filter((_, i) => i !== index));
    setHasChanges(true);
  };

  // ✅ FUNCIÓN CORREGIDA: Ahora guarda realmente en el backend
  const handleGuardar = async () => {
    if (!datosTaller.nombre.trim()) {
      Alert.alert('Error', 'El nombre del taller es obligatorio');
      return;
    }

    if (!datosTaller.direccion.trim()) {
      Alert.alert('Error', 'La dirección del taller es obligatoria');
      return;
    }

    try {
      setSaving(true);

      console.log('💾 Guardando datos del taller:', datosTaller);

      // ✅ VERIFICAR QUE TENEMOS COORDENADAS VÁLIDAS
      if (!datosTaller.latitud || !datosTaller.longitud) {
        console.log('⚠️ No hay coordenadas válidas, geocodificando dirección...');

        // ✅ GEOCODIFICAR LA DIRECCIÓN SI NO TENEMOS COORDENADAS
        const coordenadas = await geocodificarDireccion(datosTaller.direccion);
        if (coordenadas) {
          datosTaller.latitud = coordenadas.lat;
          datosTaller.longitud = coordenadas.lng;
          console.log('📍 Coordenadas obtenidas por geocodificación:', coordenadas);
        } else {
          throw new Error('No se pudo obtener las coordenadas de la dirección');
        }
      }

      // ✅ ACTUALIZAR EN EL BACKEND REAL (INCLUYENDO COORDENADAS)
      // Usar la API real para actualizar el perfil del proveedor
      const datosActualizados = {
        nombre: datosTaller.nombre,
        descripcion: datosTaller.descripcion,
        direccion: datosTaller.direccion,
        comuna: datosTaller.comuna,
        ciudad: datosTaller.ciudad,
        region: datosTaller.region,
        latitud: datosTaller.latitud,
        longitud: datosTaller.longitud,
      };

      console.log('📤 Enviando datos al backend (CON COORDENADAS):', datosActualizados);

      // Llamada real a la API del backend
      const response = await perfilAPI.actualizarDatosProveedor(datosActualizados);

      console.log('✅ Respuesta del backend:', response);

      Alert.alert('Éxito', 'Los datos del taller se han guardado correctamente');
      setHasChanges(false);

      // ✅ REFRESCAR ESTADO DEL PROVEEDOR PARA SINCRONIZAR
      await refrescarEstadoProveedor();

      // ✅ CONFIRMAR QUE LOS DATOS SE GUARDARON
      console.log('🔄 Estado del proveedor refrescado');

      // ✅ MOSTRAR CONFIRMACIÓN DE LA NUEVA DIRECCIÓN
      Alert.alert(
        'Dirección Actualizada',
        `La dirección del taller se ha actualizado a:\n\n${datosTaller.direccion}`,
        [{ text: 'Perfecto', style: 'default' }]
      );

    } catch (error) {
      console.error('❌ Error guardando datos del taller:', error);
      Alert.alert(
        'Error',
        'No se pudieron guardar los datos del taller. Verifica tu conexión e intenta nuevamente.'
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
        <View style={styles.loadingContainer}>
          <LoadingSpinner />
          <Text style={styles.loadingText}>Cargando datos del taller...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <Header
        title="Gestionar Taller"
        showBack={true}
        onBackPress={() => router.back()}
        rightComponent={
          <TouchableOpacity
            style={[styles.saveButton, (!hasChanges || saving) && styles.saveButtonDisabled]}
            onPress={handleGuardar}
            disabled={!hasChanges || saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.saveButtonText}>Guardar</Text>
            )}
          </TouchableOpacity>
        }
      />

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Información del Taller */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Información del Taller</Text>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Nombre del Taller *</Text>
            <TextInput
              style={styles.textInput}
              value={datosTaller.nombre}
              onChangeText={(value) => handleInputChange('nombre', value)}
              placeholder="Ingresa el nombre de tu taller"
              placeholderTextColor="#8E8E93"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Descripción</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={datosTaller.descripcion}
              onChangeText={(value) => handleInputChange('descripcion', value)}
              placeholder="Describe los servicios y especialidades de tu taller"
              placeholderTextColor="#8E8E93"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>
        </View>

        {/* Dirección del Taller */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ubicación del Taller</Text>
          <Text style={styles.sectionSubtitle}>
            Ingresa la dirección exacta de tu taller. Solo se aceptan direcciones reales y existentes en Chile.
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/actualizar-ubicacion')}
            style={{ marginBottom: 12 }}
            hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
          >
            <Text style={{ fontSize: 14, color: '#007EA7', fontWeight: '600' }}>
              O usar el asistente con GPS y mapa (como la app de usuarios)
            </Text>
          </TouchableOpacity>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Dirección *</Text>

            {/* ✅ CAMPO DE BÚSQUEDA CON VALIDACIÓN EN TIEMPO REAL */}
            <View style={styles.addressInputContainer}>
              <TextInput
                style={[
                  styles.textInput,
                  styles.addressInput,
                  validationStatus === 'valid' ? styles.validInput : null,
                  validationStatus === 'invalid' ? styles.invalidInput : null
                ]}
                value={searchQuery}
                onChangeText={handleSearchQueryChange}
                placeholder="Escribe dirección COMPLETA (ej: Manuel de Amat 2960)"
                placeholderTextColor="#8E8E93"
                returnKeyType="search"
                onSubmitEditing={handleBuscarDireccion}
              />

              {/* ✅ INDICADOR DE ESTADO DE VALIDACIÓN */}
              <View style={styles.validationIndicator}>
                {validationStatus === 'validating' && (
                  <ActivityIndicator size="small" color="#007AFF" />
                )}
                {validationStatus === 'valid' && (
                  <MaterialIcons name="check-circle" size={20} color="#34C759" />
                )}
                {validationStatus === 'invalid' && searchQuery.length >= 8 && (
                  <MaterialIcons name="error" size={20} color="#FF3B30" />
                )}
              </View>
            </View>

            {/* ✅ INSTRUCCIONES Y ESTADO DE VALIDACIÓN */}
            <View style={styles.validationInfo}>
              <Text style={styles.addressInstructions}>
                💡 <Text style={styles.instructionBold}>IMPORTANTE:</Text> Debes incluir el número de la casa/edificio para que la dirección sea válida.
              </Text>

              {/* ✅ ESTADO DE VALIDACIÓN EN TIEMPO REAL */}
              {validationStatus === 'validating' && (
                <Text style={styles.validatingText}>
                  🔍 Validando dirección...
                </Text>
              )}
              {validationStatus === 'valid' && searchResults.length > 0 && (
                <TouchableOpacity
                  style={styles.selectAddressButton}
                  onPress={handleBuscarDireccion}
                >
                  <Text style={styles.selectAddressButtonText}>
                    📍 Seleccionar dirección ({searchResults.length} opciones)
                  </Text>
                </TouchableOpacity>
              )}
              {validationStatus === 'invalid' && searchQuery.length >= 8 && (
                <Text style={styles.invalidText}>
                  ❌ No se encontraron direcciones válidas. Verifica que la dirección sea correcta.
                </Text>
              )}
            </View>

            {/* ✅ DIRECCIÓN SELECCIONADA - Ahora se muestra correctamente */}
            {datosTaller.direccion && (
              <View style={styles.selectedAddress}>
                <MaterialIcons name="location-on" size={16} color="#28a745" />
                <Text style={styles.selectedAddressText}>{datosTaller.direccion}</Text>
              </View>
            )}

            {/* ✅ INFORMACIÓN DE UBICACIÓN EXTRAÍDA - Ahora se muestra correctamente */}
            {(datosTaller.comuna || datosTaller.ciudad || datosTaller.region) && (
              <View style={styles.locationInfo}>
                <Text style={styles.locationInfoTitle}>Información de ubicación:</Text>
                {datosTaller.comuna && (
                  <View style={styles.locationItem}>
                    <Text style={styles.locationLabel}>Comuna:</Text>
                    <Text style={styles.locationValue}>{datosTaller.comuna}</Text>
                  </View>
                )}
                {datosTaller.ciudad && (
                  <View style={styles.locationItem}>
                    <Text style={styles.locationLabel}>Ciudad:</Text>
                    <Text style={styles.locationValue}>{datosTaller.ciudad}</Text>
                  </View>
                )}
                {datosTaller.region && (
                  <View style={styles.locationItem}>
                    <Text style={styles.locationLabel}>Región:</Text>
                    <Text style={styles.locationValue}>{datosTaller.region}</Text>
                  </View>
                )}
              </View>
            )}

            {/* Campo de dirección manual para casos especiales */}
            {/*<View style={styles.manualAddressContainer}>
              <Text style={styles.manualAddressLabel}>¿No encuentras tu dirección?</Text>
              <Text style={styles.manualAddressSubtitle}>
                Si tu dirección no aparece en la búsqueda, puedes ingresarla manualmente para validación:
              </Text>
              <View style={styles.manualAddressInputContainer}>
                <TextInput
                  style={[styles.textInput, styles.manualAddressInput]}
                  value={direccionManual}
                  onChangeText={setDireccionManual}
                  placeholder="Ingresa la dirección completa manualmente"
                  placeholderTextColor="#8E8E93"
                  multiline
                  numberOfLines={2}
                />
                <TouchableOpacity 
                  style={styles.validateButton} 
                  onPress={validarDireccionManual}
                  disabled={!direccionManual.trim() || searching}
                >
                  {searching ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.validateButtonText}>Validar</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>*/}
          </View>
        </View>

        {/* Fotos del Taller */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Fotos del Taller</Text>
          <Text style={styles.sectionSubtitle}>
            Agrega fotos de tu taller para que los clientes puedan conocer mejor tus instalaciones
          </Text>

          <TouchableOpacity style={styles.addPhotoButton} onPress={handleSeleccionarFoto}>
            <MaterialIcons name="add-photo-alternate" size={32} color="#007AFF" />
            <Text style={styles.addPhotoText}>Agregar Foto</Text>
          </TouchableOpacity>

          {fotosLocales.length > 0 && (
            <View style={styles.photosGrid}>
              {fotosLocales.map((foto, index) => (
                <View key={index} style={styles.photoContainer}>
                  <Image source={{ uri: foto }} style={styles.photo} />
                  <TouchableOpacity
                    style={styles.removePhotoButton}
                    onPress={() => handleEliminarFoto(index)}
                  >
                    <MaterialIcons name="close" size={20} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Espacio al final */}
      </ScrollView>

      {/* Modal de búsqueda de direcciones */}
      <Modal
        visible={showAddressModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddressModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Seleccionar Dirección</Text>
              <TouchableOpacity onPress={() => setShowAddressModal(false)}>
                <MaterialIcons name="close" size={24} color="#8E8E93" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScrollView}>
              {searchResults.length === 0 ? (
                <View style={styles.noResultsContainer}>
                  <MaterialIcons name="search-off" size={48} color="#8E8E93" />
                  <Text style={styles.noResultsText}>No se encontraron direcciones</Text>
                  <Text style={styles.noResultsSubtext}>
                    Intenta con una búsqueda más específica
                  </Text>
                </View>
              ) : (
                searchResults.map((resultado, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.addressResult}
                    onPress={() => handleSeleccionarDireccion(resultado)}
                  >
                    <View style={styles.addressResultIcon}>
                      <MaterialIcons name="location-on" size={20} color="#007AFF" />
                    </View>
                    <View style={styles.addressResultContent}>
                      <Text style={styles.addressResultText}>{resultado.display_name}</Text>
                      <Text style={styles.addressResultDetails}>
                        {resultado.address.city && `${resultado.address.city}, `}
                        {resultado.address.state}
                      </Text>
                    </View>
                    <MaterialIcons name="chevron-right" size={20} color="#C7C7CC" />
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#8E8E93',
  },
  header: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  saveButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveButtonDisabled: {
    backgroundColor: '#C7C7CC',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 16,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 16,
    lineHeight: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#000000',
    backgroundColor: '#FFFFFF',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  addressInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addressInput: {
    flex: 1,
    marginRight: 12,
  },
  searchButton: {
    backgroundColor: '#007AFF',
    width: 44,
    height: 44,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedAddress: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    padding: 12,
    backgroundColor: '#F0F8FF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E3F2FD',
  },
  selectedAddressText: {
    fontSize: 14,
    color: '#28a745',
    marginLeft: 8,
    flex: 1,
  },
  locationInfo: {
    marginTop: 16,
    padding: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  locationInfoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#495057',
    marginBottom: 12,
  },
  locationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  locationLabel: {
    fontSize: 14,
    color: '#6C757D',
    fontWeight: '500',
  },
  locationValue: {
    fontSize: 14,
    color: '#495057',
    fontWeight: '600',
  },
  manualAddressContainer: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#FFF8E1',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFE082',
  },
  manualAddressLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F57C00',
    marginBottom: 8,
  },
  manualAddressSubtitle: {
    fontSize: 12,
    color: '#F57C00',
    marginBottom: 12,
    lineHeight: 16,
  },
  manualAddressInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  manualAddressInput: {
    flex: 1,
    marginRight: 12,
    height: 60,
  },
  validateButton: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  validateButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  addPhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    borderWidth: 2,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
    borderRadius: 12,
    backgroundColor: '#F0F8FF',
  },
  addPhotoText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
    marginLeft: 8,
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 16,
    gap: 12,
  },
  photoContainer: {
    position: 'relative',
    width: (screenWidth - 64) / 2,
    height: 120,
  },
  photo: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
  },
  removePhotoButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#FF3B30',
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
  },
  modalScrollView: {
    padding: 20,
  },
  noResultsContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noResultsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8E8E93',
    marginTop: 16,
  },
  noResultsSubtext: {
    fontSize: 14,
    color: '#C7C7CC',
    marginTop: 8,
    textAlign: 'center',
  },
  addressResult: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F7',
  },
  addressResultIcon: {
    marginRight: 12,
  },
  addressResultContent: {
    flex: 1,
  },
  addressResultText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000000',
    lineHeight: 22,
  },
  // ✅ NUEVOS ESTILOS PARA VALIDACIÓN EN TIEMPO REAL
  validInput: {
    borderColor: '#34C759',
    backgroundColor: '#F0FFF4',
  },
  invalidInput: {
    borderColor: '#FF3B30',
    backgroundColor: '#FFF5F5',
  },
  validationIndicator: {
    position: 'absolute',
    right: 16,
    top: '50%',
    transform: [{ translateY: -10 }],
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  validationInfo: {
    marginTop: 12,
  },
  validatingText: {
    fontSize: 14,
    color: '#007AFF',
    marginTop: 8,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  selectAddressButton: {
    backgroundColor: '#34C759',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 12,
    alignSelf: 'center',
  },
  selectAddressButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  invalidText: {
    fontSize: 14,
    color: '#FF3B30',
    marginTop: 8,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  addressResultDetails: {
    fontSize: 14,
    color: '#8E8E93',
  },
  // ✅ NUEVOS ESTILOS PARA INSTRUCCIONES
  addressInstructions: {
    fontSize: 12,
    color: '#FF6B35',
    marginTop: 8,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFF3E0',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FFCC80',
    lineHeight: 16,
  },
  instructionBold: {
    fontWeight: '700',
    color: '#E65100',
  },
});
