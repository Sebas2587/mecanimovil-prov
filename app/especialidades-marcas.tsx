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
  Dimensions,
  RefreshControl,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { Stack, router } from 'expo-router';
import {
  especialidadesAPI,
  proveedorVerificadoAPI,
  vehiculoAPI,
  modelosAPI,
  type CategoriaServicio,
  type MarcaVehiculo,
  type ModeloVehiculo
} from '@/services/api';
import { useTheme } from '@/app/design-system/theme/useTheme';
import { COLORS, SPACING, TYPOGRAPHY, SHADOWS, BORDERS } from '@/app/design-system/tokens';
import Header from '@/components/Header';
import Snackbar from '@/components/Snackbar';

const { width: screenWidth } = Dimensions.get('window');

export default function EspecialidadesMarcasScreen() {
  const { estadoProveedor, usuario, obtenerNombreProveedor } = useAuth();
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  // Obtener valores seguros del tema con fallbacks
  const safeColors = useMemo(() => {
    return theme?.colors || COLORS || {};
  }, [theme]);

  const safeSpacing = useMemo(() => {
    return theme?.spacing || SPACING || {};
  }, [theme]);

  const safeTypography = useMemo(() => {
    return theme?.typography || TYPOGRAPHY || {};
  }, [theme]);

  const safeShadows = useMemo(() => {
    return theme?.shadows || SHADOWS || {};
  }, [theme]);

  const safeBorders = useMemo(() => {
    return theme?.borders || BORDERS || {};
  }, [theme]);

  // Estados principales
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Estados para especialidades
  const [todasEspecialidades, setTodasEspecialidades] = useState<CategoriaServicio[]>([]);
  const [especialidadesActuales, setEspecialidadesActuales] = useState<CategoriaServicio[]>([]);
  const [especialidadesSeleccionadas, setEspecialidadesSeleccionadas] = useState<number[]>([]);

  // Estados para marcas y modelos
  const [todasMarcas, setTodasMarcas] = useState<MarcaVehiculo[]>([]);
  const [marcasActuales, setMarcasActuales] = useState<MarcaVehiculo[]>([]);
  const [marcasSeleccionadas, setMarcasSeleccionadas] = useState<number[]>([]);
  const [modelos, setModelos] = useState<ModeloVehiculo[]>([]);
  const [modelosPorMarca, setModelosPorMarca] = useState<{ [key: number]: ModeloVehiculo[] }>({});

  // Estados para filtros y búsqueda
  const [busquedaEspecialidades, setBusquedaEspecialidades] = useState('');
  const [busquedaMarcas, setBusquedaMarcas] = useState('');
  const [tabActiva, setTabActiva] = useState<'especialidades' | 'marcas'>('especialidades');
  const [modoEdicion, setModoEdicion] = useState(false);

  // Estados para Snackbar
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarVariant, setSnackbarVariant] = useState<'success' | 'warning' | 'error' | 'info'>('warning');

  // Constantes de límites
  const MAX_ESPECIALIDADES = 6;
  const MAX_MARCAS = 3;

  useEffect(() => {
    if (!estadoProveedor?.verificado) {
      Alert.alert(
        'Acceso Restringido',
        'Solo los proveedores verificados pueden configurar sus especialidades y marcas.',
        [{ text: 'Entendido', onPress: () => router.back() }]
      );
      return;
    }

    cargarDatos();
  }, [estadoProveedor]);

  const cargarDatos = async () => {
    try {
      setLoading(true);

      // Cargar todas las especialidades disponibles
      const especialidadesData = await especialidadesAPI.obtenerCategorias();
      setTodasEspecialidades(especialidadesData);

      // Cargar todas las marcas disponibles
      const marcasData = await vehiculoAPI.obtenerMarcas();
      setTodasMarcas(marcasData);

      // Cargar todos los modelos para poder filtrarlos dinámicamente
      const modelosData = await modelosAPI.obtenerTodosLosModelos();
      setModelos(modelosData);

      // Organizar modelos por marca
      const modelosAgrupados: { [key: number]: ModeloVehiculo[] } = {};
      modelosData.forEach((modelo: ModeloVehiculo) => {
        if (!modelosAgrupados[modelo.marca]) {
          modelosAgrupados[modelo.marca] = [];
        }
        modelosAgrupados[modelo.marca].push(modelo);
      });
      setModelosPorMarca(modelosAgrupados);

      // Cargar datos actuales del proveedor
      try {
        console.log('📊 Cargando datos actuales del proveedor...');
        const datosProveedor = await proveedorVerificadoAPI.obtenerDatosCompletos();

        console.log('✅ Datos del proveedor obtenidos:', datosProveedor);

        // Extraer especialidades actuales
        if (datosProveedor.data.especialidades && Array.isArray(datosProveedor.data.especialidades)) {
          if (datosProveedor.data.especialidades.length > 0 && typeof datosProveedor.data.especialidades[0] === 'object') {
            setEspecialidadesActuales(datosProveedor.data.especialidades);
            setEspecialidadesSeleccionadas(datosProveedor.data.especialidades.map((esp: any) => esp.id));
          } else {
            const especialidadesActualesObj = especialidadesData.filter(esp =>
              datosProveedor.data.especialidades.includes(esp.id)
            );
            setEspecialidadesActuales(especialidadesActualesObj);
            setEspecialidadesSeleccionadas(datosProveedor.data.especialidades);
          }
        } else {
          setEspecialidadesActuales([]);
          setEspecialidadesSeleccionadas([]);
        }

        // Extraer marcas actuales
        if (datosProveedor.data.marcas_atendidas && Array.isArray(datosProveedor.data.marcas_atendidas)) {
          if (datosProveedor.data.marcas_atendidas.length > 0 && typeof datosProveedor.data.marcas_atendidas[0] === 'object') {
            setMarcasActuales(datosProveedor.data.marcas_atendidas);
            setMarcasSeleccionadas(datosProveedor.data.marcas_atendidas.map((marca: any) => marca.id));
          } else {
            const marcasActualesObj = marcasData.filter((marca: MarcaVehiculo) =>
              datosProveedor.data.marcas_atendidas.includes(marca.id)
            );
            setMarcasActuales(marcasActualesObj);
            setMarcasSeleccionadas(datosProveedor.data.marcas_atendidas);
          }
        } else {
          setMarcasActuales([]);
          setMarcasSeleccionadas([]);
        }

      } catch (error) {
        console.warn('⚠️ No se pudieron cargar datos actuales del proveedor:', error);
        setEspecialidadesActuales([]);
        setMarcasActuales([]);
        setEspecialidadesSeleccionadas([]);
        setMarcasSeleccionadas([]);
      }

    } catch (error) {
      console.error('❌ Error cargando datos:', error);
      Alert.alert('Error', 'No se pudieron cargar los datos. Intenta nuevamente.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    cargarDatos();
  };

  const mostrarSnackbar = (message: string, variant: 'success' | 'warning' | 'error' | 'info' = 'warning') => {
    setSnackbarMessage(message);
    setSnackbarVariant(variant);
    setSnackbarVisible(true);
  };

  const toggleEspecialidad = (especialidadId: number) => {
    if (!modoEdicion) {
      setModoEdicion(true);
    }

    const estaSeleccionada = especialidadesSeleccionadas.includes(especialidadId);

    // Si está deseleccionando, permitir siempre
    if (estaSeleccionada) {
      const nuevasSeleccionadas = especialidadesSeleccionadas.filter(id => id !== especialidadId);
      setEspecialidadesSeleccionadas(nuevasSeleccionadas);
      setHasChanges(true);
      return;
    }

    // Si está seleccionando, verificar límite
    if (especialidadesSeleccionadas.length >= MAX_ESPECIALIDADES) {
      mostrarSnackbar(
        `Has alcanzado el límite máximo de ${MAX_ESPECIALIDADES} especialidades. Deselecciona una para agregar otra.`,
        'warning'
      );
      return;
    }

    const nuevasSeleccionadas = [...especialidadesSeleccionadas, especialidadId];
    setEspecialidadesSeleccionadas(nuevasSeleccionadas);
    setHasChanges(true);
  };

  const toggleMarca = (marcaId: number) => {
    if (!modoEdicion) {
      setModoEdicion(true);
    }

    const estaSeleccionada = marcasSeleccionadas.includes(marcaId);

    // Si está deseleccionando, permitir siempre
    if (estaSeleccionada) {
      const nuevasSeleccionadas = marcasSeleccionadas.filter(id => id !== marcaId);
      setMarcasSeleccionadas(nuevasSeleccionadas);
      setHasChanges(true);
      return;
    }

    // Si está seleccionando, verificar límite
    if (marcasSeleccionadas.length >= MAX_MARCAS) {
      mostrarSnackbar(
        `Has alcanzado el límite máximo de ${MAX_MARCAS} marcas de vehículos. Deselecciona una para agregar otra.`,
        'warning'
      );
      return;
    }

    const nuevasSeleccionadas = [...marcasSeleccionadas, marcaId];
    setMarcasSeleccionadas(nuevasSeleccionadas);
    setHasChanges(true);
  };

  const cancelarEdicion = () => {
    setEspecialidadesSeleccionadas(especialidadesActuales.map(esp => esp.id));
    setMarcasSeleccionadas(marcasActuales.map(marca => marca.id));
    setModoEdicion(false);
    setHasChanges(false);
    setBusquedaEspecialidades('');
    setBusquedaMarcas('');
  };

  const seleccionarTodasLasMarcas = () => {
    setModoEdicion(true);
    const todasLasMarcasIds = todasMarcas.map((m: MarcaVehiculo) => m.id);

    // Limitar a MAX_MARCAS
    const marcasLimitadas = todasLasMarcasIds.slice(0, MAX_MARCAS);
    setMarcasSeleccionadas(marcasLimitadas);
    setHasChanges(true);

    if (todasLasMarcasIds.length > MAX_MARCAS) {
      mostrarSnackbar(
        `Solo puedes seleccionar un máximo de ${MAX_MARCAS} marcas. Se han seleccionado las primeras ${MAX_MARCAS}.`,
        'info'
      );
    }
  };

  const limpiarSeleccionMarcas = () => {
    setModoEdicion(true);
    setMarcasSeleccionadas([]);
    setHasChanges(true);
  };

  const limpiarSeleccionEspecialidades = () => {
    setModoEdicion(true);
    setEspecialidadesSeleccionadas([]);
    setHasChanges(true);
  };

  const seleccionarTodasLasEspecialidades = () => {
    setModoEdicion(true);
    const todasLasEspecialidadesIds = todasEspecialidades.map(e => e.id);

    // Limitar a MAX_ESPECIALIDADES
    const especialidadesLimitadas = todasLasEspecialidadesIds.slice(0, MAX_ESPECIALIDADES);
    setEspecialidadesSeleccionadas(especialidadesLimitadas);
    setHasChanges(true);

    if (todasLasEspecialidadesIds.length > MAX_ESPECIALIDADES) {
      mostrarSnackbar(
        `Solo puedes seleccionar un máximo de ${MAX_ESPECIALIDADES} especialidades. Se han seleccionado las primeras ${MAX_ESPECIALIDADES}.`,
        'info'
      );
    }
  };

  const guardarCambios = async () => {
    try {
      setSaving(true);

      // Validar selecciones
      if (especialidadesSeleccionadas.length === 0) {
        Alert.alert('Error', 'Debes seleccionar al menos una especialidad.');
        setSaving(false);
        return;
      }

      if (especialidadesSeleccionadas.length > MAX_ESPECIALIDADES) {
        mostrarSnackbar(
          `Has excedido el límite de ${MAX_ESPECIALIDADES} especialidades. Por favor, deselecciona algunas.`,
          'error'
        );
        setSaving(false);
        return;
      }

      if (marcasSeleccionadas.length === 0) {
        Alert.alert('Error', 'Debes seleccionar al menos una marca de vehículo.');
        setSaving(false);
        return;
      }

      if (marcasSeleccionadas.length > MAX_MARCAS) {
        mostrarSnackbar(
          `Has excedido el límite de ${MAX_MARCAS} marcas. Por favor, deselecciona algunas.`,
          'error'
        );
        setSaving(false);
        return;
      }

      // Guardar especialidades
      await especialidadesAPI.actualizarEspecialidades(especialidadesSeleccionadas);

      // Guardar marcas según el tipo de proveedor
      await proveedorVerificadoAPI.actualizarMarcas(marcasSeleccionadas, estadoProveedor?.tipo_proveedor || '');

      Alert.alert(
        '✅ Configuración Guardada',
        `Se han actualizado ${especialidadesSeleccionadas.length} especialidades y ${marcasSeleccionadas.length} marcas de vehículos.`,
        [{ text: 'Perfecto', style: 'default' }]
      );

      setHasChanges(false);
      setModoEdicion(false);
      setBusquedaEspecialidades('');
      setBusquedaMarcas('');

      // Recargar datos para obtener las configuraciones actualizadas
      await cargarDatos();

    } catch (error: any) {
      console.error('Error guardando configuración:', error);
      Alert.alert(
        'Error',
        error.response?.data?.error || 'No se pudo guardar la configuración. Intenta nuevamente.'
      );
    } finally {
      setSaving(false);
    }
  };

  // Función para filtrar especialidades según modo de edición
  const getEspecialidadesMostrar = () => {
    const especialidades = modoEdicion ? todasEspecialidades : especialidadesActuales;
    return especialidades.filter(esp =>
      esp.nombre.toLowerCase().includes(busquedaEspecialidades.toLowerCase())
    );
  };

  // Función para filtrar marcas según modo de edición
  const getMarcasMostrar = () => {
    const marcas = modoEdicion ? todasMarcas : marcasActuales;
    return marcas.filter(marca =>
      marca.nombre.toLowerCase().includes(busquedaMarcas.toLowerCase())
    );
  };

  // Renderizar item de especialidad
  const renderEspecialidadItem = (especialidad: CategoriaServicio) => {
    const isSelected = especialidadesSeleccionadas.includes(especialidad.id);

    // Obtener colores del sistema de diseño
    const bgPaper = (safeColors?.background as any)?.paper || (safeColors?.base as any)?.white || '#FFFFFF';
    const bgDefault = (safeColors?.background as any)?.default || '#F5F7F8';
    const textPrimary = safeColors?.text?.primary || (safeColors?.neutral as any)?.inkBlack || '#00171F';
    const textSecondary = safeColors?.text?.secondary || ((safeColors?.neutral as any)?.gray as any)?.[800] || '#3E4F53';
    const textTertiary = safeColors?.text?.tertiary || ((safeColors?.neutral as any)?.gray as any)?.[700] || '#5D6F75';
    const borderLight = (safeColors?.border as any)?.light || ((safeColors?.neutral as any)?.gray as any)?.[200] || '#D7DFE3';
    const primaryObj = safeColors?.primary as any;
    const primary500 = primaryObj?.['500'] || (safeColors?.accent as any)?.['500'] || '#003459';
    const primaryLight = primaryObj?.['50'] || '#E6F0F5';
    const spacingMd = safeSpacing?.md || 16;
    const spacingSm = safeSpacing?.sm || 8;
    const radiusLg = safeBorders?.radius?.lg || 12;
    const shadowSm = safeShadows?.sm || { shadowColor: '#00171F', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3, elevation: 2 };

    return (
      <TouchableOpacity
        key={especialidad.id}
        style={[
          styles.modernCard,
          isSelected && {
            backgroundColor: primaryLight
          }
        ]}
        onPress={() => toggleEspecialidad(especialidad.id)}
        disabled={!modoEdicion && !isSelected}
        activeOpacity={0.8}
      >
        <View style={styles.cardContent}>
          <View style={[styles.cardIcon, { backgroundColor: isSelected ? primaryLight : bgDefault }]}>
            <MaterialIcons
              name="build"
              size={18}
              color={isSelected ? primary500 : textTertiary}
            />
          </View>
          <View style={styles.cardInfo}>
            <Text style={[styles.cardTitle, { color: isSelected ? primary500 : textPrimary }]} numberOfLines={2}>
              {especialidad.nombre}
            </Text>
            {especialidad.descripcion && (
              <Text style={[styles.cardDescription, { color: isSelected ? textSecondary : textTertiary }]} numberOfLines={2}>
                {especialidad.descripcion}
              </Text>
            )}
          </View>
          <View style={[
            styles.modernCheckbox,
            isSelected && { borderColor: primary500, backgroundColor: primary500 }
          ]}>
            {isSelected && <Ionicons name="checkmark" size={12} color="#FFFFFF" />}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Renderizar item de marca
  const renderMarcaItem = (marca: MarcaVehiculo) => {
    const isSelected = marcasSeleccionadas.includes(marca.id);
    const modelosDeMarca = modelosPorMarca[marca.id] || [];

    // Obtener colores del sistema de diseño
    const bgPaper = (safeColors?.background as any)?.paper || (safeColors?.base as any)?.white || '#FFFFFF';
    const bgDefault = (safeColors?.background as any)?.default || '#F5F7F8';
    const textPrimary = safeColors?.text?.primary || (safeColors?.neutral as any)?.inkBlack || '#00171F';
    const textSecondary = safeColors?.text?.secondary || ((safeColors?.neutral as any)?.gray as any)?.[800] || '#3E4F53';
    const textTertiary = safeColors?.text?.tertiary || ((safeColors?.neutral as any)?.gray as any)?.[700] || '#5D6F75';
    const borderLight = (safeColors?.border as any)?.light || ((safeColors?.neutral as any)?.gray as any)?.[200] || '#D7DFE3';
    const primaryObj = safeColors?.primary as any;
    const primary500 = primaryObj?.['500'] || (safeColors?.accent as any)?.['500'] || '#003459';
    const primaryLight = primaryObj?.['50'] || '#E6F0F5';
    const primary100 = primaryObj?.['100'] || '#D0E0F0';
    const infoObj = safeColors?.info as any;
    const infoMain = infoObj?.main || infoObj?.['500'] || COLORS?.info?.main || '#068FFF';
    const infoLight = infoObj?.light || COLORS?.info?.light || '#E6F5FF';
    const infoDark = infoObj?.dark || COLORS?.info?.dark || '#0570CC';
    const infoText = infoObj?.text || COLORS?.base?.white || '#FFFFFF';
    const neutralGray200 = (safeColors?.neutral as any)?.gray?.[200] || '#EEEEEE';
    const neutralGray700 = (safeColors?.neutral as any)?.gray?.[700] || '#666666';

    return (
      <TouchableOpacity
        key={marca.id}
        style={[
          styles.modernCard,
          isSelected && {
            backgroundColor: primaryLight
          }
        ]}
        onPress={() => toggleMarca(marca.id)}
        disabled={!modoEdicion && !isSelected}
        activeOpacity={0.8}
      >
        <View style={styles.cardContent}>
          <View style={[styles.cardIcon, { backgroundColor: isSelected ? primaryLight : bgDefault }]}>
            <MaterialIcons
              name="directions-car"
              size={18}
              color={isSelected ? primary500 : textTertiary}
            />
          </View>
          <View style={styles.cardInfo}>
            <Text style={[styles.cardTitle, { color: isSelected ? primary500 : textPrimary }]} numberOfLines={2}>
              {marca.nombre}
            </Text>
            <Text style={[styles.cardDescription, { color: isSelected ? textSecondary : textTertiary }]} numberOfLines={1}>
              {modelosDeMarca.length} modelos
            </Text>
            {isSelected && modelosDeMarca.length > 0 && (
              <View style={[styles.modelosPreview, { backgroundColor: infoLight, borderColor: infoMain }]}>
                <Text style={[styles.modelosPreviewText, { color: infoDark }]} numberOfLines={2}>
                  {modelosDeMarca.slice(0, 3).map(m => m.nombre).join(', ')}
                  {modelosDeMarca.length > 3 && ` +${modelosDeMarca.length - 3} más`}
                </Text>
              </View>
            )}
          </View>
          <View style={[
            styles.modernCheckbox,
            isSelected && { borderColor: primary500, backgroundColor: primary500 }
          ]}>
            {isSelected && <Ionicons name="checkmark" size={12} color="#FFFFFF" />}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Obtener colores del sistema de diseño para estilos
  const bgPaper = (safeColors?.background as any)?.paper || (safeColors?.base as any)?.white || '#FFFFFF';
  const bgDefault = (safeColors?.background as any)?.default || '#F5F7F8';
  const textPrimary = safeColors?.text?.primary || (safeColors?.neutral as any)?.inkBlack || '#00171F';
  const textSecondary = safeColors?.text?.secondary || ((safeColors?.neutral as any)?.gray as any)?.[800] || '#3E4F53';
  const textTertiary = safeColors?.text?.tertiary || ((safeColors?.neutral as any)?.gray as any)?.[700] || '#5D6F75';
  const borderLight = (safeColors?.border as any)?.light || ((safeColors?.neutral as any)?.gray as any)?.[200] || '#D7DFE3';
  const primaryObj = safeColors?.primary as any;
  const successObj = safeColors?.success as any;
  const errorObj = safeColors?.error as any;
  const primary500 = primaryObj?.['500'] || (safeColors?.accent as any)?.['500'] || '#003459';
  const success500 = successObj?.main || successObj?.['500'] || '#00C9A7';
  const error500 = errorObj?.main || errorObj?.['500'] || '#FF6B6B';
  const infoLight = (safeColors?.info as any)?.light || '#E6F5F9';
  const infoText = (safeColors?.info as any)?.text || '#003D32';
  const containerHorizontal = safeSpacing?.container?.horizontal || safeSpacing?.content?.horizontal || 18;
  const spacingXs = safeSpacing?.xs || 4;
  const spacingSm = safeSpacing?.sm || 8;
  const spacingMd = safeSpacing?.md || 16;
  const spacingLg = safeSpacing?.lg || 24;
  const fontSizeBase = safeTypography?.fontSize?.base || 14;
  const fontSizeMd = safeTypography?.fontSize?.md || 16;
  const fontSizeLg = safeTypography?.fontSize?.lg || 18;
  const fontWeightMedium = safeTypography?.fontWeight?.medium || '500';
  const fontWeightSemibold = safeTypography?.fontWeight?.semibold || '600';
  const fontWeightBold = safeTypography?.fontWeight?.bold || '700';
  const radiusMd = safeBorders?.radius?.md || 8;
  const radiusLg = safeBorders?.radius?.lg || 12;
  const radiusXl = safeBorders?.radius?.xl || 16;
  const shadowSm = safeShadows?.sm || { shadowColor: '#00171F', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3, elevation: 2 };
  const shadowMd = safeShadows?.md || { shadowColor: '#00171F', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: bgDefault }]}>
        <Header
          title="Especialidades y Marcas"
          showBack
          onBackPress={() => router.back()}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={primary500} />
          <Text style={[styles.loadingText, { color: textTertiary }]}>Cargando configuración...</Text>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgDefault }]} edges={['left', 'right', 'bottom']}>
      <Stack.Screen
        options={{
          title: 'Especialidades y Marcas',
          headerShown: false,
        }}
      />

      <Header
        title="Especialidades y Marcas"
        showBack={true}
        onBackPress={() => router.back()}
      />

      <ScrollView
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
      >
        <View style={[styles.content, { paddingHorizontal: containerHorizontal }]}>
          {/* Información contextual - UI Card */}
          <View style={styles.uiCard}>
            <View style={styles.infoCardContent}>
              <Ionicons name="information-circle" size={20} color={primary500} />
              <Text style={[styles.infoText, { color: textPrimary }]}>
                {modoEdicion
                  ? 'Selecciona las especialidades que ofreces y las marcas de vehículos que atiendes. Esto define tu perfil de servicios.'
                  : 'Esta es tu configuración actual. Toca "Editar" para modificar tus especialidades y marcas.'
                }
              </Text>
            </View>
          </View>

          {/* Tabs modernos - UI Card */}
          <View style={styles.uiCard}>
            <View style={styles.modernTabsContainer}>
              <TouchableOpacity
                style={[
                  styles.modernTab,
                  tabActiva === 'especialidades' && { backgroundColor: infoLight }
                ]}
                onPress={() => setTabActiva('especialidades')}
                activeOpacity={0.8}
              >
                <MaterialIcons
                  name="build"
                  size={20}
                  color={tabActiva === 'especialidades' ? primary500 : textTertiary}
                />
                <Text style={[
                  styles.modernTabText,
                  { color: tabActiva === 'especialidades' ? primary500 : textTertiary }
                ]}>
                  Especialidades
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modernTab,
                  tabActiva === 'marcas' && { backgroundColor: infoLight }
                ]}
                onPress={() => setTabActiva('marcas')}
                activeOpacity={0.8}
              >
                <MaterialIcons
                  name="directions-car"
                  size={20}
                  color={tabActiva === 'marcas' ? primary500 : textTertiary}
                />
                <Text style={[
                  styles.modernTabText,
                  { color: tabActiva === 'marcas' ? primary500 : textTertiary }
                ]}>
                  Marcas de Vehículos
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Contenido según tab activa */}
          {tabActiva === 'especialidades' && (
            <>
              {/* Búsqueda - UI Card */}
              {modoEdicion && (
                <View style={[styles.uiCard, { backgroundColor: bgPaper, borderColor: borderLight, ...shadowSm }]}>
                  <View style={styles.modernSearchContainer}>
                    <Ionicons name="search" size={20} color={textTertiary} />
                    <TextInput
                      style={[styles.modernSearchInput, { color: textPrimary }]}
                      placeholder="Buscar especialidades..."
                      value={busquedaEspecialidades}
                      onChangeText={setBusquedaEspecialidades}
                      placeholderTextColor={textTertiary}
                    />
                    {busquedaEspecialidades.length > 0 && (
                      <TouchableOpacity onPress={() => setBusquedaEspecialidades('')}>
                        <Ionicons name="close-circle" size={20} color={textTertiary} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              )}

              {/* Acciones rápidas para especialidades - UI Card */}
              {modoEdicion && (
                <View style={styles.uiCard}>
                  <View style={styles.quickActionsContainer}>
                    <TouchableOpacity
                      style={styles.quickActionButton}
                      onPress={seleccionarTodasLasEspecialidades}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="checkmark-done" size={16} color={success500} />
                      <Text style={[styles.quickActionText, { color: success500 }]}>Seleccionar Todas</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.quickActionButton}
                      onPress={limpiarSeleccionEspecialidades}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="close" size={16} color={error500} />
                      <Text style={[styles.quickActionText, { color: error500 }]}>Limpiar Selección</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Contador - UI Card */}
              <View style={styles.uiCard}>
                <View style={styles.counterCard}>
                  <MaterialIcons name="list" size={20} color={primary500} />
                  <Text style={[styles.counterText, { color: textPrimary }]}>
                    {especialidadesSeleccionadas.length} / {MAX_ESPECIALIDADES} especialidades seleccionadas
                  </Text>
                </View>
              </View>

              {/* Grid de especialidades - 2 columnas */}
              <View style={styles.itemsGrid}>
                {getEspecialidadesMostrar().map(renderEspecialidadItem)}
              </View>
            </>
          )}

          {tabActiva === 'marcas' && (
            <>
              {/* Búsqueda - UI Card */}
              {modoEdicion && (
                <View style={[styles.uiCard, { backgroundColor: bgPaper, borderColor: borderLight, ...shadowSm }]}>
                  <View style={styles.modernSearchContainer}>
                    <Ionicons name="search" size={20} color={textTertiary} />
                    <TextInput
                      style={[styles.modernSearchInput, { color: textPrimary }]}
                      placeholder="Buscar marcas..."
                      value={busquedaMarcas}
                      onChangeText={setBusquedaMarcas}
                      placeholderTextColor={textTertiary}
                    />
                    {busquedaMarcas.length > 0 && (
                      <TouchableOpacity onPress={() => setBusquedaMarcas('')}>
                        <Ionicons name="close-circle" size={20} color={textTertiary} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              )}

              {/* Acciones rápidas para marcas - UI Card */}
              {modoEdicion && (
                <View style={styles.uiCard}>
                  <View style={styles.quickActionsContainer}>
                    <TouchableOpacity
                      style={styles.quickActionButton}
                      onPress={seleccionarTodasLasMarcas}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="checkmark-done" size={16} color={success500} />
                      <Text style={[styles.quickActionText, { color: success500 }]}>Seleccionar Todas</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.quickActionButton}
                      onPress={limpiarSeleccionMarcas}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="close" size={16} color={error500} />
                      <Text style={[styles.quickActionText, { color: error500 }]}>Limpiar Selección</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Contador - UI Card */}
              <View style={styles.uiCard}>
                <View style={styles.counterCard}>
                  <MaterialIcons name="directions-car" size={20} color={primary500} />
                  <Text style={[styles.counterText, { color: textPrimary }]}>
                    {marcasSeleccionadas.length} / {MAX_MARCAS} marcas seleccionadas
                  </Text>
                </View>
              </View>

              {/* Grid de marcas - 2 columnas */}
              <View style={styles.itemsGrid}>
                {getMarcasMostrar().map(renderMarcaItem)}
              </View>
            </>
          )}
        </View>
      </ScrollView>

      {/* Action Buttons Floating Footer */}
      <View style={[styles.floatingBottomBar, { paddingBottom: Math.max(insets.bottom, SPACING?.md || 16) }]}>
        {!modoEdicion ? (
          <TouchableOpacity
            style={[styles.editButtonFloat, { backgroundColor: primary500, ...shadowMd }]}
            onPress={() => setModoEdicion(true)}
            activeOpacity={0.8}
          >
            <MaterialIcons name="edit" size={20} color="#FFFFFF" />
            <Text style={styles.editButtonTextFloat}>Configurar mis especialidades</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.editingButtonsFloat}>
            <TouchableOpacity
              style={[styles.cancelButtonFloat, { backgroundColor: bgPaper, borderColor: borderLight, borderWidth: 1 }]}
              onPress={cancelarEdicion}
              activeOpacity={0.8}
            >
              <Text style={[styles.cancelButtonTextFloat, { color: textPrimary }]}>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.saveButtonFloat,
                { backgroundColor: hasChanges ? success500 : bgDefault },
                saving && { opacity: 0.7 }
              ]}
              onPress={guardarCambios}
              disabled={saving || !hasChanges}
              activeOpacity={0.8}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Ionicons name="checkmark" size={20} color={hasChanges ? "#FFFFFF" : textTertiary} />
              )}
              <Text style={[styles.saveButtonTextFloat, { color: hasChanges ? "#FFFFFF" : textTertiary }]}>
                {saving ? 'Guardando...' : 'Guardar Cambios'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Snackbar para alertas */}
      <Snackbar
        visible={snackbarVisible}
        message={snackbarMessage}
        variant={snackbarVariant}
        duration={4000}
        onDismiss={() => setSnackbarVisible(false)}
      />
    </SafeAreaView>
  );
}

