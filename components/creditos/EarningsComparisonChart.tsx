/**
 * EarningsComparisonChart
 * Gráfico de barras interactivo: ganancias mes actual vs mes anterior
 * Blank Glass Design System — mecanimovil-prov
 */
import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, Platform } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react-native';

const BLUE = '#2563EB';
const GREEN = '#22C55E';
const GRAY = '#9CA3AF';
const SCREEN_W = Dimensions.get('window').width;

interface EarningsComparisonChartProps {
  mesActual: number;
  mesAnterior: number;
  moneda?: string;
}

const fmt = (v: number) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(v);

const getNombreMes = (offset: number) => {
  const date = new Date();
  date.setDate(1);
  date.setMonth(date.getMonth() - offset);
  return date.toLocaleDateString('es-CL', { month: 'long' });
};

export const EarningsComparisonChart: React.FC<EarningsComparisonChartProps> = ({
  mesActual,
  mesAnterior,
  moneda = 'CLP',
}) => {
  const [selectedBar, setSelectedBar] = useState<'actual' | 'anterior' | null>(null);

  const { diff, pct, isUp, isNeutral } = useMemo(() => {
    const d = mesActual - mesAnterior;
    const p = mesAnterior > 0 ? Math.abs((d / mesAnterior) * 100) : mesActual > 0 ? 100 : 0;
    return { diff: d, pct: p, isUp: d > 0, isNeutral: d === 0 };
  }, [mesActual, mesAnterior]);

  const maxVal = Math.max(mesActual, mesAnterior, 1);
  const chartWidth = SCREEN_W - 80;
  const barWidth = Math.min(80, (chartWidth - 60) / 2);

  const barData = [
    {
      value: mesAnterior,
      label: getNombreMes(1),
      frontColor: 'rgba(99,102,241,0.7)',
      onPress: () => setSelectedBar(s => (s === 'anterior' ? null : 'anterior')),
    },
    {
      value: mesActual,
      label: getNombreMes(0),
      frontColor: mesActual >= mesAnterior ? 'rgba(34,197,94,0.8)' : 'rgba(239,68,68,0.7)',
      onPress: () => setSelectedBar(s => (s === 'actual' ? null : 'actual')),
    },
  ];

  const selectedValue = selectedBar === 'actual' ? mesActual : selectedBar === 'anterior' ? mesAnterior : null;
  const selectedLabel = selectedBar === 'actual' ? getNombreMes(0) : selectedBar === 'anterior' ? getNombreMes(1) : null;

  return (
    <View style={st.card}>
      {/* Header */}
      <View style={st.header}>
        <View>
          <Text style={st.title}>Comparativa de Ganancias</Text>
          <Text style={st.subtitle}>Mes actual vs mes anterior</Text>
        </View>
        <View style={[st.badge, isNeutral ? st.badgeNeutral : isUp ? st.badgeUp : st.badgeDown]}>
          {isNeutral
            ? <Minus size={12} color={GRAY} />
            : isUp
              ? <TrendingUp size={12} color="#16A34A" />
              : <TrendingDown size={12} color="#DC2626" />}
          <Text style={[st.badgeTxt, isNeutral ? { color: GRAY } : isUp ? { color: '#16A34A' } : { color: '#DC2626' }]}>
            {isNeutral ? 'Sin cambio' : `${pct.toFixed(1)}%`}
          </Text>
        </View>
      </View>

      {/* Tooltip selección */}
      {selectedBar !== null && selectedValue !== null && (
        <View style={st.tooltip}>
          <Text style={st.tooltipLabel}>{selectedLabel}</Text>
          <Text style={st.tooltipVal}>{fmt(selectedValue)}</Text>
        </View>
      )}

      {/* Chart */}
      <View style={st.chartWrap}>
        <BarChart
          data={barData}
          barWidth={barWidth}
          spacing={40}
          roundedTop
          roundedBottom={false}
          hideRules
          xAxisThickness={0}
          yAxisThickness={0}
          yAxisTextStyle={st.axisText}
          xAxisLabelTextStyle={st.axisText}
          noOfSections={4}
          maxValue={maxVal}
          isAnimated
          animationDuration={600}
          width={chartWidth}
          height={160}
          initialSpacing={20}
          barBorderRadius={10}
          disablePress={false}
        />
      </View>

      {/* Leyenda */}
      <View style={st.legend}>
        <View style={st.legendItem}>
          <View style={[st.dot, { backgroundColor: 'rgba(99,102,241,0.8)' }]} />
          <View>
            <Text style={st.legendLabel}>{getNombreMes(1)}</Text>
            <Text style={st.legendVal}>{fmt(mesAnterior)}</Text>
          </View>
        </View>
        <View style={st.legendDivider} />
        <View style={st.legendItem}>
          <View style={[st.dot, { backgroundColor: mesActual >= mesAnterior ? 'rgba(34,197,94,0.9)' : 'rgba(239,68,68,0.8)' }]} />
          <View>
            <Text style={st.legendLabel}>{getNombreMes(0)}</Text>
            <Text style={st.legendVal}>{fmt(mesActual)}</Text>
          </View>
        </View>
      </View>

      {/* Diferencia */}
      {!isNeutral && (
        <View style={[st.diffRow, isUp ? st.diffUp : st.diffDown]}>
          {isUp
            ? <TrendingUp size={13} color="#16A34A" />
            : <TrendingDown size={13} color="#DC2626" />}
          <Text style={[st.diffTxt, { color: isUp ? '#16A34A' : '#DC2626' }]}>
            {isUp ? '+' : ''}{fmt(diff)} respecto al mes anterior
          </Text>
        </View>
      )}
    </View>
  );
};

