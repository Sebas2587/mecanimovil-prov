import React, { useState, useCallback } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Stack, router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { openSolicitudDetalle } from '@/utils/navigateProveedorDetalle';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { type SolicitudPublica } from '@/services/solicitudesService';
import { SolicitudCard } from '@/components/solicitudes/SolicitudCard';
import { useAuth } from '@/context/AuthContext';
import { useRadarOportunidades } from '@/context/RadarOportunidadesContext';
import {
  useSolicitudesDisponiblesQuery,
  useSolicitudesDisponiblesRealtime,
} from '@/hooks/useSolicitudesDisponiblesQuery';
import { useColorScheme } from '@/hooks/useColorScheme';
import { InstitutionalIcon } from '@/components/ui/InstitutionalIcon';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import {
  COLORS,
  SPACING,
  BORDERS,
  platformShadow,
  withOpacity,
} from '@/app/design-system/tokens';
import { InstitutionalText } from '@/app/design-system/components/InstitutionalText';

const I = COLORS.institutional;

type FiltroUrgencia = 'todos' | 'urgente' | 'normal';

const GRADIENT_LIGHT = [I.surfaceStrong, I.hairlineSoft, I.canvas] as const;
const GRADIENT_DARK = [I.surfaceDark, I.surfaceDarkElevated, I.ink] as const;

export default function SolicitudesDisponiblesScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { estadoProveedor } = useAuth();
  const { radarOportunidadesActivo, radarPreferenciaCargada } = useRadarOportunidades();
  const cuentaAprobada = estadoProveedor?.estado_verificacion === 'aprobado';
  const queryEnabled =
    cuentaAprobada && radarPreferenciaCargada && radarOportunidadesActivo;

  const {
    data: solicitudes = [],
    isLoading: loading,
    isRefetching: refreshing,
    refetch,
  } = useSolicitudesDisponiblesQuery(queryEnabled);
  useSolicitudesDisponiblesRealtime({ enabled: queryEnabled });

  const [filtroUrgencia, setFiltroUrgencia] = useState<FiltroUrgencia>('todos');

  const onRefresh = () => {
    void refetch();
  };

  const aplicarFiltro = (solicitudesList: SolicitudPublica[], filtro: FiltroUrgencia): SolicitudPublica[] => {
    if (filtro === 'todos') return solicitudesList;
    return solicitudesList.filter((s) => s.urgencia === filtro);
  };

  const solicitudesFiltradas = aplicarFiltro(solicitudes, filtroUrgencia);
  const queryClient = useQueryClient();

  const handleSolicitudPress = useCallback(
    (solicitud: SolicitudPublica) => {
      openSolicitudDetalle(router, queryClient, solicitud.id, { solicitud });
    },
    [queryClient],
  );

  const containerHorizontal = SPACING.container.horizontal;
  const spacingMd = SPACING.fixed.md;
  const spacingSm = SPACING.fixed.sm;

  const blurTint = isDark ? ('dark' as const) : ('light' as const);
  const blurIntensity = Platform.OS === 'ios' ? (isDark ? 40 : 52) : isDark ? 26 : 36;

  const gradientColors = isDark ? GRADIENT_DARK : GRADIENT_LIGHT;
  const headerBg = isDark ? I.surfaceDarkElevated : I.surfaceStrong;

  const filtroChipInactiveBg = isDark
    ? withOpacity(I.onDark, 0.08)
    : withOpacity(I.canvas, 0.42);
  const filtroChipBorder = isDark
    ? withOpacity(I.onDark, 0.12)
    : withOpacity(I.canvas, 0.65);

  const chipActiveText = I.onPrimary;
  const chipInactiveText = isDark ? I.onDark : I.ink;

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={[...gradientColors]}
        locations={isDark ? [0, 0.45, 1] : [0, 0.4, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />
      <SafeAreaView style={styles.safe} edges={['top']}>
        <Stack.Screen
          options={{
            title: 'Solicitudes disponibles',
            headerBackTitle: '',
            headerShadowVisible: false,
            headerStyle: {
              backgroundColor: headerBg,
            },
            headerTintColor: isDark ? I.onDark : I.ink,
            headerTitleStyle: {
              fontWeight: '700',
              fontSize: 17,
              color: isDark ? I.onDark : I.ink,
            },
          }}
        />

        <View style={{ paddingHorizontal: containerHorizontal, paddingTop: spacingSm, paddingBottom: spacingSm }}>
          <View style={[styles.filterGlassOuter, isDark && styles.filterGlassOuterDark]}>
            <BlurView intensity={blurIntensity} tint={blurTint} style={styles.filterGlassBlur}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filtrosContent}
              >
                <TouchableOpacity
                  style={[
                    styles.filtroChip,
                    {
                      backgroundColor: filtroUrgencia === 'todos' ? I.primary : filtroChipInactiveBg,
                      borderColor: filtroUrgencia === 'todos' ? I.primary : filtroChipBorder,
                    },
                  ]}
                  onPress={() => setFiltroUrgencia('todos')}
                  activeOpacity={0.85}
                >
                  <InstitutionalText
                    role="captionBold"
                    color={filtroUrgencia === 'todos' ? chipActiveText : chipInactiveText}
                  >
                    Todas
                  </InstitutionalText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.filtroChip,
                    {
                      backgroundColor: filtroUrgencia === 'urgente' ? I.semanticDown : filtroChipInactiveBg,
                      borderColor: filtroUrgencia === 'urgente' ? I.semanticDown : filtroChipBorder,
                    },
                  ]}
                  onPress={() => setFiltroUrgencia('urgente')}
                  activeOpacity={0.85}
                >
                  <InstitutionalIcon
                    name="priority-high"
                    size={16}
                    color={filtroUrgencia === 'urgente' ? chipActiveText : chipInactiveText}
                    strokeWidth={ICON_STROKE_WIDTH}
                  />
                  <InstitutionalText
                    role="captionBold"
                    color={filtroUrgencia === 'urgente' ? chipActiveText : chipInactiveText}
                  >
                    Urgentes
                  </InstitutionalText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.filtroChip,
                    {
                      backgroundColor: filtroUrgencia === 'normal' ? I.primary : filtroChipInactiveBg,
                      borderColor: filtroUrgencia === 'normal' ? I.primary : filtroChipBorder,
                    },
                  ]}
                  onPress={() => setFiltroUrgencia('normal')}
                  activeOpacity={0.85}
                >
                  <InstitutionalText
                    role="captionBold"
                    color={filtroUrgencia === 'normal' ? chipActiveText : chipInactiveText}
                  >
                    Normales
                  </InstitutionalText>
                </TouchableOpacity>
              </ScrollView>
            </BlurView>
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={I.primary} />
            <InstitutionalText role="body" color="body" style={styles.loadingText}>
              Cargando solicitudes…
            </InstitutionalText>
          </View>
        ) : solicitudesFiltradas.length > 0 ? (
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={[
              styles.scrollContent,
              { paddingBottom: insets.bottom + spacingMd, paddingHorizontal: containerHorizontal },
            ]}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={I.primary}
                colors={[I.primary]}
              />
            }
            showsVerticalScrollIndicator={false}
          >
            {solicitudesFiltradas.map((solicitud) => (
              <SolicitudCard
                key={solicitud.id}
                solicitud={solicitud}
                onPress={() => handleSolicitudPress(solicitud)}
              />
            ))}
          </ScrollView>
        ) : (
          <View style={[styles.emptyWrap, { paddingHorizontal: containerHorizontal }]}>
            <View style={[styles.emptyGlassOuter, isDark && styles.emptyGlassOuterDark]}>
              <BlurView intensity={blurIntensity} tint={blurTint} style={styles.emptyGlassBlur}>
                <View style={styles.emptyInner}>
                  <View
                    style={[
                      styles.emptyIconCircle,
                      {
                        backgroundColor: isDark
                          ? withOpacity(I.onDark, 0.08)
                          : withOpacity(I.canvas, 0.55),
                      },
                    ]}
                  >
                    <InstitutionalIcon name="inbox" size={40} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
                  </View>
                  <InstitutionalText role="h4" color={isDark ? I.onDark : 'ink'} style={styles.emptyTitle}>
                    Sin solicitudes
                  </InstitutionalText>
                  <InstitutionalText
                    role="body"
                    color={isDark ? I.onDarkSoft : I.body}
                    style={styles.emptySub}
                  >
                    {filtroUrgencia !== 'todos'
                      ? `No hay solicitudes ${filtroUrgencia === 'urgente' ? 'urgentes' : 'normales'} ahora.`
                      : 'Cuando haya pedidos compatibles con tu perfil, aparecerán aquí.'}
                  </InstitutionalText>
                  <TouchableOpacity
                    style={[styles.refreshGlassBtn, { borderColor: filtroChipBorder }]}
                    onPress={onRefresh}
                    activeOpacity={0.88}
                  >
                    <InstitutionalIcon name="refresh" size={20} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
                    <InstitutionalText role="captionBold" color="primary">
                      Actualizar
                    </InstitutionalText>
                  </TouchableOpacity>
                </View>
              </BlurView>
            </View>
          </View>
        )}
      </SafeAreaView>
    </View>
  );
}

