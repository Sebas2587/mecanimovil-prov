import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  type LayoutChangeEvent,
} from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { TrendingUp } from 'lucide-react-native';
import { COLORS, SPACING, TYPOGRAPHY, BORDERS } from '@/app/design-system/tokens';
import { useGananciasSerieQuery } from '@/hooks/useGananciasSerieQuery';
import type { GananciasSerieGranularidad, GananciasSeriePunto } from '@/services/kpisProveedorService';

const I = COLORS.institutional;
const FF = TYPOGRAPHY.fontFamily;

const GRANULARIDADES: { id: GananciasSerieGranularidad; label: string }[] = [
  { id: 'dia', label: 'Día' },
  { id: 'semana', label: 'Semana' },
  { id: 'mes', label: 'Mes' },
];

const CHART_HEIGHT = 188;
const Y_AXIS_WIDTH = 44;
const INITIAL_SPACING = 8;
const END_SPACING = 16;
const SCROLL_SPACING = 12;
const LINE_COLOR_APP = I.primary;
/** Segunda serie — contraste frente a la línea azul (referencia Figma) */
const LINE_COLOR_PERSONAL = COLORS.brand.magenta;
const CHART_RULES_COLOR = 'rgba(228,228,228,0.2)';
const LINE_THICKNESS = 2.5;

type Props = {
  mecanicoId?: number | null;
  enabled?: boolean;
};

const fmt = (v: number) =>
  new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(v);

function formatClave(clave: string, granularidad: GananciasSerieGranularidad): string {
  const d = new Date(`${clave}T12:00:00`);
  if (Number.isNaN(d.getTime())) return clave;
  if (granularidad === 'mes') {
    return d.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' });
  }
  if (granularidad === 'semana') {
    return `Sem. desde ${d.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })}`;
  }
  return d.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' });
}

function buildSeriesPoints(
  puntos: GananciasSeriePunto[],
  key: 'mecanimovil' | 'agenda_personal',
  includeLabels: boolean,
) {
  return puntos.map((p) => ({
    value: p[key],
    label: includeLabels ? p.etiqueta : '',
  }));
}

