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
import { ShieldCheck } from 'lucide-react-native';
import {
  COLORS,
  SPACING,
  TYPOGRAPHY,
  BORDERS,
  SHADOWS,
  withOpacity,
} from '@/app/design-system/tokens';
import { formatearMontoCLP } from '@/utils/formatearMontoCLP';
import { InstitutionalButton } from '@/app/design-system/components/InstitutionalButton';
import type { GananciasTallerResumen } from '@/services/kpisProveedorService';
import type { CreditoProveedor } from '@/services/creditosService';
import type { SuscripcionProveedor } from '@/services/suscripcionesService';

const I = COLORS.institutional;
const FF = TYPOGRAPHY.fontFamily;
const TS = TYPOGRAPHY.styles;

const lh = (fontSize: number, mult: number) => Math.round(fontSize * mult);

export type FinanzasTallerCardProps = {
  ganancias: GananciasTallerResumen | null | undefined;
  saldoCreditos: CreditoProveedor | null | undefined;
  suscripcion?: SuscripcionProveedor | null;
  esSupervisor?: boolean;
  isLoadingGanancias?: boolean;
  isLoadingCreditos?: boolean;
  warningEmphasis?: string;
  onRecargarCreditos: () => void;
  onPressPlan?: () => void;
  style?: StyleProp<ViewStyle>;
};

type EarningsRowProps = {
  label: string;
  amount: number;
  sharePct: number;
  highlight?: boolean;
  loading?: boolean;
};

function EarningsRow({ label, amount, sharePct, highlight, loading }: EarningsRowProps) {
  const barWidth = amount > 0 ? Math.max(sharePct, 4) : 0;

  return (
    <View style={styles.barRow}>
      <View style={styles.barMeta}>
        <Text style={[styles.barLabel, highlight && styles.barLabelActive]} numberOfLines={1}>
          {label}
        </Text>
        <Text style={styles.barPct}>{loading ? '—' : `${sharePct}%`}</Text>
      </View>
      {loading ? (
        <ActivityIndicator size="small" color={I.muted} style={styles.amountLoader} />
      ) : (
        <Text style={[styles.barAmount, highlight && styles.barAmountActive]}>
          {formatearMontoCLP(amount)}
        </Text>
      )}
      <View style={styles.barTrack}>
        <View
          style={[
            styles.barFill,
            highlight ? styles.barFillPrimary : styles.barFillSecondary,
            { width: `${barWidth}%` },
          ]}
        />
      </View>
    </View>
  );
}

