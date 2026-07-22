/**
 * Pantalla dedicada: Saldo de créditos (Host Detail).
 * Antes vivía como tab dentro de /creditos — separada para dejar el hub en Plan + Tienda.
 */
import React, { useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  COLORS,
  SPACING,
  TYPOGRAPHY,
  withOpacity,
  BORDERS,
} from '@/app/design-system/tokens';
import {
  Card,
  hostScreenStyles,
} from '@/app/design-system/components';
import { hostIconPlateStyle } from '@/app/design-system/styles/institutionalSemantic';
import { InstitutionalIcon } from '@/components/ui/InstitutionalIcon';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import { SaldoCreditos } from '@/components/creditos';
import { InteractiveStatsChart } from '@/components/creditos/InteractiveStatsChart';
import FinanzasLiquidacionSection from '@/components/creditos/FinanzasLiquidacionSection';
import { SaldoBenefitGrid } from '@/components/creditos/SaldoBenefitGrid';
import { UsoPlanSection } from '@/components/creditos/UsoPlanSection';
import { CreditosHostShell } from '@/components/creditos/CreditosHostShell';
import { FALLBACK_PRECIO_CREDITO_BRUTO_CLP } from '@/constants/mercadoPagoPricing';
import {
  useEstadisticasCreditosQuery,
  useHistorialCreditosQuery,
  useMercadoPagoEstadoCuentaQuery,
  useMercadoPagoEstadisticasPagosQuery,
  useProveedorKpisResumen,
  useSaldoCreditosQuery,
  useSuscripcionProveedorQuery,
  useUsoFeaturesQuery,
} from '@/hooks/useCreditosQueries';

const I = COLORS.institutional;

function withOpacitySafe(hex: string, opacity: number): string {
  try {
    return withOpacity(hex, opacity);
  } catch {
    return hex;
  }
}

