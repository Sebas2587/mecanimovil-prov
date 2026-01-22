import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useTheme } from '@/app/design-system/theme/useTheme';
import { COLORS, SPACING, TYPOGRAPHY, SHADOWS, BORDERS } from '@/app/design-system/tokens';

// Interface para el servicio (mismo que en mis-servicios.tsx)
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

export default function ServicioResumenScreen() {
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

  const { id, servicioData } = useLocalSearchParams<{ id: string; servicioData?: string }>();
  const [servicio, setServicio] = useState<ServicioOferta | null>(
    servicioData ? JSON.parse(servicioData) : null
  );
  const [loading, setLoading] = useState(!servicioData);
  const [loadingFotos, setLoadingFotos] = useState(false);

  // Cargar fotos del servicio desde el endpoint
  useEffect(() => {
    const cargarFotos = async () => {
      if (!servicio || !servicio.id) return;
      
      // Si ya hay fotos en fotos_urls, no cargar de nuevo
      if (servicio.fotos_urls && servicio.fotos_urls.length > 0) {
        console.log('📸 Fotos ya disponibles en servicio:', servicio.fotos_urls.length);
        return;
      }
      
      try {
        setLoadingFotos(true);
        console.log('📸 Cargando fotos del servicio:', servicio.id);
        const { fotosServiciosAPI } = await import('@/services/api');
        const fotosData = await fotosServiciosAPI.obtenerFotosOferta(servicio.id);
        
        // Extraer URLs de las fotos
        const fotosUrls: string[] = [];
        if (Array.isArray(fotosData)) {
          fotosData.forEach((foto: any) => {
            if (foto.imagen_url) {
              fotosUrls.push(foto.imagen_url);
            } else if (foto.imagen) {
              fotosUrls.push(foto.imagen);
            }
          });
        } else if (fotosData.results && Array.isArray(fotosData.results)) {
          fotosData.results.forEach((foto: any) => {
            if (foto.imagen_url) {
              fotosUrls.push(foto.imagen_url);
            } else if (foto.imagen) {
              fotosUrls.push(foto.imagen);
            }
          });
        }
        
        if (fotosUrls.length > 0) {
          console.log('✅ Fotos cargadas:', fotosUrls.length);
          setServicio({
            ...servicio,
            fotos_urls: fotosUrls
          });
        } else {
          console.log('⚠️ No se encontraron fotos para el servicio');
        }
      } catch (error) {
        console.error('❌ Error cargando fotos del servicio:', error);
        // No mostrar error al usuario, solo logear
      } finally {
        setLoadingFotos(false);
      }
    };

    if (servicio && servicio.id) {
      cargarFotos();
    }
  }, [servicio?.id]);

  // Función para cambiar disponibilidad
  const toggleDisponibilidad = async () => {
    if (!servicio) return;

    try {
      const { serviciosAPI } = await import('@/services/api');
      
      console.log(`🔄 Cambiando disponibilidad del servicio ${servicio.id}`);
      
      await serviciosAPI.cambiarDisponibilidad(servicio.id, !servicio.disponible);
      
      // Actualizar estado local
      setServicio({
        ...servicio,
        disponible: !servicio.disponible
      });
      
      console.log(`✅ Disponibilidad cambiada a: ${!servicio.disponible}`);
      Alert.alert('Éxito', `Servicio ${!servicio.disponible ? 'activado' : 'pausado'} correctamente`);
      
    } catch (error) {
      console.error('❌ Error cambiando disponibilidad:', error);
      Alert.alert('Error', 'No se pudo cambiar la disponibilidad del servicio');
    }
  };

  // Función para eliminar servicio
  const eliminarServicio = async () => {
    if (!servicio) return;

    Alert.alert(
      '⚠️ Advertencia',
      `¿Estás seguro de que deseas eliminar "${servicio.servicio_info.nombre}"?\n\nEsta acción no se puede deshacer y el servicio será eliminado permanentemente.`,
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
              
              console.log(`✅ Servicio eliminado exitosamente`);
              
              Alert.alert(
                'Éxito', 
                'El servicio ha sido eliminado correctamente',
                [
                  {
                    text: 'OK',
                    onPress: () => router.back()
                  }
                ]
              );
              
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
  const editarServicio = () => {
    if (!servicio) return;
    
    console.log('🔧 Navegando a editar servicio:', servicio.id);
    
    router.push({
      pathname: '/crear-servicio',
      params: {
        mode: 'edit',
        servicioId: servicio.id.toString(),
        servicioData: JSON.stringify(servicio)
      }
    });
  };

  // Función para formatear fecha
  const formatearFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Obtener colores del sistema de diseño con nuevos fallbacks
  const bgPaper = (safeColors?.background as any)?.paper || (safeColors?.base as any)?.white || '#FFFFFF';
  const bgDefault = (safeColors?.background as any)?.default || '#EEEEEE';
  const textPrimary = safeColors?.text?.primary || '#000000';
  const textSecondary = safeColors?.text?.secondary || '#666666';
  const textTertiary = safeColors?.text?.tertiary || '#999999';
  const borderLight = (safeColors?.border as any)?.light || '#EEEEEE';
  const borderMain = (safeColors?.border as any)?.main || '#D0D0D0';
  const primaryObj = safeColors?.primary as any;
  const accentObj = safeColors?.accent as any;
  const successObj = safeColors?.success as any;
  const errorObj = safeColors?.error as any;
  const warningObj = safeColors?.warning as any;
  const infoObj = safeColors?.info as any;
  const primary500 = primaryObj?.['500'] || '#4E4FEB';
  const success500 = successObj?.main || successObj?.['500'] || '#3DB6B1';
  const error500 = errorObj?.main || errorObj?.['500'] || '#FF5555';
  const warning500 = warningObj?.main || warningObj?.['500'] || '#FFB84D';
  const primaryLight = primaryObj?.['50'] || primaryObj?.light || '#E6F2FF';
  const successLight = successObj?.light || successObj?.['50'] || '#E6F7F4';
  const errorLight = errorObj?.light || errorObj?.['50'] || '#FFEBEE';
  const warningLight = warningObj?.light || warningObj?.['50'] || '#FFF8E6';
  const infoLight = infoObj?.light || infoObj?.['50'] || '#E6F5F9';
  const neutralGray50 = ((safeColors?.neutral as any)?.gray as any)?.['50'] || '#F9F9F9';
  const neutralGray100 = ((safeColors?.neutral as any)?.gray as any)?.['100'] || '#F5F5F5';
  const containerHorizontal = safeSpacing?.container?.horizontal || safeSpacing?.content?.horizontal || 18;
  const spacingXs = safeSpacing?.xs || 4;
  const spacingSm = safeSpacing?.sm || 8;
  const spacingMd = safeSpacing?.md || 16;
  const spacingLg = safeSpacing?.lg || 24;
  const fontSizeBase = safeTypography?.fontSize?.base || 14;
  const fontSizeMd = safeTypography?.fontSize?.md || 16;
  const fontSizeLg = safeTypography?.fontSize?.lg || 18;
  const fontSizeXl = safeTypography?.fontSize?.xl || 20;
  const fontWeightMedium = safeTypography?.fontWeight?.medium || '500';
  const fontWeightSemibold = safeTypography?.fontWeight?.semibold || '600';
  const fontWeightBold = safeTypography?.fontWeight?.bold || '700';
  const radiusMd = safeBorders?.radius?.md || 8;
  const radiusLg = safeBorders?.radius?.lg || 12;
  const radiusXl = safeBorders?.radius?.xl || 16;
  const radius2xl = safeBorders?.radius?.['2xl'] || 20;
  const shadowSm = safeShadows?.sm || { shadowColor: '#000000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3, elevation: 2 };
  const shadowMd = safeShadows?.md || { shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: bgDefault }]}>
        <SafeAreaView style={[styles.headerSafeArea, { backgroundColor: bgPaper }]} edges={['top']}>
          <View style={[styles.header, { borderBottomColor: borderLight }]}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <MaterialIcons name="arrow-back" size={24} color={textPrimary} />
            </TouchableOpacity>
            <View style={styles.titleContainer}>
              <Text style={[styles.title, { color: textPrimary }]}>Cargando...</Text>
            </View>
            <View style={{ width: 24 }} />
          </View>
        </SafeAreaView>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={primary500} />
          <Text style={[styles.loadingText, { color: textTertiary }]}>Cargando servicio...</Text>
        </View>
      </View>
    );
  }

  if (!servicio) {
    return (
      <View style={[styles.container, { backgroundColor: bgDefault }]}>
        <SafeAreaView style={[styles.headerSafeArea, { backgroundColor: bgPaper }]} edges={['top']}>
          <View style={[styles.header, { borderBottomColor: borderLight }]}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <MaterialIcons name="arrow-back" size={24} color={textPrimary} />
            </TouchableOpacity>
            <View style={styles.titleContainer}>
              <Text style={[styles.title, { color: textPrimary }]}>Error</Text>
            </View>
            <View style={{ width: 24 }} />
          </View>
        </SafeAreaView>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: error500 }]}>No se pudo cargar el servicio</Text>
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: primary500 }]} 
            onPress={() => router.back()}
          >
            <Text style={[styles.actionButtonText, { color: '#FFFFFF' }]}>Volver</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: bgDefault }]}>
      <Stack.Screen options={{ headerShown: false }} />
      
      {/* Header */}
      <SafeAreaView style={[styles.headerSafeArea, { backgroundColor: bgPaper }]} edges={['top']}>
        <View style={[styles.header, { borderBottomColor: borderLight }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <MaterialIcons name="arrow-back" size={24} color={textPrimary} />
          </TouchableOpacity>
          <View style={styles.titleContainer}>
            <Text style={[styles.title, { color: textPrimary }]}>Resumen del Servicio</Text>
            <Text style={[styles.subtitle, { color: textTertiary }]}>Servicio #{servicio.id}</Text>
          </View>
          <View style={{ width: 24 }} />
        </View>
      </SafeAreaView>

      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 120 }]} 
        showsVerticalScrollIndicator={false}
      >
        {/* Estado del servicio - UI Card */}
        <View style={[styles.statusCard, { backgroundColor: bgPaper, borderColor: borderLight, ...shadowSm }]}>
          <View style={styles.statusRow}>
            <View style={[
              styles.statusBadge,
              { backgroundColor: servicio.disponible ? success500 : error500 }
            ]}>
              <Text style={styles.statusBadgeText}>
                {servicio.disponible ? 'Activo' : 'Pausado'}
              </Text>
            </View>
            <Text style={[styles.statusDate, { color: textTertiary }]}>
              Creado: {formatearFecha(servicio.fecha_creacion)}
            </Text>
          </View>
        </View>

        {/* Información del servicio - UI Card */}
        <View style={[styles.infoCard, { backgroundColor: bgPaper, borderColor: borderLight, ...shadowSm }]}>
          <Text style={[styles.cardTitle, { color: textPrimary }]}>Información del Servicio</Text>
          
          {/* Nombre del servicio */}
          <View style={styles.infoRow}>
            <MaterialIcons name="build" size={20} color={primary500} />
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: textTertiary }]}>Nombre del Servicio</Text>
              <Text style={[styles.infoValue, { color: textPrimary }]}>{servicio.servicio_info.nombre}</Text>
            </View>
          </View>

          {/* Marca de vehículo */}
          <View style={[styles.infoRow, styles.infoRowSecond]}>
            <MaterialIcons name="directions-car" size={20} color={primary500} />
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: textTertiary }]}>Marca de Vehículo</Text>
              {servicio.marca_vehiculo_info && servicio.marca_vehiculo_info.nombre ? (
                <Text style={[styles.infoValue, { color: textPrimary }]}>{servicio.marca_vehiculo_info.nombre}</Text>
              ) : (
                <Text style={[styles.infoValue, { color: textTertiary }]}>No especificada</Text>
              )}
            </View>
          </View>

          {/* Repuestos */}
          <View style={[styles.infoRow, styles.infoRowSecond]}>
            <MaterialIcons name="settings" size={20} color={primary500} />
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: textTertiary }]}>Repuestos</Text>
              {servicio.tipo_servicio === 'con_repuestos' ? (
                (servicio.repuestos_info && Array.isArray(servicio.repuestos_info) && servicio.repuestos_info.length > 0) ||
                (servicio.repuestos_seleccionados && Array.isArray(servicio.repuestos_seleccionados) && servicio.repuestos_seleccionados.length > 0) ? (
                  <View style={styles.repuestosContainer}>
                    {(servicio.repuestos_info && servicio.repuestos_info.length > 0 ? servicio.repuestos_info : servicio.repuestos_seleccionados || []).map((repuesto: any, index: number) => {
                      const nombreRepuesto = repuesto.nombre || repuesto.descripcion || `Repuesto ${index + 1}`;
                      const cantidad = repuesto.cantidad ? ` (x${repuesto.cantidad})` : '';
                      return (
                        <View key={repuesto.id || index} style={[styles.repuestoTag, { backgroundColor: primaryLight }]}>
                          <Text style={[styles.repuestoText, { color: primary500 }]}>
                            {nombreRepuesto}{cantidad}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                ) : (
                  <Text style={[styles.infoValue, { color: textTertiary }]}>Sin repuestos seleccionados</Text>
                )
              ) : (
                <Text style={[styles.infoValue, { color: textTertiary }]}>Sin repuestos</Text>
              )}
            </View>
          </View>

          {/* Fotos en miniatura - Mostrar máximo 4 fotos */}
          <View style={[styles.infoRow, styles.infoRowSecond]}>
            <MaterialIcons name="photo-library" size={20} color={primary500} />
            <View style={styles.infoContent}>
              <Text style={[styles.infoLabel, { color: textTertiary }]}>Fotos del Servicio</Text>
              {loadingFotos ? (
                <View style={styles.loadingFotosContainer}>
                  <ActivityIndicator size="small" color={primary500} />
                  <Text style={[styles.loadingFotosText, { color: textTertiary }]}>Cargando fotos...</Text>
                </View>
              ) : servicio.fotos_urls && Array.isArray(servicio.fotos_urls) && servicio.fotos_urls.length > 0 ? (
                <>
                  <View style={styles.photosMiniContainer}>
                    {servicio.fotos_urls.slice(0, 4).map((foto, index) => (
                      <Image
                        key={index}
                        source={{ uri: foto }}
                        style={[styles.photoMini, { borderColor: borderLight }]}
                        onError={() => console.log('Error cargando foto:', foto)}
                      />
                    ))}
                    {servicio.fotos_urls.length > 4 && (
                      <View style={[styles.photoMini, styles.photoMiniMore, { backgroundColor: neutralGray100, borderColor: borderLight }]}>
                        <Text style={[styles.photoMiniMoreText, { color: textTertiary }]}>
                          +{servicio.fotos_urls.length - 4}
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.photosCount, { color: textTertiary }]}>
                    {servicio.fotos_urls.length} foto{servicio.fotos_urls.length !== 1 ? 's' : ''}
                  </Text>
                </>
              ) : (
                <Text style={[styles.infoValue, { color: textTertiary }]}>No hay fotos disponibles</Text>
              )}
            </View>
          </View>
        </View>

        {/* Desglose de precios - UI Card */}
        <View style={[styles.priceCard, { backgroundColor: bgPaper, borderColor: borderLight, ...shadowSm }]}>
          <Text style={[styles.cardTitle, { color: textPrimary }]}>💰 Desglose de Precios</Text>
          
          <View style={styles.desgloseContainer}>
            {/* Sección: Costos Base */}
            <View style={styles.desgloseSection}>
              <View style={styles.desgloseRow}>
                <Text style={[styles.desgloseLabel, { color: textTertiary }]}>Precio mano de servicio:</Text>
                <Text style={[styles.desgloseValue, { color: textPrimary }]}>
                  ${parseFloat(servicio.costo_mano_de_obra_sin_iva).toLocaleString('es-CL')}
                </Text>
              </View>
              
              {servicio.tipo_servicio === 'con_repuestos' && parseFloat(servicio.costo_repuestos_sin_iva) > 0 && (
                <View style={styles.desgloseRow}>
                  <Text style={[styles.desgloseLabel, { color: textTertiary }]}>Precio repuestos:</Text>
                  <Text style={[styles.desgloseValue, { color: textPrimary }]}>
                    ${parseFloat(servicio.costo_repuestos_sin_iva).toLocaleString('es-CL')}
                  </Text>
                </View>
              )}
              
              <View style={[styles.desgloseRow, styles.subtotalRow, { backgroundColor: neutralGray50 }]}>
                <Text style={[styles.desgloseLabel, { color: textSecondary, fontWeight: fontWeightBold }]}>Costo total sin IVA:</Text>
                <Text style={[styles.desgloseValue, { color: textPrimary, fontWeight: fontWeightBold }]}>
                  ${servicio.desglose_precios.costo_total_sin_iva.toLocaleString('es-CL')}
                </Text>
              </View>
            </View>
            
            {/* Sección: Precio al Cliente */}
            <View style={styles.desgloseSection}>
              <View style={styles.desgloseRow}>
                <Text style={[styles.desgloseLabel, { color: textTertiary }]}>IVA 19%:</Text>
                <Text style={[styles.desgloseValue, { color: textPrimary }]}>
                  ${servicio.desglose_precios.iva_19_porciento.toLocaleString('es-CL')}
                </Text>
              </View>
              
              <View style={[styles.desgloseRow, styles.precioClienteRow, { backgroundColor: infoLight }]}>
                <Text style={[styles.desgloseLabel, { color: textPrimary, fontWeight: fontWeightBold }]}>Precio al público:</Text>
                <Text style={[styles.desgloseValue, { color: primary500, fontWeight: fontWeightBold, fontSize: fontSizeMd }]}>
                  ${servicio.desglose_precios.precio_final_cliente.toLocaleString('es-CL')}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Botones de acción fijos */}
      <SafeAreaView style={styles.actionsSafeArea} edges={['bottom']}>
        <View style={[styles.actionsContainer, { backgroundColor: bgPaper, borderTopColor: borderLight }]}>
          <TouchableOpacity
            style={[styles.actionButton, {
              backgroundColor: servicio.disponible 
                ? warningLight
                : successLight
            }]}
            onPress={toggleDisponibilidad}
          >
            <MaterialIcons 
              name={servicio.disponible ? 'pause' : 'play-arrow'} 
              size={20} 
              color={servicio.disponible ? warning500 : success500} 
            />
            <Text style={[styles.actionButtonText, {
              color: servicio.disponible ? warning500 : success500
            }]}>
              {servicio.disponible ? 'Pausar' : 'Activar'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: primaryLight }]}
            onPress={editarServicio}
          >
            <MaterialIcons name="edit" size={20} color={primary500} />
            <Text style={[styles.actionButtonText, { color: primary500 }]}>Editar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: errorLight }]}
            onPress={eliminarServicio}
          >
            <MaterialIcons name="delete" size={20} color={error500} />
            <Text style={[styles.actionButtonText, { color: error500 }]}>Eliminar</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