export function FacturacionComparisonChart({ mecanicoId = null, enabled = true }: Props) {
  const [granularidad, setGranularidad] = useState<GananciasSerieGranularidad>('dia');
  const [chartViewportWidth, setChartViewportWidth] = useState(0);
  const { data, loading, error } = useGananciasSerieQuery(granularidad, {
    mecanicoId,
    enabled,
  });

  const onChartLayout = useCallback((event: LayoutChangeEvent) => {
    const nextWidth = Math.floor(event.nativeEvent.layout.width);
    if (nextWidth > 0) {
      setChartViewportWidth((prev) => (prev === nextWidth ? prev : nextWidth));
    }
  }, []);

  const chartMetrics = useMemo(() => {
    const puntos = data?.puntos ?? [];
    const allValues = puntos.flatMap((p) => [p.mecanimovil, p.agenda_personal]);
    const maxVal = Math.max(...allValues, 0);
    const pad = Math.max(1, Math.ceil(maxVal * 0.15));
    const count = Math.max(puntos.length, 1);
    const viewport = Math.max(chartViewportWidth, 0);
    const plotWidth = Math.max(160, viewport - Y_AXIS_WIDTH - 4);
    const fitSpacing =
      count <= 1 ? 0 : (plotWidth - INITIAL_SPACING - END_SPACING) / (count - 1);
    const needsScroll = fitSpacing < 8;
    const spacing = needsScroll ? SCROLL_SPACING : Math.max(0, fitSpacing);

    return {
      puntos,
      maxValue: Math.max(maxVal + pad, 1),
      chartViewportWidth: viewport,
      spacing,
      disableScroll: !needsScroll,
      empty: allValues.every((v) => v === 0),
      ready: viewport > 0,
    };
  }, [data, chartViewportWidth]);

  const onSelectGranularidad = useCallback((g: GananciasSerieGranularidad) => {
    setGranularidad(g);
  }, []);

  const lineMecanimovil = useMemo(
    () => buildSeriesPoints(chartMetrics.puntos, 'mecanimovil', true),
    [chartMetrics.puntos],
  );

  const linePersonal = useMemo(
    () => buildSeriesPoints(chartMetrics.puntos, 'agenda_personal', false),
    [chartMetrics.puntos],
  );

  const renderPointerLabel = useCallback(
    (
      items: { value?: number }[],
      _secondaryItems: { value?: number }[] | undefined,
      pointerIndex?: number,
    ) => {
      const idx = pointerIndex ?? 0;
      const punto = chartMetrics.puntos[idx];
      const mkt = items[0]?.value ?? punto?.mecanimovil ?? 0;
      const personal = items[1]?.value ?? punto?.agenda_personal ?? 0;
      const title = punto ? formatClave(punto.clave, granularidad) : '';

      return (
        <View style={styles.pointerLabel}>
          <Text style={styles.pointerLabelTitle}>{title}</Text>
          <Text style={[styles.pointerValue, { color: LINE_COLOR_APP }]}>App {fmt(mkt)}</Text>
          <Text style={[styles.pointerValue, { color: LINE_COLOR_PERSONAL }]}>
            Propias {fmt(personal)}
          </Text>
          <Text style={styles.pointerTotal}>Total {fmt(mkt + personal)}</Text>
        </View>
      );
    },
    [chartMetrics.puntos, granularidad],
  );

  const totalPeriodo = data?.totales_periodo.ganancias_total ?? 0;

  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Facturación</Text>
        {!chartMetrics.empty && data?.pico_mayor ? (
          <View style={[styles.deltaPill, { backgroundColor: `${I.semanticUp}18` }]}>
            <TrendingUp size={14} color={I.semanticUp} strokeWidth={2.25} />
            <Text style={[styles.deltaText, { color: I.semanticUp }]}>
              Pico {fmt(data.pico_mayor.total)}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={styles.chipsRow}>
        {GRANULARIDADES.map((g) => {
          const active = granularidad === g.id;
          return (
            <TouchableOpacity
              key={g.id}
              style={[styles.chip, active && styles.chipActive]}
              onPress={() => onSelectGranularidad(g.id)}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={`Ver por ${g.label}`}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{g.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {loading && !data ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator color={I.primary} />
        </View>
      ) : null}

      {error && !data ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : null}

      {data ? (
        <>
          <Text style={styles.heroAmount}>{fmt(totalPeriodo)}</Text>
          <Text style={styles.heroSub}>
            Total del periodo · App {fmt(data.totales_periodo.ganancias_mecanimovil)} · Propias{' '}
            {fmt(data.totales_periodo.ganancias_agenda_personal)}
          </Text>

          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: LINE_COLOR_APP }]} />
              <Text style={styles.legendText}>Mecanimóvil App</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: LINE_COLOR_PERSONAL }]} />
              <Text style={styles.legendText}>Agenda personal</Text>
            </View>
          </View>

          <View style={styles.chartWell} onLayout={onChartLayout}>
            {chartMetrics.empty ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>Sin ingresos en este periodo</Text>
                <Text style={styles.emptyBody}>
                  Cuando completes órdenes de la app o cierres citas personales, verás la
                  comparativa aquí.
                </Text>
              </View>
            ) : chartMetrics.ready ? (
              <View style={styles.chartScrollWrap}>
                <LineChart
                  data={lineMecanimovil}
                  data2={linePersonal}
                  height={CHART_HEIGHT}
                  width={chartMetrics.chartViewportWidth}
                  parentWidth={chartMetrics.chartViewportWidth}
                  initialSpacing={INITIAL_SPACING}
                  endSpacing={END_SPACING}
                  spacing={chartMetrics.spacing}
                  disableScroll={chartMetrics.disableScroll}
                  color1={LINE_COLOR_APP}
                  color2={LINE_COLOR_PERSONAL}
                  thickness={LINE_THICKNESS}
                  thickness2={LINE_THICKNESS}
                  curved
                  hideDataPoints1
                  hideDataPoints2
                  zIndex1={1}
                  zIndex2={0}
                  noOfSections={4}
                  maxValue={chartMetrics.maxValue}
                  yAxisColor="transparent"
                  yAxisThickness={0}
                  xAxisColor={I.hairline}
                  xAxisThickness={StyleSheet.hairlineWidth}
                  rulesColor={CHART_RULES_COLOR}
                  rulesThickness={StyleSheet.hairlineWidth}
                  showVerticalLines={false}
                  yAxisTextStyle={styles.yAxisText}
                  xAxisLabelTextStyle={styles.xAxisText}
                  yAxisLabelWidth={Y_AXIS_WIDTH}
                  nestedScrollEnabled
                  overflowTop={52}
                  formatYLabel={(v) => {
                    const n = Math.max(0, Math.round(Number(v)));
                    if (n >= 1_000_000) return `${Math.round(n / 1_000_000)}M`;
                    if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
                    return String(n);
                  }}
                  focusEnabled
                  showStripOnFocus
                  stripColor={I.hairline}
                  stripWidth={1}
                  pointerConfig={{
                    pointerStripHeight: CHART_HEIGHT,
                    pointerStripColor: I.hairline,
                    pointerStripWidth: 1,
                    hidePointers: true,
                    activatePointersOnLongPress: false,
                    autoAdjustPointerLabelPosition: true,
                    pointerLabelWidth: 148,
                    pointerLabelComponent: renderPointerLabel,
                  }}
                />
              </View>
            ) : (
              <View style={styles.chartMeasurePlaceholder} />
            )}
          </View>

          {data.pico_mayor || data.pico_menor ? (
            <View style={styles.extremosRow}>
              {data.pico_mayor ? (
                <View style={[styles.extremoCell, styles.extremoUp]}>
                  <Text style={styles.extremoLabel}>Mayor ingreso</Text>
                  <Text style={styles.extremoValue}>{fmt(data.pico_mayor.total)}</Text>
                  <Text style={styles.extremoMeta}>
                    {formatClave(data.pico_mayor.clave, granularidad)}
                  </Text>
                  <Text style={styles.extremoBreakdown}>
                    App {fmt(data.pico_mayor.mecanimovil)} · Propias{' '}
                    {fmt(data.pico_mayor.agenda_personal)}
                  </Text>
                </View>
              ) : null}
              {data.pico_menor ? (
                <View style={[styles.extremoCell, styles.extremoDown]}>
                  <Text style={styles.extremoLabel}>Menor ingreso</Text>
                  <Text style={styles.extremoValue}>{fmt(data.pico_menor.total)}</Text>
                  <Text style={styles.extremoMeta}>
                    {formatClave(data.pico_menor.clave, granularidad)}
                  </Text>
                  <Text style={styles.extremoBreakdown}>
                    App {fmt(data.pico_menor.mecanimovil)} · Propias{' '}
                    {fmt(data.pico_menor.agenda_personal)}
                  </Text>
                </View>
              ) : null}
            </View>
          ) : null}
        </>
      ) : null}
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
    marginBottom: SPACING.fixed.sm,
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
  chipsRow: {
    flexDirection: 'row',
    gap: SPACING.fixed.xs,
    marginBottom: SPACING.fixed.sm,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: BORDERS.radius.pill,
    backgroundColor: I.surfaceStrong,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
  },
  chipActive: {
    backgroundColor: I.primary,
    borderColor: I.primary,
  },
  chipText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontFamily: FF.sansSemiBold,
    color: I.muted,
  },
  chipTextActive: {
    color: I.onPrimary,
  },
  loaderWrap: {
    minHeight: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansMedium,
    color: I.semanticDown,
    marginBottom: SPACING.fixed.sm,
  },
  heroAmount: {
    fontSize: TYPOGRAPHY.fontSize['2xl'],
    fontFamily: FF.monoMedium,
    color: I.ink,
    letterSpacing: -0.5,
  },
  heroSub: {
    marginTop: 2,
    marginBottom: SPACING.fixed.sm,
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontFamily: FF.regular,
    color: I.muted,
    lineHeight: 16,
  },
  legendRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.fixed.md,
    marginBottom: SPACING.fixed.xs,
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
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontFamily: FF.sansRegular,
    color: I.body,
  },
  chartWell: {
    borderRadius: 20,
    backgroundColor: I.canvas,
    overflow: 'visible',
    paddingTop: SPACING.fixed.lg,
    paddingBottom: SPACING.fixed.md,
    paddingHorizontal: SPACING.fixed.sm,
    width: '100%',
  },
  chartScrollWrap: {
    width: '100%',
    overflow: 'visible',
  },
  chartMeasurePlaceholder: {
    height: CHART_HEIGHT + 52,
    width: '100%',
  },
  emptyState: {
    minHeight: 192,
    justifyContent: 'center',
    paddingVertical: SPACING.fixed.lg,
    paddingHorizontal: SPACING.fixed.sm,
  },
  emptyTitle: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontFamily: FF.sansSemiBold,
    color: I.ink,
    textAlign: 'center',
    marginBottom: SPACING.fixed.xs,
  },
  emptyBody: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.regular,
    color: I.body,
    textAlign: 'center',
    lineHeight: 18,
  },
  yAxisText: {
    color: I.muted,
    fontSize: 11,
    fontFamily: FF.sansMedium,
  },
  xAxisText: {
    color: I.muted,
    fontSize: 12,
    fontFamily: FF.sansRegular,
  },
  pointerLabel: {
    backgroundColor: I.ink,
    borderRadius: BORDERS.radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 8,
    minWidth: 132,
  },
  pointerLabelTitle: {
    fontSize: 10,
    fontFamily: FF.sansSemiBold,
    color: I.onPrimary,
    marginBottom: 4,
    textTransform: 'capitalize',
    opacity: 0.85,
  },
  pointerValue: {
    fontSize: 11,
    fontFamily: FF.monoMedium,
  },
  pointerTotal: {
    marginTop: 4,
    fontSize: 11,
    fontFamily: FF.sansSemiBold,
    color: I.onPrimary,
  },
  extremosRow: {
    flexDirection: 'row',
    gap: SPACING.fixed.sm,
    marginTop: SPACING.fixed.sm,
    paddingTop: SPACING.fixed.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: I.hairline,
  },
  extremoCell: {
    flex: 1,
    borderRadius: BORDERS.radius.md,
    padding: SPACING.fixed.sm,
    minWidth: 0,
  },
  extremoUp: {
    backgroundColor: `${I.primary}12`,
  },
  extremoDown: {
    backgroundColor: `${LINE_COLOR_PERSONAL}18`,
  },
  extremoLabel: {
    fontSize: 10,
    fontFamily: FF.sansSemiBold,
    color: I.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  extremoValue: {
    marginTop: 2,
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.monoMedium,
    color: I.ink,
  },
  extremoMeta: {
    marginTop: 2,
    fontSize: 10,
    fontFamily: FF.regular,
    color: I.body,
    textTransform: 'capitalize',
  },
  extremoBreakdown: {
    marginTop: 4,
    fontSize: 10,
    fontFamily: FF.monoMedium,
    color: I.muted,
  },
});
