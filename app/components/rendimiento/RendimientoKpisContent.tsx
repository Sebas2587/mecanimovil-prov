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
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { SPACING, TYPOGRAPHY, BORDERS } from '@/app/design-system/tokens';
import {
  useProveedorKpisResumen,
  targetTierNameForScore,
} from '@/hooks/useProveedorKpisResumen';

const DIAS_OPCIONES = [7, 30, 90] as const;

/** Paleta y ritmo visual alineados a `app/(tabs)/index.tsx` (dashboard). */
const D = {
  ink: '#111827',
  gray: '#6B7280',
  grayLight: '#9CA3AF',
  border: '#E5E7EB',
  borderWhite: 'rgba(255,255,255,0.6)',
  blue: '#2563EB',
  blueBorder: '#DBEAFE',
  track: '#E5E7EB',
  fillBar: '#2563EB',
  gradTop: '#F3F5F8',
  gradMid: '#FAFBFC',
  gradBottom: '#FFFFFF',
} as const;

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

function GlassCard({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.glassOuter}>
      <BlurView intensity={60} tint="light" style={styles.glassInner}>
        {children}
      </BlurView>
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

type DataRowProps = {
  label: string;
  value: string;
  hint?: string;
  isLast?: boolean;
};

function DataRow({ label, value, hint, isLast }: DataRowProps) {
  return (
    <View
      style={[
        styles.dataRow,
        !isLast && { borderBottomColor: D.border, borderBottomWidth: StyleSheet.hairlineWidth },
      ]}
    >
      <View style={styles.dataRowTextCol}>
        <Text style={styles.dataRowLabel} numberOfLines={2}>
          {label}
        </Text>
        {hint ? (
          <Text style={styles.dataRowHint} numberOfLines={4}>
            {hint}
          </Text>
        ) : null}
      </View>
      <Text style={styles.dataRowValue}>{value}</Text>
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
        !isLast && { borderBottomColor: D.border, borderBottomWidth: StyleSheet.hairlineWidth },
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
        <View style={[styles.scoreBarTrack, { backgroundColor: D.track }]}>
          <View style={[styles.scoreBarFill, { width: `${score}%`, backgroundColor: D.fillBar }]} />
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

  const onRefresh = useCallback(() => {
    refresh();
  }, [refresh]);

  const bottomPad = insets.bottom + 40;

  if (!cuentaAprobadaPorAdmin && !isLoading) {
    return (
      <LinearGradient
        style={styles.gradientRoot}
        colors={[D.gradTop, D.gradMid, D.gradBottom]}
        locations={[0, 0.35, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      >
        <View style={[styles.centered, { paddingHorizontal: 20 }]}>
          <Text style={styles.emptyTitle}>Rendimiento no disponible</Text>
          <Text style={styles.emptySub}>Tu cuenta debe estar aprobada para ver KPIs.</Text>
        </View>
      </LinearGradient>
    );
  }

  const calificacionHint =
    data != null
      ? `En este periodo: ${data.resenas_muestra} reseña(s). Total en tu perfil: ${data.resenas_totales_proveedor} · Promedio global: ${formatEstrellas(data.calificacion_promedio_todas_resenas)}`
      : undefined;

  return (
    <LinearGradient
      style={styles.gradientRoot}
      colors={[D.gradTop, D.gradMid, D.gradBottom]}
      locations={[0, 0.35, 1]}
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
                  style={[
                    styles.chip,
                    active ? styles.chipActive : styles.chipIdle,
                  ]}
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
              <ActivityIndicator size="large" color={D.blue} />
            </View>
          </View>
        ) : null}

        {error && !data ? (
          <View style={styles.sectionWrap}>
            <GlassCard>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity onPress={onRefresh} style={styles.retryBtn}>
                <Text style={styles.retryText}>Reintentar</Text>
              </TouchableOpacity>
            </GlassCard>
          </View>
        ) : null}

        {data ? (
          <>
            <View style={styles.sectionWrap}>
              <SectionTitle>RESUMEN</SectionTitle>
              <GlassCard>
                <Text style={styles.heroLabel}>Índice de rendimiento</Text>
                <Text style={styles.heroPct}>{data.score_rendimiento}%</Text>
                <Text style={styles.heroTier}>Nivel: {tierName}</Text>
                <Text style={styles.heroFoot}>
                  Combina respuesta en ofertas, reseñas de clientes, checklist y cumplimiento de tiempos estimados en
                  ofertas aceptadas (últimos {data.ventana_dias} días con actividad).
                </Text>
              </GlassCard>
            </View>

            <View style={styles.sectionWrap}>
              <SectionTitle>DESGLOSE DE PUNTAJES</SectionTitle>
              <GlassCard>
                <ScoreBlock
                  title="Tiempo de respuesta"
                  score={data.score_tiempo_respuesta}
                  description="Tiempo desde que la solicitud quedó publicada hasta que enviaste la oferta (dirigidas priorizadas)."
                />
                <ScoreBlock
                  title="Satisfacción del cliente"
                  score={data.score_calificacion_cliente}
                  description="Basado en reseñas del periodo; si no hay en el periodo, se usa tu promedio histórico."
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
              </GlassCard>
            </View>

            <View style={styles.sectionWrap}>
              <SectionTitle>DATOS EN ESTE PERIODO</SectionTitle>
              <GlassCard>
                <DataRow
                  label="Ofertas (total)"
                  value={`${data.ofertas_total_en_periodo}`}
                  hint="Envío o publicación de solicitud dentro del periodo."
                />
                <DataRow
                  label="Ofertas dirigidas / globales"
                  value={`${data.ofertas_dirigidas_muestra} / ${data.ofertas_globales_muestra}`}
                  hint="Para tiempos de respuesta por tipo de solicitud."
                />
                <DataRow label="Respuesta media (dirigidas)" value={formatMinutos(data.tiempo_respuesta_dirigida_media_minutos)} />
                <DataRow label="Respuesta media (globales)" value={formatMinutos(data.tiempo_respuesta_global_media_minutos)} />
                <DataRow
                  label="Órdenes con oferta (actividad)"
                  value={`${data.ordenes_mercado_en_periodo}`}
                  hint="Servicios originados en oferta con movimiento en el periodo."
                />
                <DataRow
                  label="Órdenes completadas"
                  value={`${data.ordenes_mercado_completadas}`}
                  hint="Estado finalizado en el subconjunto con actividad reciente."
                />
                <DataRow
                  label="Checklist: completados / con instancia"
                  value={`${data.checklist_completados} / ${data.ordenes_con_checklist}`}
                  hint={
                    data.checklist_cumplimiento_pct != null
                      ? `Cumplimiento ${data.checklist_cumplimiento_pct}%`
                      : 'Sin instancias de checklist en el periodo'
                  }
                />
                <DataRow
                  label="Tiempo medio checklist"
                  value={formatMinutos(data.checklist_tiempo_promedio_minutos ?? null)}
                  hint="Solo checklists completados; si falta duración guardada, se usa inicio→fin."
                />
                <DataRow
                  label="Ejecución vs estimado (promedio)"
                  value={formatRatio(data.tiempo_ejecucion_vs_estimado_promedio)}
                  hint={`${data.tiempo_ejecucion_vs_estimado_muestra} servicio(s) con checklist y oferta estimada. 1,0 = en tiempo.`}
                />
                <DataRow
                  label="Calificación mostrada"
                  value={formatEstrellas(data.calificacion_cliente_promedio)}
                  hint={calificacionHint}
                  isLast
                />
              </GlassCard>
            </View>

            <View style={styles.sectionWrap}>
              <Text style={styles.disclaimer}>
                Los datos se calculan en el servidor. “Actividad” incluye órdenes con checklist o reseña en el periodo,
                no solo la fecha de creación.
              </Text>
            </View>
          </>
        ) : null}
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradientRoot: { flex: 1 },
  scrollTransparent: { flex: 1, backgroundColor: 'transparent' },
  scrollInner: {
    paddingTop: SPACING.sm,
  },
  sectionWrap: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: D.gray,
    letterSpacing: 1,
    marginBottom: 14,
  },
  glassOuter: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: D.borderWhite,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  glassInner: {
    padding: 20,
  },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipActive: {
    backgroundColor: '#FFFFFF',
    borderColor: D.blueBorder,
  },
  chipIdle: {
    backgroundColor: '#FFFFFF',
    borderColor: D.border,
  },
  chipText: { fontSize: 13, fontWeight: '600' },
  chipTextActive: { color: D.blue },
  chipTextIdle: { color: D.gray },
  loaderWrap: { paddingVertical: SPACING.xl, alignItems: 'center' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: SPACING['2xl'] },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: D.ink,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  emptySub: { fontSize: 14, color: D.gray, textAlign: 'center', lineHeight: 20 },
  heroLabel: { fontSize: 12, color: D.gray, fontWeight: '500', marginBottom: 6 },
  heroPct: {
    fontSize: 40,
    fontWeight: '900',
    color: D.ink,
    letterSpacing: TYPOGRAPHY.letterSpacing?.tight,
  },
  heroTier: {
    fontSize: 16,
    fontWeight: '700',
    color: D.ink,
    marginTop: 6,
  },
  heroFoot: { fontSize: 12, color: D.gray, marginTop: 12, lineHeight: 18 },
  scoreWrap: { paddingVertical: 14 },
  scoreTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  scoreTitle: {
    flex: 1,
    paddingRight: SPACING.sm,
    fontSize: 14,
    fontWeight: '600',
    color: D.ink,
  },
  scoreBadgePlan: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: D.blueBorder,
  },
  scoreBadgePlanText: {
    fontSize: 12,
    fontWeight: '600',
    color: D.blue,
  },
  scoreDesc: {
    fontSize: 12,
    color: D.gray,
    lineHeight: 18,
    marginBottom: 10,
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
    paddingVertical: 12,
    gap: SPACING.md,
  },
  dataRowTextCol: { flex: 1, minWidth: 0 },
  dataRowLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: D.ink,
    lineHeight: 20,
  },
  dataRowHint: {
    fontSize: 12,
    color: D.grayLight,
    marginTop: 4,
    lineHeight: 17,
  },
  dataRowValue: {
    fontSize: 16,
    fontWeight: '900',
    color: D.ink,
    textAlign: 'right',
    maxWidth: '44%',
    minWidth: 72,
  },
  errorText: { fontSize: 14, color: D.ink, marginBottom: SPACING.md },
  retryBtn: {
    alignSelf: 'flex-start',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: D.blueBorder,
    backgroundColor: '#FFFFFF',
  },
  retryText: { fontSize: 13, fontWeight: '600', color: D.blue },
  disclaimer: { fontSize: 12, color: D.gray, lineHeight: 18 },
});
