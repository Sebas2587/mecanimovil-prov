/**
 * Primitivos de superficie Host (Airbnb Anfitriones + paleta Tinder).
 * Fuente canónica: kickers en canvas, una sola paper por bloque, filas métrica.
 */
import React from 'react';
import { View, Text, StyleSheet, type ViewStyle, type StyleProp } from 'react-native';
import { COLORS, SPACING, TYPOGRAPHY, BORDERS } from '@/app/design-system/tokens';
import { institutionalTextStyle } from '@/app/design-system/styles/institutionalTypography';
import { Card } from './Card';

const I = COLORS.institutional;
const FF = TYPOGRAPHY.fontFamily;
const TS = TYPOGRAPHY.styles;

const lh = (fontSize: number, mult: number) => Math.round(fontSize * mult);

/** Kicker de sección en canvas (h6 Host, muted, MAYÚSCULAS). */
export function HostSectionKicker({
  label,
  style,
}: {
  label: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.kickerWrap, style]}>
      <Text style={styles.kicker}>{label}</Text>
    </View>
  );
}

/** Una sola superficie paper por bloque — sin hijos-card. */
export function HostPaperSection({
  children,
  style,
  onPress,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
}) {
  return (
    <Card elevated padding="host" onPress={onPress} style={[styles.paperStretch, style]}>
      {children}
    </Card>
  );
}

export type HostMetricRowProps = {
  label: string;
  value: string;
  /** Meta bajo el label (fecha / breakdown). */
  meta?: string;
  last?: boolean;
};

/** Fila label · valor (lista Host Insights). */
export function HostMetricRow({ label, value, meta, last }: HostMetricRowProps) {
  return (
    <View style={[styles.row, !last && styles.rowBorder]}>
      <View style={styles.rowLabelCol}>
        <Text style={styles.rowLabel}>{label}</Text>
        {meta ? <Text style={styles.rowMeta}>{meta}</Text> : null}
      </View>
      <Text style={styles.rowValue} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

export type HostProgressRowProps = {
  label: string;
  score: number | null | undefined;
  last?: boolean;
};

/** Barra de progreso Host 4px (Insights / rendimiento). */
export function HostProgressRow({ label, score, last }: HostProgressRowProps) {
  const value = score != null ? Math.max(0, Math.min(100, score)) : null;

  return (
    <View style={[styles.progressBlock, !last && styles.rowBorder]}>
      <View style={styles.progressTop}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.progressValue}>{value != null ? value : '—'}</Text>
      </View>
      <View style={styles.progressTrack}>
        {value != null ? <View style={[styles.progressFill, { width: `${value}%` }]} /> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  kickerWrap: {
    marginTop: SPACING.fixed.md,
    marginBottom: SPACING.fixed.xs,
  },
  kicker: {
    fontSize: TS.h6.fontSize,
    lineHeight: lh(TS.h6.fontSize, TS.h6.lineHeight),
    fontFamily: FF.sansMedium,
    fontWeight: '500',
    letterSpacing: TYPOGRAPHY.letterSpacing.wider,
    textTransform: 'uppercase',
    color: I.muted,
  },
  paperStretch: {
    alignSelf: 'stretch',
    width: '100%',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: SPACING.fixed.md,
    paddingVertical: 14,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: I.hairline,
  },
  rowLabelCol: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  rowLabel: {
    ...institutionalTextStyle('body', I.ink),
    fontFamily: FF.sansMedium,
  },
  rowMeta: {
    ...institutionalTextStyle('small', I.muted),
  },
  rowValue: {
    fontSize: TYPOGRAPHY.fontSize.base,
    lineHeight: lh(TYPOGRAPHY.fontSize.base, TS.numberDisplay.lineHeight),
    fontFamily: FF.monoMedium,
    color: I.ink,
    textAlign: 'right',
    maxWidth: '46%',
  },
  progressBlock: {
    paddingVertical: 14,
    gap: SPACING.fixed.sm,
  },
  progressTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.fixed.sm,
  },
  progressValue: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    lineHeight: lh(TYPOGRAPHY.fontSize.sm, TS.numberDisplay.lineHeight),
    fontFamily: FF.monoMedium,
    color: I.ink,
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
    backgroundColor: I.primary,
  },
});
