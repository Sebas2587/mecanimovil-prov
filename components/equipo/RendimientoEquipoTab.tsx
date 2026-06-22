import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { COLORS, SPACING, TYPOGRAPHY, BORDERS } from '@/app/design-system/tokens';
import equipoTallerService, { type MecanicoKpis } from '@/services/equipoTallerService';
import { MecanicoPickerHorizontal } from '@/components/equipo/MecanicoPickerHorizontal';
import { ScoreCircle } from '@/components/equipo/ScoreCircle';
import { KpiProgressRow } from '@/components/equipo/KpiProgressRow';
import { ComparativoMensual } from '@/components/equipo/ComparativoMensual';
import { FacturacionComparisonChart } from '@/components/equipo/FacturacionComparisonChart';

const I = COLORS.institutional;
const FF = TYPOGRAPHY.fontFamily;
const DIAS_OPCIONES = [7, 30, 90] as const;

function rangoFechas(dias: number): { desde: string; hasta: string } {
  const hasta = new Date();
  const desde = new Date();
  desde.setDate(desde.getDate() - dias);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  return { desde: fmt(desde), hasta: fmt(hasta) };
}

function fmtPct(v: number | null | undefined): string {
  if (v == null) return '—';
  return `${Math.round(v)}%`;
}

function fmtMin(v: number | null | undefined): string {
  if (v == null) return '—';
  if (v < 60) return `${Math.round(v)} min`;
  const h = Math.floor(v / 60);
  const m = Math.round(v % 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

type MetricTileProps = { label: string; value: string };

function MetricTile({ label, value }: MetricTileProps) {
  return (
    <View style={styles.metricTile}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel} numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
}

export function RendimientoEquipoTab() {
  const [diasVentana, setDiasVentana] = useState<number>(30);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [kpis, setKpis] = useState<MecanicoKpis[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    try {
      setError(null);
      const { desde, hasta } = rangoFechas(diasVentana);
      const data = await equipoTallerService.rendimientoDetallado({ desde, hasta, dias: diasVentana });
      setKpis(data);
      setSelectedId((prev) => {
        if (prev != null && data.some((m) => m.mecanico_id === prev)) return prev;
        return data[0]?.mecanico_id ?? null;
      });
    } catch {
      setError('No se pudieron cargar las métricas.');
      setKpis([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [diasVentana]);

  useEffect(() => {
    setLoading(true);
    cargar();
  }, [cargar]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    cargar();
  }, [cargar]);

  const selected = useMemo(
    () => kpis.find((m) => m.mecanico_id === selectedId) ?? null,
    [kpis, selectedId],
  );

  if (loading && kpis.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={I.primary} />
      </View>
    );
  }

  return (
    <View style={styles.root}>
    <ScrollView
      style={styles.flex}
      contentContainerStyle={styles.scroll}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={I.primary} />}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.periodRow}>
        {DIAS_OPCIONES.map((d) => (
          <TouchableOpacity
            key={d}
            style={[styles.periodChip, diasVentana === d && styles.periodChipActive]}
            onPress={() => setDiasVentana(d)}
          >
            <Text style={[styles.periodChipText, diasVentana === d && styles.periodChipTextActive]}>
              {d}d
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <MecanicoPickerHorizontal
        mecanicos={kpis}
        selectedId={selectedId}
        onSelect={setSelectedId}
      />

      {error ? (
        <Text style={styles.error}>{error}</Text>
      ) : null}

      {!selected ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>Agrega mecánicos para ver métricas</Text>
        </View>
      ) : (
        <View style={styles.detail}>
          <View style={styles.scoreRow}>
            <ScoreCircle score={selected.score_rendimiento_global} label="Rendimiento" />
            <View style={styles.scoreSide}>
              <MetricTile label="Completados" value={String(selected.servicios_completados)} />
              <MetricTile label="Dentro de tiempo" value={fmtPct(selected.pct_dentro_tiempo)} />
            </View>
          </View>

          <FacturacionComparisonChart
            mesActual={selected.facturacion_mes_actual}
            mesAnterior={selected.facturacion_mes_anterior}
          />

          <View style={styles.channelRow}>
            <MetricTile label="Mecanimovil" value={String(selected.ordenes_mecanimovil)} />
            <View style={styles.channelSep} />
            <MetricTile label="Agenda personal" value={String(selected.ordenes_personales)} />
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionLabel}>KPIs</Text>
            <KpiProgressRow label="Productividad" score={selected.score_productividad} />
            <KpiProgressRow label="Tiempo ejecución" score={selected.score_tiempo_ejecucion} />
            <KpiProgressRow label="Checklist" score={selected.score_checklist} />
            <KpiProgressRow label="Inicio checklist" score={selected.score_puntualidad_inicio} />
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionLabel}>vs mes anterior</Text>
            <ComparativoMensual comparativo={selected.comparativo} />
          </View>

          <View style={styles.footerMeta}>
            <Text style={styles.footerText}>
              Tiempo prom. {fmtMin(selected.tiempo_promedio_minutos)} · Fact. periodo{' '}
              {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(
                selected.facturacion_periodo,
              )}
            </Text>
          </View>
        </View>
      )}
    </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  scroll: {
    paddingBottom: SPACING.fixed.xl,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  periodRow: {
    flexDirection: 'row',
    gap: SPACING.fixed.xs,
    paddingHorizontal: SPACING.container.horizontal,
    paddingTop: SPACING.fixed.sm,
    paddingBottom: SPACING.fixed.xs,
  },
  periodChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: BORDERS.radius.pill,
    backgroundColor: I.surfaceStrong,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
  },
  periodChipActive: {
    backgroundColor: I.primary,
    borderColor: I.primary,
  },
  periodChipText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansSemiBold,
    color: I.muted,
  },
  periodChipTextActive: {
    color: I.onPrimary,
  },
  detail: {
    paddingHorizontal: SPACING.container.horizontal,
    gap: SPACING.fixed.md,
    marginTop: SPACING.fixed.sm,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.lg,
    backgroundColor: I.canvas,
    borderRadius: BORDERS.radius.lg,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    padding: SPACING.fixed.md,
  },
  scoreSide: {
    flex: 1,
    flexDirection: 'row',
    gap: SPACING.fixed.sm,
  },
  metricTile: {
    flex: 1,
    alignItems: 'center',
  },
  metricValue: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontFamily: FF.monoMedium,
    color: I.ink,
  },
  metricLabel: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontFamily: FF.sansMedium,
    color: I.muted,
    textAlign: 'center',
    marginTop: 2,
  },
  channelRow: {
    flexDirection: 'row',
    backgroundColor: I.canvas,
    borderRadius: BORDERS.radius.lg,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    paddingVertical: SPACING.fixed.md,
    paddingHorizontal: SPACING.fixed.sm,
  },
  channelSep: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: I.hairline,
    marginVertical: 4,
  },
  card: {
    backgroundColor: I.canvas,
    borderRadius: BORDERS.radius.lg,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    padding: SPACING.fixed.md,
  },
  sectionLabel: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontFamily: FF.sansSemiBold,
    color: I.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: SPACING.fixed.xs,
  },
  footerMeta: {
    paddingVertical: SPACING.fixed.sm,
  },
  footerText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontFamily: FF.sansMedium,
    color: I.muted,
    textAlign: 'center',
  },
  emptyWrap: {
    padding: SPACING.fixed.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansMedium,
    color: I.muted,
  },
  error: {
    textAlign: 'center',
    color: I.semanticDown,
    fontFamily: FF.sansMedium,
    fontSize: TYPOGRAPHY.fontSize.sm,
    paddingHorizontal: SPACING.container.horizontal,
    marginTop: SPACING.fixed.sm,
  },
});
