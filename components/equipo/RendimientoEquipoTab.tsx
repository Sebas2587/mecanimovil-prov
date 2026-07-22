import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  Pressable,
} from 'react-native';
import { ChevronRight } from 'lucide-react-native';
import { router } from 'expo-router';
import { COLORS, SPACING, TYPOGRAPHY, BORDERS } from '@/app/design-system/tokens';
import { institutionalTextStyle } from '@/app/design-system/styles/institutionalTypography';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import { navegarServiciosCompletados } from '@/utils/navegarServiciosCompletados';
import { useRendimientoEquipoDetalladoQuery } from '@/hooks/useRendimientoEquipoDetalladoQuery';
import { MecanicoPickerHorizontal } from '@/components/equipo/MecanicoPickerHorizontal';
import { ScoreCircle } from '@/components/equipo/ScoreCircle';
import { ComparativoMensual } from '@/components/equipo/ComparativoMensual';
import { FacturacionComparisonChart } from '@/components/equipo/FacturacionComparisonChart';
import { UsoGeminiRendimientoCard } from '@/components/equipo/UsoGeminiRendimientoCard';
import {
  HostMetricRow,
  HostPaperSection,
  HostProgressRow,
  HostSectionKicker,
} from '@/app/design-system/components';
import type { MecanicoKpis } from '@/services/equipoTallerService';

const I = COLORS.institutional;
const FF = TYPOGRAPHY.fontFamily;
const DIAS_OPCIONES = [7, 30, 90] as const;
const PAPER = COLORS.background.paper;
const TS = TYPOGRAPHY.styles;
const lh = (fontSize: number, mult: number) => Math.round(fontSize * mult);

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

function completadosTotales(m: MecanicoKpis): number {
  return m.servicios_completados_totales ?? m.servicios_completados ?? 0;
}

function completadosConChecklist(m: MecanicoKpis): number {
  return m.servicios_completados_con_checklist ?? 0;
}

function rechazados(m: MecanicoKpis): number {
  return m.servicios_rechazados ?? 0;
}

function demoradas(m: MecanicoKpis): number {
  return m.ordenes_demoradas ?? 0;
}

function dentroTiempoCount(m: MecanicoKpis): number {
  return m.ordenes_dentro_tiempo ?? 0;
}