// Función para crear estilos usando tokens del sistema de diseño
const createStyles = () => {
  const bgPaper = COLORS?.background?.paper || COLORS?.base?.white || '#FFFFFF';
  const bgDefault = COLORS?.background?.default || '#EEEEEE';
  const textPrimary = COLORS?.text?.primary || '#000000';
  const textTertiary = COLORS?.text?.tertiary || '#999999';
  const borderLight = COLORS?.border?.light || '#EEEEEE';
  const spacingSm = SPACING?.sm || 8;
  const spacingMd = SPACING?.md || 16;
  const spacingLg = SPACING?.lg || 24;
  const containerHorizontal = SPACING?.container?.horizontal || SPACING?.content?.horizontal || 18;
  const fontSizeBase = TYPOGRAPHY?.fontSize?.base || 14;
  const fontSizeLg = TYPOGRAPHY?.fontSize?.lg || 18;
  const fontWeightBold = TYPOGRAPHY?.fontWeight?.bold || '700';
  const radiusMd = BORDERS?.radius?.md || 8;
  const radiusLg = BORDERS?.radius?.lg || 12;
  const radiusXl = BORDERS?.radius?.xl || 16;
  const radius2xl = BORDERS?.radius?.['2xl'] || 20;
  const shadowSm = SHADOWS?.sm || { shadowColor: '#000000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3, elevation: 2 };

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: bgDefault,
    },
    headerSafeArea: {
      backgroundColor: bgPaper,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: containerHorizontal,
      paddingVertical: spacingMd,
      backgroundColor: bgPaper,
      borderBottomWidth: 1,
    },
    backButton: {
      padding: spacingSm,
    },
    titleContainer: {
      flexDirection: 'column',
      alignItems: 'center',
      flex: 1,
    },
    title: {
      fontSize: fontSizeLg,
      fontWeight: fontWeightBold,
    },
    subtitle: {
      fontSize: fontSizeBase,
      marginTop: spacingSm / 2,
    },
    scrollView: {
      flex: 1,
    },
    content: {
      padding: containerHorizontal,
      paddingBottom: spacingLg * 4,
    },
    // Status card
    statusCard: {
      borderRadius: radiusXl,
      padding: spacingMd,
      marginBottom: spacingMd,
      borderWidth: 1,
    },
    statusRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    statusBadge: {
      paddingHorizontal: spacingMd,
      paddingVertical: spacingSm / 2,
      borderRadius: radius2xl,
    },
    statusBadgeText: {
      fontSize: fontSizeBase - 2,
      fontWeight: fontWeightBold,
      color: '#FFFFFF',
      textTransform: 'uppercase',
    },
    statusDate: {
      fontSize: fontSizeBase,
    },
    // Info card
    infoCard: {
      borderRadius: radiusXl,
      padding: spacingMd,
      marginBottom: spacingMd,
      borderWidth: 1,
    },
    cardTitle: {
      fontSize: fontSizeLg,
      fontWeight: fontWeightBold,
      marginBottom: spacingMd,
    },
    infoRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacingMd,
    },
    infoRowSecond: {
      marginTop: spacingMd,
      paddingTop: spacingMd,
      borderTopWidth: 1,
      borderTopColor: borderLight,
    },
    infoContent: {
      flex: 1,
    },
    infoLabel: {
      fontSize: fontSizeBase - 2,
      marginBottom: spacingSm / 2,
      fontWeight: '500',
    },
    infoValue: {
      fontSize: fontSizeBase,
      fontWeight: '500',
    },
    repuestosContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacingSm,
      marginTop: spacingSm / 2,
    },
    repuestoTag: {
      paddingHorizontal: spacingMd,
      paddingVertical: spacingSm / 2,
      borderRadius: radiusLg,
    },
    repuestoText: {
      fontSize: fontSizeBase - 2,
      fontWeight: '500',
    },
    photosMiniContainer: {
      flexDirection: 'row',
      gap: spacingSm,
      marginTop: spacingSm / 2,
      marginBottom: spacingSm / 2,
    },
    photoMini: {
      width: 48,
      height: 48,
      borderRadius: radiusMd,
      borderWidth: 1,
      backgroundColor: bgDefault,
    },
    photoMiniMore: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    photoMiniMoreText: {
      fontSize: fontSizeBase - 2,
      fontWeight: '600',
    },
    photosCount: {
      fontSize: fontSizeBase - 2,
      marginTop: spacingSm / 2,
    },
    loadingFotosContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacingSm,
      marginTop: spacingSm / 2,
    },
    loadingFotosText: {
      fontSize: fontSizeBase - 2,
    },
    // Price card
    priceCard: {
      borderRadius: radiusXl,
      padding: spacingMd,
      marginBottom: spacingMd,
      borderWidth: 1,
    },
    desgloseContainer: {
      gap: spacingMd,
    },
    desgloseSection: {
      gap: spacingSm,
    },
    desgloseSectionTitle: {
      fontSize: fontSizeBase - 1,
      fontWeight: '600',
      marginBottom: spacingSm,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    desgloseRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: spacingSm / 2,
    },
    desgloseLabel: {
      fontSize: fontSizeBase,
      flex: 1,
      marginRight: spacingSm,
    },
    desgloseValue: {
      fontSize: fontSizeBase,
      fontWeight: '500',
      textAlign: 'right',
      flexShrink: 0,
    },
    subtotalRow: {
      paddingHorizontal: spacingMd,
      paddingVertical: spacingSm,
      borderRadius: radiusMd,
      marginVertical: spacingSm,
      marginHorizontal: -spacingMd,
    },
    precioClienteRow: {
      paddingHorizontal: spacingMd,
      paddingVertical: spacingMd,
      borderRadius: radiusLg,
      marginVertical: spacingSm,
      marginHorizontal: -spacingMd,
    },
    // Actions
    actionsSafeArea: {
      backgroundColor: bgPaper,
    },
    actionsContainer: {
      flexDirection: 'row',
      padding: spacingMd,
      gap: spacingMd,
      borderTopWidth: 1,
    },
    actionButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacingMd,
      borderRadius: radiusLg,
      gap: spacingSm,
    },
    actionButtonText: {
      fontSize: fontSizeBase,
      fontWeight: '600',
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    loadingText: {
      marginTop: spacingMd,
      fontSize: fontSizeBase,
    },
    errorContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: spacingLg,
    },
    errorText: {
      fontSize: fontSizeBase,
      marginBottom: spacingLg,
    },
  });
};

const styles = createStyles();
