import React, { memo, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { ChevronRight, Inbox } from 'lucide-react-native';
import { usePipelineComercialQuery } from '@/hooks/usePipelineComercialQuery';
import { COLORS, SPACING, TYPOGRAPHY } from '@/app/design-system/tokens';
import { Card } from '@/app/design-system/components';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import {
  hostIconPlateColor,
  hostIconPlateStyle,
} from '@/app/design-system/styles/institutionalSemantic';

const I = COLORS.institutional;
const T = TYPOGRAPHY.styles;

const ESTADOS_ATENCION = new Set(['nuevo', 'cotizacion_enviada', 'en_negociacion']);

export type HomeBandejaEntryProps = {
  enabled?: boolean;
  refreshKey?: number;
};

function HomeBandejaEntryInner({ enabled = true, refreshKey = 0 }: HomeBandejaEntryProps) {
  const { data, isPending, refetch } = usePipelineComercialQuery(
    { limite: 100, fetchAllEstados: true },
    { enabled },
  );

  React.useEffect(() => {
    if (refreshKey > 0) void refetch();
  }, [refreshKey, refetch]);

  const pendientes = useMemo(() => {
    if (!data?.results) return 0;
    return data.results.filter((row) => ESTADOS_ATENCION.has(row.estado_normalizado)).length;
  }, [data?.results]);

  const abrir = useCallback(() => {
    router.push('/(tabs)/bandeja');
  }, []);

  if (!enabled) return null;

  return (
    <Card
      elevated
      padding="host"
      onPress={abrir}
      style={styles.card}
    >
      <View style={styles.row}>
        <View style={[hostIconPlateStyle, styles.iconPlate]}>
          <Inbox size={22} color={hostIconPlateColor} strokeWidth={ICON_STROKE_WIDTH} />
        </View>
        <View style={styles.textCol}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>Bandeja</Text>
            {isPending ? (
              <ActivityIndicator size="small" color={I.primary} />
            ) : pendientes > 0 ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{pendientes > 99 ? '99+' : pendientes}</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.sub} numberOfLines={2}>
            {pendientes > 0
              ? `${pendientes} solicitud${pendientes === 1 ? '' : 'es'} o cotización${pendientes === 1 ? '' : 'es'} por atender`
              : 'Solicitudes, cotizaciones y seguimiento del taller'}
          </Text>
        </View>
        <ChevronRight size={22} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
      </View>
    </Card>
  );
}

export const HomeBandejaEntry = memo(HomeBandejaEntryInner);

const styles = StyleSheet.create({
  card: {
    minHeight: 88,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  iconPlate: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  textCol: { flex: 1, gap: 2, minWidth: 0 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  title: {
    fontSize: T.h4.fontSize,
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    fontWeight: '600',
    color: I.ink,
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
  },
  sub: {
    fontSize: T.caption.fontSize,
    lineHeight: Math.round(T.caption.fontSize * T.caption.lineHeight),
    fontFamily: TYPOGRAPHY.fontFamily.sansRegular,
    color: I.muted,
  },
});

export default HomeBandejaEntry;
