import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { ChevronRight, ShieldCheck, Wallet } from 'lucide-react-native';
import {
  COLORS,
  SPACING,
  TYPOGRAPHY,
  BORDERS,
  SHADOWS,
  withOpacity,
} from '@/app/design-system/tokens';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import { PrimaryGradientFill } from '@/app/design-system/components/PrimaryGradientFill';
import {
  hostIconPlateColor,
  hostIconPlateStyle,
} from '@/app/design-system/styles/institutionalSemantic';
import { formatearMontoCLP } from '@/utils/formatearMontoCLP';
import type { GananciasTallerResumen } from '@/services/kpisProveedorService';
import type { CreditoProveedor } from '@/services/creditosService';
import type { SuscripcionProveedor } from '@/services/suscripcionesService';
import { formatearDeltaMesAnterior, progresoCalendarioMes } from '@/utils/finanzasMes';

const I = COLORS.institutional;
const FF = TYPOGRAPHY.fontFamily;
const TS = TYPOGRAPHY.styles;
const CARD_MIN_HEIGHT = 168;

const lh = (fontSize: number, mult: number) => Math.round(fontSize * mult);

export type FinanzasTallerCardProps = {
  ganancias: GananciasTallerResumen | null | undefined;
  saldoCreditos: CreditoProveedor | null | undefined;
  suscripcion?: SuscripcionProveedor | null;
  esSupervisor?: boolean;
  isLoadingGanancias?: boolean;
  isLoadingCreditos?: boolean;
  warningEmphasis?: string;
  onPress: () => void;
  onRecargarCreditos: () => void;
  onPressPlan?: () => void;
  style?: StyleProp<ViewStyle>;
  fill?: boolean;
};