const shadowSm = platformShadow({
  shadowColor: I.ink,
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.06,
  shadowRadius: 4,
  elevation: 2,
});

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  safe: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  filterGlassOuter: {
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: withOpacity(I.canvas, 0.6),
    ...shadowSm,
  },
  filterGlassOuterDark: {
    borderColor: withOpacity(I.onDark, 0.1),
  },
  filterGlassBlur: {
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  filtrosContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.xs,
    paddingRight: 4,
  },
  filtroChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: BORDERS.radius.full,
    borderWidth: BORDERS.width.thin,
    gap: 5,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: SPACING.fixed.md,
  },
  emptyWrap: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: 48,
  },
  emptyGlassOuter: {
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: withOpacity(I.canvas, 0.62),
    ...shadowSm,
  },
  emptyGlassOuterDark: {
    borderColor: withOpacity(I.onDark, 0.1),
  },
  emptyGlassBlur: {
    overflow: 'hidden',
  },
  emptyInner: {
    paddingVertical: 28,
    paddingHorizontal: 22,
    alignItems: 'center',
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    marginBottom: SPACING.fixed.xs,
    textAlign: 'center',
  },
  emptySub: {
    textAlign: 'center',
    lineHeight: 21,
    marginBottom: 20,
  },
  refreshGlassBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.xs,
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderRadius: BORDERS.radius.xl,
    borderWidth: BORDERS.width.thin,
    backgroundColor: withOpacity(I.canvas, 0.35),
  },
});
