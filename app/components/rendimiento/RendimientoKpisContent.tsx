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

const padH = SPACING.container?.horizontal ?? SPACING.content?.horizontal ?? 20;
const cardPad = SPACING.cardPadding ?? SPACING.md;

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

function formatEstrellas(v: number | null | undefined): string {
  if (v == null || Number.isNaN(v)) return '—';
  return `${v.toFixed(1)} / 5`;
}

type DataRowProps = {
  label: string;
  value: string;
  hint?: string;
  isLast?: boolean;
  labelColor: string;
  valueColor: string;
  hintColor: string;
  borderColor: string;
};

function DataRow({
  label,
  value,
  hint,
  isLast,
  labelColor,
  valueColor,
  hintColor,
  borderColor,
}: DataRowProps) {
  return (
    <View
      style={[
        styles.dataRow,
        !isLast && { borderBottomColor: borderColor, borderBottomWidth: StyleSheet.hairlineWidth },
      ]}
    >
      <View style={styles.dataRowTextCol}>
        <Text style={[styles.dataRowLabel, { color: labelColor }]} numberOfLines={2}>
          {label}
        </Text>
        {hint ? (
          <Text style={[styles.dataRowHint, { color: hintColor }]} numberOfLines={3}>
            {hint}
          </Text>
        ) : null}
      </View>
      <Text style={[styles.dataRowValue, { color: valueColor }]}>{value}</Text>
    </View>
  );
}

type ScoreBlockProps = {
  title: string;
  score: number | null;
  description: string;
  isLast?: boolean;
  titleColor: string;
  descColor: string;
  badgeBg: string;
  badgeText: string;
  barFill: string;
  trackBg: string;
  borderColor: string;
};

function ScoreBlock({
  title,
  score,
  description,
  isLast,
  titleColor,
  descColor,
  badgeBg,
  badgeText,
  barFill,
  trackBg,
  borderColor,
}: ScoreBlockProps) {
  return (
    <View
      style={[
        styles.scoreWrap,
        !isLast && { borderBottomColor: borderColor, borderBottomWidth: StyleSheet.hairlineWidth },
      ]}
    >
      <View style={styles.scoreTop}>
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
  );
}

