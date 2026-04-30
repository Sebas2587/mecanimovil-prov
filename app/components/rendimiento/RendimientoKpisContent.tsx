import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/app/design-system/theme/useTheme';
import { COLORS, SPACING, TYPOGRAPHY, BORDERS, SHADOWS } from '@/app/design-system/tokens';
import {
  useProveedorKpisResumen,
  targetTierNameForScore,
} from '@/hooks/useProveedorKpisResumen';

const DIAS_OPCIONES = [7, 30, 90] as const;

function formatMinutos(v: number | null | undefined): string {
  if (v == null || Number.isNaN(v)) return '—';
  if (v < 60) return `${Math.round(v)} min`;
  const h = Math.floor(v / 60);
  const m = Math.round(v % 60);
  return m > 0 ? `${h} h ${m} min` : `${h} h`;
}

function formatScore(v: number | null | undefined): string {
  if (v == null) return '—';
  return `${v}`;
}

function formatRatio(v: number | null | undefined): string {
  if (v == null) return '—';
  return `${v.toFixed(2)}×`;
}

type MetricRowProps = {
  label: string;
  value: string;
  hint?: string;
  labelColor: string;
  valueColor: string;
  hintColor: string;
};

const MetricRow = React.memo(
  ({ label, value, hint, labelColor, valueColor, hintColor }: MetricRowProps) => (
    <View style={styles.metricRow}>
      <View style={styles.metricRowLeft}>
        <Text style={[styles.metricLabel, { color: labelColor }]}>{label}</Text>
        {hint ? <Text style={[styles.metricHint, { color: hintColor }]}>{hint}</Text> : null}
      </View>
      <Text style={[styles.metricValue, { color: valueColor }]}>{value}</Text>
    </View>
  )
);

type ScoreRowProps = {
  title: string;
  score: number | null;
  description: string;
  titleColor: string;
  descColor: string;
  badgeBg: string;
  badgeText: string;
  barFill: string;
  trackBg: string;
};

const ScoreRow = React.memo(
  ({ title, score, description, titleColor, descColor, badgeBg, badgeText, barFill, trackBg }: ScoreRowProps) => (
    <View style={styles.scoreBlock}>
      <View style={styles.scoreHeader}>
        <Text style={[styles.scoreTitle, { color: titleColor }]}>{title}</Text>
        <View style={[styles.scoreBadge, { backgroundColor: badgeBg }]}>
          <Text style={[styles.scoreBadgeText, { color: badgeText }]}>{formatScore(score)}</Text>
        </View>
      </View>
      <Text style={[styles.scoreDesc, { color: descColor }]}>{description}</Text>
      {score != null ? (
        <View style={[styles.scoreBarTrack, { backgroundColor: trackBg }]}>
          <View style={[styles.scoreBarFill, { width: `${score}%`, backgroundColor: barFill }]} />
        </View>
      ) : null}
    </View>
  )
);

