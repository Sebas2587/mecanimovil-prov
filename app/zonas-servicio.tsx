import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { Stack, router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import serviceAreasApi, { ServiceArea, ServiceAreaStats } from '@/services/serviceAreasApi';
import { BLANK_GLASS, GLASS_INSET } from '@/app/design-system/blankGlass';
import { COLORS, SPACING, TYPOGRAPHY, SHADOWS, BORDERS } from '@/app/design-system/tokens';
import Header from '@/components/Header';
import { InstitutionalIcon } from '@/components/ui/InstitutionalIcon';
import { InstitutionalButton } from '@/app/design-system/components/InstitutionalButton';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';

// Interfaces TypeScript


export default function ZonasServicioScreen() {
  const { estadoProveedor } = useAuth();
  const insets = useSafeAreaInsets();
  const [serviceAreas, setServiceAreas] = useState<ServiceArea[]>([]);
  const [stats, setStats] = useState<ServiceAreaStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const I = COLORS.institutional;

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
  }, [estadoProveedor?.tipo_proveedor]);

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

  const bgPaper = I.canvas;
  const bgDefault = I.surfaceSoft;
  const textPrimary = I.ink;
  const textSecondary = I.body;
  const textTertiary = I.muted;
  const borderLight = I.hairline;
  const primary500 = I.primary;
  const success500 = I.semanticUp;
  const error500 = I.semanticDown;
  const warning500 = I.accentYellow;

  // Renderizar zona de servicio
  const renderServiceArea = (area: ServiceArea) => (
    <View key={area.id} style={styles.zoneCard}>
      <View style={styles.zoneHeader}>
        <View style={styles.zoneInfo}>
          <Text style={styles.zoneName}>
            {area.name || `Zona ${area.id.slice(-4)}`}
          </Text>
          <View style={styles.zoneStats}>
            <View style={styles.communeCount}>
              <InstitutionalIcon name="location" size={14} color={textTertiary} strokeWidth={ICON_STROKE_WIDTH} />
              <Text style={styles.communeCountText}>
                {area.commune_count} comuna{area.commune_count !== 1 ? 's' : ''}
              </Text>
            </View>
            <View style={styles.statusBadge}>
              <InstitutionalIcon
                name={area.is_active ? 'check-circle' : 'schedule'}
                size={12}
                color={area.is_active ? success500 : warning500}
                strokeWidth={ICON_STROKE_WIDTH}
              />
              <Text style={[styles.statusText, { color: area.is_active ? success500 : warning500 }]}>
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
          <InstitutionalIcon
            name={area.is_active ? "pause-circle" : "play-circle"}
            size={24}
            color={area.is_active ? warning500 : success500}
            strokeWidth={ICON_STROKE_WIDTH}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.communesList}>
        <Text style={styles.communesLabel}>Comunas</Text>
        <View style={styles.communesTags}>
          {area.commune_names.slice(0, 3).map((commune, index) => (
            <View key={index} style={styles.communeTag}>
              <Text style={styles.communeTagText}>{commune}</Text>
            </View>
          ))}
          {area.commune_names.length > 3 && (
            <View style={[styles.communeTag, styles.moreTag]}>
              <Text style={styles.moreTagText}>+{area.commune_names.length - 3}</Text>
            </View>
          )}
        </View>
      </View>

      <View style={styles.zoneActions}>
        <InstitutionalButton
          label="Editar"
          variant="primary"
          size="compact"
          onPress={() => navigateToEditZone(area.id)}
          style={{ flex: 1 }}
        />
        <TouchableOpacity
          style={styles.buttonTertiaryDanger}
          onPress={() => deleteZone(area.id, area.name)}
          activeOpacity={0.65}
          accessibilityRole="button"
          accessibilityLabel="Eliminar zona"
        >
          <Text style={styles.buttonTertiaryDangerLabel}>Eliminar</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.screenRoot}>
        <LinearGradient
          colors={BLANK_GLASS.gradient}
          locations={BLANK_GLASS.gradientLocations}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
        <Header
          title="Zonas de Servicio"
          showBack
          onBackPress={() => router.back()}
          rightComponent={
            <TouchableOpacity
              style={styles.buttonTertiaryText}
              onPress={navigateToCreateZone}
              activeOpacity={0.65}
              accessibilityRole="button"
              accessibilityLabel="Crear zona de servicio"
            >
              <Text style={[styles.buttonTertiaryTextLabel, { color: primary500 }]}>Crear</Text>
            </TouchableOpacity>
          }
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={primary500} />
          <Text style={styles.loadingText}>Cargando zonas de servicio…</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screenRoot}>
      <LinearGradient
        colors={BLANK_GLASS.gradient}
        locations={BLANK_GLASS.gradientLocations}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
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
              style={styles.buttonTertiaryText}
              onPress={navigateToCreateZone}
              activeOpacity={0.65}
              accessibilityRole="button"
              accessibilityLabel="Crear zona de servicio"
            >
              <Text style={[styles.buttonTertiaryTextLabel, { color: primary500 }]}>Crear</Text>
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
        <View style={styles.content}>
          {/* Información contextual - UI Card */}
          <View style={styles.uiCard}>
            <View style={styles.infoCardContent}>
              <View style={styles.iconPlate}>
                <InstitutionalIcon name="information-circle" size={18} color={textPrimary} strokeWidth={ICON_STROKE_WIDTH} />
              </View>
              <Text style={styles.infoText}>
                Define las comunas donde ofreces servicios a domicilio. Los clientes podrán encontrarte cuando soliciten servicios en estas zonas.
              </Text>
            </View>
          </View>

          {/* Estadísticas rápidas - UI Card */}
          {stats && (
            <View style={styles.summaryCard}>
              <View style={styles.summaryPillRow}>
                <View style={[styles.sectionPill, { backgroundColor: I.surfaceStrong }]}>
                  <Text style={[styles.sectionPillText, { color: I.muted }]}>Resumen</Text>
                </View>
              </View>
              <View style={styles.quickStats}>
                <View style={styles.statItem}>
                  <Text style={[styles.summaryStatNumber, { color: textPrimary }]}>{stats.active_zones}</Text>
                  <Text style={styles.statLabel}>Zonas activas</Text>
                </View>
                <View style={styles.statItem}>
                  <Text style={[styles.summaryStatNumber, { color: textPrimary }]}>{stats.total_communes_covered}</Text>
                  <Text style={styles.statLabel}>Comunas cubiertas</Text>
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
              <InstitutionalIcon name="location-outline" size={56} color={textTertiary} strokeWidth={ICON_STROKE_WIDTH} />
              <Text style={styles.emptyTitle}>No tienes zonas de servicio</Text>
              <Text style={styles.emptySubtitle}>
                Crea tu primera zona para empezar a recibir solicitudes de servicio
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
      </SafeAreaView>
    </View>
  );
}