const st = StyleSheet.create({
  card: {
    borderRadius: 22,
    padding: 18,
    marginBottom: 16,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.9)',
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
      android: { elevation: 2 },
    }),
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  title: { fontSize: 16, fontWeight: '700', color: '#111827' },
  subtitle: { fontSize: 11, color: '#6B7280', marginTop: 2 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  badgeUp: { backgroundColor: 'rgba(220,252,231,0.6)', borderWidth: 1, borderColor: '#BBF7D0' },
  badgeDown: { backgroundColor: 'rgba(254,226,226,0.6)', borderWidth: 1, borderColor: '#FECACA' },
  badgeNeutral: { backgroundColor: 'rgba(243,244,246,0.6)', borderWidth: 1, borderColor: 'rgba(229,231,235,0.5)' },
  badgeTxt: { fontSize: 11, fontWeight: '700' },
  tooltip: {
    alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(229,231,235,0.5)',
    marginBottom: 10,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6 },
      android: { elevation: 3 },
    }),
  },
  tooltipLabel: { fontSize: 10, color: '#6B7280', textAlign: 'center', textTransform: 'capitalize' },
  tooltipVal: { fontSize: 16, fontWeight: '800', color: '#111827', textAlign: 'center' },
  chartWrap: {
    marginTop: 4,
    alignItems: 'center',
  },
  axisText: { color: '#9CA3AF', fontSize: 10 },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(229,231,235,0.4)',
  },
  legendItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  legendDivider: { width: 1, height: 32, backgroundColor: 'rgba(229,231,235,0.5)', marginHorizontal: 8 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  legendLabel: { fontSize: 11, color: '#6B7280', textTransform: 'capitalize' },
  legendVal: { fontSize: 13, fontWeight: '700', color: '#111827', marginTop: 1 },
  diffRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  diffUp: { backgroundColor: 'rgba(220,252,231,0.4)', borderWidth: 1, borderColor: '#BBF7D0' },
  diffDown: { backgroundColor: 'rgba(254,226,226,0.4)', borderWidth: 1, borderColor: '#FECACA' },
  diffTxt: { fontSize: 12, fontWeight: '600' },
});
