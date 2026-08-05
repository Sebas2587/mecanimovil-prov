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
import { router } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { type SolicitudPublica } from '@/services/solicitudesService';
import { SolicitudCard } from '@/components/solicitudes/SolicitudCard';
import { openSolicitudDetalle } from '@/utils/navigateProveedorDetalle';
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
  TYPOGRAPHY,
  BORDERS,
  platformShadow,
  withOpacity,
} from '@/app/design-system/tokens';
import { InstitutionalText } from '@/app/design-system/components/InstitutionalText';
import { HOST_GUTTER, HostEmptyState } from '@/app/design-system/components';
import { Radar, Zap } from 'lucide-react-native';

const I = COLORS.institutional;
const FF = TYPOGRAPHY.fontFamily;

type FiltroUrgencia = 'todos' | 'urgente' | 'normal';

export type SolicitudesDisponiblesContentProps = {
  /** Pantalla completa con glass vs tab embebido en Mensajes */
  variant?: 'screen' | 'embedded';
  contentPaddingBottom?: number;
};

const shadowSm = platformShadow({
  shadowColor: I.ink,
  shadowOffset: { width: 0, height: 1 },
  shadowOpacity: 0.06,
  shadowRadius: 4,
  elevation: 2,
});

function aplicarFiltro(
  solicitudesList: SolicitudPublica[],
  filtro: FiltroUrgencia,
): SolicitudPublica[] {
  if (filtro === 'todos') return solicitudesList;
  return solicitudesList.filter((s) => s.urgencia === filtro);
}

