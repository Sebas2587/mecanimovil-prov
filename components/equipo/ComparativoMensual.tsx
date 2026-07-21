import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react-native';
import { COLORS, TYPOGRAPHY } from '@/app/design-system/tokens';
import { institutionalTextStyle } from '@/app/design-system/styles/institutionalTypography';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import type { MecanicoKpis } from '@/services/equipoTallerService';

const I = COLORS.institutional;
const FF = TYPOGRAPHY.fontFamily;
const TS = TYPOGRAPHY.styles;
const lh = (fontSize: number, mult: number) => Math.round(fontSize * mult);

type Props = {
  comparativo: MecanicoKpis['comparativo'];
};

type RowProps = {
  label: string;
  delta: number | null | undefined;
  invertGood?: boolean;
  last?: boolean;
};

function DeltaRow({ label, delta, invertGood = false, last }: RowProps) {
  if (delta == null) {
    return (
      <View style={[styles.row, !last && styles.rowBorder]}>
        <Text style={styles.label}>{label}</Text>
        <View style={styles.deltaWrap}>
          <Minus size={14} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
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
    <View style={[styles.row, !last && styles.rowBorder]}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.deltaWrap}>
        <Icon size={14} color={color} strokeWidth={ICON_STROKE_WIDTH} />
        <Text style={[styles.delta, { color }]}>
          {prefix}
          {delta.toFixed(1)}%
        </Text>
      </View>
    </View>
  );
}

/** Filas planas dentro de HostPaperSection (sin card propia). */
export function ComparativoMensual({ comparativo }: Props) {
  return (
    <View>
      <DeltaRow label="Completados" delta={comparativo.delta_completados_pct} />
      <DeltaRow label="Tiempo prom." delta={comparativo.delta_tiempo_pct} invertGood />
      <DeltaRow label="Facturación" delta={comparativo.delta_facturacion_pct} last />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: I.hairline,
  },
  label: {
    ...institutionalTextStyle('body', I.ink),
    fontFamily: FF.sansMedium,
  },
  deltaWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  delta: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    lineHeight: lh(TYPOGRAPHY.fontSize.sm, TS.numberDisplay.lineHeight),
    fontFamily: FF.monoMedium,
  },
  deltaNeutral: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    lineHeight: lh(TYPOGRAPHY.fontSize.sm, TS.numberDisplay.lineHeight),
    fontFamily: FF.monoMedium,
    color: I.muted,
  },
});
