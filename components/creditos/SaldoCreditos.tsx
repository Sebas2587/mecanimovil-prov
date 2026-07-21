import React, { memo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Wallet, ChevronRight } from 'lucide-react-native';
import { router } from 'expo-router';
import { COLORS, SPACING, TYPOGRAPHY, BORDERS, SHADOWS } from '@/app/design-system/tokens';
import { ICON_STROKE_WIDTH, ICON_SIZE } from '@/app/design-system/iconography';
import {
  hostIconPlateColor,
  hostIconPlateStyle,
} from '@/app/design-system/styles/institutionalSemantic';
import { Card } from '@/app/design-system/components';

const I = COLORS.institutional;

export interface SaldoMesStats {
  consumidos: number;
  comprados: number;
  expirados: number;
  ingresosMPClp: number;
}

interface SaldoCreditosProps {
  saldo: number;
  creditosPlanMensuales?: number;
  fechaUltimoConsumo?: string | null;
  fechaUltimaCompra?: string | null;
  /** ISO; solo con plan activo. Pill + fecha arriba a la izquierda, alineada con el badge. */
  fechaProximaRecarga?: string | null;
  mesStats?: SaldoMesStats;
  onPress?: () => void;
  titulo?: string;
  disabled?: boolean;
}

function formatFechaCorta(iso: string | null | undefined) {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleDateString('es-CL', {
      day: 'numeric',
      month: 'short',
    });
  } catch {
    return null;
  }
}

function formatFechaRecarga(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('es-CL', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
    });
  } catch {
    return '';
  }
}