export function RendimientoKpisContent() {
  const theme = useTheme();
  const { isAuthenticated, isLoading, estadoProveedor } = useAuth();
  const cuentaAprobadaPorAdmin = estadoProveedor?.estado_verificacion === 'aprobado';
  const [diasVentana, setDiasVentana] = useState<number>(30);

  const enabled = Boolean(isAuthenticated && cuentaAprobadaPorAdmin && !isLoading);
  const { data, loading, error, refresh, progress } = useProveedorKpisResumen({
    enabled,
    dias: diasVentana,
  });

  const colors = theme?.colors || COLORS;
  const bg = colors?.background?.default ?? COLORS.neutral?.gray?.[50] ?? '#F8FAFC';
  const paper = colors?.background?.paper ?? COLORS.base?.white ?? '#fff';
  const textPrimary = colors?.text?.primary ?? COLORS.base?.inkBlack ?? '#00171F';
  const textSecondary = colors?.text?.secondary ?? COLORS.neutral?.gray?.[600] ?? '#4B5563';
  const primary = (colors?.primary as { 500?: string })?.['500'] ?? COLORS.primary?.[500] ?? '#003459';
  const primarySoft = COLORS.primary?.[50] ?? '#E6F2F7';
  const primaryBold = COLORS.primary?.[600] ?? '#002A47';
  const border = colors?.border?.light ?? COLORS.neutral?.gray?.[200] ?? '#E5E7EB';
  const trackBar = COLORS.neutral?.gray?.[200] ?? '#E5E7EB';

  const tierName = useMemo(() => targetTierNameForScore(progress), [progress]);

  const onRefresh = useCallback(() => {
    refresh();
  }, [refresh]);

  if (!cuentaAprobadaPorAdmin && !isLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: bg }]}>
        <Text style={[styles.emptyTitle, { color: textPrimary }]}>Rendimiento no disponible</Text>
        <Text style={[styles.emptySub, { color: textSecondary }]}>
          Tu cuenta debe estar aprobada para ver KPIs.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor: bg }]}
      contentContainerStyle={styles.scrollContent}
      refreshControl={<RefreshControl refreshing={loading && !!data} onRefresh={onRefresh} />}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.periodRow, { borderColor: border }]}>
        <Text style={[styles.periodLabel, { color: textSecondary }]}>Periodo</Text>
        <View style={styles.chips}>
          {DIAS_OPCIONES.map((d) => {
            const active = diasVentana === d;
            return (
              <TouchableOpacity
                key={d}
                onPress={() => setDiasVentana(d)}
                style={[
                  styles.chip,
                  {
                    borderColor: active ? primary : border,
                    backgroundColor: active ? (COLORS.primary?.[50] ?? '#E6F2F7') : paper,
                  },
                ]}
                activeOpacity={0.75}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`${d} dias`}
              >
                <Text
                  style={[
                    styles.chipText,
                    { color: active ? primary : textSecondary, fontWeight: active ? '700' : '500' },
                  ]}
                >
                  {d} días
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {loading && !data ? (
        <View style={styles.loaderWrap}>
          <ActivityIndicator size="large" color={primary} />
        </View>
      ) : null}

      {error && !data ? (
        <View style={[styles.card, { backgroundColor: paper, borderColor: border }]}>
          <Text style={[styles.errorText, { color: textPrimary }]}>{error}</Text>
          <TouchableOpacity onPress={onRefresh} style={[styles.retryBtn, { borderColor: primary }]}>
            <Text style={[styles.retryText, { color: primary }]}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {data ? (
        <>
          <View
            style={[
              styles.heroCard,
              { backgroundColor: paper, borderColor: border },
              SHADOWS?.sm,
            ]}
          >
            <Text style={[styles.heroLabel, { color: textSecondary }]}>Índice de rendimiento</Text>
            <Text style={[styles.heroPct, { color: primary }]}>{data.score_rendimiento}%</Text>
            <Text style={[styles.heroTier, { color: textPrimary }]}>Nivel: {tierName}</Text>
            <Text style={[styles.heroFoot, { color: textSecondary }]}>
              Basado en ofertas, checklist, tiempos y reseñas (últimos {data.ventana_dias} días).
            </Text>
          </View>

          <Text style={[styles.sectionTitle, { color: textPrimary }]}>Desglose</Text>
          <View style={[styles.card, { backgroundColor: paper, borderColor: border }]}>
            <ScoreRow
              title="Tiempo de respuesta"
              score={data.score_tiempo_respuesta}
              description="Desde la publicación de la solicitud hasta enviar tu oferta. Prioriza solicitudes dirigidas a ti."
              titleColor={textPrimary}
              descColor={textSecondary}
              badgeBg={primarySoft}
              badgeText={primary}
              barFill={primary}
              trackBg={trackBar}
            />
            <View style={[styles.divider, { backgroundColor: border }]} />
            <ScoreRow
              title="Satisfacción del cliente"
              score={data.score_calificacion_cliente}
              description="Promedio de calificaciones en servicios completados vía marketplace."
              titleColor={textPrimary}
              descColor={textSecondary}
              badgeBg={primarySoft}
              badgeText={primary}
              barFill={primary}
              trackBg={trackBar}
            />
            <View style={[styles.divider, { backgroundColor: border }]} />
            <ScoreRow
              title="Checklist"
              score={data.score_checklist}
              description="Porcentaje de checklists completados entre órdenes que tenían checklist."
              titleColor={textPrimary}
              descColor={textSecondary}
              badgeBg={primarySoft}
              badgeText={primary}
              barFill={primary}
              trackBg={trackBar}
            />
            <View style={[styles.divider, { backgroundColor: border }]} />
            <ScoreRow
              title="Tiempo vs estimado"
              score={data.score_tiempo_ejecucion}
              description="Compara duración real del checklist con el tiempo estimado en la oferta (1× = acorde)."
              titleColor={textPrimary}
              descColor={textSecondary}
              badgeBg={primarySoft}
              badgeText={primary}
              barFill={primary}
              trackBg={trackBar}
            />
          </View>

          <Text style={[styles.sectionTitle, { color: textPrimary }]}>Datos</Text>
          <View style={[styles.card, { backgroundColor: paper, borderColor: border }]}>
            <MetricRow
              label="Respuesta media (dirigidas)"
              value={formatMinutos(data.tiempo_respuesta_dirigida_media_minutos)}
              hint={`${data.ofertas_dirigidas_muestra} ofertas en periodo`}
              labelColor={textPrimary}
              valueColor={primaryBold}
              hintColor={textSecondary}
            />
            <MetricRow
              label="Respuesta media (globales)"
              value={formatMinutos(data.tiempo_respuesta_global_media_minutos)}
              hint={`${data.ofertas_globales_muestra} ofertas en periodo`}
              labelColor={textPrimary}
              valueColor={primaryBold}
              hintColor={textSecondary}
            />
            <MetricRow
              label="Órdenes marketplace completadas"
              value={`${data.ordenes_mercado_completadas}`}
              labelColor={textPrimary}
              valueColor={primaryBold}
              hintColor={textSecondary}
            />
            <MetricRow
              label="Cumplimiento checklist"
              value={data.checklist_cumplimiento_pct != null ? `${data.checklist_cumplimiento_pct}%` : '—'}
              hint={`${data.checklist_completados} / ${data.ordenes_con_checklist} con checklist`}
              labelColor={textPrimary}
              valueColor={primaryBold}
              hintColor={textSecondary}
            />
            <MetricRow
              label="Tiempo medio checklist"
              value={formatMinutos(data.checklist_tiempo_promedio_minutos ?? null)}
              labelColor={textPrimary}
              valueColor={primaryBold}
              hintColor={textSecondary}
            />
            <MetricRow
              label="Ejecución vs estimado"
              value={formatRatio(data.tiempo_ejecucion_vs_estimado_promedio)}
              hint={`${data.tiempo_ejecucion_vs_estimado_muestra} órdenes con datos`}
              labelColor={textPrimary}
              valueColor={primaryBold}
              hintColor={textSecondary}
            />
            <MetricRow
              label="Calificación clientes"
              value={data.calificacion_cliente_promedio != null ? `${data.calificacion_cliente_promedio} / 5` : '—'}
              hint={`${data.resenas_muestra} reseñas`}
              labelColor={textPrimary}
              valueColor={primaryBold}
              hintColor={textSecondary}
            />
          </View>

          <Text style={[styles.disclaimer, { color: textSecondary }]}>
            Las métricas se calculan en el servidor. Si acabas de completar servicios, desliza hacia abajo para
            actualizar.
          </Text>
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING['2xl'],
    paddingTop: SPACING.sm,
  },
  periodRow: {
    marginBottom: SPACING.md,
    paddingBottom: SPACING.sm,
    borderBottomWidth: BORDERS.width?.thin ?? 1,
  },
  periodLabel: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    marginBottom: SPACING.xs,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  chip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDERS.radius?.lg ?? 12,
    borderWidth: BORDERS.width?.thin ?? 1,
  },
  chipText: { fontSize: TYPOGRAPHY.fontSize.sm },
  loaderWrap: { paddingVertical: SPACING.xl, alignItems: 'center' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING.lg },
  emptyTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  emptySub: { fontSize: TYPOGRAPHY.fontSize.sm, textAlign: 'center' },
  heroCard: {
    borderRadius: BORDERS.radius?.['2xl'] ?? 20,
    borderWidth: BORDERS.width?.thin ?? 1,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
  },
  heroLabel: { fontSize: TYPOGRAPHY.fontSize.sm, marginBottom: SPACING.xs },
  heroPct: {
    fontSize: TYPOGRAPHY.fontSize['4xl'] ?? 40,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    letterSpacing: TYPOGRAPHY.letterSpacing?.tight,
  },
  heroTier: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    marginTop: SPACING.xs,
  },
  heroFoot: { fontSize: TYPOGRAPHY.fontSize.xs, marginTop: SPACING.sm, lineHeight: 18 },
  sectionTitle: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    marginBottom: SPACING.sm,
    marginTop: SPACING.xs,
  },
  card: {
    borderRadius: BORDERS.radius?.xl ?? 16,
    borderWidth: BORDERS.width?.thin ?? 1,
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  scoreBlock: { paddingVertical: SPACING.sm },
  scoreHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  scoreTitle: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    flex: 1,
    paddingRight: SPACING.sm,
  },
  scoreBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDERS.radius?.badge?.md ?? 8,
  },
  scoreBadgeText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
  },
  scoreDesc: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    lineHeight: 18,
    marginBottom: SPACING.sm,
  },
  scoreBarTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  scoreBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  divider: { height: 1, marginVertical: SPACING.xs },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: SPACING.sm,
    gap: SPACING.md,
  },
  metricRowLeft: { flex: 1 },
  metricLabel: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
  metricHint: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    marginTop: 2,
  },
  metricValue: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
  errorText: { fontSize: TYPOGRAPHY.fontSize.sm, marginBottom: SPACING.md },
  retryBtn: {
    alignSelf: 'flex-start',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDERS.radius?.lg ?? 12,
    borderWidth: BORDERS.width?.thin ?? 1,
  },
  retryText: { fontSize: TYPOGRAPHY.fontSize.sm, fontWeight: TYPOGRAPHY.fontWeight.semibold },
  disclaimer: { fontSize: TYPOGRAPHY.fontSize.xs, lineHeight: 18, marginTop: SPACING.sm },
});
