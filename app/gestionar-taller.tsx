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
  Dimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { useAuth } from '@/context/AuthContext';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { perfilAPI } from '@/services/api';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import Header from '@/components/Header';
import { useTheme } from '@/app/design-system/theme/useTheme';
import { InstitutionalIcon } from '@/components/ui/InstitutionalIcon';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import { COLORS, SPACING, withOpacity, SHADOWS, noShadow, platformShadow } from '@/app/design-system/tokens';
import {
  institutionalStatusColors,
  institutionalCardStyles,
} from '@/app/design-system/styles/institutionalSemantic';
import { InstitutionalButton } from '@/app/design-system/components/InstitutionalButton';
import { InstitutionalSectionHeader } from '@/app/design-system/components/InstitutionalSectionHeader';

const I = COLORS.institutional;
const successStatus = institutionalStatusColors('success');
const errorStatus = institutionalStatusColors('error');
const warningStatus = institutionalStatusColors('warning');
const primaryStatus = institutionalStatusColors('primary');

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
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  /** Mismo look que `app/(tabs)/index.tsx`: siempre claro (glass + gradiente), sin seguir system dark mode. */
  const primary500 = I.primary;
  const gradientColors = [I.surfaceStrong, I.surfaceSoft, I.canvas] as const;
  const gradientLocations = [0, 0.35, 1] as const;
  const headerBg = I.surfaceStrong;
  const blurTint = 'light' as const;
  const blurIntensity = 60;
  const textPrimary = I.ink;
  const textMuted = I.body;
  const textSubtle = I.mutedSoft;
  const inputBg = withOpacity(I.canvas, 0.82);
  const inputBorder = withOpacity(I.ink, 0.08);
  const validBg = successStatus.bg;
  const invalidBg = errorStatus.bg;
  const linkColor = I.primary;
  const saveDisabledBg = I.primaryDisabled;
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

  // Modalidad de atención: en_taller / a_domicilio / ambas. Editable tras el registro.
  type Modalidad = 'en_taller' | 'a_domicilio' | 'ambas';
  const [modalidad, setModalidad] = useState<Modalidad>('en_taller');
  const soloDomicilio = modalidad === 'a_domicilio';

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

        const modalidadActual = estadoProveedor.datos_proveedor.modalidad_atencion;
        if (modalidadActual === 'en_taller' || modalidadActual === 'a_domicilio' || modalidadActual === 'ambas') {
          setModalidad(modalidadActual);
        }

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

  const handleModalidadChange = (value: Modalidad) => {
    if (value === modalidad) return;
    setModalidad(value);
    setHasChanges(true);
  };

  const MODALIDAD_OPCIONES: { value: Modalidad; titulo: string; descripcion: string; icon: string }[] = [
    { value: 'en_taller', titulo: 'En taller', descripcion: 'Los clientes llevan su vehículo a tu local físico.', icon: 'business' },
    { value: 'a_domicilio', titulo: 'A domicilio', descripcion: 'Tus mecánicos atienden donde está el cliente.', icon: 'directions-car' },
    { value: 'ambas', titulo: 'Ambas', descripcion: 'Atiendes en tu local y también a domicilio.', icon: 'sync' },
  ];

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
      Alert.alert('Error', 'El nombre es obligatorio');
      return;
    }

    // La dirección física solo es obligatoria si atiende en local (en_taller/ambas).
    if (!soloDomicilio && !datosTaller.direccion.trim()) {
      Alert.alert('Error', 'La dirección del taller es obligatoria');
      return;
    }

    try {
      setSaving(true);

      console.log('💾 Guardando datos del taller:', { ...datosTaller, modalidad });

      // ✅ VERIFICAR QUE TENEMOS COORDENADAS VÁLIDAS (solo si hay dirección)
      if (datosTaller.direccion.trim() && (!datosTaller.latitud || !datosTaller.longitud)) {
        console.log('⚠️ No hay coordenadas válidas, geocodificando dirección...');

        // ✅ GEOCODIFICAR LA DIRECCIÓN SI NO TENEMOS COORDENADAS
        const coordenadas = await geocodificarDireccion(datosTaller.direccion);
        if (coordenadas) {
          datosTaller.latitud = coordenadas.lat;
          datosTaller.longitud = coordenadas.lng;
          console.log('📍 Coordenadas obtenidas por geocodificación:', coordenadas);
        } else if (!soloDomicilio) {
          throw new Error('No se pudo obtener las coordenadas de la dirección');
        }
      }

      // ✅ ACTUALIZAR EN EL BACKEND REAL (INCLUYENDO COORDENADAS Y MODALIDAD)
      // Usar la API real para actualizar el perfil del proveedor
      const datosActualizados: Record<string, any> = {
        nombre: datosTaller.nombre,
        descripcion: datosTaller.descripcion,
        modalidad_atencion: modalidad,
      };
      if (datosTaller.direccion.trim()) {
        datosActualizados.direccion = datosTaller.direccion;
        datosActualizados.comuna = datosTaller.comuna;
        datosActualizados.ciudad = datosTaller.ciudad;
        datosActualizados.region = datosTaller.region;
        datosActualizados.latitud = datosTaller.latitud;
        datosActualizados.longitud = datosTaller.longitud;
      }

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

      // ✅ MOSTRAR CONFIRMACIÓN DE LA NUEVA DIRECCIÓN (solo si hay dirección)
      if (datosTaller.direccion.trim()) {
        Alert.alert(
          'Dirección Actualizada',
          `La dirección del taller se ha actualizado a:\n\n${datosTaller.direccion}`,
          [{ text: 'Perfecto', style: 'default' }]
        );
      }

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
      <View style={styles.root}>
        <LinearGradient
          colors={[...gradientColors]}
          locations={[...gradientLocations]}
          style={StyleSheet.absoluteFillObject}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />
        <SafeAreaView style={styles.safeTransparent} edges={['left', 'right', 'bottom']}>
          <View style={styles.loadingContainer}>
            <LoadingSpinner />
            <Text style={[styles.loadingText, { color: textMuted }]}>Cargando datos del taller...</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={[...gradientColors]}
        locations={[...gradientLocations]}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />
      <SafeAreaView style={styles.safeTransparent} edges={['left', 'right', 'bottom']}>
        <Header
          title="Gestionar Taller"
          showBack={true}
          onBackPress={() => router.back()}
          backgroundColor={headerBg}
          style={{ borderBottomWidth: 0, ...noShadow }}
        />

        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingBottom: insets.bottom + 96,
            paddingHorizontal: 20,
            paddingTop: 8,
          }}
        >
          {/* Modalidad de atención */}
          <View style={styles.glassOuter}>
            <BlurView intensity={blurIntensity} tint={blurTint} style={StyleSheet.absoluteFillObject} />
            <View style={styles.glassInner}>
              <InstitutionalSectionHeader title="Modalidad de atención" level="h4" style={styles.sectionHeaderWrap} />
              <Text style={[styles.sectionSubtitle, { color: textMuted }]}>
                Elige cómo atiendes a tus clientes. Puedes cambiarlo cuando quieras.
              </Text>
              {MODALIDAD_OPCIONES.map((op) => {
                const seleccionada = modalidad === op.value;
                return (
                  <TouchableOpacity
                    key={op.value}
                    activeOpacity={0.85}
                    onPress={() => handleModalidadChange(op.value)}
                    style={[
                      styles.modalidadOption,
                      {
                        backgroundColor: seleccionada ? validBg : inputBg,
                        borderColor: seleccionada ? I.semanticUp : inputBorder,
                      },
                    ]}
                  >
                    <InstitutionalIcon
                      name={op.icon as any}
                      size={22}
                      color={seleccionada ? successStatus.text : textMuted}
                      strokeWidth={ICON_STROKE_WIDTH}
                    />
                    <View style={styles.modalidadTextWrap}>
                      <Text style={[styles.modalidadTitulo, { color: textPrimary }]}>{op.titulo}</Text>
                      <Text style={[styles.modalidadDescripcion, { color: textMuted }]}>{op.descripcion}</Text>
                    </View>
                    <InstitutionalIcon
                      name={seleccionada ? 'radio-button-checked' : 'radio-button-unchecked'}
                      size={22}
                      color={seleccionada ? I.semanticUp : textSubtle}
                      strokeWidth={ICON_STROKE_WIDTH}
                    />
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Información del Taller */}
          <View style={styles.glassOuter}>
            <BlurView intensity={blurIntensity} tint={blurTint} style={StyleSheet.absoluteFillObject} />
            <View style={styles.glassInner}>
                <InstitutionalSectionHeader title="Información del Taller" level="h4" style={styles.sectionHeaderWrap} />

                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: textPrimary }]}>Nombre del Taller *</Text>
                  <TextInput
                    style={[
                      styles.textInput,
                      {
                        color: textPrimary,
                        backgroundColor: inputBg,
                        borderColor: inputBorder,
                      },
                    ]}
                    value={datosTaller.nombre}
                    onChangeText={(value) => handleInputChange('nombre', value)}
                    placeholder="Ingresa el nombre de tu taller"
                    placeholderTextColor={textSubtle}
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: textPrimary }]}>Descripción</Text>
                  <TextInput
                    style={[
                      styles.textInput,
                      styles.textArea,
                      {
                        color: textPrimary,
                        backgroundColor: inputBg,
                        borderColor: inputBorder,
                      },
                    ]}
                    value={datosTaller.descripcion}
                    onChangeText={(value) => handleInputChange('descripcion', value)}
                    placeholder="Describe los servicios y especialidades de tu taller"
                    placeholderTextColor={textSubtle}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />
                </View>
            </View>
          </View>

          {/* Dirección del Taller */}
          <View style={styles.glassOuter}>
            <BlurView intensity={blurIntensity} tint={blurTint} style={StyleSheet.absoluteFillObject} />
            <View style={styles.glassInner}>
                <InstitutionalSectionHeader title="Ubicación del Taller" level="h4" style={styles.sectionHeaderWrap} />
                <Text style={[styles.sectionSubtitle, { color: textMuted }]}>
                  {soloDomicilio
                    ? 'Como atiendes solo a domicilio, la dirección es opcional. Sirve como punto de referencia de tu zona.'
                    : 'Ingresa la dirección exacta de tu taller. Solo se aceptan direcciones reales y existentes en Chile.'}
                </Text>
                <TouchableOpacity
                  onPress={() => router.push('/actualizar-ubicacion')}
                  style={{ marginBottom: 12 }}
                  hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                >
                  <Text style={{ fontSize: 14, color: linkColor, fontWeight: '600' }}>
                    O usar el asistente con GPS y mapa (como la app de usuarios)
                  </Text>
                </TouchableOpacity>

                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: textPrimary }]}>
                    {soloDomicilio ? 'Dirección (opcional)' : 'Dirección *'}
                  </Text>

                  <View style={styles.addressInputContainer}>
                    <TextInput
                      style={[
                        styles.textInput,
                        styles.addressInput,
                        {
                          color: textPrimary,
                          backgroundColor: inputBg,
                          borderColor: inputBorder,
                        },
                        validationStatus === 'valid' && { borderColor: I.semanticUp, backgroundColor: validBg },
                        validationStatus === 'invalid' && searchQuery.length >= 8 && {
                          borderColor: I.semanticDown,
                          backgroundColor: invalidBg,
                        },
                      ]}
                      value={searchQuery}
                      onChangeText={handleSearchQueryChange}
                      placeholder="Escribe dirección COMPLETA (ej: Manuel de Amat 2960)"
                      placeholderTextColor={textSubtle}
                      returnKeyType="search"
                      onSubmitEditing={handleBuscarDireccion}
                    />

                    <View style={styles.validationIndicator}>
                      {validationStatus === 'validating' && (
                        <ActivityIndicator size="small" color={primary500} />
                      )}
                      {validationStatus === 'valid' && (
                        <InstitutionalIcon name="check-circle" size={20} color={I.semanticUp}  strokeWidth={ICON_STROKE_WIDTH} />
                      )}
                      {validationStatus === 'invalid' && searchQuery.length >= 8 && (
                        <InstitutionalIcon name="error" size={20} color={I.semanticDown}  strokeWidth={ICON_STROKE_WIDTH} />
                      )}
                    </View>
                  </View>

                  <View style={styles.validationInfo}>
                    <Text style={styles.addressInstructions}>
                      💡{' '}
                      <Text style={styles.instructionBold}>
                        IMPORTANTE:
                      </Text>{' '}
                      Debes incluir el número de la casa/edificio para que la dirección sea válida.
                    </Text>

                    {validationStatus === 'validating' && (
                      <Text style={[styles.validatingText, { color: primary500 }]}>
                        🔍 Validando dirección...
                      </Text>
                    )}
                    {validationStatus === 'valid' && searchResults.length > 0 && (
                      <TouchableOpacity
                        style={[styles.selectAddressButton, { backgroundColor: I.semanticUp }]}
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

                  {datosTaller.direccion && (
                    <View style={styles.selectedAddress}>
                      <InstitutionalIcon name="location-on" size={16} color={I.semanticUp}  strokeWidth={ICON_STROKE_WIDTH} />
                      <Text style={[styles.selectedAddressText, { color: successStatus.text }]}>
                        {datosTaller.direccion}
                      </Text>
                    </View>
                  )}

                  {(datosTaller.comuna || datosTaller.ciudad || datosTaller.region) && (
                    <View style={styles.locationInfo}>
                      <Text style={[styles.locationInfoTitle, { color: textMuted }]}>
                        Información de ubicación:
                      </Text>
                      {datosTaller.comuna && (
                        <View style={styles.locationItem}>
                          <Text style={[styles.locationLabel, { color: textSubtle }]}>Comuna:</Text>
                          <Text style={[styles.locationValue, { color: textPrimary }]}>{datosTaller.comuna}</Text>
                        </View>
                      )}
                      {datosTaller.ciudad && (
                        <View style={styles.locationItem}>
                          <Text style={[styles.locationLabel, { color: textSubtle }]}>Ciudad:</Text>
                          <Text style={[styles.locationValue, { color: textPrimary }]}>{datosTaller.ciudad}</Text>
                        </View>
                      )}
                      {datosTaller.region && (
                        <View style={styles.locationItem}>
                          <Text style={[styles.locationLabel, { color: textSubtle }]}>Región:</Text>
                          <Text style={[styles.locationValue, { color: textPrimary }]}>{datosTaller.region}</Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>
            </View>
          </View>

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
                  placeholderTextColor=I.mutedSoft
                  multiline
                  numberOfLines={2}
                />
                <TouchableOpacity 
                  style={styles.validateButton} 
                  onPress={validarDireccionManual}
                  disabled={!direccionManual.trim() || searching}
                >
                  {searching ? (
                    <ActivityIndicator size="small" color={I.onPrimary} />
                  ) : (
                    <Text style={styles.validateButtonText}>Validar</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>*/}

        {/* Fotos del Taller */}
        <View style={styles.glassOuter}>
          <BlurView intensity={blurIntensity} tint={blurTint} style={StyleSheet.absoluteFillObject} />
          <View style={styles.glassInner}>
              <InstitutionalSectionHeader title="Fotos del Taller" level="h4" style={styles.sectionHeaderWrap} />
              <Text style={[styles.sectionSubtitle, { color: textMuted }]}>
                Agrega fotos de tu taller para que los clientes puedan conocer mejor tus instalaciones
              </Text>

              <TouchableOpacity
                style={[styles.addPhotoButton, { borderColor: primary500 }]}
                onPress={handleSeleccionarFoto}
              >
                <InstitutionalIcon name="add-photo-alternate" size={32} color={primary500}  strokeWidth={ICON_STROKE_WIDTH} />
                <Text style={[styles.addPhotoText, { color: primary500 }]}>Agregar Foto</Text>
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
                        <InstitutionalIcon name="close" size={20} color={I.onPrimary}  strokeWidth={ICON_STROKE_WIDTH} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
          </View>
        </View>

        {/* Espacio al final */}
      </ScrollView>

        <View
          style={[
            styles.footerBar,
            {
              paddingBottom: Math.max(insets.bottom, 12),
              backgroundColor: withOpacity(I.surfaceStrong, 0.97),
              borderTopColor: withOpacity(I.ink, 0.08),
            },
          ]}
        >
          <InstitutionalButton
            label="Guardar cambios"
            variant="primary"
            onPress={handleGuardar}
            disabled={!hasChanges || saving}
            loading={saving}
            style={styles.footerSaveButton}
          />
        </View>

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
                <InstitutionalIcon name="close" size={24} color={I.mutedSoft}  strokeWidth={ICON_STROKE_WIDTH} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScrollView}>
              {searchResults.length === 0 ? (
                <View style={styles.noResultsContainer}>
                  <InstitutionalIcon name="search-off" size={48} color={I.mutedSoft}  strokeWidth={ICON_STROKE_WIDTH} />
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
                      <InstitutionalIcon name="location-on" size={20} color={I.primary}  strokeWidth={ICON_STROKE_WIDTH} />
                    </View>
                    <View style={styles.addressResultContent}>
                      <Text style={styles.addressResultText}>{resultado.display_name}</Text>
                      <Text style={styles.addressResultDetails}>
                        {resultado.address.city && `${resultado.address.city}, `}
                        {resultado.address.state}
                      </Text>
                    </View>
                    <InstitutionalIcon name="chevron-right" size={20} color={I.mutedSoft}  strokeWidth={ICON_STROKE_WIDTH} />
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  safeTransparent: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  footerBar: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  footerSaveButton: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    minWidth: 76,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonDisabled: {
    opacity: 1,
  },
  saveButtonText: {
    color: I.onPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  glassOuter: {
    position: 'relative',
    marginBottom: 14,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.62)',
    ...platformShadow({
      shadowColor: I.ink,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.07,
      shadowRadius: 10,
      elevation: 4,
    }),
  },
  glassInner: {
    padding: 18,
  },
  sectionHeaderWrap: {
    marginBottom: 14,
  },
  sectionSubtitle: {
    fontSize: 14,
    marginBottom: 14,
    lineHeight: 20,
  },
  inputGroup: {
    marginBottom: 18,
  },
  modalidadOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
    gap: 12,
  },
  modalidadTextWrap: {
    flex: 1,
  },
  modalidadTitulo: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  modalidadDescripcion: {
    fontSize: 13,
    lineHeight: 18,
  },
  inputLabel: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
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
    backgroundColor: I.primary,
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
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.35)',
  },
  selectedAddressText: {
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  locationInfo: {
    marginTop: 14,
    padding: 14,
    backgroundColor: 'rgba(255,255,255,0.42)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.08)',
  },
  locationInfoTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  locationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  locationLabel: {
    fontSize: 14,
    color: I.body,
    fontWeight: '500',
  },
  locationValue: {
    fontSize: 14,
    color: I.ink,
    fontWeight: '600',
  },
  manualAddressContainer: {
    marginTop: 20,
    padding: 16,
    backgroundColor: warningStatus.bg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: warningStatus.border,
  },
  manualAddressLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: warningStatus.text,
    marginBottom: 8,
  },
  manualAddressSubtitle: {
    fontSize: 12,
    color: warningStatus.text,
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
    backgroundColor: I.accentYellow,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  validateButtonText: {
    color: I.onPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  addPhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.38)',
  },
  addPhotoText: {
    fontSize: 16,
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
    width: (screenWidth - 76 - 12) / 2,
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
    backgroundColor: I.semanticDown,
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
    backgroundColor: 'rgba(255,255,255,0.97)',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    maxHeight: '80%',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: I.hairline,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: I.ink,
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
    color: I.mutedSoft,
    marginTop: 16,
  },
  noResultsSubtext: {
    fontSize: 14,
    color: I.mutedSoft,
    marginTop: 8,
    textAlign: 'center',
  },
  addressResult: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: I.hairlineSoft,
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
    color: I.ink,
    lineHeight: 22,
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
    color: I.primary,
    marginTop: 8,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  selectAddressButton: {
    backgroundColor: I.semanticUp,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 12,
    alignSelf: 'center',
  },
  selectAddressButtonText: {
    color: I.onPrimary,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  invalidText: {
    fontSize: 14,
    color: I.semanticDown,
    marginTop: 8,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  addressResultDetails: {
    fontSize: 14,
    color: I.mutedSoft,
  },
  // ✅ NUEVOS ESTILOS PARA INSTRUCCIONES
  addressInstructions: {
    fontSize: 12,
    color: warningStatus.text,
    marginTop: 8,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 237, 213, 0.85)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(251, 146, 60, 0.45)',
    lineHeight: 16,
  },
  instructionBold: {
    fontWeight: '700',
    color: warningStatus.text,
  },
});
