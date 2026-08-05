import React, { memo, useCallback, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { router } from 'expo-router';
import {
  CalendarPlus,
  ChevronRight,
  ClipboardList,
  Inbox,
  Sparkles,
} from 'lucide-react-native';
import { COLORS, SPACING, TYPOGRAPHY } from '@/app/design-system/tokens';
import { HostSectionKicker, InstitutionalText } from '@/app/design-system/components';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import {
  hostIconPlateColor,
  hostIconPlateStyle,
} from '@/app/design-system/styles/institutionalSemantic';
import type { PipelineComercialResponse } from '@/services/pipelineComercialService';

const I = COLORS.institutional;
const T = TYPOGRAPHY.styles;

const ESTADOS_BANDEJA = new Set(['nuevo', 'cotizacion_enviada', 'en_negociacion']);

export type HomeHubMenuProps = {
  onNuevaSolicitud: () => void;
  borradoresIa?: number;
  iaActivaCount?: number;
  pipeline?: PipelineComercialResponse | null;
};

type HubRowProps = {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  badge?: number;
  onPress: () => void;
  last?: boolean;
};

function HubNavRow({ icon, title, subtitle, badge, onPress, last }: HubRowProps) {
  return (
    <TouchableOpacity
      style={[styles.row, !last && styles.rowBorder]}
      onPress={onPress}
      activeOpacity={0.72}
      accessibilityRole="button"
    >
      <View style={styles.iconPlate}>{icon}</View>
      <View style={styles.copy}>
        <InstitutionalText role="bodyBold" numberOfLines={1}>
          {title}
        </InstitutionalText>
        {subtitle ? (
          <InstitutionalText role="caption" color="body" numberOfLines={1}>
            {subtitle}
          </InstitutionalText>
        ) : null}
      </View>
      {badge != null && badge > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Text>
        </View>
      ) : null}
      <ChevronRight size={20} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
    </TouchableOpacity>
  );
}

function HomeHubMenuInner({
  onNuevaSolicitud,
  borradoresIa = 0,
  iaActivaCount = 0,
  pipeline,
}: HomeHubMenuProps) {
  const bandejaCount = useMemo(() => {
    if (!pipeline?.results?.length) return 0;
    return pipeline.results.filter((row) => ESTADOS_BANDEJA.has(row.estado_normalizado)).length;
  }, [pipeline?.results]);

  const ordenesActivas = useMemo(() => {
    const resumen = pipeline?.resumen;
    if (!resumen) return 0;
    return (resumen.en_ejecucion ?? 0) + (resumen.aceptado_agendado ?? 0);
  }, [pipeline?.resumen]);

  const cotizarSubtitle = useMemo(() => {
    if (borradoresIa > 0) {
      return `${borradoresIa} borrador${borradoresIa === 1 ? '' : 'es'} por revisar`;
    }
    if (iaActivaCount > 0) {
      return `IA atendiendo ${iaActivaCount} chat${iaActivaCount === 1 ? '' : 's'}`;
    }
    return 'Borradores y envío al cliente';
  }, [borradoresIa, iaActivaCount]);

  const bandejaSubtitle = useMemo(() => {
    if (bandejaCount > 0) {
      return `${bandejaCount} caso${bandejaCount === 1 ? '' : 's'} en seguimiento`;
    }
    const esperando24h = pipeline?.esperando_respuesta_24h_count ?? 0;
    if (esperando24h > 0) {
      return `${esperando24h} sin respuesta +24h`;
    }
    return 'Cotizaciones, leads y agendamientos';
  }, [bandejaCount, pipeline?.esperando_respuesta_24h_count]);

  const goCotizar = useCallback(() => router.push('/cotizar-ia'), []);
  const goBandeja = useCallback(() => router.push('/(tabs)/bandeja'), []);
  const goOrdenes = useCallback(() => router.push('/(tabs)/ordenes'), []);

  return (
    <View style={styles.section}>
      <HostSectionKicker label="Operar" />
      <View style={styles.paper}>
        <HubNavRow
          icon={<CalendarPlus size={20} color={hostIconPlateColor} strokeWidth={ICON_STROKE_WIDTH} />}
          title="Nueva solicitud"
          subtitle="Cliente del taller · agendar o cotizar"
          onPress={onNuevaSolicitud}
        />
        <HubNavRow
          icon={<Sparkles size={20} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />}
          title="Cotizar con IA"
          subtitle={cotizarSubtitle}
          badge={borradoresIa}
          onPress={goCotizar}
        />
        <HubNavRow
          icon={<Inbox size={20} color={hostIconPlateColor} strokeWidth={ICON_STROKE_WIDTH} />}
          title="Bandeja"
          subtitle={bandejaSubtitle}
          badge={bandejaCount}
          onPress={goBandeja}
        />
        <HubNavRow
          icon={<ClipboardList size={20} color={hostIconPlateColor} strokeWidth={ICON_STROKE_WIDTH} />}
          title="Órdenes del taller"
          subtitle={
            ordenesActivas > 0
              ? `${ordenesActivas} servicio${ordenesActivas === 1 ? '' : 's'} activo${ordenesActivas === 1 ? '' : 's'}`
              : 'Activas, completadas y rechazadas'
          }
          badge={ordenesActivas}
          onPress={goOrdenes}
          last
        />
      </View>
    </View>
  );
}

export const HomeHubMenu = memo(HomeHubMenuInner);

const styles = StyleSheet.create({
  section: {
    gap: SPACING.xs,
  },
  paper: {
    backgroundColor: I.paper,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: I.hairline,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
    minHeight: 64,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: I.hairline,
  },
  iconPlate: {
    ...hostIconPlateStyle,
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  copy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    backgroundColor: I.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: I.onPrimary,
    fontSize: 11,
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    fontWeight: '600',
  },
});

export default HomeHubMenu;