// Función para crear estilos usando tokens del sistema de diseño
const createStyles = () => {
  const I = COLORS.institutional;
  const bgPaper = I.canvas;
  const bgDefault = I.surfaceSoft;
  const textPrimary = I.ink;
  const textSecondary = I.body;
  const textTertiary = I.muted;
  const borderLight = I.hairline;
  const primary500 = I.primary;
  const spacingXs = SPACING?.xs || 4;
  const spacingSm = SPACING?.sm || 8;
  const spacingMd = SPACING?.md || 16;
  const spacingLg = SPACING?.lg || 24;
  const fontSizeBase = TYPOGRAPHY?.fontSize?.base || 14;
  const fontSizeSm = TYPOGRAPHY?.fontSize?.sm || 12;
  const fontSizeMd = TYPOGRAPHY?.fontSize?.md || 16;
  const fontSizeLg = TYPOGRAPHY?.fontSize?.lg || 18;

  return StyleSheet.create({
    screenRoot: { flex: 1 },
    container: {
      flex: 1,
      backgroundColor: 'transparent',
    },
    scrollView: {
      flex: 1,
    },
    content: {
      paddingVertical: spacingMd,
      paddingHorizontal: GLASS_INSET,
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: spacingLg * 2,
    },
    loadingText: {
      marginTop: spacingMd,
      fontSize: TYPOGRAPHY.fontSize.sm,
      fontFamily: TYPOGRAPHY.fontFamily.sansRegular,
      color: textSecondary,
    },
    headerRightActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacingSm,
    },
    /** Coinbase `button-tertiary-text` */
    buttonTertiaryText: {
      justifyContent: 'center',
      alignItems: 'flex-end',
      minHeight: 44,
      minWidth: 44,
      paddingVertical: 10,
      paddingHorizontal: SPACING.xs,
    },
    buttonTertiaryTextLabel: {
      fontSize: TYPOGRAPHY.styles.button.fontSize,
      fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
      fontWeight: TYPOGRAPHY.styles.button.fontWeight as '600',
      lineHeight: Math.round(TYPOGRAPHY.styles.button.fontSize * TYPOGRAPHY.styles.button.lineHeight),
    },
    uiCard: {
      backgroundColor: bgPaper,
      borderRadius: BORDERS.radius.lg,
      padding: spacingMd,
      marginBottom: spacingMd,
      borderWidth: BORDERS.width.thin,
      borderColor: borderLight,
      ...SHADOWS.editorial,
    },
    infoCardContent: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacingMd,
    },
    iconPlate: {
      width: 40,
      height: 40,
      borderRadius: BORDERS.radius.full,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: I.surfaceStrong,
    },
    infoText: {
      flex: 1,
      fontSize: TYPOGRAPHY.fontSize.sm,
      fontFamily: TYPOGRAPHY.fontFamily.sansRegular,
      color: textSecondary,
      lineHeight: TYPOGRAPHY.fontSize.sm * 1.45,
    },
    summaryPillRow: {
      marginBottom: spacingXs,
    },
    sectionPill: {
      alignSelf: 'flex-start',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: BORDERS.radius.pill,
    },
    sectionPillText: {
      fontSize: 10,
      fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
      fontWeight: TYPOGRAPHY.fontWeight.semibold as '600',
      letterSpacing: TYPOGRAPHY.letterSpacing.wider,
      textTransform: 'uppercase',
    },
    quickStats: {
      flexDirection: 'row',
      justifyContent: 'space-around',
      paddingTop: spacingXs,
    },
    statItem: {
      alignItems: 'center',
    },
    summaryStatNumber: {
      fontSize: TYPOGRAPHY.fontSize.lg,
      fontFamily: TYPOGRAPHY.fontFamily.monoMedium,
      fontWeight: TYPOGRAPHY.fontWeight.semibold as '600',
    },
    statLabel: {
      fontSize: TYPOGRAPHY.fontSize.xs,
      fontFamily: TYPOGRAPHY.fontFamily.sansRegular,
      color: textTertiary,
      marginTop: spacingXs,
    },
    zonesContainer: {
      gap: spacingSm,
    },
    zoneCard: {
      backgroundColor: bgPaper,
      borderRadius: BORDERS.radius.lg,
      padding: spacingMd,
      marginBottom: spacingMd,
      borderWidth: BORDERS.width.thin,
      borderColor: borderLight,
      ...SHADOWS.editorial,
      gap: spacingSm,
    },
    zoneHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 0,
    },
    zoneInfo: {
      flex: 1,
      minWidth: 0,
    },
    zoneName: {
      fontSize: TYPOGRAPHY.fontSize.md,
      fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
      fontWeight: TYPOGRAPHY.fontWeight.semibold as '600',
      color: textPrimary,
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
      fontSize: TYPOGRAPHY.fontSize.xs,
      fontFamily: TYPOGRAPHY.fontFamily.sansRegular,
      color: textTertiary,
    },
    statusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: BORDERS.radius.pill,
      backgroundColor: I.surfaceStrong,
    },
    statusText: {
      fontSize: TYPOGRAPHY.fontSize.xs,
      fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
      fontWeight: TYPOGRAPHY.fontWeight.semibold as '600',
    },
    moreButton: {
      padding: spacingXs,
    },
    communesList: {
      marginBottom: spacingSm,
    },
    communesLabel: {
      fontSize: 10,
      fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
      fontWeight: TYPOGRAPHY.fontWeight.semibold as '600',
      letterSpacing: TYPOGRAPHY.letterSpacing.wider,
      textTransform: 'uppercase',
      color: textTertiary,
      marginBottom: spacingSm,
    },
    communesTags: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacingSm,
    },
    communeTag: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: BORDERS.radius.pill,
      backgroundColor: I.surfaceStrong,
    },
    communeTagText: {
      fontSize: TYPOGRAPHY.fontSize.xs,
      fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
      fontWeight: TYPOGRAPHY.fontWeight.semibold as '600',
      color: textPrimary,
    },
    moreTag: {
      // Estilos aplicados dinámicamente
    },
    moreTagText: {
      fontSize: TYPOGRAPHY.fontSize.xs,
      fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
      fontWeight: TYPOGRAPHY.fontWeight.semibold as '600',
      color: textTertiary,
    },
    zoneActions: {
      flexDirection: 'row',
      gap: spacingSm,
      paddingTop: spacingSm,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: borderLight,
      alignItems: 'center',
    },
    /** Coinbase `button-tertiary-text` danger */
    buttonTertiaryDanger: {
      justifyContent: 'center',
      alignItems: 'flex-end',
      minHeight: 44,
      paddingVertical: 10,
      paddingHorizontal: 8,
    },
    buttonTertiaryDangerLabel: {
      fontSize: TYPOGRAPHY.styles.button.fontSize,
      fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
      fontWeight: TYPOGRAPHY.styles.button.fontWeight as '600',
      lineHeight: Math.round(TYPOGRAPHY.styles.button.fontSize * TYPOGRAPHY.styles.button.lineHeight),
      color: I.semanticDown,
    },
    /** Resumen compacto (misma densidad que cards en ordenes / documentos) */
    summaryCard: {
      backgroundColor: bgPaper,
      borderRadius: BORDERS.radius.lg,
      paddingVertical: spacingSm,
      paddingHorizontal: spacingMd,
      marginBottom: spacingMd,
      borderWidth: BORDERS.width.thin,
      borderColor: borderLight,
      ...SHADOWS.editorial,
    },
    emptyContainer: {
      paddingVertical: spacingLg * 2,
      alignItems: 'center',
    },
    emptyTitle: {
      fontSize: TYPOGRAPHY.fontSize.lg,
      fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
      fontWeight: TYPOGRAPHY.fontWeight.semibold as '600',
      color: textPrimary,
      marginTop: spacingMd,
      marginBottom: spacingSm,
    },
    emptySubtitle: {
      fontSize: TYPOGRAPHY.fontSize.sm,
      fontFamily: TYPOGRAPHY.fontFamily.sansRegular,
      color: textTertiary,
      textAlign: 'center',
      lineHeight: TYPOGRAPHY.fontSize.sm * 1.45,
      paddingHorizontal: spacingLg,
    },
  });
};

const styles = createStyles(); 