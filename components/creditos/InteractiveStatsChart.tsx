/**
 * Actividad del mes — gráfico de créditos consumidos por día.
 * Ingreso asociado: Σ (créditos × precio/cr. de cada postulación); fallback al precio tienda si falta.
 */
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { Info } from 'lucide-react-native';
import { SPACING, TYPOGRAPHY, BORDERS, SHADOWS, COLORS } from '@/app/design-system/tokens';
import { ICON_STROKE_WIDTH, ICON_SIZE } from '@/app/design-system/iconography';

const I = COLORS.institutional;

interface ConsumoChartRow {
  fecha_consumo: string;
  creditos_consumidos?: number;
  /** CLP por crédito registrado en la postulación; si falta, se usa el precio de referencia. */
  precio_credito?: number;
}

interface InteractiveStatsChartProps {
  consumos: ConsumoChartRow[];
  /** Precio tienda/referencia vigente si algún consumo no trae `precio_credito`. */
  precioCreditoReferenciaClp: number;
  currentMonth?: number;
  currentYear?: number;
}

function capitalizeEs(s: string) {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatCLP(n: number) {
  return `$${Math.round(n).toLocaleString('es-CL')}`;
}

function buildConsumoSeries(
  consumos: InteractiveStatsChartProps['consumos'],
  precioReferencia: number,
  currentMonth: number,
  currentYear: number
) {
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const dailyConsumos: Record<number, number> = {};
  for (let i = 1; i <= daysInMonth; i++) {
    dailyConsumos[i] = 0;
  }
  let ingresoAsociadoMes = 0;
  consumos.forEach((item) => {
    const date = new Date(item.fecha_consumo);
    if (date.getMonth() === currentMonth && date.getFullYear() === currentYear) {
      const day = date.getDate();
      const c = item.creditos_consumidos || 0;
      dailyConsumos[day] += c;
      const pu =
        item.precio_credito != null && item.precio_credito > 0
          ? item.precio_credito
          : precioReferencia;
      ingresoAsociadoMes += c * pu;
    }
  });

  const labelForDay = (d: number) =>
    d % 5 === 0 || d === 1 || d === daysInMonth ? String(d) : '';

  const lineData = [];
  for (let d = 1; d <= daysInMonth; d++) {
    lineData.push({ value: dailyConsumos[d], label: labelForDay(d) });
  }

  const sumConsumos = Object.values(dailyConsumos).reduce((a, b) => a + b, 0);
  const maxC = Math.max(...Object.values(dailyConsumos), 0);
  const padC = Math.max(1, Math.ceil(maxC * 0.2));
  const maxValue = Math.max(maxC + padC, 1);

  return {
    lineData,
    sumConsumos,
    ingresoAsociadoMes: Math.round(ingresoAsociadoMes),
    maxValue,
    empty: sumConsumos === 0,
  };
}

export const InteractiveStatsChart: React.FC<InteractiveStatsChartProps> = ({
  consumos = [],
  precioCreditoReferenciaClp,
  currentMonth = new Date().getMonth(),
  currentYear = new Date().getFullYear(),
}) => {
  const { width: windowWidth } = useWindowDimensions();

  const monthTitle = useMemo(() => {
    const raw = new Date(currentYear, currentMonth).toLocaleDateString('es-CL', {
      month: 'long',
      year: 'numeric',
    });
    return capitalizeEs(raw);
  }, [currentMonth, currentYear]);

  const precioSeguro = Math.max(0, Math.round(precioCreditoReferenciaClp));

  const series = useMemo(
    () => buildConsumoSeries(consumos, precioSeguro, currentMonth, currentYear),
    [consumos, precioSeguro, currentMonth, currentYear]
  );

  const chartInnerWidth = useMemo(() => {
    const scrollPad = 40;
    const cardPad = SPACING.md * 2;
    const wellPad = SPACING.sm * 2;
    const yAxis = 44;
    const safety = 8;
    return Math.max(200, windowWidth - scrollPad - cardPad - wellPad - yAxis - safety);
  }, [windowWidth]);

  const spacing = useMemo(() => {
    const days = new Date(currentYear, currentMonth + 1, 0).getDate();
    const initial = 10;
    if (days <= 1) return { initial, spacing: 0 };
    return {
      initial,
      spacing: (chartInnerWidth - initial) / (days - 1),
    };
  }, [chartInnerWidth, currentYear, currentMonth]);

  return (
    <View style={styles.card}>
      <View style={styles.headerBlock}>
        <Text style={styles.headline}>Actividad del mes</Text>
        <Text style={styles.subhead} numberOfLines={1}>
          {monthTitle}
        </Text>
      </View>

      <View style={styles.summaryGrid}>
        <View style={[styles.summaryCell, { backgroundColor: I.surfaceSoft }]}>
          <Text style={styles.summaryLabel}>Créditos usados</Text>
          <Text style={[styles.summaryValue, { color: I.semanticUp }]}>
            {Math.round(series.sumConsumos).toLocaleString('es-CL')} cr.
          </Text>
        </View>
        <View style={[styles.summaryCell, { backgroundColor: I.surfaceSoft }]}>
          <Text style={styles.summaryLabel}>Ingreso asociado</Text>
          <Text style={[styles.summaryValue, { color: I.primary }]} numberOfLines={1}>
            {formatCLP(series.ingresoAsociadoMes)}
          </Text>
          <Text style={styles.summaryHint} numberOfLines={2}>
            {series.sumConsumos > 0
              ? 'Suma de créditos consumidos valorizados con el precio/cr. de cada postulación.'
              : 'Sin consumo este mes'}
          </Text>
        </View>
      </View>

      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: I.semanticUp }]} />
          <Text style={styles.legendText}>Créditos consumidos por día</Text>
        </View>
      </View>

      <View style={styles.chartWell}>
        <View style={styles.chartWrap}>
          {series.empty ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>Sin consumo este mes</Text>
              <Text style={styles.emptyBody}>
                Cuando postules y se consuman créditos, verás el uso diario y el ingreso asociado
                estimado con el precio de referencia vigente.
              </Text>
            </View>
          ) : (
            <LineChart
              data={series.lineData}
              height={192}
              width={chartInnerWidth}
              initialSpacing={spacing.initial}
              spacing={spacing.spacing}
              color1={I.semanticUp}
              thickness={2}
              curved
              areaChart
              startFillColor={I.semanticUp}
              endFillColor={I.semanticUp}
              startOpacity={0.22}
              endOpacity={0.04}
              hideDataPoints
              noOfSections={4}
              maxValue={series.maxValue}
              yAxisColor="transparent"
              yAxisThickness={0}
              xAxisColor={I.hairline}
              xAxisThickness={StyleSheet.hairlineWidth}
              rulesColor={I.hairlineSoft}
              rulesType="solid"
              yAxisTextStyle={styles.axisText}
              xAxisLabelTextStyle={styles.axisText}
              yAxisLabelWidth={44}
              yAxisSide={0}
              formatYLabel={(v) => String(Math.max(0, Math.round(Number(v))))}
              focusEnabled={false}
            />
          )}
        </View>
      </View>

      <View style={[styles.footer, { borderTopColor: I.hairline }]}>
        <Info size={ICON_SIZE.sm} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
        <Text style={styles.footerText}>
          El ingreso asociado suma cada consumo como créditos × precio por crédito guardado en esa
          postulación (si falta, se usa el precio de referencia de tienda). No equivale al dinero
          acreditado en Mercado Pago: ese total está en la card de saldo.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: I.canvas,
    borderRadius: BORDERS.radius.xl,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.editorial,
  },
  headerBlock: {
    marginBottom: SPACING.sm,
  },
  headline: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    fontWeight: TYPOGRAPHY.fontWeight.semibold as '600',
    color: I.ink,
    letterSpacing: -0.2,
  },
  subhead: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: TYPOGRAPHY.fontFamily.sansRegular,
    color: I.muted,
    marginTop: 2,
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  summaryCell: {
    flex: 1,
    minWidth: 0,
    borderRadius: BORDERS.radius.md,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm,
  },
  summaryLabel: {
    fontSize: 10,
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    fontWeight: TYPOGRAPHY.fontWeight.semibold as '600',
    color: I.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.45,
    marginBottom: 6,
  },
  summaryValue: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontFamily: TYPOGRAPHY.fontFamily.monoMedium,
    fontWeight: '500',
  },
  summaryHint: {
    marginTop: 4,
    fontSize: 11,
    fontFamily: TYPOGRAPHY.fontFamily.sansRegular,
    color: I.body,
    lineHeight: 15,
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
    marginBottom: SPACING.xs,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 12,
    fontFamily: TYPOGRAPHY.fontFamily.sansRegular,
    color: I.body,
  },
  chartWell: {
    width: '100%',
    borderRadius: BORDERS.radius.lg,
    backgroundColor: I.surfaceSoft,
    overflow: 'hidden',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.sm,
  },
  chartWrap: {
    alignItems: 'center',
    alignSelf: 'center',
    minHeight: 192,
    width: '100%',
    overflow: 'hidden',
  },
  emptyState: {
    minHeight: 192,
    width: '100%',
    justifyContent: 'center',
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.sm,
    backgroundColor: I.surfaceStrong,
    borderRadius: BORDERS.radius.md,
  },
  emptyTitle: {
    ...TYPOGRAPHY.styles.h4,
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    color: I.ink,
    textAlign: 'center',
    marginBottom: SPACING.xs,
  },
  emptyBody: {
    ...TYPOGRAPHY.styles.small,
    fontFamily: TYPOGRAPHY.fontFamily.sansRegular,
    color: I.body,
    textAlign: 'center',
    lineHeight: 20,
  },
  axisText: {
    color: I.muted,
    fontSize: 9,
    fontFamily: TYPOGRAPHY.fontFamily.sansRegular,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  footerText: {
    flex: 1,
    ...TYPOGRAPHY.styles.small,
    fontFamily: TYPOGRAPHY.fontFamily.sansRegular,
    color: I.body,
    lineHeight: 18,
  },
});
