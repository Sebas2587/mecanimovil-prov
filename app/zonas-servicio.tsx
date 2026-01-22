import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  RefreshControl,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '@/context/AuthContext';
import { Stack, router } from 'expo-router';
import serviceAreasApi, { ServiceArea, ServiceAreaStats } from '@/services/serviceAreasApi';
import { useTheme } from '@/app/design-system/theme/useTheme';
import { COLORS, SPACING, TYPOGRAPHY, SHADOWS, BORDERS } from '@/app/design-system/tokens';
import Header from '@/components/Header';

// Interfaces TypeScript


export default function ZonasServicioScreen() {
  const { estadoProveedor } = useAuth();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [serviceAreas, setServiceAreas] = useState<ServiceArea[]>([]);
  const [stats, setStats] = useState<ServiceAreaStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);

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

  // Verificar que solo los mecánicos a domicilio puedan acceder
  useEffect(() => {
    if (estadoProveedor?.tipo_proveedor === 'taller') {
      Alert.alert(
        'Acceso Restringido',
        'Esta funcionalidad solo está disponible para mecánicos a domicilio. Los talleres tienen una ubicación fija.',
        [
          {
            text: 'Entendido',
            onPress: () => router.back()
          }
        ]
      );
    }
  }, [estadoProveedor]);

  // Cargar zonas de servicio
  const loadServiceAreas = useCallback(async () => {
    try {
      setLoading(true);

      // Llamada real a la API
      const data = await serviceAreasApi.getServiceAreas();
      setServiceAreas(data);

    } catch (error) {
      console.error('Error cargando zonas de servicio:', error);
      Alert.alert('Error', 'No se pudieron cargar las zonas de servicio');
    } finally {
      setLoading(false);
    }
  }, []);

  // Cargar estadísticas
  const loadStats = useCallback(async () => {
    try {
      // Llamada real a la API
      const statsData = await serviceAreasApi.getServiceAreaStats();
      setStats(statsData);

    } catch (error) {
      console.error('Error cargando estadísticas:', error);
    }
  }, []);

  // Activar/desactivar zona
  const toggleZoneActive = async (zoneId: string, currentStatus: boolean) => {
    try {
      Alert.alert(
        currentStatus ? 'Desactivar Zona' : 'Activar Zona',
        `¿Estás seguro de que quieres ${currentStatus ? 'desactivar' : 'activar'} esta zona?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: currentStatus ? 'Desactivar' : 'Activar',
            style: currentStatus ? 'destructive' : 'default',
            onPress: async () => {
              try {
                // Llamada real a la API
                const updatedZone = await serviceAreasApi.toggleServiceAreaActive(zoneId);

                // Actualizar localmente
                setServiceAreas(prev => prev.map(zone =>
                  zone.id === zoneId
                    ? { ...zone, is_active: updatedZone.is_active }
                    : zone
                ));

                await loadStats();
              } catch (error) {
                console.error('Error actualizando zona:', error);
                Alert.alert('Error', 'No se pudo actualizar la zona');
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error en toggle:', error);
    }
  };

  // Eliminar zona
  const deleteZone = async (zoneId: string, zoneName: string) => {
    Alert.alert(
      'Eliminar Zona',
      `¿Estás seguro de que quieres eliminar "${zoneName}"? Esta acción no se puede deshacer.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              // Llamada real a la API
              await serviceAreasApi.deleteServiceArea(zoneId);

              // Actualizar localmente
              setServiceAreas(prev => prev.filter(zone => zone.id !== zoneId));
              await loadStats();

              Alert.alert('Éxito', 'Zona eliminada correctamente');
            } catch (error) {
              console.error('Error eliminando zona:', error);
              Alert.alert('Error', 'No se pudo eliminar la zona');
            }
          }
        }
      ]
    );
  };

  // Navegación a crear/editar zona
  const navigateToCreateZone = () => {
    router.push('/crear-zona-servicio');
  };

  const navigateToEditZone = (zoneId: string) => {
    router.push(`/editar-zona-servicio?id=${zoneId}`);
  };

  // Efectos
  useEffect(() => {
    loadServiceAreas();
    loadStats();
  }, [loadServiceAreas, loadStats]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([loadServiceAreas(), loadStats()]);
    setRefreshing(false);
  }, [loadServiceAreas, loadStats]);

  // Obtener colores del sistema de diseño
  const bgPaper = (safeColors?.background as any)?.paper || (safeColors?.base as any)?.white || '#FFFFFF';
  const bgDefault = (safeColors?.background as any)?.default || '#F5F7F8';
  const textPrimary = safeColors?.text?.primary || (safeColors?.neutral as any)?.inkBlack || '#00171F';
  const textSecondary = safeColors?.text?.secondary || ((safeColors?.neutral as any)?.gray as any)?.[800] || '#3E4F53';
  const textTertiary = safeColors?.text?.tertiary || ((safeColors?.neutral as any)?.gray as any)?.[700] || '#5D6F75';
  const borderLight = (safeColors?.border as any)?.light || ((safeColors?.neutral as any)?.gray as any)?.[200] || '#D7DFE3';
  const primaryObj = safeColors?.primary as any;
  const successObj = safeColors?.success as any;
  const errorObj = safeColors?.error as any;
  const warningObj = safeColors?.warning as any;
  const infoObj = safeColors?.info as any;
  const accentObj = safeColors?.accent as any;
  const primary500 = primaryObj?.['500'] || (safeColors?.accent as any)?.['500'] || '#003459';
  const primaryLight = primaryObj?.['50'] || (safeColors?.accent as any)?.['50'] || '#E6F0F5';
  const success500 = successObj?.main || successObj?.['500'] || '#00C9A7';
  const successLight = successObj?.light || successObj?.['50'] || '#E6F7F4';
  const error500 = errorObj?.main || errorObj?.['500'] || '#FF6B6B';
  const errorLight = errorObj?.light || errorObj?.['50'] || '#FFEBEE';
  const warning500 = warningObj?.main || warningObj?.['500'] || '#FFB84D';
  const info500 = infoObj?.main || infoObj?.['500'] || accentObj?.['500'] || '#007EA7';
  const infoLight = infoObj?.light || infoObj?.['50'] || primaryLight || '#E6F5F9';
  const containerHorizontal = safeSpacing?.container?.horizontal || safeSpacing?.content?.horizontal || 18;
  const spacingXs = safeSpacing?.xs || 4;
  const spacingSm = safeSpacing?.sm || 8;
  const spacingMd = safeSpacing?.md || 16;
  const spacingLg = safeSpacing?.lg || 24;
  const cardPadding = safeSpacing?.cardPadding || spacingMd;
  const cardGap = safeSpacing?.cardGap || spacingSm + 4;
  const radiusXl = safeBorders?.radius?.xl || 16;
  const fontSizeBase = safeTypography?.fontSize?.base || 14;
  const fontSizeSm = safeTypography?.fontSize?.sm || 12;
  const fontSizeMd = safeTypography?.fontSize?.md || 16;
  const fontSizeLg = safeTypography?.fontSize?.lg || 18;
  const fontWeightMedium = safeTypography?.fontWeight?.medium || '500';
  const fontWeightSemibold = safeTypography?.fontWeight?.semibold || '600';
  const fontWeightBold = safeTypography?.fontWeight?.bold || '700';
  const shadowSm = safeShadows?.sm || { shadowColor: '#00171F', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3, elevation: 2 };
  const shadowMd = safeShadows?.md || { shadowColor: '#00171F', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 };

  // Renderizar zona de servicio
  const renderServiceArea = (area: ServiceArea) => (
    <View key={area.id} style={styles.zoneCard}>
      <View style={styles.zoneHeader}>
        <View style={styles.zoneInfo}>
          <Text style={[styles.zoneName, { color: textPrimary }]}>
            {area.name || `Zona ${area.id.slice(-4)}`}
          </Text>
          <View style={styles.zoneStats}>
            <View style={styles.communeCount}>
              <Ionicons name="location" size={14} color={textTertiary} />
              <Text style={[styles.communeCountText, { color: textTertiary }]}>
                {area.commune_count} comuna{area.commune_count !== 1 ? 's' : ''}
              </Text>
            </View>
            <View style={[
              styles.statusBadge,
              area.is_active
                ? { backgroundColor: successLight, borderColor: success500 }
                : { backgroundColor: bgDefault, borderColor: borderLight }
            ]}>
              <Text style={[
                styles.statusText,
                { color: area.is_active ? success500 : textTertiary }
              ]}>
                {area.is_active ? 'Activa' : 'Inactiva'}
              </Text>
            </View>
          </View>
        </View>
        <TouchableOpacity
          style={styles.moreButton}
          onPress={() => toggleZoneActive(area.id, area.is_active)}
          activeOpacity={0.7}
        >
          <Ionicons
            name={area.is_active ? "pause-circle" : "play-circle"}
            size={24}
            color={area.is_active ? warning500 : success500}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.communesList}>
        <Text style={[styles.communesLabel, { color: textPrimary }]}>Comunas:</Text>
        <View style={styles.communesTags}>
          {area.commune_names.slice(0, 3).map((commune, index) => (
            <View key={index} style={[styles.communeTag, { backgroundColor: infoLight, borderColor: borderLight }]}>
              <Text style={[styles.communeTagText, { color: info500 }]}>{commune}</Text>
            </View>
          ))}
          {area.commune_names.length > 3 && (
            <View style={[styles.communeTag, styles.moreTag, { backgroundColor: bgDefault, borderColor: borderLight }]}>
              <Text style={[styles.moreTagText, { color: textTertiary }]}>+{area.commune_names.length - 3}</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.zoneActions}>
        <TouchableOpacity
          style={[styles.actionButton, styles.editButton, { backgroundColor: infoLight }]}
          onPress={() => navigateToEditZone(area.id)}
          activeOpacity={0.7}
        >
          <Ionicons name="create" size={16} color={info500} />
          <Text style={[styles.actionButtonText, { color: info500 }]}>Editar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton, { backgroundColor: errorLight }]}
          onPress={() => deleteZone(area.id, area.name)}
          activeOpacity={0.7}
        >
          <Ionicons name="trash" size={16} color={error500} />
          <Text style={[styles.actionButtonText, { color: error500 }]}>Eliminar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: bgDefault }]}>
        <Header
          title="Zonas de Servicio"
          showBack
          onBackPress={() => router.back()}
          rightComponent={
            <TouchableOpacity
              style={styles.addButtonHeader}
              onPress={navigateToCreateZone}
              activeOpacity={0.7}
            >
              <MaterialIcons name="add" size={24} color={primary500} />
            </TouchableOpacity>
          }
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={primary500} />
          <Text style={[styles.loadingText, { color: textTertiary }]}>Cargando zonas de servicio...</Text>
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bgDefault }]} edges={['left', 'right', 'bottom']}>
      <Stack.Screen
        options={{
          title: 'Zonas de Servicio',
          headerShown: false,
        }}
      />

      <Header
        title="Zonas de Servicio"
        showBack={true}
        onBackPress={() => router.back()}
        rightComponent={
          <View style={styles.headerRightActions}>
            <TouchableOpacity
              style={styles.statsButtonHeader}
              onPress={() => setShowStatsModal(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="stats-chart" size={20} color={primary500} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.addButtonHeader, { backgroundColor: primary500, ...shadowMd }]}
              onPress={navigateToCreateZone}
              activeOpacity={0.8}
            >
              <MaterialIcons
                name="add"
                size={24}
                color={COLORS?.text?.onPrimary || COLORS?.base?.white || '#FFFFFF'}
              />
            </TouchableOpacity>
          </View>
        }
      />

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
      >
        <View style={[styles.content, { paddingHorizontal: containerHorizontal }]}>
          {/* Información contextual - UI Card */}
          <View style={styles.uiCard}>
            <View style={styles.infoCardContent}>
              <Ionicons name="information-circle" size={20} color={primary500} />
              <Text style={[styles.infoText, { color: textPrimary }]}>
                Define las comunas donde ofreces servicios a domicilio. Los clientes podrán encontrarte cuando soliciten servicios en estas zonas.
              </Text>
            </View>
          </View>

          {/* Estadísticas rápidas - UI Card */}
          {stats && (
            <View style={styles.uiCard}>
              <Text style={[styles.sectionTitle, { color: textPrimary }]}>📊 Resumen</Text>
              <View style={styles.quickStats}>
                <View style={styles.statItem}>
                  <Text style={[styles.statNumber, { color: primary500 }]}>{stats.active_zones}</Text>
                  <Text style={[styles.statLabel, { color: textTertiary }]}>Zonas Activas</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={[styles.statNumber, { color: primary500 }]}>{stats.total_communes_covered}</Text>
                  <Text style={[styles.statLabel, { color: textTertiary }]}>Comunas Cubiertas</Text>
                </View>
              </View>
            </View>
          )}

          {/* Lista de zonas */}
          {serviceAreas.length > 0 ? (
            <View style={styles.zonesContainer}>
              {serviceAreas.map(renderServiceArea)}
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Ionicons name="location-outline" size={64} color={textTertiary} />
              <Text style={[styles.emptyTitle, { color: textPrimary }]}>No tienes zonas de servicio</Text>
              <Text style={[styles.emptySubtitle, { color: textTertiary }]}>
                Crea tu primera zona para empezar a recibir solicitudes de servicio
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Modal de estadísticas */}
      <Modal
        visible={showStatsModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowStatsModal(false)}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: bgDefault }]}>
          <View style={[styles.modalHeader, { backgroundColor: bgPaper, borderBottomColor: borderLight }]}>
            <Text style={[styles.modalTitle, { color: textPrimary }]}>Estadísticas de Cobertura</Text>
            <TouchableOpacity onPress={() => setShowStatsModal(false)} activeOpacity={0.7}>
              <Ionicons name="close" size={24} color={textTertiary} />
            </TouchableOpacity>
          </View>

          {stats && (
            <ScrollView style={styles.statsContent} showsVerticalScrollIndicator={false}>
              <View style={[styles.statCard, { backgroundColor: bgPaper, borderColor: borderLight, ...shadowSm }]}>
                <Text style={[styles.statCardNumber, { color: primary500 }]}>{stats.total_zones}</Text>
                <Text style={[styles.statCardLabel, { color: textTertiary }]}>Total de Zonas</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: bgPaper, borderColor: borderLight, ...shadowSm }]}>
                <Text style={[styles.statCardNumber, { color: success500 }]}>{stats.active_zones}</Text>
                <Text style={[styles.statCardLabel, { color: textTertiary }]}>Zonas Activas</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: bgPaper, borderColor: borderLight, ...shadowSm }]}>
                <Text style={[styles.statCardNumber, { color: textTertiary }]}>{stats.inactive_zones}</Text>
                <Text style={[styles.statCardLabel, { color: textTertiary }]}>Zonas Inactivas</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: bgPaper, borderColor: borderLight, ...shadowSm }]}>
                <Text style={[styles.statCardNumber, { color: info500 }]}>{stats.total_communes_covered}</Text>
                <Text style={[styles.statCardLabel, { color: textTertiary }]}>Comunas Cubiertas</Text>
              </View>

              <View style={[styles.summaryCard, { backgroundColor: bgPaper, borderColor: borderLight, ...shadowSm }]}>
                <Text style={[styles.summaryText, { color: textPrimary }]}>{stats.coverage_summary}</Text>
              </View>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>
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
  const primaryObj = COLORS?.primary as any;
  const accentObj = COLORS?.accent as any;
  const primary500 = primaryObj?.['500'] || accentObj?.['500'] || '#003459';
  const spacingXs = SPACING?.xs || 4;
  const spacingSm = SPACING?.sm || 8;
  const spacingMd = SPACING?.md || 16;
  const spacingLg = SPACING?.lg || 24;
  const containerHorizontal = SPACING?.container?.horizontal || SPACING?.content?.horizontal || 18;
  const cardPadding = SPACING?.cardPadding || spacingMd;
  const cardGap = SPACING?.cardGap || spacingSm + 4;
  const radiusXl = BORDERS?.radius?.xl || 16;
  const fontSizeBase = TYPOGRAPHY?.fontSize?.base || 14;
  const fontSizeSm = TYPOGRAPHY?.fontSize?.sm || 12;
  const fontSizeMd = TYPOGRAPHY?.fontSize?.md || 16;
  const fontSizeLg = TYPOGRAPHY?.fontSize?.lg || 18;
  const fontWeightMedium = TYPOGRAPHY?.fontWeight?.medium || '500';
  const fontWeightSemibold = TYPOGRAPHY?.fontWeight?.semibold || '600';
  const fontWeightBold = TYPOGRAPHY?.fontWeight?.bold || '700';
  const shadowSm = SHADOWS?.sm || { shadowColor: '#00171F', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.08, shadowRadius: 3, elevation: 2 };
  const shadowMd = SHADOWS?.md || { shadowColor: '#00171F', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 };

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: bgDefault,
    },
    scrollView: {
      flex: 1,
    },
    content: {
      paddingVertical: spacingMd,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: spacingLg * 2,
    },
    loadingText: {
      marginTop: spacingMd,
      fontSize: fontSizeBase,
    },
    headerRightActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacingSm,
    },
    statsButtonHeader: {
      padding: spacingXs,
      borderRadius: radiusXl / 2,
    },
    addButtonHeader: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: primary500,
    },
    uiCard: {
      backgroundColor: bgPaper,
      borderRadius: radiusXl,
      padding: cardPadding,
      marginBottom: cardGap,
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
    sectionTitle: {
      fontSize: fontSizeLg,
      fontWeight: fontWeightBold,
      marginBottom: spacingMd,
    },
    quickStats: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      paddingTop: spacingSm,
    },
    statItem: {
      alignItems: 'center',
    },
    statNumber: {
      fontSize: fontSizeLg + 4,
      fontWeight: fontWeightBold,
    },
    statLabel: {
      fontSize: fontSizeSm,
      marginTop: spacingXs,
      fontWeight: fontWeightMedium,
    },
    zonesContainer: {
      gap: cardGap,
    },
    zoneCard: {
      backgroundColor: bgPaper,
      borderRadius: radiusXl,
      padding: cardPadding,
      marginBottom: cardGap,
      ...shadowSm,
      borderWidth: 1,
      borderColor: borderLight,
    },
    zoneHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: spacingMd,
    },
    zoneInfo: {
      flex: 1,
    },
    zoneName: {
      fontSize: fontSizeMd + 1,
      fontWeight: fontWeightSemibold,
      marginBottom: spacingSm,
    },
    zoneStats: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacingSm,
    },
    communeCount: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacingXs,
    },
    communeCountText: {
      fontSize: fontSizeBase - 1,
    },
    statusBadge: {
      paddingHorizontal: spacingSm,
      paddingVertical: spacingXs,
      borderRadius: radiusXl / 2,
      borderWidth: 1,
    },
    statusText: {
      fontSize: fontSizeSm,
      fontWeight: fontWeightSemibold,
    },
    moreButton: {
      padding: spacingXs,
    },
    communesList: {
      marginBottom: spacingMd,
    },
    communesLabel: {
      fontSize: fontSizeBase,
      fontWeight: fontWeightMedium,
      marginBottom: spacingSm,
    },
    communesTags: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacingSm,
    },
    communeTag: {
      paddingHorizontal: spacingSm + 2,
      paddingVertical: spacingXs + 1,
      borderRadius: radiusXl / 2,
      borderWidth: 1,
    },
    communeTagText: {
      fontSize: fontSizeSm,
      fontWeight: fontWeightMedium,
    },
    moreTag: {
      // Estilos aplicados dinámicamente
    },
    moreTagText: {
      fontSize: fontSizeSm,
      fontWeight: fontWeightMedium,
    },
    zoneActions: {
      flexDirection: 'row',
      gap: spacingSm,
      paddingTop: spacingSm,
      borderTopWidth: 1,
      borderTopColor: borderLight,
    },
    actionButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: spacingSm + 2,
      paddingHorizontal: spacingMd,
      borderRadius: radiusXl / 2,
      gap: spacingXs,
    },
    editButton: {
      // backgroundColor aplicado dinámicamente
    },
    deleteButton: {
      // backgroundColor aplicado dinámicamente
    },
    actionButtonText: {
      fontSize: fontSizeBase,
      fontWeight: fontWeightSemibold,
    },
    emptyContainer: {
      paddingVertical: spacingLg * 2,
      alignItems: 'center',
    },
    emptyTitle: {
      fontSize: fontSizeLg,
      fontWeight: fontWeightSemibold,
      marginTop: spacingMd,
      marginBottom: spacingSm,
    },
    emptySubtitle: {
      fontSize: fontSizeBase,
      textAlign: 'center',
      lineHeight: fontSizeBase + 6,
      paddingHorizontal: spacingLg,
    },
    modalContainer: {
      flex: 1,
      backgroundColor: bgDefault,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: containerHorizontal,
      paddingVertical: spacingMd,
      borderBottomWidth: 1,
      ...shadowSm,
    },
    modalTitle: {
      fontSize: fontSizeLg,
      fontWeight: fontWeightBold,
    },
    statsContent: {
      padding: containerHorizontal,
      gap: cardGap,
    },
    statCard: {
      backgroundColor: bgPaper,
      padding: cardPadding,
      borderRadius: radiusXl,
      alignItems: 'center',
      borderWidth: 1,
      ...shadowSm,
    },
    statCardNumber: {
      fontSize: fontSizeLg + 12,
      fontWeight: fontWeightBold,
    },
    statCardLabel: {
      fontSize: fontSizeBase,
      marginTop: spacingXs,
      fontWeight: fontWeightMedium,
    },
    summaryCard: {
      backgroundColor: bgPaper,
      padding: cardPadding,
      borderRadius: radiusXl,
      borderWidth: 1,
      ...shadowSm,
    },
    summaryText: {
      fontSize: fontSizeBase,
      textAlign: 'center',
      fontWeight: fontWeightMedium,
      lineHeight: fontSizeBase + 6,
    },
  });
};

const styles = createStyles(); 