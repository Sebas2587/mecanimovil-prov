import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react-native';
import { COLORS, SPACING, TYPOGRAPHY, BORDERS } from '@/app/design-system/tokens';
import type { MecanicoKpis } from '@/services/equipoTallerService';

const I = COLORS.institutional;
const FF = TYPOGRAPHY.fontFamily;

type Props = {
  comparativo: MecanicoKpis['comparativo'];
};

type RowProps = {
  label: string;
  delta: number | null | undefined;
  /** Si true, un delta negativo es bueno (ej. tiempo) */
  invertGood?: boolean;
};

function DeltaRow({ label, delta, invertGood = false }: RowProps) {
  if (delta == null) {
    return (
      <View style={styles.row}>
        <Text style={styles.label}>{label}</Text>
        <View style={styles.deltaWrap}>
          <Minus size={14} color={I.muted} />
          <Text style={styles.deltaNeutral}>—</Text>
        </View>
      </View>
    );
  }

  const isUp = delta > 0;
  const isNeutral = delta === 0;
  const isGood = invertGood ? !isUp : isUp;

  const color = isNeutral ? I.muted : isGood ? I.semanticUp : I.semanticDown;
  const Icon = isNeutral ? Minus : isUp ? TrendingUp : TrendingDown;
  const prefix = isUp ? '+' : '';

  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.deltaWrap}>
        <Icon size={14} color={color} />
        <Text style={[styles.delta, { color }]}>
          {prefix}
          {delta.toFixed(1)}%
        </Text>
      </View>
    </View>
  );
}

export function ComparativoMensual({ comparativo }: Props) {
  return (
    <View style={styles.card}>
      <DeltaRow label="Completados" delta={comparativo.delta_completados_pct} />
      <View style={styles.sep} />
      <DeltaRow label="Tiempo prom." delta={comparativo.delta_tiempo_pct} invertGood />
      <View style={styles.sep} />
      <DeltaRow label="Facturación" delta={comparativo.delta_facturacion_pct} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: I.canvas,
    borderRadius: BORDERS.radius.lg,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    paddingHorizontal: SPACING.fixed.md,
    paddingVertical: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  label: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansMedium,
    color: I.ink,
  },
  deltaWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  delta: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.monoMedium,
  },
  deltaNeutral: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.monoMedium,
    color: I.muted,
  },
  sep: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: I.hairline,
  },
});