export default function SaldoCreditosScreen() {
  const insets = useSafeAreaInsets();
  const scrollBottomPad = useMemo(() => Math.max(32, insets.bottom + 24), [insets.bottom]);

  const {
    data: saldo,
    loading: saldoLoading,
    isRefetching: saldoRefetching,
    refresh: refreshSaldo,
  } = useSaldoCreditosQuery(true);
  const {
    data: estadisticas,
    isRefetching: estadisticasRefetching,
    refresh: refreshEstadisticas,
  } = useEstadisticasCreditosQuery(true);
  const {
    consumos,
    isRefetching: historialRefetching,
    refresh: refreshHistorial,
  } = useHistorialCreditosQuery(true);
  const {
    data: suscripcion,
    isRefetching: suscripcionRefetching,
    refresh: refreshSuscripcion,
  } = useSuscripcionProveedorQuery(true);
  const {
    data: usoFeatures,
    isRefetching: usoRefetching,
    refresh: refreshUso,
  } = useUsoFeaturesQuery(true);
  const {
    conectada: mpConectada,
    isRefetching: mpRefetching,
    refresh: refreshMp,
  } = useMercadoPagoEstadoCuentaQuery(true);
  const {
    data: estadisticasMP,
    isRefetching: mpStatsRefetching,
    refresh: refreshMpStats,
  } = useMercadoPagoEstadisticasPagosQuery(mpConectada);
  const {
    data: kpisData,
    loading: kpisLoading,
    isRefetching: kpisRefetching,
    refresh: refreshKpis,
  } = useProveedorKpisResumen({ enabled: true, dias: 30 });

  const kpiSugerenciaInsignia = useMemo(
    () => ({
      mostrar: !!kpisData?.sugerencia_suscripcion_para_insignia,
      mensaje: kpisData?.mensaje_sugerencia_suscripcion ?? null,
    }),
    [kpisData],
  );

  const loading = saldoLoading || kpisLoading;
  const refreshing =
    saldoRefetching ||
    estadisticasRefetching ||
    historialRefetching ||
    suscripcionRefetching ||
    usoRefetching ||
    mpRefetching ||
    mpStatsRefetching ||
    kpisRefetching;

  const tieneSuscripcionActiva = useMemo(
    () => suscripcion !== null && ['activa', 'pendiente'].includes(suscripcion?.estado ?? ''),
    [suscripcion],
  );
  const saldoCero = saldo !== null && saldo.saldo_creditos === 0;
  const saldoBajo =
    saldo !== null && saldo.saldo_creditos > 0 && saldo.saldo_creditos <= 5;
  const mostrarBannerComprarCreditos = saldoCero || saldoBajo;

  const precioTopUpClp = useMemo(
    () =>
      Math.round(
        Number(estadisticas?.precio_credito_unitario_clp ?? FALLBACK_PRECIO_CREDITO_BRUTO_CLP),
      ),
    [estadisticas?.precio_credito_unitario_clp],
  );

  const onRefresh = useCallback(() => {
    void Promise.all([
      refreshSaldo(),
      refreshEstadisticas(),
      refreshHistorial(),
      refreshSuscripcion(),
      refreshUso(),
      refreshMp(),
      refreshKpis(),
      ...(mpConectada ? [refreshMpStats()] : []),
    ]);
  }, [
    mpConectada,
    refreshEstadisticas,
    refreshHistorial,
    refreshKpis,
    refreshMp,
    refreshMpStats,
    refreshSaldo,
    refreshSuscripcion,
    refreshUso,
  ]);

  return (
    <CreditosHostShell title="Saldo" loading={loading}>
      <ScrollView
        style={hostScreenStyles.scroll}
        contentContainerStyle={[
          hostScreenStyles.scrollInner,
          { paddingBottom: scrollBottomPad },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={I.primary}
          />
        }
      >
        {saldo ? (
          <SaldoCreditos
            saldo={saldo.saldo_creditos}
            titulo={suscripcion?.plan.nombre}
            creditosPlanMensuales={suscripcion?.plan.creditos_mensuales}
            fechaUltimoConsumo={saldo.fecha_ultimo_consumo}
            fechaUltimaCompra={saldo.fecha_ultima_compra}
            fechaProximaRecarga={
              tieneSuscripcionActiva ? suscripcion?.fecha_proximo_cobro ?? null : null
            }
            mesStats={
              estadisticas
                ? {
                    consumidos: estadisticas.creditos_consumidos_mes,
                    comprados: estadisticas.creditos_comprados_mes,
                    expirados: estadisticas.creditos_expirados,
                    ingresosMPClp: Math.round(estadisticasMP?.total_recibido_mes ?? 0),
                  }
                : undefined
            }
            disabled
          />
        ) : null}

        <UsoPlanSection uso={usoFeatures} />
        <FinanzasLiquidacionSection />
        <InteractiveStatsChart
          consumos={consumos}
          precioCreditoReferenciaClp={precioTopUpClp}
        />

        {mostrarBannerComprarCreditos ? (
          <Card
            elevated
            padding={0}
            style={[
              styles.saldoBanner,
              {
                backgroundColor: withOpacitySafe(I.accentYellow, 0.14),
                borderColor: I.hairline,
              },
            ]}
            onPress={() => router.push({ pathname: '/creditos', params: { tab: 'tienda' } })}
          >
            <View style={styles.saldoBannerIconPlate}>
              <InstitutionalIcon
                name="lightning-bolt"
                size={20}
                color={I.ink}
                strokeWidth={ICON_STROKE_WIDTH}
              />
            </View>
            <View style={styles.saldoBannerTextCol}>
              <Text style={[styles.saldoBannerTitle, { color: I.ink }]}>
                {saldoCero ? 'Sin créditos disponibles' : 'Te quedan pocos créditos'}
              </Text>
              <Text style={[styles.saldoBannerSub, { color: I.body }]}>
                {saldoCero
                  ? 'Comprá en Tienda para seguir postulando.'
                  : 'Recargá en Tienda antes de quedarte sin saldo.'}
              </Text>
            </View>
            <InstitutionalIcon
              name="chevron-right"
              size={22}
              color={I.muted}
              strokeWidth={ICON_STROKE_WIDTH}
            />
          </Card>
        ) : null}

        {kpiSugerenciaInsignia.mostrar && kpiSugerenciaInsignia.mensaje ? (
          <Card
            elevated
            padding={0}
            style={styles.saldoBanner}
            onPress={() => router.push({ pathname: '/creditos', params: { tab: 'suscripcion' } })}
          >
            <View style={styles.saldoBannerIconPlate}>
              <InstitutionalIcon
                name="star-circle-outline"
                size={20}
                color={I.ink}
                strokeWidth={ICON_STROKE_WIDTH}
              />
            </View>
            <View style={styles.saldoBannerTextCol}>
              <Text style={[styles.saldoBannerTitle, { color: I.ink }]}>Destacá tu perfil</Text>
              <Text style={[styles.saldoBannerSub, { color: I.body }]}>
                {kpiSugerenciaInsignia.mensaje}
              </Text>
            </View>
            <InstitutionalIcon
              name="chevron-right"
              size={20}
              color={I.muted}
              strokeWidth={ICON_STROKE_WIDTH}
            />
          </Card>
        ) : null}

        <SaldoBenefitGrid />
      </ScrollView>
    </CreditosHostShell>
  );
}

const styles = StyleSheet.create({
  saldoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.fixed.md,
    paddingVertical: SPACING.fixed.sm,
    marginBottom: SPACING.md,
    gap: SPACING.sm,
    borderWidth: BORDERS.width.thin,
  },
  saldoBannerIconPlate: {
    ...hostIconPlateStyle,
  },
  saldoBannerTextCol: { flex: 1, minWidth: 0 },
  saldoBannerTitle: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
  },
  saldoBannerSub: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontFamily: TYPOGRAPHY.fontFamily.sansRegular,
    marginTop: 2,
    lineHeight: 18,
  },
});
