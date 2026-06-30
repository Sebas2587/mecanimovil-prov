import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  useWindowDimensions,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { TrendingUp } from 'lucide-react-native';
import { COLORS, SPACING, TYPOGRAPHY, BORDERS } from '@/app/design-system/tokens';
import {
  useGananciasSerieQuery,
} from '@/hooks/useGananciasSerieQuery';
import type { GananciasSerieGranularidad, GananciasSeriePunto } from '@/services/kpisProveedorService';

const I = COLORS.institutional;
const FF = TYPOGRAPHY.fontFamily;

const GRANULARIDADES: { id: GananciasSerieGranularidad; label: string }[] = [
  { id: 'dia', label: 'Día' },
  { id: 'semana', label: 'Semana' },
  { id: 'mes', label: 'Mes' },
];

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

function buildLineData(
  puntos: GananciasSeriePunto[],
  key: 'mecanimovil' | 'agenda_personal',
  picoMayor: GananciasSeriePunto | null,
  picoMenor: GananciasSeriePunto | null,
) {
  return puntos.map((p) => {
    const isPeak = picoMayor?.clave === p.clave;
    const isValley = picoMenor?.clave === p.clave && picoMenor.total !== picoMayor?.total;
    const showPoint = isPeak || isValley;
    return {
      value: p[key],
      label: p.etiqueta,
      dataPointColor: isPeak ? I.primary : isValley ? I.muted : undefined,
      dataPointRadius: showPoint ? 5 : 0,
      hideDataPoint: !showPoint,
    };
  });
}

