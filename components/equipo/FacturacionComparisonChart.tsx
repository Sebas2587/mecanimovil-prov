import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react-native';
import { COLORS, SPACING, TYPOGRAPHY, BORDERS } from '@/app/design-system/tokens';

const I = COLORS.institutional;
const FF = TYPOGRAPHY.fontFamily;

type Props = {
  mesActual: number;
  mesAnterior: number;
};

const fmt = (v: number) =>
  new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(v);

const getNombreMes = (offset: number) => {
  const date = new Date();
  date.setDate(1);
  date.setMonth(date.getMonth() - offset);
  return date.toLocaleDateString('es-CL', { month: 'long' });
};

type BarRowProps = {
  label: string;
  amount: number;
  pct: number;
  highlight?: boolean;
};

function BarRow({ label, amount, pct, highlight }: BarRowProps) {
  return (
    <View style={styles.barRow}>
      <View style={styles.barMeta}>
        <Text style={[styles.barLabel, highlight && styles.barLabelActive]}>{label}</Text>
        <Text style={[styles.barAmount, highlight && styles.barAmountActive]}>{fmt(amount)}</Text>
      </View>
      <View style={styles.barTrack}>
        <View
          style={[
            styles.barFill,
            highlight ? styles.barFillActive : styles.barFillMuted,
            { width: `${Math.max(pct, amount > 0 ? 4 : 0)}%` },
          ]}
        />
      </View>
    </View>
  );
}

export function FacturacionComparisonChart({ mesActual, mesAnterior }: Props) {
  const mesActualLabel = getNombreMes(0);
  const mesAnteriorLabel = getNombreMes(1);

  const { pctActual, pctAnterior, deltaPct, deltaPositivo, sinVariacion } = useMemo(() => {
    const maxVal = Math.max(mesActual, mesAnterior, 1);
    const delta =
      mesAnterior === 0
        ? mesActual > 0
          ? 100
          : 0
        : ((mesActual - mesAnterior) / mesAnterior) * 100;
    return {
      pctActual: (mesActual / maxVal) * 100,
      pctAnterior: (mesAnterior / maxVal) * 100,
      deltaPct: delta,
      deltaPositivo: delta >= 0,
      sinVariacion: mesActual === mesAnterior,
    };
  }, [mesActual, mesAnterior]);

  const DeltaIcon = sinVariacion ? Minus : deltaPositivo ? TrendingUp : TrendingDown;
  const deltaColor = sinVariacion ? I.muted : deltaPositivo ? I.semanticUp : I.semanticDown;

  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Facturación</Text>
        <View style={[styles.deltaPill, { backgroundColor: `${deltaColor}18` }]}>
          <DeltaIcon size={14} color={deltaColor} strokeWidth={2.25} />
          <Text style={[styles.deltaText, { color: deltaColor }]}>
            {sinVariacion
              ? 'Sin cambio'
              : `${deltaPositivo ? '+' : ''}${deltaPct.toFixed(0)}% vs mes ant.`}
          </Text>
        </View>
      </View>

      <Text style={styles.heroAmount}>{fmt(mesActual)}</Text>
      <Text style={styles.heroSub}>Total de {mesActualLabel}</Text>

      <View style={styles.compareBlock}>
        <BarRow
          label={mesActualLabel}
          amount={mesActual}
          pct={pctActual}
          highlight
        />
        <BarRow
          label={mesAnteriorLabel}
          amount={mesAnterior}
          pct={pctAnterior}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: I.canvas,
    borderRadius: BORDERS.radius.lg,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    padding: SPACING.fixed.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.fixed.sm,
    marginBottom: SPACING.fixed.md,
  },
  title: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontFamily: FF.sansSemiBold,
    color: I.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  deltaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: SPACING.fixed.sm,
    paddingVertical: 4,
    borderRadius: BORDERS.radius.pill,
  },
  deltaText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontFamily: FF.sansSemiBold,
  },
  heroAmount: {
    fontSize: TYPOGRAPHY.fontSize['2xl'],
    fontFamily: FF.monoMedium,
    color: I.ink,
    letterSpacing: -0.5,
  },
  heroSub: {
    marginTop: 2,
    marginBottom: SPACING.fixed.md,
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.regular,
    color: I.muted,
    textTransform: 'capitalize',
  },
  compareBlock: {
    gap: SPACING.fixed.sm,
    paddingTop: SPACING.fixed.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: I.hairline,
  },
  barRow: {
    gap: 6,
  },
  barMeta: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: SPACING.fixed.sm,
  },
  barLabel: {
    flex: 1,
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontFamily: FF.sansMedium,
    color: I.muted,
    textTransform: 'capitalize',
  },
  barLabelActive: {
    color: I.ink,
    fontFamily: FF.sansSemiBold,
  },
  barAmount: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.monoMedium,
    color: I.muted,
  },
  barAmountActive: {
    color: I.ink,
    fontSize: TYPOGRAPHY.fontSize.base,
  },
  barTrack: {
    height: 8,
    borderRadius: BORDERS.radius.pill,
    backgroundColor: I.surfaceStrong,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: BORDERS.radius.pill,
    minWidth: 0,
  },
  barFillActive: {
    backgroundColor: I.primary,
  },
  barFillMuted: {
    backgroundColor: I.mutedSoft,
  },
});
