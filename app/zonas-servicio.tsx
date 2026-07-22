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
import serviceAreasApi, { ServiceArea, ServiceAreaStats } from '@/services/serviceAreasApi';
import { COLORS, SPACING, TYPOGRAPHY, BORDERS } from '@/app/design-system/tokens';
import {
  Card,
  HostPaperSection,
  HostSectionKicker,
  hostScreenStyles,
} from '@/app/design-system/components';
import Header from '@/components/Header';
import { InstitutionalIcon } from '@/components/ui/InstitutionalIcon';
import { InstitutionalButton } from '@/app/design-system/components/InstitutionalButton';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import { useQueryClient } from '@tanstack/react-query';
import {
  invalidateZonasServicioQueries,
  useZonasServicioQuery,
} from '@/hooks/useZonasServicioQuery';

// Interfaces TypeScript


export default function ZonasServicioScreen() {
  const { estadoProveedor } = useAuth();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const esDomicilio = estadoProveedor?.tipo_proveedor !== 'taller';

  const {
    areas: serviceAreasFromQuery,
    stats: statsFromQuery,
    loading,
    isRefetching,
    refresh,
    error: loadError,
  } = useZonasServicioQuery(esDomicilio);

  const [serviceAreas, setServiceAreas] = useState<ServiceArea[]>([]);
  const [stats, setStats] = useState<ServiceAreaStats | null>(null);

  useEffect(() => {
    setServiceAreas(serviceAreasFromQuery);
  }, [serviceAreasFromQuery]);

  useEffect(() => {
    setStats(statsFromQuery);
  }, [statsFromQuery]);

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

  useEffect(() => {
    if (loadError) {
      Alert.alert('Error', 'No se pudieron cargar las zonas de servicio');
    }
  }, [loadError]);

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

                invalidateZonasServicioQueries(queryClient);
                await refresh();
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
              invalidateZonasServicioQueries(queryClient);
              await refresh();

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

  const onRefresh = useCallback(() => {
    void refresh();
  }, [refresh]);

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
    <Card key={area.id} elevated padding="host" style={styles.zoneCard}>
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
    </Card>
  );

  if (loading) {
    return (
      <View style={styles.screenRoot}>
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
        style={hostScreenStyles.scroll}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          hostScreenStyles.scrollInner,
          { paddingBottom: insets.bottom + 20 },
        ]}
      >
        <HostSectionKicker label="Cobertura" />
        <Card elevated padding="host">
          <View style={styles.infoCardContent}>
            <View style={styles.iconPlate}>
              <InstitutionalIcon name="information-circle" size={18} color={textPrimary} strokeWidth={ICON_STROKE_WIDTH} />
            </View>
            <Text style={styles.infoText}>
              Define las comunas donde ofreces servicios a domicilio. Los clientes podrán encontrarte cuando soliciten servicios en estas zonas.
            </Text>
          </View>
        </Card>

        {stats && (
          <>
            <HostSectionKicker label="Resumen" />
            <HostPaperSection>
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
            </HostPaperSection>
          </>
        )}

        <HostSectionKicker label="Tus zonas" />
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
    screenRoot: { flex: 1, backgroundColor: I.surfaceSoft },
    container: {
      flex: 1,
      backgroundColor: I.surfaceSoft,
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
      marginBottom: spacingMd,
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