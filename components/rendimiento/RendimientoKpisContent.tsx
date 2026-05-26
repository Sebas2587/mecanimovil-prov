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
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import { COLORS, SPACING, TYPOGRAPHY, BORDERS, SHADOWS } from '@/app/design-system/tokens';
import {
  useProveedorKpisResumen,
  targetTierNameForScore,
} from '@/hooks/useProveedorKpisResumen';

const DIAS_OPCIONES = [7, 30, 90] as const;

const I = COLORS.institutional;
const FF = TYPOGRAPHY.fontFamily;

function lh(fontSize: number, lineMult: number): number {
  return Math.round(fontSize * lineMult);
}

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

function DsCard({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.cardOuter}>
      <View style={styles.cardInner}>{children}</View>
    </View>
  );
}

function SectionTitle({ children }: { children: string }) {
  return (
    <Text style={styles.sectionTitle} numberOfLines={1}>
      {children}
    </Text>
  );
}

type MetricItem = { label: string; value: string };

function TwoColumnMetricGrid({ rows }: { rows: [MetricItem, MetricItem][] }) {
  return (
    <View>
      {rows.map((pair, idx) => (
        <View
          key={idx}
          style={[styles.metricGridRow, idx < rows.length - 1 && styles.metricGridRowBorder]}
        >
          <View style={styles.metricCell}>
            <Text style={styles.metricLabel} numberOfLines={2}>
              {pair[0].label}
            </Text>
            <Text style={styles.metricValue}>{pair[0].value}</Text>
          </View>
          <View style={styles.metricColSep} />
          <View style={styles.metricCell}>
            <Text style={styles.metricLabel} numberOfLines={2}>
              {pair[1].label}
            </Text>
            <Text style={styles.metricValue}>{pair[1].value}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

type ScoreBlockProps = {
  title: string;
  score: number | null;
  description: string;
  isLast?: boolean;
};

function ScoreBlock({ title, score, description, isLast }: ScoreBlockProps) {
  return (
    <View
      style={[
        styles.scoreWrap,
        !isLast && { borderBottomColor: I.hairline, borderBottomWidth: StyleSheet.hairlineWidth },
      ]}
    >
      <View style={styles.scoreTop}>
        <Text style={styles.scoreTitle}>{title}</Text>
        <View style={styles.scoreBadgePlan}>
          <Text style={styles.scoreBadgePlanText}>{formatScore(score)}</Text>
        </View>
      </View>
      <Text style={styles.scoreDesc}>{description}</Text>
      {score != null ? (
        <View style={[styles.scoreBarTrack, { backgroundColor: I.hairlineSoft }]}>
          <View
            style={[
              styles.scoreBarFill,
              { width: `${Math.min(100, Math.max(0, score))}%`, backgroundColor: COLORS.primary[500] },
            ]}
          />
        </View>
      ) : null}
    </View>
  );
}

export function RendimientoKpisContent() {
  const insets = useSafeAreaInsets();
  const { isAuthenticated, isLoading, estadoProveedor } = useAuth();
  const cuentaAprobadaPorAdmin = estadoProveedor?.estado_verificacion === 'aprobado';
  const [diasVentana, setDiasVentana] = useState<number>(30);

  const enabled = Boolean(isAuthenticated && cuentaAprobadaPorAdmin && !isLoading);
  const { data, loading, error, refresh } = useProveedorKpisResumen({
    enabled,
    dias: diasVentana,
  });

  const tierName = useMemo(
    () => (data != null ? targetTierNameForScore(data.score_rendimiento) : '—'),
    [data]
  );

  const metricRows = useMemo((): [MetricItem, MetricItem][] | null => {
    if (!data) return null;
    return [
      [
        { label: 'Ofertas (total)', value: `${data.ofertas_total_en_periodo}` },
        {
          label: 'Dirigidas / globales',
          value: `${data.ofertas_dirigidas_muestra} / ${data.ofertas_globales_muestra}`,
        },
      ],
      [
        { label: 'Resp. media (dir.)', value: formatMinutos(data.tiempo_respuesta_dirigida_media_minutos) },
        { label: 'Resp. media (glob.)', value: formatMinutos(data.tiempo_respuesta_global_media_minutos) },
      ],
      [
        { label: 'Órdenes con actividad', value: `${data.ordenes_mercado_en_periodo}` },
        { label: 'Órdenes completadas', value: `${data.ordenes_mercado_completadas}` },
      ],
      [
        {
          label: 'Checklist (ok / total)',
          value: `${data.checklist_completados} / ${data.ordenes_con_checklist}`,
        },
        { label: 'Tiempo medio checklist', value: formatMinutos(data.checklist_tiempo_promedio_minutos ?? null) },
      ],
      [
        { label: 'Ejec. vs estimado (ø)', value: formatRatio(data.tiempo_ejecucion_vs_estimado_promedio) },
        {
          label: 'Calificación (servicios)',
          value: formatEstrellas(data.calificacion_servicios_promedio),
        },
      ],
      [
        {
          label: 'Calificación (reseñas orden)',
          value: formatEstrellas(data.calificacion_cliente_promedio),
        },
        {
          label: 'Líneas serv. calif. (periodo)',
          value: `${data.calificacion_servicios_lineas_muestra ?? 0}`,
        },
      ],
    ];
  }, [data]);

  const onRefresh = useCallback(() => {
    refresh();
  }, [refresh]);

  const bottomPad = insets.bottom + (SPACING.fixed?.xl ?? SPACING.fixed.xl);

  if (!cuentaAprobadaPorAdmin && !isLoading) {
    return (
      <LinearGradient
        style={styles.gradientRoot}
        colors={[I.surfaceSoft, I.canvas] as const}
        locations={[0, 1] as const}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      >
        <View style={[styles.centered, { paddingHorizontal: SPACING.fixed.lg }]}>
          <Text style={styles.emptyTitle}>Rendimiento no disponible</Text>
          <Text style={styles.emptySub}>Tu cuenta debe estar aprobada para ver KPIs.</Text>
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      style={styles.gradientRoot}
      colors={[I.surfaceSoft, I.canvas] as const}
      locations={[0, 1] as const}
      start={{ x: 0.5, y: 0 }}
      end={{ x: 0.5, y: 1 }}
    >
      <ScrollView
        style={styles.scrollTransparent}
        contentContainerStyle={[styles.scrollInner, { paddingBottom: bottomPad }]}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.sectionWrap}>
          <SectionTitle>PERIODO</SectionTitle>
          <View style={styles.chipsRow}>
            {DIAS_OPCIONES.map((d) => {
              const active = diasVentana === d;
              return (
                <TouchableOpacity
                  key={d}
                  onPress={() => setDiasVentana(d)}
                  style={[styles.chip, active ? styles.chipActive : styles.chipIdle]}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={`${d} dias`}
                >
                  <Text style={[styles.chipText, active ? styles.chipTextActive : styles.chipTextIdle]}>
                    {d} días
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {loading && !data ? (
          <View style={styles.sectionWrap}>
            <View style={styles.loaderWrap}>
              <ActivityIndicator size="large" color={COLORS.primary[500]} />
            </View>
          </View>
        ) : null}

        {error && !data ? (
          <View style={styles.sectionWrap}>
            <DsCard>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity onPress={onRefresh} style={styles.retryBtn} activeOpacity={0.85}>
                <Text style={styles.retryText}>Reintentar</Text>
              </TouchableOpacity>
            </DsCard>
          </View>
        ) : null}

        {data ? (
          <>
            <View style={styles.sectionWrap}>
              <SectionTitle>RESUMEN</SectionTitle>
              <DsCard>
                <Text style={styles.heroLabel}>Índice de rendimiento</Text>
                <Text style={styles.heroPct}>{data.score_rendimiento}%</Text>
                <Text style={styles.heroTier}>Nivel: {tierName}</Text>
                <Text style={styles.heroFoot}>
                  Combina respuesta en ofertas, reseñas de clientes, checklist y cumplimiento de tiempos estimados en
                  ofertas aceptadas (últimos {data.ventana_dias} días con actividad).
                </Text>
              </DsCard>
            </View>

            {data.sugerencia_suscripcion_para_insignia && data.mensaje_sugerencia_suscripcion ? (
              <View style={styles.sectionWrap}>
                <DsCard>
                  <Text style={styles.insigneTitle}>Insignia en la app de usuarios</Text>
                  <Text style={styles.insigneBody}>{data.mensaje_sugerencia_suscripcion}</Text>
                  <TouchableOpacity
                    onPress={() => router.push('/creditos?tab=suscripcion')}
                    style={styles.insigneCta}
                    activeOpacity={0.85}
                    accessibilityRole="button"
                    accessibilityLabel="Ir a suscripción para mostrar insignia a clientes"
                  >
                    <Text style={styles.insigneCtaText}>Ver suscripción mensual</Text>
                  </TouchableOpacity>
                </DsCard>
              </View>
            ) : null}

            <View style={styles.sectionWrap}>
              <SectionTitle>DESGLOSE DE PUNTAJES</SectionTitle>
              <DsCard>
                <ScoreBlock
                  title="Tiempo de respuesta"
                  score={data.score_tiempo_respuesta}
                  description="Tiempo desde que la solicitud quedó publicada hasta que enviaste la oferta (dirigidas priorizadas)."
                />
                <ScoreBlock
                  title="Satisfacción del cliente"
                  score={data.score_calificacion_cliente}
                  description="Basado en reseñas al proveedor en el periodo; si no hay, promedio histórico. En datos del periodo ver también Calificación (servicios) por líneas contratadas."
                />
                <ScoreBlock
                  title="Checklist"
                  score={data.score_checklist}
                  description="Órdenes marketplace con checklist: % completados según actividad en el periodo."
                />
                <ScoreBlock
                  title="Tiempo vs estimado"
                  score={data.score_tiempo_ejecucion}
                  description="Relación tiempo real del checklist vs tiempo total estimado en la oferta (1,0 = cumple)."
                  isLast
                />
              </DsCard>
            </View>

            <View style={styles.sectionWrap}>
              <SectionTitle>DATOS EN ESTE PERIODO</SectionTitle>
              <DsCard>{metricRows ? <TwoColumnMetricGrid rows={metricRows} /> : null}</DsCard>
            </View>

            <View style={styles.sectionWrap}>
              <Text style={styles.disclaimer}>
                Los datos se calculan en el servidor. “Actividad” incluye órdenes con checklist o reseña en el periodo,
                no solo la fecha de creación. Las calificaciones se toman por orden en esa ventana (Resena y reseñas de la
                app de usuarios); “servicios” repite esa nota por cada línea con tu OfertaServicio.
              </Text>
            </View>
          </>
        ) : null}
      </ScrollView>
    </LinearGradient>
  );
}

const h4 = TYPOGRAPHY.styles.h4;
const body = TYPOGRAPHY.styles.body;
const small = TYPOGRAPHY.styles.small;
const caption = TYPOGRAPHY.styles.caption;
const captionBold = TYPOGRAPHY.styles.captionBold;
const numberDisplay = TYPOGRAPHY.styles.numberDisplay;

const styles = StyleSheet.create({
  gradientRoot: { flex: 1 },
  scrollTransparent: { flex: 1, backgroundColor: 'transparent' },
  scrollInner: {
    paddingTop: SPACING.fixed.sm,
  },
  sectionWrap: {
    paddingHorizontal: SPACING.fixed.lg,
    marginBottom: SPACING.fixed.lg,
  },
  sectionTitle: {
    fontSize: captionBold.fontSize,
    lineHeight: lh(captionBold.fontSize, captionBold.lineHeight),
    fontFamily: FF.sansSemiBold,
    color: I.muted,
    letterSpacing: TYPOGRAPHY.letterSpacing.wide,
    marginBottom: SPACING.fixed.sm,
  },
  cardOuter: {
    borderRadius: BORDERS.radius.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: I.hairline,
    backgroundColor: I.canvas,
    ...SHADOWS.editorial,
  },
  cardInner: {
    padding: SPACING.fixed.lg,
    backgroundColor: I.canvas,
  },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.fixed.sm },
  chip: {
    paddingHorizontal: SPACING.fixed.sm,
    paddingVertical: SPACING.fixed.xs,
    borderRadius: BORDERS.radius.pill,
    borderWidth: 1,
  },
  chipActive: {
    backgroundColor: I.canvas,
    borderColor: COLORS.primary[200],
  },
  chipIdle: {
    backgroundColor: I.canvas,
    borderColor: I.hairline,
  },
  chipText: {
    fontSize: small.fontSize,
    lineHeight: lh(small.fontSize, small.lineHeight),
    fontFamily: FF.sansSemiBold,
  },
  chipTextActive: { color: COLORS.primary[500] },
  chipTextIdle: { color: I.body },
  loaderWrap: { paddingVertical: SPACING.fixed.xl, alignItems: 'center' },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SPACING.fixed['2xl'],
  },
  emptyTitle: {
    fontSize: h4.fontSize,
    lineHeight: lh(h4.fontSize, h4.lineHeight),
    fontFamily: FF.sansSemiBold,
    color: I.ink,
    textAlign: 'center',
    marginBottom: SPACING.fixed.sm,
  },
  emptySub: {
    fontSize: small.fontSize,
    lineHeight: lh(small.fontSize, small.lineHeight),
    fontFamily: FF.sansRegular,
    color: I.body,
    textAlign: 'center',
  },
  heroLabel: {
    fontSize: caption.fontSize,
    lineHeight: lh(caption.fontSize, caption.lineHeight),
    color: I.body,
    fontFamily: FF.sansMedium,
    marginBottom: SPACING.fixed.xs,
  },
  heroPct: {
    fontSize: TYPOGRAPHY.fontSize['4xl'],
    lineHeight: lh(TYPOGRAPHY.fontSize['4xl'], numberDisplay.lineHeight),
    fontFamily: FF.monoMedium,
    color: I.ink,
    letterSpacing: TYPOGRAPHY.letterSpacing.tight,
  },
  heroTier: {
    fontSize: body.fontSize,
    lineHeight: lh(body.fontSize, body.lineHeight),
    fontFamily: FF.sansSemiBold,
    color: I.ink,
    marginTop: SPACING.fixed.xs,
  },
  heroFoot: {
    fontSize: small.fontSize,
    lineHeight: lh(small.fontSize, small.lineHeight),
    fontFamily: FF.sansRegular,
    color: I.body,
    marginTop: SPACING.fixed.sm,
  },
  insigneTitle: {
    fontSize: body.fontSize,
    lineHeight: lh(body.fontSize, body.lineHeight),
    fontFamily: FF.sansSemiBold,
    color: I.ink,
    marginBottom: SPACING.fixed.xs,
  },
  insigneBody: {
    fontSize: caption.fontSize,
    lineHeight: lh(caption.fontSize, caption.lineHeight),
    fontFamily: FF.sansRegular,
    color: I.body,
    marginBottom: SPACING.fixed.md,
  },
  insigneCta: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.primary[500],
    paddingHorizontal: SPACING.fixed.md,
    paddingVertical: SPACING.fixed.sm,
    borderRadius: BORDERS.radius.pill,
  },
  insigneCtaText: {
    color: I.onPrimary,
    fontSize: TYPOGRAPHY.styles.button.fontSize,
    lineHeight: lh(TYPOGRAPHY.styles.button.fontSize, TYPOGRAPHY.styles.button.lineHeight),
    fontFamily: FF.sansSemiBold,
  },
  scoreWrap: { paddingVertical: SPACING.fixed.sm },
  scoreTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.fixed.xs,
  },
  scoreTitle: {
    flex: 1,
    paddingRight: SPACING.fixed.sm,
    fontSize: small.fontSize,
    lineHeight: lh(small.fontSize, small.lineHeight),
    fontFamily: FF.sansSemiBold,
    color: I.ink,
  },
  scoreBadgePlan: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: I.canvas,
    paddingHorizontal: SPACING.fixed.sm,
    paddingVertical: SPACING.fixed.xxs,
    borderRadius: BORDERS.radius.pill,
    borderWidth: 1,
    borderColor: I.hairline,
  },
  scoreBadgePlanText: {
    fontSize: caption.fontSize,
    lineHeight: lh(caption.fontSize, caption.lineHeight),
    fontFamily: FF.sansSemiBold,
    color: COLORS.primary[500],
  },
  scoreDesc: {
    fontSize: caption.fontSize,
    lineHeight: lh(caption.fontSize, caption.lineHeight),
    fontFamily: FF.sansRegular,
    color: I.body,
    marginBottom: SPACING.fixed.sm,
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
  metricGridRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingVertical: SPACING.fixed.sm,
  },
  metricGridRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: I.hairline,
  },
  metricCell: {
    flex: 1,
    paddingHorizontal: SPACING.fixed.xs,
    minWidth: 0,
  },
  metricColSep: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: I.hairline,
    marginVertical: SPACING.fixed.xxs,
  },
  metricLabel: {
    fontSize: caption.fontSize,
    lineHeight: lh(caption.fontSize, caption.lineHeight),
    fontFamily: FF.sansMedium,
    color: I.body,
    marginBottom: SPACING.fixed.xxs,
  },
  metricValue: {
    fontSize: numberDisplay.fontSize,
    lineHeight: lh(numberDisplay.fontSize, numberDisplay.lineHeight),
    fontFamily: FF.monoMedium,
    color: I.ink,
  },
  errorText: {
    fontSize: small.fontSize,
    lineHeight: lh(small.fontSize, small.lineHeight),
    fontFamily: FF.sansRegular,
    color: I.ink,
    marginBottom: SPACING.fixed.md,
  },
  retryBtn: {
    alignSelf: 'flex-start',
    paddingVertical: SPACING.fixed.sm,
    paddingHorizontal: SPACING.fixed.md,
    borderRadius: BORDERS.radius.md,
    borderWidth: 1,
    borderColor: I.hairline,
    backgroundColor: I.surfaceStrong,
  },
  retryText: {
    fontSize: small.fontSize,
    lineHeight: lh(small.fontSize, small.lineHeight),
    fontFamily: FF.sansSemiBold,
    color: COLORS.primary[500],
  },
  disclaimer: {
    fontSize: caption.fontSize,
    lineHeight: lh(caption.fontSize, caption.lineHeight),
    fontFamily: FF.sansRegular,
    color: I.muted,
  },
});
