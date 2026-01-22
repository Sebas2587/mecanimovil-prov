import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Header from '@/components/Header';
import { useTheme } from '@/app/design-system/theme/useTheme';
import { COLORS, SPACING, TYPOGRAPHY, SHADOWS, BORDERS } from '@/app/design-system/tokens';

// Interfaces para TypeScript (actualizadas según respuesta real del backend)
interface ServicioOferta {
  id: number;
  servicio: number;
  servicio_info: {
    id: number;
    nombre: string;
    descripcion: string;
    requiere_repuestos: boolean;
    foto: string | null;
  };
  marca_vehiculo_seleccionada: number | null;
  marca_vehiculo_info: {
    id: number;
    nombre: string;
    logo: string | null;
  } | null;
  tipo_servicio: 'con_repuestos' | 'sin_repuestos';
  disponible: boolean;
  duracion_estimada: string | null;
  incluye_garantia: boolean;
  duracion_garantia: number;
  detalles_adicionales: string | null;
  repuestos_seleccionados: any[];
  repuestos_info: any[];
  costo_mano_de_obra_sin_iva: string;
  costo_repuestos_sin_iva: string;
  precio_publicado_cliente: string;
  comision_mecanmovil: string;
  iva_sobre_comision: string;
  ganancia_neta_proveedor: string;
  desglose_precios: {
    costo_total_sin_iva: number;
    iva_19_porciento: number;
    precio_final_cliente: number;
    comision_mecanmovil_20_porciento: number;
    iva_sobre_comision: number;
    ganancia_neta_proveedor: number;
    monto_transferido: number;
  };
  fecha_creacion: string;
  ultima_actualizacion: string;
  fotos_urls: string[];
}