function formatCompactMonto(value: number): string {
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1).replace('.0', '')}M`;
  }
  if (value >= 100_000) {
    return `$${Math.round(value / 1000)}k`;
  }
  return formatearMontoCLP(value);
}

export function FinanzasTallerCard({
  ganancias,
  saldoCreditos,
  suscripcion,
  esSupervisor = false,
  isLoadingGanancias = false,
  isLoadingCreditos = false,
  warningEmphasis = COLORS.warning.dark,
  onPress,
  onRecargarCreditos,
  onPressPlan,
  style,
  fill = false,
}: FinanzasTallerCardProps) {
  const loadingGanancias = isLoadingGanancias && !ganancias;

  const resumen = useMemo(() => {
    const m = ganancias?.ganancias_mecanimovil ?? 0;
    const p = ganancias?.ganancias_agenda_personal ?? 0;
    const total = ganancias?.ganancias_total ?? m + p;
    const calendario = progresoCalendarioMes();
    const delta = formatearDeltaMesAnterior(ganancias?.delta_pct_mes);
    const ambosConIngreso = m > 0 && p > 0;

    return { mecanimovil: m, propias: p, total, calendario, delta, ambosConIngreso };
  }, [ganancias]);

  const creditos = saldoCreditos?.saldo_creditos ?? 0;
  const planActivo = suscripcion?.esta_activa && !esSupervisor;

  const contextLine = loadingGanancias
    ? 'Cargando resumen…'
    : `Día ${resumen.calendario.diaActual}/${resumen.calendario.diasEnMes} · ${resumen.delta.label}`;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Finanzas del mes, ver detalle"
      style={({ pressed }) => [
        styles.card,
        fill && styles.cardFill,
        pressed && styles.pressed,
        style,
      ]}
    >
      <View style={[styles.inner, fill && styles.innerFill]}>
        <View style={styles.headerRow}>
          <View style={styles.titleLeft}>
            <View style={hostIconPlateStyle}>
              <Wallet size={20} color={hostIconPlateColor} strokeWidth={ICON_STROKE_WIDTH} />
            </View>
            <Text style={styles.title}>Finanzas del mes</Text>
          </View>
          <View style={styles.headerActions}>
            {planActivo && onPressPlan ? (
              <Pressable
                onPress={onPressPlan}
                style={({ pressed: planPressed }) => [
                  styles.planBadge,
                  suscripcion?.plan?.destacado && styles.planBadgeDestacado,
                  planPressed && styles.pressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Plan ${suscripcion?.plan?.nombre ?? 'activo'}`}
              >
                <ShieldCheck
                  size={12}
                  color={suscripcion?.plan?.destacado ? warningEmphasis : I.primary}
                />
              </Pressable>
            ) : null}
            <View style={styles.chevronCircle}>
              <ChevronRight size={16} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
            </View>
          </View>
        </View>

        <Text style={styles.monthLine} numberOfLines={1}>
          Total {resumen.calendario.nombreMes}
        </Text>

        <View style={styles.kpiRow}>
          {loadingGanancias ? (
            <ActivityIndicator size="small" color={I.primary} />
          ) : (
            <Text style={styles.totalAmount}>{formatearMontoCLP(resumen.total)}</Text>
          )}
        </View>

        <Text
          style={[
            styles.contextLine,
            !loadingGanancias && resumen.delta.tone === 'up' && styles.contextUp,
            !loadingGanancias && resumen.delta.tone === 'down' && styles.contextDown,
          ]}
          numberOfLines={2}
        >
          {contextLine}
        </Text>

        {!loadingGanancias && resumen.ambosConIngreso ? (
          <View style={styles.splitTrack}>
            <View
              style={[
                styles.splitFillPrimary,
                {
                  flex: Math.max(
                    1,
                    resumen.total > 0 ? resumen.mecanimovil / resumen.total : 0,
                  ),
                },
              ]}
            />
            <View
              style={[
                styles.splitFillSecondary,
                {
                  flex: Math.max(
                    1,
                    resumen.total > 0 ? resumen.propias / resumen.total : 0,
                  ),
                },
              ]}
            />
          </View>
        ) : null}

        <View style={styles.footerRow}>
          <View style={styles.footerMetaBlock}>
            <Text style={styles.footerMeta} numberOfLines={2}>
              {loadingGanancias
                ? '—'
                : `App ${formatCompactMonto(resumen.mecanimovil)} · Propias ${formatCompactMonto(resumen.propias)}`}
            </Text>
            {isLoadingCreditos && !saldoCreditos ? (
              <ActivityIndicator size="small" color={I.muted} />
            ) : (
              <Text style={styles.creditsText} numberOfLines={1}>
                {creditos.toLocaleString('es-CL')} pts
              </Text>
            )}
          </View>
          {!esSupervisor ? (
            <Pressable
              onPress={onRecargarCreditos}
              style={({ pressed: recargaPressed }) => [
                styles.recargaBtn,
                recargaPressed && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Recargar créditos"
            >
              <PrimaryGradientFill style={StyleSheet.absoluteFillObject} />
              <Text style={styles.recargaBtnText}>Recargar</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: BORDERS.radius.lg,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    backgroundColor: COLORS.background.paper,
    overflow: 'hidden',
    minHeight: CARD_MIN_HEIGHT,
    ...SHADOWS.editorial,
  },
  cardFill: {
    flex: 1,
    alignSelf: 'stretch',
  },
  pressed: {
    opacity: 0.94,
    transform: [{ scale: 0.99 }],
  },
  inner: {
    padding: SPACING.md,
    gap: SPACING.sm,
    minHeight: CARD_MIN_HEIGHT,
  },
  innerFill: {
    flex: 1,
    justifyContent: 'space-between',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: TS.h4.fontSize,
    lineHeight: lh(TS.h4.fontSize, TS.h4.lineHeight),
    fontFamily: FF.sansSemiBold,
    color: I.ink,
    flexShrink: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  planBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    backgroundColor: I.surfaceSoft,
  },
  planBadgeDestacado: {
    borderColor: withOpacity(I.accentYellow, 0.5),
    backgroundColor: COLORS.background.warning,
  },
  chevronCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: I.surfaceSoft,
  },
  monthLine: {
    fontSize: TS.caption.fontSize,
    lineHeight: lh(TS.caption.fontSize, TS.caption.lineHeight),
    fontFamily: FF.sansRegular,
    color: I.body,
    textTransform: 'capitalize',
  },
  kpiRow: {
    minHeight: 36,
    justifyContent: 'center',
  },
  totalAmount: {
    fontSize: TYPOGRAPHY.fontSize['3xl'],
    lineHeight: lh(TYPOGRAPHY.fontSize['3xl'], TS.numberDisplay.lineHeight),
    fontFamily: FF.monoMedium,
    color: I.ink,
    letterSpacing: TYPOGRAPHY.letterSpacing.tight,
  },
  contextLine: {
    fontSize: TS.small.fontSize,
    lineHeight: lh(TS.small.fontSize, TS.small.lineHeight),
    fontFamily: FF.sansRegular,
    color: I.muted,
  },
  contextUp: {
    color: I.semanticUp,
  },
  contextDown: {
    color: I.semanticDown,
  },
  splitTrack: {
    flexDirection: 'row',
    height: 4,
    borderRadius: BORDERS.radius.pill,
    overflow: 'hidden',
    backgroundColor: I.surfaceSoft,
  },
  splitFillPrimary: {
    backgroundColor: I.primary,
  },
  splitFillSecondary: {
    backgroundColor: withOpacity(COLORS.brand.orange, 0.45),
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: SPACING.sm,
    marginTop: SPACING.xs,
    paddingTop: SPACING.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: I.hairline,
  },
  footerMetaBlock: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  footerMeta: {
    fontSize: TS.small.fontSize,
    lineHeight: lh(TS.small.fontSize, TS.small.lineHeight),
    fontFamily: FF.sansRegular,
    color: I.body,
  },
  creditsText: {
    fontSize: TS.captionBold.fontSize,
    lineHeight: lh(TS.captionBold.fontSize, TS.captionBold.lineHeight),
    fontFamily: FF.monoMedium,
    color: I.ink,
  },
  recargaBtn: {
    overflow: 'hidden',
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
    borderRadius: BORDERS.radius.md,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  recargaBtnText: {
    fontSize: TS.captionBold.fontSize,
    lineHeight: lh(TS.captionBold.fontSize, TS.captionBold.lineHeight),
    fontFamily: FF.sansSemiBold,
    color: I.onPrimary,
    zIndex: 1,
  },
});