export function FinanzasTallerCard({
  ganancias,
  saldoCreditos,
  suscripcion,
  esSupervisor = false,
  isLoadingGanancias = false,
  isLoadingCreditos = false,
  warningEmphasis = COLORS.warning.text,
  onRecargarCreditos,
  onPressPlan,
  style,
}: FinanzasTallerCardProps) {
  const { mecanimovil, propias, pctMecanimovil, pctPropias } = useMemo(() => {
    const m = ganancias?.ganancias_mecanimovil ?? 0;
    const p = ganancias?.ganancias_agenda_personal ?? 0;
    const total = m + p;
    if (total <= 0) {
      return { mecanimovil: m, propias: p, pctMecanimovil: 0, pctPropias: 0 };
    }
    const pctMecanimovil = Math.round((m / total) * 100);
    return {
      mecanimovil: m,
      propias: p,
      pctMecanimovil,
      pctPropias: 100 - pctMecanimovil,
    };
  }, [ganancias]);

  const creditos = saldoCreditos?.saldo_creditos ?? 0;
  const planActivo = suscripcion?.esta_activa && !esSupervisor;

  return (
    <View style={[styles.cardOuter, style]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Finanzas del mes</Text>
        {planActivo && onPressPlan ? (
          <Pressable
            onPress={onPressPlan}
            style={({ pressed }) => [
              styles.planBadge,
              suscripcion?.plan?.destacado && styles.planBadgeDestacado,
              pressed && styles.pressed,
            ]}
            accessibilityRole="button"
            accessibilityLabel={`Plan ${suscripcion?.plan?.nombre ?? 'activo'}`}
          >
            <ShieldCheck
              size={14}
              color={suscripcion?.plan?.destacado ? warningEmphasis : I.primary}
            />
            <Text
              style={[
                styles.planBadgeText,
                suscripcion?.plan?.destacado && { color: warningEmphasis },
              ]}
              numberOfLines={1}
            >
              {suscripcion?.plan?.nombre?.trim() || 'Plan activo'}
            </Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.earningsBlock}>
        <EarningsRow
          label="Mecanimóvil App"
          amount={mecanimovil}
          sharePct={pctMecanimovil}
          highlight
          loading={isLoadingGanancias && !ganancias}
        />
        <EarningsRow
          label="Órdenes propias"
          amount={propias}
          sharePct={pctPropias}
          loading={isLoadingGanancias && !ganancias}
        />
      </View>

      <View style={styles.creditsRow}>
        <View style={styles.creditsTextBlock}>
          <Text style={styles.creditsLabel}>Créditos disponibles</Text>
          {isLoadingCreditos && !saldoCreditos ? (
            <ActivityIndicator size="small" color={I.primary} />
          ) : (
            <Text style={styles.creditsValue}>
              {creditos.toLocaleString('es-CL')}
              <Text style={styles.creditsUnit}> pts</Text>
            </Text>
          )}
        </View>

        {!esSupervisor ? (
          <InstitutionalButton
            label="Recargar"
            variant="primary"
            size="compact"
            onPress={onRecargarCreditos}
            accessibilityLabel="Recargar créditos"
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardOuter: {
    borderRadius: BORDERS.radius.lg,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    backgroundColor: I.canvas,
    padding: SPACING.fixed.md,
    gap: SPACING.fixed.sm,
    ...SHADOWS.editorial,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.fixed.sm,
  },
  headerTitle: {
    flex: 1,
    fontSize: TS.captionBold.fontSize,
    lineHeight: lh(TS.captionBold.fontSize, TS.captionBold.lineHeight),
    fontFamily: FF.sansSemiBold,
    color: I.muted,
    textTransform: 'uppercase',
    letterSpacing: TYPOGRAPHY.letterSpacing.wide,
  },
  planBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    maxWidth: '46%',
    paddingHorizontal: SPACING.fixed.sm,
    paddingVertical: 3,
    borderRadius: BORDERS.radius.pill,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    backgroundColor: I.canvas,
  },
  planBadgeDestacado: {
    borderColor: withOpacity(I.accentYellow, 0.5),
    backgroundColor: withOpacity(I.accentYellow, 0.08),
  },
  planBadgeText: {
    fontSize: TS.small.fontSize,
    lineHeight: lh(TS.small.fontSize, TS.small.lineHeight),
    fontFamily: FF.sansSemiBold,
    color: I.primary,
    flexShrink: 1,
  },
  pressed: {
    opacity: 0.88,
  },
  earningsBlock: {
    gap: SPACING.fixed.md,
    paddingTop: SPACING.fixed.xxs,
  },
  barRow: {
    gap: SPACING.fixed.xs,
  },
  barMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.fixed.sm,
  },
  barLabel: {
    flex: 1,
    fontSize: TS.caption.fontSize,
    lineHeight: lh(TS.caption.fontSize, TS.caption.lineHeight),
    fontFamily: FF.sansRegular,
    color: I.body,
  },
  barLabelActive: {
    fontFamily: FF.sansSemiBold,
    color: I.ink,
  },
  barPct: {
    fontSize: TS.captionBold.fontSize,
    lineHeight: lh(TS.captionBold.fontSize, TS.captionBold.lineHeight),
    fontFamily: FF.sansSemiBold,
    color: I.ink,
  },
  barAmount: {
    fontSize: TS.numberDisplay.fontSize,
    lineHeight: lh(TS.numberDisplay.fontSize, TS.numberDisplay.lineHeight),
    fontFamily: FF.monoMedium,
    color: I.ink,
    letterSpacing: TYPOGRAPHY.letterSpacing.tight,
  },
  barAmountActive: {
    fontSize: TYPOGRAPHY.fontSize['2xl'],
    lineHeight: lh(TYPOGRAPHY.fontSize['2xl'], TS.numberDisplay.lineHeight),
  },
  amountLoader: {
    alignSelf: 'flex-start',
  },
  barTrack: {
    height: 6,
    borderRadius: BORDERS.radius.pill,
    backgroundColor: I.surfaceStrong,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: BORDERS.radius.pill,
    minWidth: 0,
  },
  barFillPrimary: {
    backgroundColor: I.primary,
  },
  barFillSecondary: {
    backgroundColor: I.mutedSoft,
  },
  creditsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.fixed.sm,
    marginTop: 2,
    paddingTop: SPACING.fixed.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: I.hairline,
  },
  creditsTextBlock: {
    flex: 1,
    minWidth: 0,
    gap: SPACING.fixed.xxs,
  },
  creditsLabel: {
    fontSize: TS.captionBold.fontSize,
    lineHeight: lh(TS.captionBold.fontSize, TS.captionBold.lineHeight),
    fontFamily: FF.sansSemiBold,
    color: I.muted,
    textTransform: 'uppercase',
    letterSpacing: TYPOGRAPHY.letterSpacing.wide,
  },
  creditsValue: {
    fontSize: TYPOGRAPHY.fontSize['3xl'],
    lineHeight: lh(TYPOGRAPHY.fontSize['3xl'], TS.numberDisplay.lineHeight),
    fontFamily: FF.monoMedium,
    color: I.ink,
    letterSpacing: TYPOGRAPHY.letterSpacing.tight,
  },
  creditsUnit: {
    fontSize: TS.small.fontSize,
    lineHeight: lh(TS.small.fontSize, TS.small.lineHeight),
    fontFamily: FF.sansSemiBold,
    color: I.body,
  },
});