const MisServiciosScreen = () => {
  // Hook del sistema de diseño - acceso seguro a tokens
  const theme = useTheme();

  // Estados
  const [servicios, setServicios] = useState<ServicioOferta[]>([]);
  const [serviciosFiltrados, setServiciosFiltrados] = useState<ServicioOferta[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState('');

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

  // Cargar datos
  const fetchServicios = useCallback(async () => {
    try {
      // Usar la API de servicios específica
      const { serviciosAPI } = await import('@/services/api');

      console.log('🔧 Cargando servicios del proveedor...');

      // Cargar servicios del proveedor
      const response = await serviciosAPI.obtenerMisServicios();

      // El backend devuelve formato paginado: { count, results }
      const serviciosData = response.data?.results || response.data || [];

      console.log('✅ Servicios obtenidos:', serviciosData.length || 0);
      setServicios(serviciosData);
      setServiciosFiltrados(serviciosData);

    } catch (error) {
      console.error('❌ Error cargando servicios:', error);
      Alert.alert('Error', 'No se pudieron cargar los servicios');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Cargar datos al montar componente y al volver a la pantalla
  useFocusEffect(
    useCallback(() => {
      fetchServicios();
    }, [fetchServicios])
  );

  // Función para navegar al detalle del servicio
  const verDetalleServicio = (servicio: ServicioOferta) => {
    console.log('👁️ Navegando al detalle del servicio:', servicio.id);
    // Navegar a una pantalla de detalle (crearemos esta pantalla)
    router.push({
      pathname: '/servicio-resumen/[id]' as any,
      params: {
        id: servicio.id.toString(),
        servicioData: JSON.stringify(servicio)
      }
    });
  };

  // Función para cambiar disponibilidad
  const toggleDisponibilidad = async (servicio: ServicioOferta) => {
    try {
      const { serviciosAPI } = await import('@/services/api');

      console.log(`🔄 Cambiando disponibilidad del servicio ${servicio.id}`);

      await serviciosAPI.cambiarDisponibilidad(servicio.id, !servicio.disponible);

      // Actualizar estado local
      setServicios(prev => prev.map(s =>
        s.id === servicio.id
          ? { ...s, disponible: !s.disponible }
          : s
      ));

      console.log(`✅ Disponibilidad cambiada a: ${!servicio.disponible}`);

    } catch (error) {
      console.error('❌ Error cambiando disponibilidad:', error);
      Alert.alert('Error', 'No se pudo cambiar la disponibilidad del servicio');
    }
  };

  // Función para eliminar servicio
  const eliminarServicio = async (servicio: ServicioOferta) => {
    Alert.alert(
      '¿Eliminar servicio?',
      `¿Estás seguro de que deseas eliminar "${servicio.servicio_info.nombre}"? Esta acción no se puede deshacer.`,
      [
        {
          text: 'Cancelar',
          style: 'cancel',
        },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const { serviciosAPI } = await import('@/services/api');

              console.log(`🗑️ Eliminando servicio ${servicio.id}`);

              await serviciosAPI.eliminarServicio(servicio.id);

              // Actualizar estado local
              const nuevosServicios = servicios.filter(s => s.id !== servicio.id);
              setServicios(nuevosServicios);
              aplicarFiltro(searchText, nuevosServicios);

              console.log(`✅ Servicio eliminado exitosamente`);

              Alert.alert('Éxito', 'El servicio ha sido eliminado correctamente');

            } catch (error) {
              console.error('❌ Error eliminando servicio:', error);
              Alert.alert('Error', 'No se pudo eliminar el servicio. Intenta nuevamente.');
            }
          }
        }
      ]
    );
  };

  // Función para editar servicio
  const editarServicio = (servicio: ServicioOferta) => {
    console.log('🔧 Navegando a editar servicio:', servicio.id);

    const servicioDataString = JSON.stringify(servicio);

    router.push({
      pathname: '/crear-servicio',
      params: {
        mode: 'edit',
        servicioId: servicio.id.toString(),
        servicioData: servicioDataString
      }
    });
  };

  // Función para filtrar servicios
  const aplicarFiltro = useCallback((texto: string, serviciosLista: ServicioOferta[]) => {
    if (!texto.trim()) {
      setServiciosFiltrados(serviciosLista);
      return;
    }

    const textoLower = texto.toLowerCase().trim();
    const filtrados = serviciosLista.filter((servicio) => {
      const nombreMatch = servicio.servicio_info.nombre.toLowerCase().includes(textoLower);
      const marcaMatch = servicio.marca_vehiculo_info?.nombre.toLowerCase().includes(textoLower);
      const tipoMatch = servicio.tipo_servicio === 'con_repuestos'
        ? 'con repuestos'.includes(textoLower)
        : 'sin repuestos'.includes(textoLower);

      return nombreMatch || marcaMatch || tipoMatch;
    });

    setServiciosFiltrados(filtrados);
  }, []);

  // Efecto para aplicar filtro cuando cambia el texto de búsqueda o los servicios
  useEffect(() => {
    aplicarFiltro(searchText, servicios);
  }, [searchText, servicios, aplicarFiltro]);

  // Función para obtener el ícono según el tipo de servicio
  const getServicioIcon = (tipo: 'con_repuestos' | 'sin_repuestos') => {
    return tipo === 'con_repuestos' ? 'build' : 'handyman';
  };

  // Función para formatear fecha
  const formatearFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Componente de lista vacía mejorado
  const EmptyComponent = () => {
    const neutralGrayObj = safeColors?.neutral?.gray as any;
    const neutralColor = neutralGrayObj?.[500] || safeColors?.text?.tertiary || '#999999';
    const primaryObj = safeColors?.primary as any;
    const secondaryObj = safeColors?.secondary as any;
    const accentObj = safeColors?.accent as any;
    const primaryColor = primaryObj?.['500'] || secondaryObj?.['500'] || '#4E4FEB';

    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconContainer}>
          <Ionicons name="construct-outline" size={64} color={neutralColor} />
        </View>
        <Text style={styles.emptyTitle}>No tienes servicios publicados</Text>
        <Text style={styles.emptySubtitle}>
          Comienza creando tu primer servicio para comenzar a recibir solicitudes de clientes
        </Text>
        <TouchableOpacity
          style={styles.createFirstButton}
          onPress={() => router.push('/crear-servicio')}
          activeOpacity={0.8}
        >
          <Ionicons name="add-circle" size={24} color={COLORS?.base?.white || '#FFFFFF'} style={{ marginRight: 8 }} />
          <Text style={styles.createFirstButtonText}>Crear mi primer servicio</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // Colores seguros para componentes
  const primaryObj = safeColors?.primary as any;
  const secondaryObj = safeColors?.secondary as any;
  const accentObj = safeColors?.accent as any;
  const primaryColor = primaryObj?.['500'] || secondaryObj?.['500'] || '#4E4FEB';
  const successColor = (safeColors?.success as any)?.main || (safeColors?.success as any)?.['500'] || '#3DB6B1';
  const errorColor = (safeColors?.error as any)?.main || (safeColors?.error as any)?.['500'] || '#FF5555';

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={primaryColor} />
          <Text style={styles.loadingText}>Cargando tus servicios...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <Stack.Screen
        options={{
          title: 'Mis Servicios',
          headerShown: false,
        }}
      />

      {/* Header consistente del sistema de diseño */}
      <Header
        title="Mis Servicios"
        showBack={true}
        onBackPress={() => router.back()}
      />

      <ScrollView
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => {
            setRefreshing(true);
            fetchServicios();
          }} />
        }
      >
        <View style={styles.content}>
          {/* Barra de búsqueda y filtro */}
          <View style={styles.searchSection}>
            <View style={styles.searchContainer}>
              <Ionicons name="search" size={20} color={(safeColors?.neutral?.gray as any)?.[700] || safeColors?.text?.secondary || '#666666'} style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Buscar servicios..."
                placeholderTextColor={(safeColors?.neutral?.gray as any)?.[500] || safeColors?.text?.tertiary || '#999999'}
                value={searchText}
                onChangeText={setSearchText}
              />
              {searchText.length > 0 && (
                <TouchableOpacity
                  onPress={() => setSearchText('')}
                  style={styles.clearButton}
                >
                  <Ionicons name="close-circle" size={20} color={(safeColors?.neutral?.gray as any)?.[700] || safeColors?.text?.secondary || '#666666'} />
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity
              style={styles.filterButton}
              onPress={() => router.push('/crear-servicio')}
            >
              <MaterialIcons name="add-circle" size={24} color={primaryColor} />
            </TouchableOpacity>
          </View>

          {/* Sección de servicios - diseño minimalista en lista */}
          <View style={styles.servicesSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                Servicios {searchText ? `(${serviciosFiltrados.length})` : `(${servicios.length})`}
              </Text>
              <TouchableOpacity style={styles.sortButton}>
                <Text style={styles.sortButtonText}>Sort by Latest</Text>
                <MaterialIcons name="arrow-drop-down" size={16} color={safeColors?.text?.primary || '#000000'} />
              </TouchableOpacity>
            </View>

            {servicios.length === 0 ? (
              <EmptyComponent />
            ) : serviciosFiltrados.length > 0 ? (
              // Ordenar servicios por fecha más reciente (latest first)
              [...serviciosFiltrados]
                .sort((a, b) => {
                  const fechaA = new Date(a.fecha_creacion).getTime();
                  const fechaB = new Date(b.fecha_creacion).getTime();
                  return fechaB - fechaA; // Más reciente primero
                })
                .map((servicio) => (
                  <TouchableOpacity
                    key={servicio.id}
                    style={styles.serviceItem}
                    onPress={() => verDetalleServicio(servicio)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.serviceItemIcon}>
                      <MaterialIcons
                        name={getServicioIcon(servicio.tipo_servicio) as any}
                        size={24}
                        color={primaryColor}
                      />
                    </View>
                    <View style={styles.serviceItemInfo}>
                      <Text style={styles.serviceItemName}>
                        {servicio.servicio_info.nombre}
                      </Text>
                      <Text style={styles.serviceItemDate}>
                        {formatearFecha(servicio.fecha_creacion)}
                      </Text>
                      {servicio.marca_vehiculo_info && (
                        <Text style={styles.serviceItemType}>
                          {servicio.marca_vehiculo_info.nombre}
                        </Text>
                      )}
                    </View>
                    <View style={styles.serviceItemStatus}>
                      <View style={[
                        styles.statusBadge,
                        { backgroundColor: servicio.disponible ? successColor : errorColor }
                      ]}>
                        <Text style={styles.statusBadgeText}>
                          {servicio.disponible ? 'Activo' : 'Inactivo'}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))
            ) : (
              <View style={styles.noResultsContainer}>
                <Ionicons name="search-outline" size={48} color={(safeColors?.neutral?.gray as any)?.[500] || safeColors?.text?.tertiary || '#999999'} />
                <Text style={styles.noResultsText}>No se encontraron servicios</Text>
                <Text style={styles.noResultsSubtext}>
                  Intenta con otros términos de búsqueda
                </Text>
                <TouchableOpacity
                  style={styles.clearSearchButton}
                  onPress={() => setSearchText('')}
                >
                  <Text style={styles.clearSearchButtonText}>Limpiar búsqueda</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

// Función para crear estilos usando tokens del sistema de diseño
const createStyles = () => {
  // Valores seguros con fallbacks del nuevo sistema de diseño
  const bgPaper = COLORS?.background?.paper || COLORS?.base?.white || '#FFFFFF';
  const bgDefault = COLORS?.background?.default || '#EEEEEE';
  const textPrimary = COLORS?.text?.primary || '#000000';
  const textSecondary = COLORS?.text?.secondary || '#666666';
  const neutralGrayObj = COLORS?.neutral?.gray as any;
  const textTertiary = COLORS?.text?.tertiary || neutralGrayObj?.[500] || '#999999';
  const borderLight = COLORS?.border?.light || '#EEEEEE';
  const borderMain = COLORS?.border?.main || '#D0D0D0';

  // Acceso seguro a propiedades numéricas usando type assertion
  const primaryObj = COLORS?.primary as any;
  const secondaryObj = COLORS?.secondary as any;
  const accentObj = COLORS?.accent as any;
  const successObj = COLORS?.success as any;
  const errorObj = COLORS?.error as any;

  const primary500 = primaryObj?.['500'] || secondaryObj?.['500'] || '#4E4FEB';
  const primaryLight = (primaryObj as any)?.['50'] || (secondaryObj as any)?.['50'] || '#E6F2FF';
  const successColor = successObj?.main || successObj?.['500'] || '#3DB6B1';
  const errorColor = errorObj?.main || errorObj?.['500'] || '#FF5555';

  // Espaciado optimizado para contenido y containers
  const containerHorizontal = SPACING?.container?.horizontal || SPACING?.content?.horizontal || 18;
  const containerVertical = SPACING?.container?.vertical || SPACING?.content?.vertical || 20;
  const cardPadding = SPACING?.cardPadding || SPACING?.md || 16;
  const cardGap = SPACING?.cardGap || SPACING?.sm || 8;

  const spacingXs = SPACING?.xs || 4;
  const spacingSm = SPACING?.sm || 8;
  const spacingMd = SPACING?.md || 16;
  const spacingLg = SPACING?.lg || 24;
  const spacingXl = SPACING?.xl || 32;

  const fontSizeSm = TYPOGRAPHY?.fontSize?.sm || 12;
  const fontSizeBase = TYPOGRAPHY?.fontSize?.base || 14;
  const fontSizeMd = TYPOGRAPHY?.fontSize?.md || 16;
  const fontSizeLg = TYPOGRAPHY?.fontSize?.lg || 18;
  const fontSizeXl = TYPOGRAPHY?.fontSize?.xl || 20;
  const fontSize2xl = TYPOGRAPHY?.fontSize?.['2xl'] || 24;

  const fontWeightRegular = TYPOGRAPHY?.fontWeight?.regular || '400';
  const fontWeightMedium = TYPOGRAPHY?.fontWeight?.medium || '500';
  const fontWeightSemibold = TYPOGRAPHY?.fontWeight?.semibold || '600';
  const fontWeightBold = TYPOGRAPHY?.fontWeight?.bold || '700';

  const radiusSm = BORDERS?.radius?.sm || 4;
  const radiusMd = BORDERS?.radius?.md || 8;
  const radiusLg = BORDERS?.radius?.lg || 12;
  const radiusFull = BORDERS?.radius?.full || 9999;

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: bgPaper,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: bgPaper,
    },
    loadingText: {
      marginTop: spacingMd,
      fontSize: fontSizeMd,
      color: textTertiary,
    },
    scrollContainer: {
      flex: 1,
      backgroundColor: bgPaper,
    },
    content: {
      paddingHorizontal: containerHorizontal,
      paddingVertical: containerVertical,
      backgroundColor: bgPaper,
      flex: 1,
    },
    // Search section
    searchSection: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: spacingLg,
      gap: spacingSm + 4, // 12
    },
    searchContainer: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: COLORS?.neutral?.gray?.[50] || COLORS?.background?.default || '#EEEEEE',
      borderRadius: radiusLg,
      paddingHorizontal: spacingMd,
      paddingVertical: spacingSm + 4, // 12
      borderWidth: 1,
      borderColor: borderLight,
    },
    searchIcon: {
      marginRight: spacingSm,
    },
    searchInput: {
      flex: 1,
      fontSize: fontSizeMd,
      color: textPrimary,
      padding: 0,
    },
    clearButton: {
      marginLeft: spacingSm,
      padding: spacingXs,
    },
    filterButton: {
      width: 48,
      height: 48,
      borderRadius: radiusFull,
      backgroundColor: primaryLight,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: borderLight,
    },
    // Services section
    servicesSection: {
      marginBottom: spacingLg,
    },
    sectionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacingMd,
    },
    sectionTitle: {
      fontSize: fontSizeLg,
      fontWeight: fontWeightBold,
      color: textPrimary,
    },
    sortButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacingXs,
    },
    sortButtonText: {
      fontSize: fontSizeBase,
      color: textPrimary,
      fontWeight: fontWeightMedium,
    },
    // Service item - diseño mejorado con card usando sistema de diseño
    serviceItem: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: bgPaper,
      paddingVertical: spacingMd,
      paddingHorizontal: spacingMd,
      marginBottom: spacingSm,
      borderRadius: radiusLg,
      borderWidth: 1,
      borderColor: borderLight,
      gap: spacingMd,
      ...SHADOWS?.sm || { shadowColor: '#00171F', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3, elevation: 2 },
    },
    serviceItemIcon: {
      width: 56,
      height: 56,
      borderRadius: radiusMd,
      backgroundColor: primaryLight,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: (primaryObj as any)?.['100'] || borderLight,
    },
    serviceItemInfo: {
      flex: 1,
      gap: spacingXs,
    },
    serviceItemName: {
      fontSize: fontSizeMd,
      fontWeight: fontWeightBold,
      color: textPrimary,
      marginBottom: spacingXs,
      lineHeight: 20,
    },
    serviceItemDate: {
      fontSize: fontSizeSm,
      color: textTertiary,
      marginBottom: 2,
      lineHeight: 16,
    },
    serviceItemType: {
      fontSize: fontSizeSm,
      color: textSecondary,
      lineHeight: 16,
    },
    serviceItemStatus: {
      alignItems: 'flex-end',
      justifyContent: 'center',
    },
    statusBadge: {
      paddingHorizontal: spacingSm + 2, // 10
      paddingVertical: spacingXs + 2, // 6
      borderRadius: radiusFull,
      minWidth: 70,
      alignItems: 'center',
      justifyContent: 'center',
    },
    statusBadgeText: {
      fontSize: fontSizeSm,
      fontWeight: fontWeightSemibold,
      color: COLORS?.base?.white || '#FFFFFF',
      textTransform: 'capitalize',
      letterSpacing: 0.3,
    },
    // Empty state
    emptyContainer: {
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: spacingXl,
      paddingTop: spacingXl * 1.25, // 40
      paddingBottom: spacingXl * 1.25, // 40
    },
    emptyIconContainer: {
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: COLORS?.neutral?.gray?.[50] || COLORS?.background?.default || '#EEEEEE',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: spacingLg,
    },
    emptyTitle: {
      fontSize: fontSize2xl - 2, // 22
      fontWeight: fontWeightBold,
      color: textPrimary,
      marginBottom: spacingSm + 4, // 12
      textAlign: 'center',
    },
    emptySubtitle: {
      fontSize: fontSizeMd,
      color: textTertiary,
      textAlign: 'center',
      lineHeight: 24,
      marginBottom: spacingXl,
      maxWidth: 280,
    },
    createFirstButton: {
      backgroundColor: primary500,
      paddingHorizontal: spacingXl,
      paddingVertical: spacingMd,
      borderRadius: radiusLg,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: 200,
      ...SHADOWS?.lg || { shadowColor: primary500, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 },
    },
    createFirstButtonText: {
      color: COLORS?.base?.white || '#FFFFFF',
      fontSize: fontSizeMd,
      fontWeight: fontWeightSemibold,
    },
    // No results state
    noResultsContainer: {
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: spacingXl * 1.875, // 60
      paddingHorizontal: spacingXl,
    },
    noResultsText: {
      fontSize: fontSizeLg,
      fontWeight: fontWeightBold,
      color: textPrimary,
      marginTop: spacingMd,
      marginBottom: spacingSm,
      textAlign: 'center',
    },
    noResultsSubtext: {
      fontSize: fontSizeBase,
      color: textTertiary,
      textAlign: 'center',
      marginBottom: spacingLg,
    },
    clearSearchButton: {
      backgroundColor: COLORS?.neutral?.gray?.[50] || COLORS?.background?.default || '#EEEEEE',
      paddingHorizontal: spacingLg,
      paddingVertical: spacingSm + 4, // 12
      borderRadius: radiusSm,
      borderWidth: 1,
      borderColor: borderLight,
    },
    clearSearchButtonText: {
      fontSize: fontSizeBase,
      fontWeight: fontWeightSemibold,
      color: textPrimary,
    },
  });
};

// Crear estilos usando la función
const styles = createStyles();

export default MisServiciosScreen;
