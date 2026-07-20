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
import { Activity, ChevronRight } from 'lucide-react-native';
import {
  COLORS,
  SPACING,
  TYPOGRAPHY,
  SHADOWS,
  BORDERS,
} from '@/app/design-system/tokens';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import {
  hostIconPlateColor,
  hostIconPlateStyle,
} from '@/app/design-system/styles/institutionalSemantic';

const I = COLORS.institutional;
const FF = TYPOGRAPHY.fontFamily;
const TS = TYPOGRAPHY.styles;
const CARD_MIN_HEIGHT = 168;

const lh = (fontSize: number, mult: number) => Math.round(fontSize * mult);

type KpiTierKey = keyof typeof COLORS.kpi;

function tierKeyForName(name: string): KpiTierKey {
  const n = name.toLowerCase();
  if (n.includes('elite')) return 'elite';
  if (n.includes('máster') || n.includes('master')) return 'master';
  if (n.includes('pro')) return 'pro';
  if (n.includes('ascenso')) return 'ascenso';
  if (n.includes('sin') || n.includes('actividad')) return 'sinActividad';
  return 'enProgreso';
}

export type PerformanceWidgetProps = {
  progress?: number | null;
  targetTierName: string;
  periodSubtitle?: string;
  isLoading?: boolean;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
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
    [hasValue, progress],
  );
  const tip = useMemo(() => (hasValue ? motivationalLabel(pct) : '…'), [hasValue, pct]);
  const tierPalette = COLORS.kpi[tierKeyForName(targetTierName)];

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
        styles.card,
        fill && styles.cardFill,
        pressed && styles.pressed,
        style,
      ]}
    >
      <View style={[styles.inner, fill && styles.innerFill]}>
        <View style={styles.headerRow}>
          <View style={styles.titleLeft}>
            <View style={hostIconPlateStyle}>
              <Activity size={20} color={hostIconPlateColor} strokeWidth={ICON_STROKE_WIDTH} />
            </View>
            <Text style={styles.title}>Tu rendimiento</Text>
          </View>
          <View style={styles.chevronCircle}>
            <ChevronRight size={16} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
          </View>
        </View>

        <View style={styles.tierRow}>
          <View
            style={[
              styles.tierBadge,
              {
                backgroundColor: tierPalette.background,
                borderColor: tierPalette.border,
              },
            ]}
          >
            <Text style={[styles.tierBadgeText, { color: tierPalette.text }]} numberOfLines={1}>
              {targetTierName}
            </Text>
          </View>
          {hasValue ? (
            <Text style={styles.tipText} numberOfLines={1}>
              {tip}
            </Text>
          ) : null}
        </View>

        {periodSubtitle ? (
          <Text style={styles.periodLine} numberOfLines={fill ? 3 : 2}>
            {periodSubtitle}
          </Text>
        ) : null}

        <View style={styles.kpiBlock}>
          {hasValue ? (
            <Text style={styles.percent}>{pct}%</Text>
          ) : isLoading ? (
            <ActivityIndicator color={I.primary} size="small" />
          ) : (
            <Text style={styles.percentPlaceholder}>—</Text>
          )}

          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${hasValue ? pct : 0}%`,
                  backgroundColor: hasValue ? I.primary : I.surfaceSoft,
                },
              ]}
            />
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BORDERS.radius.lg,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    backgroundColor: COLORS.background.paper,
    overflow: 'hidden',
    minHeight: CARD_MIN_HEIGHT,
    ...SHADOWS.editorial,
  },
  cardFill: {
    flex: 1,
    alignSelf: 'stretch',
  },
  pressed: {
    opacity: 0.94,
    transform: [{ scale: 0.99 }],
  },
  inner: {
    padding: SPACING.md,
    gap: SPACING.sm,
    minHeight: CARD_MIN_HEIGHT,
  },
  innerFill: {
    flex: 1,
    justifyContent: 'space-between',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    flex: 1,
    minWidth: 0,
    paddingRight: SPACING.sm,
  },
  title: {
    color: I.ink,
    fontSize: TS.h4.fontSize,
    lineHeight: lh(TS.h4.fontSize, TS.h4.lineHeight),
    fontFamily: FF.sansSemiBold,
    flexShrink: 1,
  },
  chevronCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: I.surfaceSoft,
  },
  tierRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    flexWrap: 'wrap',
  },
  tierBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDERS.radius.sm,
    borderWidth: BORDERS.width.thin,
  },
  tierBadgeText: {
    fontSize: TS.caption.fontSize,
    lineHeight: lh(TS.caption.fontSize, TS.caption.lineHeight),
    fontFamily: FF.sansMedium,
  },
  tipText: {
    fontSize: TS.caption.fontSize,
    lineHeight: lh(TS.caption.fontSize, TS.caption.lineHeight),
    fontFamily: FF.sansRegular,
    color: I.body,
    flexShrink: 1,
  },
  periodLine: {
    color: I.muted,
    fontSize: TS.small.fontSize,
    lineHeight: lh(TS.small.fontSize, TS.small.lineHeight),
    fontFamily: FF.sansRegular,
  },
  kpiBlock: {
    gap: SPACING.sm,
  },
  percent: {
    color: I.ink,
    fontSize: TYPOGRAPHY.fontSize['3xl'],
    lineHeight: lh(TYPOGRAPHY.fontSize['3xl'], TS.numberDisplay.lineHeight),
    fontFamily: FF.monoMedium,
    letterSpacing: TYPOGRAPHY.letterSpacing.tight,
  },
  percentPlaceholder: {
    color: I.muted,
    fontSize: TYPOGRAPHY.fontSize['3xl'],
    lineHeight: lh(TYPOGRAPHY.fontSize['3xl'], TS.numberDisplay.lineHeight),
    fontFamily: FF.monoMedium,
    letterSpacing: TYPOGRAPHY.letterSpacing.tight,
  },
  progressTrack: {
    height: 4,
    borderRadius: BORDERS.radius.pill,
    backgroundColor: I.surfaceSoft,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: BORDERS.radius.pill,
  },
});

export default PerformanceWidget;