export function SolicitudesDisponiblesContent({
  variant = 'screen',
  contentPaddingBottom,
}: SolicitudesDisponiblesContentProps) {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const embedded = variant === 'embedded';
  const queryClient = useQueryClient();
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
  const solicitudesFiltradas = aplicarFiltro(solicitudes, filtroUrgencia);

  const onRefresh = useCallback(() => {
    void refetch();
  }, [refetch]);

  const handleSolicitudPress = useCallback(
    (solicitud: SolicitudPublica) => {
      openSolicitudDetalle(router, queryClient, solicitud.id, { solicitud });
    },
    [queryClient],
  );

  const containerHorizontal = HOST_GUTTER;
  const spacingMd = SPACING.fixed.md;
  const paddingBottom = contentPaddingBottom ?? insets.bottom + spacingMd;

  const blurTint = isDark ? ('dark' as const) : ('light' as const);
  const blurIntensity = Platform.OS === 'ios' ? (isDark ? 40 : 52) : isDark ? 26 : 36;

  const filtroChipInactiveBg = embedded
    ? I.surfaceStrong
    : isDark
      ? withOpacity(I.onDark, 0.08)
      : withOpacity(I.canvas, 0.42);
  const filtroChipBorder = embedded
    ? I.hairline
    : isDark
      ? withOpacity(I.onDark, 0.12)
      : withOpacity(I.canvas, 0.65);

  const chipActiveText = I.onPrimary;
  const chipInactiveText = isDark ? I.onDark : I.ink;

  const renderFiltroChip = (
    key: FiltroUrgencia,
    label: string,
    activeColor: string,
    icon?: React.ReactNode,
  ) => (
    <TouchableOpacity
      key={key}
      style={[
        styles.filtroChip,
        embedded && styles.filtroChipEmbedded,
        {
          backgroundColor: filtroUrgencia === key ? activeColor : filtroChipInactiveBg,
          borderColor: filtroUrgencia === key ? activeColor : filtroChipBorder,
        },
      ]}
      onPress={() => setFiltroUrgencia(key)}
      activeOpacity={0.85}
    >
      {icon}
      <InstitutionalText
        role="captionBold"
        color={filtroUrgencia === key ? chipActiveText : chipInactiveText}
      >
        {label}
      </InstitutionalText>
    </TouchableOpacity>
  );

  const filtrosRow = (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.filtrosContent}
    >
      {renderFiltroChip('todos', 'Todas', I.primary)}
      {renderFiltroChip(
        'urgente',
        'Urgentes',
        I.semanticDown,
        <InstitutionalIcon
          name="priority-high"
          size={16}
          color={filtroUrgencia === 'urgente' ? chipActiveText : chipInactiveText}
          strokeWidth={ICON_STROKE_WIDTH}
        />,
      )}
      {renderFiltroChip('normal', 'Normales', I.primary)}
    </ScrollView>
  );

  const filtrosBlock = embedded ? (
    <View style={styles.embeddedFiltersWrap}>{filtrosRow}</View>
  ) : (
    <View style={{ paddingHorizontal: containerHorizontal, paddingTop: SPACING.fixed.sm, paddingBottom: SPACING.fixed.sm }}>
      <View style={[styles.filterGlassOuter, isDark && styles.filterGlassOuterDark]}>
        <BlurView intensity={blurIntensity} tint={blurTint} style={styles.filterGlassBlur}>
          {filtrosRow}
        </BlurView>
      </View>
    </View>
  );

  if (!radarPreferenciaCargada || loading) {
    return (
      <View style={styles.loadingContainerAirbnb}>
        <ActivityIndicator size="large" color={COLORS.brand.magenta} />
        <InstitutionalText role="body" color="body" style={styles.loadingText}>
          Buscando solicitudes B2C en tus zonas de cobertura…
        </InstitutionalText>
      </View>
    );
  }

  if (!radarOportunidadesActivo) {
    return (
      <View style={[styles.emptyWrapAirbnb, { paddingHorizontal: containerHorizontal }]}>
        <HostEmptyState
          icon={Radar}
          title="Radar de Oportunidades Desactivado"
          description="Activa el radar de disponibilidad en la pestaña Hoy para recibir solicitudes de clientes cercanas en tiempo real."
        />
      </View>
    );
  }

  return (
    <View style={styles.root}>
      {filtrosBlock}

      {solicitudesFiltradas.length > 0 ? (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingBottom,
              paddingHorizontal: containerHorizontal,
            },
          ]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.brand.magenta}
              colors={[COLORS.brand.magenta]}
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
        <View style={[styles.emptyWrapAirbnb, { paddingHorizontal: containerHorizontal }]}>
          <HostEmptyState
            icon={Zap}
            title="Sin Solicitudes Activas en tu Zona"
            description={
              filtroUrgencia !== 'todos'
                ? `No hay solicitudes ${filtroUrgencia === 'urgente' ? 'urgentes' : 'normales'} registradas en este momento.`
                : 'No se encontraron solicitudes de clientes en tus comunas/zonas de servicio configuradas.'
            }
            primaryAction={{ label: 'Actualizar Lista', onPress: onRefresh }}
            secondaryAction={{ label: 'Configurar Zonas', onPress: () => router.push('/zonas-servicio') }}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  filterGlassOuter: {
    borderRadius: BORDERS.radius.lg,
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
  embeddedFiltersWrap: {
    paddingHorizontal: SPACING.container.horizontal,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xs,
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
  filtroChipEmbedded: {
    paddingVertical: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 4,
  },
  loadingContainerAirbnb: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.fixed.xl,
  },
  emptyWrapAirbnb: {
    paddingVertical: SPACING.fixed.lg,
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.xl,
  },
  loadingText: {
    marginTop: SPACING.fixed.md,
  },
  emptyWrap: {
    flex: 1,
    justifyContent: 'center',
    paddingBottom: 48,
  },
  embeddedEmptyInner: {
    alignItems: 'center',
    paddingVertical: SPACING.xl,
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
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
    borderRadius: BORDERS.radius.lg,
    borderWidth: BORDERS.width.thin,
    backgroundColor: withOpacity(I.canvas, 0.35),
  },
  refreshEmbeddedBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.xs,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: BORDERS.radius.lg,
    borderWidth: BORDERS.width.thin,
    backgroundColor: I.surfaceStrong,
    marginTop: SPACING.sm,
  },
});
