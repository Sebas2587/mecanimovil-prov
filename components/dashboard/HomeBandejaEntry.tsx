import React, { memo, useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { ChevronRight, Inbox } from 'lucide-react-native';
import pipelineComercialService from '@/services/pipelineComercialService';
import { COLORS, SPACING, TYPOGRAPHY, BORDERS, SHADOWS } from '@/app/design-system/tokens';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import {
  hostIconPlateColor,
  hostIconPlateStyle,
} from '@/app/design-system/styles/institutionalSemantic';

const I = COLORS.institutional;
const T = TYPOGRAPHY.styles;

const ESTADOS_ATENCION = new Set(['nuevo', 'cotizacion_enviada', 'en_negociacion']);
const TIPOS_AGENDABLES = new Set([
  'oferta',
  'cita_personal',
  'orden_directa',
  'solicitud_publica',
]);

export type HomeBandejaEntryProps = {
  enabled?: boolean;
  refreshKey?: number;
};

/**
 * Acceso primario a la Bandeja desde Hoy: card grande, no un link de 11px.
 * El tab inferior "Bandeja" es el acceso permanente; esta card refuerza el hábito.
 */
function HomeBandejaEntryInner({ enabled = true, refreshKey = 0 }: HomeBandejaEntryProps) {
  const [loading, setLoading] = useState(true);
  const [pendientes, setPendientes] = useState(0);

  useEffect(() => {
    let cancelled = false;
    if (!enabled) {
      setPendientes(0);
      setLoading(false);
      return;
    }
    setLoading(true);
    (async () => {
      try {
        const data = await pipelineComercialService.listar({ limite: 40 });
        const n = data.results.filter(
          (row) =>
            ESTADOS_ATENCION.has(row.estado_normalizado)
            && TIPOS_AGENDABLES.has(row.tipo_entidad),
        ).length;
        if (!cancelled) setPendientes(n);
      } catch {
        if (!cancelled) setPendientes(0);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled, refreshKey]);

  const abrir = useCallback(() => {
    router.push('/(tabs)/bandeja');
  }, []);

  if (!enabled) return null;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={abrir}
      activeOpacity={0.88}
      accessibilityRole="button"
      accessibilityLabel="Abrir bandeja del taller"
    >
      <View style={[hostIconPlateStyle, styles.iconPlate]}>
        <Inbox size={22} color={hostIconPlateColor} strokeWidth={ICON_STROKE_WIDTH} />
      </View>
      <View style={styles.textCol}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Bandeja</Text>
          {loading ? (
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
    </TouchableOpacity>
  );
}

export const HomeBandejaEntry = memo(HomeBandejaEntryInner);

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: I.hairline,
    padding: SPACING.md,
    minHeight: 88,
    ...SHADOWS.editorial,
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
