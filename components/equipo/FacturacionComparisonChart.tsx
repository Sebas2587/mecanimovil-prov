import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import { COLORS, SPACING, TYPOGRAPHY, BORDERS } from '@/app/design-system/tokens';

const I = COLORS.institutional;
const FF = TYPOGRAPHY.fontFamily;
const SCREEN_W = Dimensions.get('window').width;

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
  return date.toLocaleDateString('es-CL', { month: 'short' });
};

export function FacturacionComparisonChart({ mesActual, mesAnterior }: Props) {
  const chartW = SCREEN_W - SPACING.container.horizontal * 2 - 48;

  const data = useMemo(
    () => [
      {
        value: mesAnterior,
        label: getNombreMes(1),
        frontColor: I.muted,
      },
      {
        value: mesActual,
        label: getNombreMes(0),
        frontColor: I.primary,
      },
    ],
    [mesActual, mesAnterior],
  );

  const maxVal = Math.max(mesActual, mesAnterior, 1);

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Facturación</Text>
      <View style={styles.values}>
        <View>
          <Text style={styles.valLabel}>{getNombreMes(0)}</Text>
          <Text style={styles.valActual}>{fmt(mesActual)}</Text>
        </View>
        <View style={styles.valRight}>
          <Text style={styles.valLabel}>{getNombreMes(1)}</Text>
          <Text style={styles.valPrev}>{fmt(mesAnterior)}</Text>
        </View>
      </View>
      <BarChart
        data={data}
        width={chartW}
        height={120}
        barWidth={36}
        spacing={48}
        roundedTop
        hideRules
        hideYAxisText
        xAxisThickness={0}
        yAxisThickness={0}
        noOfSections={3}
        maxValue={maxVal * 1.15}
        isAnimated
        animationDuration={400}
      />
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
  title: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontFamily: FF.sansSemiBold,
    color: I.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: SPACING.fixed.sm,
  },
  values: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.fixed.sm,
  },
  valRight: {
    alignItems: 'flex-end',
  },
  valLabel: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontFamily: FF.sansMedium,
    color: I.muted,
    textTransform: 'capitalize',
  },
  valActual: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontFamily: FF.monoMedium,
    color: I.ink,
  },
  valPrev: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontFamily: FF.monoMedium,
    color: I.muted,
  },
});
