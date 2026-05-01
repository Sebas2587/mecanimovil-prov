import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { Activity, ChevronRight } from 'lucide-react-native';
import { COLORS } from '@/app/design-system/tokens/colors';
import { SPACING } from '@/app/design-system/tokens/spacing';
import { TYPOGRAPHY } from '@/app/design-system/tokens/typography';
import { SHADOWS } from '@/app/design-system/tokens/shadows';
import { BORDERS } from '@/app/design-system/tokens/borders';

/** Acento púrpura (no hay token en DS; uso exclusivo de este widget). */
const PURPLE = {
  glow: 'rgba(168, 85, 247, 0.2)',
  glowSoft: 'rgba(168, 85, 247, 0.12)',
  icon: '#c4b5fd',
  badgeBg: 'rgba(168, 85, 247, 0.35)',
  badgeText: '#f5f3ff',
} as const;

export type PerformanceWidgetProps = {
  /** Índice 0–100 desde API (`score_rendimiento`). `undefined` mientras carga o sin datos. */
  progress?: number | null;
  /** Nivel derivado del índice (misma regla que pantalla de KPIs). */
  targetTierName: string;
  /** Segunda línea: periodo y fuentes del índice (alineado a RendimientoKpisContent). */
  periodSubtitle?: string;
  /** Muestra estado de carga cuando aún no hay `progress`. */
  isLoading?: boolean;
  /** Acción al pulsar la tarjeta (p. ej. `() => router.push('/ruta')`). */
  onPress: () => void;
  /** Estilo opcional del contenedor exterior (p. ej. márgenes). */
  style?: StyleProp<ViewStyle>;
};

function clampPercent(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

function motivationalLabel(percent: number): string {
  if (percent <= 0) return 'Sin métricas en el periodo';
  if (percent >= 95) return '¡Casi listo!';
  if (percent >= 80) return '¡Excelente!';
  if (percent >= 50) return '¡Sigue así!';
  if (percent >= 25) return '¡Buen avance!';
  return '¡Vamos!';
}

export function PerformanceWidget({
  progress,
  targetTierName,
  periodSubtitle,
  isLoading,
  onPress,
  style,
}: PerformanceWidgetProps) {
  const hasValue = progress != null && !Number.isNaN(progress);
  const pct = useMemo(
    () => (hasValue ? clampPercent(progress as number) : 0),
    [hasValue, progress]
  );
  const badgeText = useMemo(() => (hasValue ? motivationalLabel(pct) : '…'), [hasValue, pct]);

  const gradientColors = [
    COLORS.neutral.gray[900],
    COLORS.neutral.gray[800],
  ] as const;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={
        hasValue
          ? `Tu rendimiento, ${pct} por ciento, nivel ${targetTierName}`
          : `Tu rendimiento, ${isLoading ? 'cargando' : 'sin datos'}`
      }
      style={({ pressed }) => [
        styles.outer,
        SHADOWS.lg,
        pressed && styles.pressed,
        style,
      ]}
    >
      <LinearGradient
        colors={[...gradientColors]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {/* Luz decorativa tipo blur (capas suaves; RN no tiene blur-3xl sobre vistas arbitrarias). */}
        <View style={styles.decorWrap} pointerEvents="none">
          <View style={styles.glowOuter} />
          <View style={styles.glowInner} />
        </View>

        <View style={styles.inner}>
          <View style={styles.headerRow}>
            <View style={styles.titleLeft}>
              <Activity size={22} color={PURPLE.icon} strokeWidth={2.25} />
              <Text style={styles.title}>Tu Rendimiento</Text>
            </View>

            <View style={styles.chevronCircle}>
              <BlurView intensity={28} tint="light" style={StyleSheet.absoluteFill} />
              <View style={styles.chevronIcon} pointerEvents="none">
                <ChevronRight size={18} color={COLORS.neutral.white} strokeWidth={2.5} />
              </View>
            </View>
          </View>

          <Text style={styles.subtitle} numberOfLines={1}>
            Nivel: {targetTierName}
          </Text>
          {periodSubtitle ? (
            <Text style={styles.periodLine} numberOfLines={2}>
              {periodSubtitle}
            </Text>
          ) : null}

          <View style={styles.kpiRow}>
            {hasValue ? (
              <Text style={styles.percent}>{pct}%</Text>
            ) : isLoading ? (
              <View style={styles.percentRow}>
                <ActivityIndicator color={COLORS.neutral.white} size="small" />
              </View>
            ) : (
              <Text style={styles.percentPlaceholder}>—</Text>
            )}
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{badgeText}</Text>
            </View>
          </View>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

const radius = BORDERS.radius['3xl'];

const styles = StyleSheet.create({
  outer: {
    borderRadius: radius,
    overflow: 'hidden',
  },
  pressed: {
    transform: [{ scale: 0.95 }],
  },
  gradient: {
    borderRadius: radius,
    overflow: 'hidden',
    padding: SPACING.md,
    paddingBottom: SPACING.lg,
    minHeight: 148,
  },
  decorWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'flex-end',
  },
  glowOuter: {
    position: 'absolute',
    top: -56,
    right: -48,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: PURPLE.glowSoft,
  },
  glowInner: {
    position: 'absolute',
    top: -36,
    right: -28,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: PURPLE.glow,
  },
  inner: {
    zIndex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  titleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    flex: 1,
    paddingRight: SPACING.sm,
  },
  title: {
    color: COLORS.text.inverse,
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
  },
  chevronCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  chevronIcon: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  subtitle: {
    color: COLORS.neutral.gray[300],
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    marginBottom: SPACING.xs,
  },
  periodLine: {
    color: COLORS.neutral.gray[400],
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    marginBottom: SPACING.sm,
    lineHeight: 16,
  },
  kpiRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  percent: {
    color: COLORS.text.inverse,
    fontSize: TYPOGRAPHY.fontSize['4xl'],
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    letterSpacing: TYPOGRAPHY.letterSpacing.tight,
  },
  percentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  percentPlaceholder: {
    color: COLORS.neutral.gray[300],
    fontSize: TYPOGRAPHY.fontSize['4xl'],
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    letterSpacing: TYPOGRAPHY.letterSpacing.tight,
  },
  badge: {
    backgroundColor: PURPLE.badgeBg,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDERS.radius.badge.md,
  },
  badgeText: {
    color: PURPLE.badgeText,
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
});

export default PerformanceWidget;
