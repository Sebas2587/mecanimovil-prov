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
import { pointerEventsNone } from '@/app/design-system/tokens';
import { BORDERS } from '@/app/design-system/tokens/borders';

const I = COLORS.institutional;

/** Acento decorativo azul (primario usado con mesura, patrón hero oscuro). */
const ACCENT_GLOW = {
  soft: 'rgba(0, 82, 255, 0.14)',
  strong: 'rgba(0, 82, 255, 0.22)',
} as const;

export type PerformanceWidgetProps = {
  progress?: number | null;
  targetTierName: string;
  periodSubtitle?: string;
  isLoading?: boolean;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
  /** Igualar altura en layout de 2 columnas del home. */
  fill?: boolean;
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
  fill = false,
}: PerformanceWidgetProps) {
  const hasValue = progress != null && !Number.isNaN(progress);
  const pct = useMemo(
    () => (hasValue ? clampPercent(progress as number) : 0),
    [hasValue, progress]
  );
  const badgeText = useMemo(() => (hasValue ? motivationalLabel(pct) : '…'), [hasValue, pct]);

  const gradientColors = [I.surfaceDark, I.surfaceDarkElevated] as const;
  const ff = TYPOGRAPHY.fontFamily;

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
        fill && styles.outerFill,
        SHADOWS.editorial,
        pressed && styles.pressed,
        style,
      ]}
    >
      <LinearGradient
        colors={[...gradientColors]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.gradient, fill && styles.gradientFill]}
      >
        <View style={[styles.decorWrap, pointerEventsNone]}>
          <View style={[styles.glowOuter, { backgroundColor: ACCENT_GLOW.soft }]} />
          <View style={[styles.glowInner, { backgroundColor: ACCENT_GLOW.strong }]} />
        </View>

        <View style={styles.inner}>
          <View style={styles.headerRow}>
            <View style={styles.titleLeft}>
              <Activity size={22} color={COLORS.primary[300]} strokeWidth={2.25} />
              <Text style={[styles.title, { fontFamily: ff.sansSemiBold }]}>Tu Rendimiento</Text>
            </View>

            <View style={styles.chevronCircle}>
              <BlurView intensity={32} tint="light" style={StyleSheet.absoluteFill} />
              <View style={[styles.chevronIcon, pointerEventsNone]}>
                <ChevronRight size={18} color={I.onDark} strokeWidth={2.5} />
              </View>
            </View>
          </View>

          <Text style={[styles.subtitle, { fontFamily: ff.sansMedium }]} numberOfLines={1}>
            Nivel: {targetTierName}
          </Text>
          {periodSubtitle ? (
            <Text
              style={[styles.periodLine, { fontFamily: ff.sansRegular }, fill && styles.periodLineCompact]}
              numberOfLines={fill ? 3 : 2}
            >
              {periodSubtitle}
            </Text>
          ) : null}

          <View style={styles.kpiRow}>
            {hasValue ? (
              <Text style={[styles.percent, { fontFamily: ff.monoMedium }]}>{pct}%</Text>
            ) : isLoading ? (
              <View style={styles.percentRow}>
                <ActivityIndicator color={I.onDark} size="small" />
              </View>
            ) : (
              <Text style={[styles.percentPlaceholder, { fontFamily: ff.monoMedium }]}>—</Text>
            )}
            <View style={styles.badge}>
              <Text style={[styles.badgeText, { fontFamily: ff.sansSemiBold }]}>{badgeText}</Text>
            </View>
          </View>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

const radius = BORDERS.radius.card.xl;

const styles = StyleSheet.create({
  outer: {
    borderRadius: radius,
    overflow: 'hidden',
  },
  outerFill: {
    flex: 1,
    alignSelf: 'stretch',
  },
  pressed: {
    opacity: 0.92,
    transform: [{ scale: 0.985 }],
  },
  gradient: {
    borderRadius: radius,
    overflow: 'hidden',
    padding: SPACING.md,
    paddingBottom: SPACING.lg,
    minHeight: 148,
  },
  gradientFill: {
    flex: 1,
    justifyContent: 'space-between',
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
  },
  glowInner: {
    position: 'absolute',
    top: -36,
    right: -28,
    width: 140,
    height: 140,
    borderRadius: 70,
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
    color: I.onDark,
    fontSize: TYPOGRAPHY.fontSize.lg,
  },
  chevronCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  chevronIcon: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  subtitle: {
    color: I.onDarkSoft,
    fontSize: TYPOGRAPHY.fontSize.sm,
    marginBottom: SPACING.xs,
  },
  periodLine: {
    color: I.mutedSoft,
    fontSize: TYPOGRAPHY.fontSize.xs,
    marginBottom: SPACING.sm,
    lineHeight: 16,
  },
  periodLineCompact: {
    fontSize: 11,
    lineHeight: 14,
  },
  kpiRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  percent: {
    color: I.onDark,
    fontSize: TYPOGRAPHY.fontSize['4xl'],
    letterSpacing: TYPOGRAPHY.letterSpacing.tight,
  },
  percentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  percentPlaceholder: {
    color: I.onDarkSoft,
    fontSize: TYPOGRAPHY.fontSize['4xl'],
    letterSpacing: TYPOGRAPHY.letterSpacing.tight,
  },
  badge: {
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDERS.radius.pill,
  },
  badgeText: {
    color: I.onDark,
    fontSize: TYPOGRAPHY.fontSize.sm,
  },
});

export default PerformanceWidget;