export function RendimientoEquipoTab() {
  const [diasVentana, setDiasVentana] = useState<number>(30);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const { data: kpis, loading, error, refresh } = useRendimientoEquipoDetalladoQuery({
    dias: diasVentana,
  });
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    setSelectedId((prev) => {
      if (prev != null && kpis.some((m) => m.mecanico_id === prev)) return prev;
      const first = kpis[0]?.mecanico_id;
      return first === undefined ? null : first;
    });
  }, [kpis]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  }, [refresh]);

  const selected = useMemo(
    () => kpis.find((m) => m.mecanico_id === selectedId) ?? null,
    [kpis, selectedId],
  );

  const kpiRows = useMemo(() => {
    if (!selected) return [];
    const rows: { label: string; score: number | null | undefined }[] = [
      { label: 'Productividad', score: selected.score_productividad },
      { label: 'Tiempo ejecución', score: selected.score_tiempo_ejecucion },
      { label: 'Checklist', score: selected.score_checklist },
      { label: 'Inicio checklist', score: selected.score_puntualidad_inicio },
    ];
    if (selected.score_confiabilidad != null) {
      rows.push({ label: 'Confiabilidad', score: selected.score_confiabilidad });
    }
    if (selected.score_aceptacion != null) {
      rows.push({ label: 'Aceptación 24h', score: selected.score_aceptacion });
    }
    if (selected.score_calificacion_cliente != null) {
      rows.push({ label: 'Calificación cliente', score: selected.score_calificacion_cliente });
    }
    return rows;
  }, [selected]);

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
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={I.primary} />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.periodRow}>
          {DIAS_OPCIONES.map((d) => {
            const active = diasVentana === d;
            return (
              <TouchableOpacity
                key={d}
                style={[styles.periodChip, active && styles.periodChipActive]}
                onPress={() => setDiasVentana(d)}
              >
                <Text style={[styles.periodChipText, active && styles.periodChipTextActive]}>
                  {d}d
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <MecanicoPickerHorizontal
          mecanicos={kpis}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />

        {error ? (
          <Text style={styles.error}>{error || 'No se pudieron cargar las métricas.'}</Text>
        ) : null}

        {!selected ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>No hay datos de rendimiento disponibles</Text>
          </View>
        ) : (
          <View style={styles.detail}>
            <HostSectionKicker label="Asistente IA" />
            <UsoGeminiRendimientoCard
              uso={selected.uso_ia_gemini}
              titular={
                selected.mecanico_id == null
                  ? 'Uso del taller (sin mecánicos registrados)'
                  : selected.uso_ia_gemini?.usa_ia
                    ? `${selected.nombre} está usando el asistente IA`
                    : `${selected.nombre} no ha usado el asistente IA en este periodo`
              }
            />

            {selected.solo_uso_ia ? (
              <Text style={styles.legend}>
                Agrega mecánicos al equipo para ver scores de productividad y checklist.
              </Text>
            ) : (
              <>
                <HostSectionKicker label="Rendimiento" />
                <Text style={styles.legend}>
                  Flujo completo de {selected.nombre}: órdenes Mecanimovil + citas personales
                  cerradas (checklist, tiempos y productividad).
                </Text>
                <HostPaperSection>
                  <View style={styles.scoreHero}>
                    <ScoreCircle score={selected.score_rendimiento_global} label="Score" />
                    <View style={styles.scoreCopy}>
                      <Text style={styles.scoreName} numberOfLines={2}>
                        {selected.nombre}
                      </Text>
                      <Text style={styles.scoreHint}>Periodo {diasVentana} días</Text>
                    </View>
                  </View>
                  <HostMetricRow
                    label="Completadas"
                    value={String(completadosTotales(selected))}
                  />
                  <HostMetricRow label="Rechazadas" value={String(rechazados(selected))} />
                  <HostMetricRow
                    label="A tiempo"
                    value={fmtPct(selected.pct_dentro_tiempo)}
                    last
                  />
                </HostPaperSection>

                <HostSectionKicker label="Órdenes completadas" />
                <FacturacionComparisonChart
                  mecanicoId={selected.mecanico_id}
                  dias={diasVentana}
                  metrica="ordenes"
                />

                <HostSectionKicker label="Actividad" />
                <HostPaperSection>
                  <HostMetricRow
                    label="Con checklist"
                    value={String(completadosConChecklist(selected))}
                  />
                  <HostMetricRow
                    label="Sin checklist"
                    value={String(
                      Math.max(0, completadosTotales(selected) - completadosConChecklist(selected)),
                    )}
                  />
                  <HostMetricRow label="Demoradas" value={String(demoradas(selected))} />
                  <HostMetricRow
                    label="Dentro de tiempo"
                    value={String(dentroTiempoCount(selected))}
                  />
                  <HostMetricRow
                    label="Mecanimovil"
                    value={String(selected.ordenes_mecanimovil)}
                  />
                  <HostMetricRow
                    label="Agenda personal"
                    value={String(selected.ordenes_personales)}
                    last
                  />
                </HostPaperSection>

                <HostSectionKicker label="KPIs" />
                <HostPaperSection>
                  {kpiRows.map((row, idx) => (
                    <HostProgressRow
                      key={row.label}
                      label={row.label}
                      score={row.score}
                      last={idx === kpiRows.length - 1}
                    />
                  ))}
                </HostPaperSection>

                <HostSectionKicker label="Vs periodo anterior (proporcional)" />
                <Text style={styles.legend}>
                  Compara los primeros días del mes en curso con los mismos días del mes
                  anterior (variación relativa, no % de cumplimiento).
                </Text>
                <HostPaperSection>
                  <ComparativoMensual comparativo={selected.comparativo} />
                </HostPaperSection>

                <Text style={styles.footerText}>
                  Tiempo prom. {fmtMin(selected.tiempo_promedio_minutos)} · Fact. periodo{' '}
                  {new Intl.NumberFormat('es-CL', {
                    style: 'currency',
                    currency: 'CLP',
                    maximumFractionDigits: 0,
                  }).format(selected.facturacion_periodo)}
                </Text>

                <Pressable
                  onPress={() => navegarServiciosCompletados(router, { canal: 'todos' })}
                  style={({ pressed }) => [styles.verServiciosLink, pressed && styles.verServiciosPressed]}
                  accessibilityRole="button"
                  accessibilityLabel="Ver servicios completados"
                >
                  <Text style={styles.verServiciosText}>Ver servicios completados</Text>
                  <ChevronRight size={16} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
                </Pressable>
              </>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background.default },
  flex: { flex: 1 },
  scroll: {
    paddingBottom: SPACING.fixed.xl,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    backgroundColor: COLORS.background.default,
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
    borderRadius: BORDERS.radius.sm,
    backgroundColor: PAPER,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
  },
  periodChipActive: {
    backgroundColor: COLORS.selection.background,
    borderColor: I.primary,
  },
  periodChipText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansSemiBold,
    color: I.muted,
  },
  periodChipTextActive: {
    color: COLORS.selection.text,
  },
  detail: {
    paddingHorizontal: SPACING.container.horizontal,
    paddingBottom: SPACING.fixed.md,
  },
  legend: {
    ...institutionalTextStyle('caption', I.muted),
    marginBottom: SPACING.fixed.sm,
  },
  scoreHero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.lg,
    paddingTop: SPACING.fixed.sm,
    paddingBottom: SPACING.fixed.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: I.hairline,
    marginBottom: 2,
  },
  scoreCopy: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  scoreName: {
    ...institutionalTextStyle('h4', I.ink),
  },
  scoreHint: {
    ...institutionalTextStyle('caption', I.muted),
  },
  footerText: {
    ...institutionalTextStyle('small', I.muted),
    textAlign: 'center',
    marginTop: SPACING.fixed.lg,
    marginBottom: SPACING.fixed.xs,
  },
  verServiciosLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: SPACING.fixed.sm,
    marginBottom: SPACING.fixed.md,
  },
  verServiciosPressed: {
    opacity: 0.92,
  },
  verServiciosText: {
    ...institutionalTextStyle('captionBold', I.primary),
    fontFamily: FF.sansSemiBold,
  },
  emptyWrap: {
    padding: SPACING.fixed.xl,
    alignItems: 'center',
  },
  emptyText: {
    ...institutionalTextStyle('body', I.muted),
    fontFamily: FF.sansMedium,
  },
  error: {
    textAlign: 'center',
    color: I.semanticDown,
    fontFamily: FF.sansMedium,
    fontSize: TYPOGRAPHY.fontSize.sm,
    lineHeight: lh(TYPOGRAPHY.fontSize.sm, TS.body.lineHeight),
    paddingHorizontal: SPACING.container.horizontal,
    marginTop: SPACING.fixed.sm,
  },
});