function formatCLP(amount: number) {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export const SaldoCreditos = memo(function SaldoCreditos({
  saldo,
  creditosPlanMensuales,
  fechaUltimoConsumo,
  fechaUltimaCompra,
  fechaProximaRecarga,
  mesStats,
  onPress,
  titulo,
  disabled = false,
}: SaldoCreditosProps) {
  const conSaldo = saldo > 0;
  const saldoColor = conSaldo ? I.ink : I.semanticDown;
  const recargaStr = fechaProximaRecarga ? formatFechaRecarga(fechaProximaRecarga) : '';

  const handlePress = () => {
    if (disabled) return;
    if (onPress) onPress();
    else router.push('/creditos');
  };

  const fc = formatFechaCorta(fechaUltimoConsumo);
  const fcom = formatFechaCorta(fechaUltimaCompra);

  const content = (
    <>
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          {fechaProximaRecarga && recargaStr ? (
            <View style={styles.recargaRow}>
              <View style={styles.sectionPill}>
                <Text style={styles.sectionPillText}>PRÓXIMA RECARGA</Text>
              </View>
              <Text style={styles.proximaRecargaDate} numberOfLines={1}>
                {recargaStr}
              </Text>
            </View>
          ) : (
            <Text style={styles.cardTitle}>Saldo</Text>
          )}
        </View>
        <View style={[styles.statusBadge, { backgroundColor: I.surfaceStrong }]}>
          <Text
            style={[
              styles.statusBadgeText,
              { color: conSaldo ? I.semanticUp : I.semanticDown },
            ]}
          >
            {conSaldo ? 'Con saldo' : 'Sin saldo'}
          </Text>
        </View>
      </View>

      <View style={styles.heroRow}>
        <View style={styles.iconPlate}>
          <Wallet size={ICON_SIZE.md} color={hostIconPlateColor} strokeWidth={ICON_STROKE_WIDTH} />
        </View>

        <View style={styles.heroMain}>
          <View style={styles.saldoRow}>
            <Text style={[styles.saldoNumber, { color: saldoColor }]}>{saldo}</Text>
            <Text style={styles.saldoUnit}>créditos</Text>
          </View>

          {titulo ? (
            <Text style={styles.metaLine} numberOfLines={1}>
              {creditosPlanMensuales != null
                ? `Plan ${titulo} · ${creditosPlanMensuales} cr./mes`
                : `Plan ${titulo}`}
            </Text>
          ) : (
            <Text style={styles.metaLine} numberOfLines={1}>
              Para postular y enviar ofertas
            </Text>
          )}

          {(fc || fcom) && (
            <View style={styles.fechasRow}>
              {fc ? <Text style={styles.fechaMini}>Últ. consumo {fc}</Text> : null}
              {fc && fcom ? <Text style={styles.fechaDot}>·</Text> : null}
              {fcom ? <Text style={styles.fechaMini}>Últ. compra {fcom}</Text> : null}
            </View>
          )}
        </View>

        {!disabled && (
          <ChevronRight size={20} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
        )}
      </View>

      {mesStats ? (
        <View style={[styles.resumenWrap, { borderTopColor: I.hairline }]}>
          <Text style={styles.sectionKicker}>Resumen del mes</Text>
          <View style={styles.resumenGrid}>
            <View
              style={[
                styles.resumenRow,
                styles.resumenRowDivider,
                { borderBottomColor: I.hairline },
              ]}
            >
              <View style={styles.statColLeft}>
                <Text style={styles.statLabel}>Consumidos</Text>
                <Text style={[styles.statValue, { color: I.ink }]}>{mesStats.consumidos}</Text>
              </View>
              <View style={[styles.statColRight, { borderLeftColor: I.hairline }]}>
                <Text style={styles.statLabel}>Comprados</Text>
                <Text style={[styles.statValue, { color: I.semanticUp }]}>
                  {mesStats.comprados}
                </Text>
              </View>
            </View>
            <View style={styles.resumenRow}>
              <View style={styles.statColLeft}>
                <Text style={styles.statLabel}>Expirados</Text>
                <Text
                  style={[
                    styles.statValue,
                    { color: mesStats.expirados > 0 ? I.semanticDown : I.muted },
                  ]}
                >
                  {mesStats.expirados}
                </Text>
              </View>
              <View style={[styles.statColRight, { borderLeftColor: I.hairline }]}>
                <Text style={styles.statLabel}>Ingresos MP</Text>
                <Text style={[styles.statValueClp, { color: I.primary }]} numberOfLines={1}>
                  {formatCLP(mesStats.ingresosMPClp)}
                </Text>
              </View>
            </View>
          </View>
        </View>
      ) : null}
    </>
  );

  if (disabled) {
    return (
      <Card elevated padding="host" style={styles.card}>
        {content}
      </Card>
    );
  }

  return (
    <Card elevated padding="host" onPress={handlePress} style={styles.card}>
      {content}
    </Card>
  );
});

const styles = StyleSheet.create({
  card: {
    marginBottom: SPACING.md,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  topBarLeft: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  recargaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  sectionPill: {
    alignSelf: 'flex-start',
    backgroundColor: I.surfaceSoft,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 4,
    borderRadius: BORDERS.radius.sm,
  },
  sectionPillText: {
    fontSize: 10,
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    fontWeight: TYPOGRAPHY.fontWeight.semibold as '600',
    color: I.muted,
    letterSpacing: 0.65,
  },
  sectionKicker: {
    fontSize: TYPOGRAPHY.styles.h6.fontSize,
    lineHeight: Math.round(TYPOGRAPHY.styles.h6.fontSize * TYPOGRAPHY.styles.h6.lineHeight),
    fontFamily: TYPOGRAPHY.fontFamily.sansMedium,
    fontWeight: '500',
    letterSpacing: TYPOGRAPHY.letterSpacing.wider,
    textTransform: 'uppercase',
    color: I.muted,
    marginBottom: SPACING.fixed.xxs,
  },
  proximaRecargaDate: {
    flex: 1,
    minWidth: 120,
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: TYPOGRAPHY.fontFamily.sansMedium,
    color: I.ink,
  },
  cardTitle: {
    ...TYPOGRAPHY.styles.h4,
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    color: I.ink,
  },
  statusBadge: {
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    borderRadius: BORDERS.radius.sm,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    backgroundColor: I.surfaceSoft,
    flexShrink: 0,
  },
  statusBadgeText: {
    fontSize: 12,
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    fontWeight: TYPOGRAPHY.fontWeight.semibold as '600',
    letterSpacing: 0.2,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },
  iconPlate: {
    ...hostIconPlateStyle,
    marginTop: 2,
  },
  heroMain: {
    flex: 1,
    minWidth: 0,
  },
  saldoRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  saldoNumber: {
    fontSize: 30,
    fontFamily: TYPOGRAPHY.fontFamily.monoMedium,
    fontWeight: '500',
    letterSpacing: TYPOGRAPHY.letterSpacing.tight,
    lineHeight: 34,
  },
  saldoUnit: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: TYPOGRAPHY.fontFamily.sansMedium,
    color: I.muted,
  },
  metaLine: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontFamily: TYPOGRAPHY.fontFamily.sansRegular,
    color: I.body,
    marginTop: 4,
  },
  fechasRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  fechaMini: {
    fontSize: 11,
    fontFamily: TYPOGRAPHY.fontFamily.sansRegular,
    color: I.muted,
  },
  fechaDot: {
    fontSize: 11,
    color: I.mutedSoft,
  },
  resumenWrap: {
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  resumenGrid: {
    width: '100%',
  },
  resumenRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingVertical: 14,
  },
  resumenRowDivider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  statColLeft: {
    flex: 1,
    minWidth: 0,
    paddingRight: SPACING.fixed.md,
    justifyContent: 'center',
  },
  statColRight: {
    flex: 1,
    minWidth: 0,
    borderLeftWidth: StyleSheet.hairlineWidth,
    paddingLeft: SPACING.fixed.md,
    justifyContent: 'center',
  },
  statLabel: {
    fontSize: TYPOGRAPHY.styles.h6.fontSize,
    fontFamily: TYPOGRAPHY.fontFamily.sansMedium,
    fontWeight: '500',
    color: I.muted,
    letterSpacing: TYPOGRAPHY.letterSpacing.wider,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  statValue: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontFamily: TYPOGRAPHY.fontFamily.monoMedium,
    fontWeight: '500',
  },
  statValueClp: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontFamily: TYPOGRAPHY.fontFamily.monoMedium,
    fontWeight: '500',
  },
});