// Función para crear estilos usando tokens del sistema de diseño
const createStyles = () => {
  const bgPaper = COLORS?.background?.paper || COLORS?.base?.white || '#FFFFFF';
  const bgDefault = COLORS?.background?.default || '#F5F7F8';
  const textPrimary = COLORS?.text?.primary || COLORS?.neutral?.inkBlack || '#00171F';
  const textTertiary = COLORS?.text?.tertiary || ((COLORS?.neutral?.gray as any)?.[700]) || '#5D6F75';
  const borderLight = COLORS?.border?.light || COLORS?.neutral?.gray?.[200] || '#D7DFE3';
  const spacingXs = SPACING?.xs || 4;
  const spacingSm = SPACING?.sm || 8;
  const spacingMd = SPACING?.md || 16;
  const spacingLg = SPACING?.lg || 24;
  const containerHorizontal = SPACING?.container?.horizontal || SPACING?.content?.horizontal || 18;
  const cardPadding = SPACING?.cardPadding || spacingMd;
  const cardGap = SPACING?.cardGap || spacingSm + 4;
  const cardRadius = BORDERS?.radius?.lg || 12;
  const fontSizeBase = TYPOGRAPHY?.fontSize?.base || 14;
  const fontSizeLg = TYPOGRAPHY?.fontSize?.lg || 18;
  const fontWeightMedium = TYPOGRAPHY?.fontWeight?.medium || '500';
  const fontWeightBold = TYPOGRAPHY?.fontWeight?.bold || '700';
  const radiusMd = BORDERS?.radius?.md || 8;
  const radiusLg = BORDERS?.radius?.lg || 12;
  const radiusXl = BORDERS?.radius?.xl || 16;
  const shadowSm = SHADOWS?.sm || { shadowColor: '#00171F', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3, elevation: 2 };
  const shadowMd = SHADOWS?.md || { shadowColor: '#00171F', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 };

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: bgDefault,
    },
    scrollContainer: {
      flex: 1,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: bgDefault,
    },
    loadingText: {
      marginTop: spacingMd,
      fontSize: fontSizeBase,
    },
    statsContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    statItem: {
      alignItems: 'center',
    },
    statNumber: {
      fontSize: fontSizeLg,
      fontWeight: fontWeightBold,
    },
    statLabel: {
      fontSize: fontSizeBase - 4,
      fontWeight: '500',
      marginTop: spacingSm / 2,
    },
    content: {
      paddingVertical: spacingMd,
    },
    uiCard: {
      backgroundColor: bgPaper,
      borderRadius: radiusXl,
      padding: spacingMd,
      marginBottom: spacingMd,
      ...shadowSm,
      borderWidth: 1,
      borderColor: borderLight,
    },
    infoCardContent: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacingMd,
    },
    infoText: {
      flex: 1,
      fontSize: fontSizeBase,
      lineHeight: fontSizeBase + 6,
    },
    modernTabsContainer: {
      flexDirection: 'row',
      gap: spacingXs || 4,
    },
    modernTab: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacingMd - 2,
      paddingHorizontal: spacingMd,
      borderRadius: radiusLg - 2,
    },
    modernTabText: {
      fontSize: fontSizeBase,
      marginLeft: spacingSm,
      fontWeight: '500',
    },
    modernSearchContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacingMd,
    },
    modernSearchInput: {
      flex: 1,
      marginLeft: spacingMd,
      fontSize: fontSizeBase,
      fontWeight: '400',
    },
    quickActionsContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: spacingMd,
    },
    quickActionButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacingMd - 2,
      paddingHorizontal: spacingMd,
      borderRadius: radiusLg,
      gap: spacingSm / 2,
    },
    quickActionText: {
      fontSize: fontSizeBase,
      fontWeight: '600',
      marginLeft: spacingSm / 2,
    },
    counterCard: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacingSm,
    },
    counterText: {
      fontSize: fontSizeBase,
      fontWeight: '600',
      marginLeft: spacingSm,
    },
    itemsList: {
      gap: spacingSm,
    },
    itemsGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      gap: spacingSm,
    },
    modernCard: {
      backgroundColor: bgPaper,
      borderRadius: radiusLg,
      padding: spacingSm + 2,
      marginBottom: spacingXs || 4,
      ...shadowSm,
      borderWidth: 1,
      borderColor: borderLight,
      width: '48%',
      minHeight: 100,
      position: 'relative',
    },
    cardContent: {
      flexDirection: 'column',
      alignItems: 'flex-start',
      gap: spacingXs + 2,
    },
    cardIcon: {
      width: 32,
      height: 32,
      borderRadius: 16,
      justifyContent: 'center',
      alignItems: 'center',
      alignSelf: 'flex-start',
      marginBottom: spacingXs,
    },
    cardInfo: {
      flex: 1,
      width: '100%',
    },
    cardTitle: {
      fontSize: fontSizeBase - 1,
      fontWeight: '600',
      marginBottom: 2,
    },
    cardDescription: {
      fontSize: fontSizeBase - 3,
      lineHeight: fontSizeBase,
    },
    modernCheckbox: {
      width: 18,
      height: 18,
      borderRadius: 9,
      borderWidth: 1.5,
      borderColor: borderLight,
      backgroundColor: bgPaper,
      justifyContent: 'center',
      alignItems: 'center',
      position: 'absolute',
      top: spacingSm + 2,
      right: spacingSm + 2,
    },
    modelosPreview: {
      marginTop: spacingSm,
      paddingVertical: spacingSm,
      paddingHorizontal: spacingMd,
      borderRadius: radiusMd,
      alignSelf: 'flex-start',
      borderWidth: 1,
      maxWidth: '100%',
    },
    modelosPreviewText: {
      fontSize: fontSizeBase - 1,
      fontWeight: '600',
      lineHeight: (fontSizeBase - 1) * 1.4,
      letterSpacing: 0.2,
    },
    floatingBottomBar: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: bgPaper,
      paddingTop: spacingMd,
      paddingHorizontal: containerHorizontal,
      borderTopWidth: 1,
      borderColor: borderLight,
      ...shadowMd,
    },
    editButtonFloat: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacingMd,
      borderRadius: radiusLg,
      gap: spacingSm,
    },
    editButtonTextFloat: {
      color: '#FFFFFF',
      fontSize: fontSizeBase + 1,
      fontWeight: 'bold',
    },
    editingButtonsFloat: {
      flexDirection: 'row',
      gap: spacingMd,
      justifyContent: 'space-between',
    },
    cancelButtonFloat: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacingMd - 2,
      borderRadius: radiusLg,
    },
    cancelButtonTextFloat: {
      fontSize: fontSizeBase,
      fontWeight: '600',
    },
    saveButtonFloat: {
      flex: 2,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacingMd - 2,
      borderRadius: radiusLg,
      gap: spacingXs,
    },
    saveButtonTextFloat: {
      fontSize: fontSizeBase,
      fontWeight: 'bold',
    },
  });
};

const styles = createStyles();