function SectionKicker({ children, color }: { children: string; color: string }) {
  return (
    <Text style={[styles.kicker, { color }]} numberOfLines={1}>
      {children}
    </Text>
  );
}

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
  const textMuted = COLORS.neutral?.gray?.[500] ?? '#6B7280';
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
      <View style={[styles.centered, { backgroundColor: bg, paddingHorizontal: padH }]}>
        <Text style={[styles.emptyTitle, { color: textPrimary }]}>Rendimiento no disponible</Text>
        <Text style={[styles.emptySub, { color: textSecondary }]}>
          Tu cuenta debe estar aprobada para ver KPIs.
        </Text>
      </View>
    );
  }

  const calificacionHint =
    data != null
      ? `En este periodo: ${data.resenas_muestra} reseña(s). Total en tu perfil: ${data.resenas_totales_proveedor} · Promedio global: ${formatEstrellas(data.calificacion_promedio_todas_resenas)}`
      : undefined;

  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor: bg }]}
      contentContainerStyle={[styles.scrollContent, { paddingHorizontal: padH }]}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={onRefresh} />}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.periodBlock, { borderBottomColor: border }]}>
        <SectionKicker color={textMuted}>PERIODO</SectionKicker>
        <View style={styles.chipsRow}>
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
                    backgroundColor: active ? primarySoft : paper,
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
                    { color: active ? primary : textSecondary, fontWeight: active ? '700' : '600' },
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
        <View style={[styles.surface, { backgroundColor: paper, borderColor: border }, SHADOWS?.sm]}>
          <Text style={[styles.errorText, { color: textPrimary }]}>{error}</Text>
          <TouchableOpacity onPress={onRefresh} style={[styles.retryBtn, { borderColor: primary }]}>
            <Text style={[styles.retryText, { color: primary }]}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {data ? (
        <>
          <SectionKicker color={textMuted}>RESUMEN</SectionKicker>
          <View style={[styles.surface, { backgroundColor: paper, borderColor: border }, SHADOWS?.sm]}>
            <Text style={[styles.heroLabel, { color: textSecondary }]}>Índice de rendimiento</Text>
            <Text style={[styles.heroPct, { color: primary }]}>{data.score_rendimiento}%</Text>
            <Text style={[styles.heroTier, { color: textPrimary }]}>Nivel: {tierName}</Text>
            <Text style={[styles.heroFoot, { color: textSecondary }]}>
              Combina respuesta en ofertas, reseñas de clientes, checklist y cumplimiento de tiempos estimados en
              ofertas aceptadas (últimos {data.ventana_dias} días con actividad).
            </Text>
          </View>

          <View style={styles.sectionSpacer} />
          <SectionKicker color={textMuted}>DESGLOSE DE PUNTAJES</SectionKicker>
          <View style={[styles.surface, { backgroundColor: paper, borderColor: border }, SHADOWS?.sm]}>
            <ScoreBlock
              title="Tiempo de respuesta"
              score={data.score_tiempo_respuesta}
              description="Tiempo desde que la solicitud quedó publicada hasta que enviaste la oferta (dirigidas priorizadas)."
              titleColor={textPrimary}
              descColor={textSecondary}
              badgeBg={primarySoft}
              badgeText={primary}
              barFill={primary}
              trackBg={trackBar}
              borderColor={border}
            />
            <ScoreBlock
              title="Satisfacción del cliente"
              score={data.score_calificacion_cliente}
              description="Basado en reseñas del periodo; si no hay en el periodo, se usa tu promedio histórico."
              titleColor={textPrimary}
              descColor={textSecondary}
              badgeBg={primarySoft}
              badgeText={primary}
              barFill={primary}
              trackBg={trackBar}
              borderColor={border}
            />
            <ScoreBlock
              title="Checklist"
              score={data.score_checklist}
              description="Órdenes marketplace con checklist: % completados según actividad en el periodo."
              titleColor={textPrimary}
              descColor={textSecondary}
              badgeBg={primarySoft}
              badgeText={primary}
              barFill={primary}
              trackBg={trackBar}
              borderColor={border}
            />
            <ScoreBlock
              title="Tiempo vs estimado"
              score={data.score_tiempo_ejecucion}
              description="Relación tiempo real del checklist vs tiempo total estimado en la oferta (1,0 = cumple)."
              titleColor={textPrimary}
              descColor={textSecondary}
              badgeBg={primarySoft}
              badgeText={primary}
              barFill={primary}
              trackBg={trackBar}
              borderColor={border}
              isLast
            />
          </View>

          <View style={styles.sectionSpacer} />
          <SectionKicker color={textMuted}>DATOS EN ESTE PERIODO</SectionKicker>
          <View style={[styles.surface, { backgroundColor: paper, borderColor: border }, SHADOWS?.sm]}>
            <DataRow
              label="Ofertas (total)"
              value={`${data.ofertas_total_en_periodo}`}
              hint="Envío o publicación de solicitud dentro del periodo."
              labelColor={textPrimary}
              valueColor={primaryBold}
              hintColor={textMuted}
              borderColor={border}
            />
            <DataRow
              label="Ofertas dirigidas / globales"
              value={`${data.ofertas_dirigidas_muestra} / ${data.ofertas_globales_muestra}`}
              hint="Para tiempos de respuesta por tipo de solicitud."
              labelColor={textPrimary}
              valueColor={primaryBold}
              hintColor={textMuted}
              borderColor={border}
            />
            <DataRow
              label="Respuesta media (dirigidas)"
              value={formatMinutos(data.tiempo_respuesta_dirigida_media_minutos)}
              labelColor={textPrimary}
              valueColor={primaryBold}
              hintColor={textMuted}
              borderColor={border}
            />
            <DataRow
              label="Respuesta media (globales)"
              value={formatMinutos(data.tiempo_respuesta_global_media_minutos)}
              labelColor={textPrimary}
              valueColor={primaryBold}
              hintColor={textMuted}
              borderColor={border}
            />
            <DataRow
              label="Órdenes con oferta (actividad)"
              value={`${data.ordenes_mercado_en_periodo}`}
              hint="Servicios originados en oferta con movimiento en el periodo."
              labelColor={textPrimary}
              valueColor={primaryBold}
              hintColor={textMuted}
              borderColor={border}
            />
            <DataRow
              label="Órdenes completadas"
              value={`${data.ordenes_mercado_completadas}`}
              hint="Estado finalizado en el subconjunto con actividad reciente."
              labelColor={textPrimary}
              valueColor={primaryBold}
              hintColor={textMuted}
              borderColor={border}
            />
            <DataRow
              label="Checklist: completados / con instancia"
              value={`${data.checklist_completados} / ${data.ordenes_con_checklist}`}
              hint={
                data.checklist_cumplimiento_pct != null
                  ? `Cumplimiento ${data.checklist_cumplimiento_pct}%`
                  : 'Sin instancias de checklist en el periodo'
              }
              labelColor={textPrimary}
              valueColor={primaryBold}
              hintColor={textMuted}
              borderColor={border}
            />
            <DataRow
              label="Tiempo medio checklist"
              value={formatMinutos(data.checklist_tiempo_promedio_minutos ?? null)}
              hint="Solo checklists completados; si falta duración guardada, se usa inicio→fin."
              labelColor={textPrimary}
              valueColor={primaryBold}
              hintColor={textMuted}
              borderColor={border}
            />
            <DataRow
              label="Ejecución vs estimado (promedio)"
              value={formatRatio(data.tiempo_ejecucion_vs_estimado_promedio)}
              hint={`${data.tiempo_ejecucion_vs_estimado_muestra} servicio(s) con checklist y oferta estimada. 1,0 = en tiempo.`}
              labelColor={textPrimary}
              valueColor={primaryBold}
              hintColor={textMuted}
              borderColor={border}
            />
            <DataRow
              label="Calificación mostrada"
              value={formatEstrellas(data.calificacion_cliente_promedio)}
              hint={calificacionHint}
              labelColor={textPrimary}
              valueColor={primaryBold}
              hintColor={textMuted}
              borderColor={border}
              isLast
            />
          </View>

          <Text style={[styles.disclaimer, { color: textSecondary }]}>
            Los datos se calculan en el servidor. “Actividad” incluye órdenes con checklist o reseña en el periodo, no
            solo la fecha de creación.
          </Text>
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: {
    paddingBottom: SPACING['2xl'],
    paddingTop: SPACING.sm,
  },
  kicker: {
    fontSize: 11,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    letterSpacing: 1.2,
    marginBottom: SPACING.sm,
    marginTop: SPACING.xs,
  },
  periodBlock: {
    paddingBottom: SPACING.md,
    marginBottom: SPACING.sm,
    borderBottomWidth: BORDERS.width?.thin ?? 1,
  },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  chip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDERS.radius?.lg ?? 12,
    borderWidth: BORDERS.width?.thin ?? 1,
  },
  chipText: { fontSize: TYPOGRAPHY.fontSize.sm },
  loaderWrap: { paddingVertical: SPACING.xl, alignItems: 'center' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: SPACING['2xl'] },
  emptyTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  emptySub: { fontSize: TYPOGRAPHY.fontSize.sm, textAlign: 'center', lineHeight: 20 },
  surface: {
    borderRadius: BORDERS.radius?.['2xl'] ?? 20,
    borderWidth: BORDERS.width?.thin ?? 1,
    padding: cardPad,
    marginBottom: SPACING.md,
  },
  sectionSpacer: { height: SPACING.xs },
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
  scoreWrap: { paddingVertical: SPACING.md },
  scoreTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xs,
  },
  scoreTitle: {
    flex: 1,
    paddingRight: SPACING.sm,
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
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
  dataRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
    gap: SPACING.md,
  },
  dataRowTextCol: { flex: 1, minWidth: 0 },
  dataRowLabel: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    lineHeight: 20,
  },
  dataRowHint: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    marginTop: 4,
    lineHeight: 17,
  },
  dataRowValue: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    textAlign: 'right',
    maxWidth: '42%',
    minWidth: 72,
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
  disclaimer: { fontSize: TYPOGRAPHY.fontSize.xs, lineHeight: 18, marginTop: SPACING.sm, marginBottom: SPACING.lg },
});