export function FacturacionComparisonChart({ mecanicoId = null, enabled = true }: Props) {
  const [granularidad, setGranularidad] = useState<GananciasSerieGranularidad>('dia');
  const { width: windowWidth } = useWindowDimensions();
  const { data, loading, error } = useGananciasSerieQuery(granularidad, {
    mecanicoId,
    enabled,
  });

  const chartMetrics = useMemo(() => {
    const puntos = data?.puntos ?? [];
    const allValues = puntos.flatMap((p) => [p.mecanimovil, p.agenda_personal]);
    const maxVal = Math.max(...allValues, 0);
    const pad = Math.max(1, Math.ceil(maxVal * 0.15));
    const count = Math.max(puntos.length, 1);

    const scrollPad = 40;
    const cardPad = SPACING.fixed.md * 2;
    const wellPad = SPACING.fixed.sm * 2;
    const yAxis = 44;
    const chartInnerWidth = Math.max(
      200,
      windowWidth - scrollPad - cardPad - wellPad - yAxis - 8,
    );
    const initial = count <= 12 ? 12 : 8;
    const spacing =
      count <= 1 ? 0 : Math.max(4, (chartInnerWidth - initial) / (count - 1));

    return {
      puntos,
      maxValue: Math.max(maxVal + pad, 1),
      chartInnerWidth,
      spacing,
      initial,
      empty: allValues.every((v) => v === 0),
    };
  }, [data, windowWidth]);

  const onSelectGranularidad = useCallback((g: GananciasSerieGranularidad) => {
    setGranularidad(g);
  }, []);

  const lineMecanimovil = useMemo(
    () =>
      buildLineData(
        chartMetrics.puntos,
        'mecanimovil',
        data?.pico_mayor ?? null,
        data?.pico_menor ?? null,
      ),
    [chartMetrics.puntos, data?.pico_mayor, data?.pico_menor],
  );

  const linePersonal = useMemo(
    () =>
      buildLineData(
        chartMetrics.puntos,
        'agenda_personal',
        data?.pico_mayor ?? null,
        data?.pico_menor ?? null,
      ),
    [chartMetrics.puntos, data?.pico_mayor, data?.pico_menor],
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
              <View style={[styles.legendDot, { backgroundColor: I.primary }]} />
              <Text style={styles.legendText}>Mecanimóvil App</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: I.mutedSoft }]} />
              <Text style={styles.legendText}>Agenda personal</Text>
            </View>
          </View>

          <View style={styles.chartWell}>
            {chartMetrics.empty ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>Sin ingresos en este periodo</Text>
                <Text style={styles.emptyBody}>
                  Cuando completes órdenes de la app o cierres citas personales, verás la
                  comparativa aquí.
                </Text>
              </View>
            ) : (
              <LineChart
                data={lineMecanimovil}
                data2={linePersonal}
                height={192}
                width={chartMetrics.chartInnerWidth}
                initialSpacing={chartMetrics.initial}
                spacing={chartMetrics.spacing}
                color1={I.primary}
                color2={I.mutedSoft}
                thickness={2}
                thickness2={2}
                curved
                hideDataPoints={false}
                noOfSections={4}
                maxValue={chartMetrics.maxValue}
                yAxisColor="transparent"
                yAxisThickness={0}
                xAxisColor={I.hairline}
                xAxisThickness={StyleSheet.hairlineWidth}
                rulesColor={I.hairlineSoft}
                rulesType="solid"
                yAxisTextStyle={styles.axisText}
                xAxisLabelTextStyle={styles.axisText}
                yAxisLabelWidth={44}
                formatYLabel={(v) => {
                  const n = Math.max(0, Math.round(Number(v)));
                  if (n >= 1_000_000) return `${Math.round(n / 1_000_000)}M`;
                  if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
                  return String(n);
                }}
                focusEnabled
                showStripOnFocus
                showTextOnFocus
                stripColor={I.hairline}
                stripWidth={1}
                pointerConfig={{
                  pointerStripHeight: 192,
                  pointerStripColor: I.hairline,
                  pointerStripWidth: 1,
                  pointerColor: I.primary,
                  radius: 5,
                  pointerLabelWidth: 132,
                  activatePointersOnLongPress: false,
                  autoAdjustPointerLabelPosition: true,
                  pointerLabelComponent: (items: { value?: number }[]) => {
                    const mkt = items[0]?.value ?? 0;
                    const personal = items[1]?.value ?? 0;
                    return (
                      <View style={styles.pointerLabel}>
                        <Text style={styles.pointerLabelTitle}>Ingresos</Text>
                        <Text style={[styles.pointerValue, { color: I.primary }]}>
                          App {fmt(mkt)}
                        </Text>
                        <Text style={[styles.pointerValue, { color: I.muted }]}>
                          Propias {fmt(personal)}
                        </Text>
                        <Text style={styles.pointerTotal}>Total {fmt(mkt + personal)}</Text>
                      </View>
                    );
                  },
                }}
              />
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
                </View>
              ) : null}
              {data.pico_menor ? (
                <View style={[styles.extremoCell, styles.extremoDown]}>
                  <Text style={styles.extremoLabel}>Menor ingreso</Text>
                  <Text style={styles.extremoValue}>{fmt(data.pico_menor.total)}</Text>
                  <Text style={styles.extremoMeta}>
                    {formatClave(data.pico_menor.clave, granularidad)}
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
    borderRadius: BORDERS.radius.md,
    backgroundColor: I.surfaceSoft,
    overflow: 'hidden',
    paddingVertical: SPACING.fixed.sm,
    paddingHorizontal: SPACING.fixed.xs,
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
  axisText: {
    color: I.muted,
    fontSize: 9,
    fontFamily: FF.sansRegular,
  },
  pointerLabel: {
    backgroundColor: I.canvas,
    borderRadius: BORDERS.radius.md,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    paddingHorizontal: 10,
    paddingVertical: 8,
    minWidth: 120,
  },
  pointerLabelTitle: {
    fontSize: 10,
    fontFamily: FF.sansSemiBold,
    color: I.muted,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  pointerValue: {
    fontSize: 11,
    fontFamily: FF.monoMedium,
  },
  pointerTotal: {
    marginTop: 4,
    fontSize: 11,
    fontFamily: FF.sansSemiBold,
    color: I.ink,
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
    backgroundColor: `${I.mutedSoft}33`,
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
});
