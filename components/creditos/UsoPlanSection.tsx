import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, SPACING, TYPOGRAPHY, BORDERS } from '@/app/design-system/tokens';
import { Card, HostMetricRow } from '@/app/design-system/components';
import type { UsoFeaturesMes } from '@/services/suscripcionesService';

const I = COLORS.institutional;

function barraProgreso(usados: number, limite: number) {
  if (limite <= 0) return 0;
  return Math.min(1, usados / limite);
}

interface UsoPlanSectionProps {
  uso: UsoFeaturesMes | null;
}

export function UsoPlanSection({ uso }: UsoPlanSectionProps) {
  if (!uso?.plan) {
    return (
      <Card elevated padding="host" style={styles.card}>
        <Text style={styles.kicker}>Uso del plan</Text>
        <Text style={styles.empty}>
          Activa una suscripción para ver cotizaciones IA, diagnósticos, patentes y mensajería incluidos.
        </Text>
      </Card>
    );
  }

  return (
    <Card elevated padding="host" style={styles.card}>
      <Text style={styles.kicker}>Uso del plan · {uso.periodo}</Text>
      <Text style={styles.planName}>{uso.plan.nombre}</Text>

      {uso.features.map((f) => {
        const pct = barraProgreso(f.usados, f.limite);
        const agotado = f.limite > 0 && f.usados >= f.limite;
        return (
          <View key={f.feature} style={styles.featureBlock}>
            <View style={styles.featureHeader}>
              <Text style={styles.featureLabel}>{f.label}</Text>
              <Text style={[styles.featureCount, agotado && styles.featureCountWarn]}>
                {f.usados} / {f.limite}
              </Text>
            </View>
            <View style={styles.track}>
              <View
                style={[
                  styles.fill,
                  { width: `${Math.round(pct * 100)}%` },
                  agotado && styles.fillWarn,
                ]}
              />
            </View>
            {f.overage_por_credito > 0 && f.creditos_overage_gastados > 0 ? (
              <Text style={styles.overageMeta}>
                {f.creditos_overage_gastados} crédito(s) usados en excedente este mes
              </Text>
            ) : null}
            {f.overage_por_credito > 0 && agotado ? (
              <Text style={styles.overageHint}>
                Excedente: 1 crédito = {f.overage_por_credito} usos extra
              </Text>
            ) : null}
          </View>
        );
      })}

      <HostMetricRow
        label="Canales conectados"
        value={`${uso.canales_conectados} / ${uso.canales_mensajeria_max}`}
        last
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  kicker: {
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: I.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  planName: {
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    fontSize: TYPOGRAPHY.fontSize.md,
    color: I.ink,
    marginBottom: SPACING.xs,
  },
  empty: {
    fontFamily: TYPOGRAPHY.fontFamily.sansRegular,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: I.body,
    lineHeight: 20,
  },
  featureBlock: {
    gap: 4,
    marginTop: SPACING.xs,
  },
  featureHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  featureLabel: {
    fontFamily: TYPOGRAPHY.fontFamily.sansRegular,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: I.body,
    flex: 1,
  },
  featureCount: {
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: I.ink,
  },
  featureCountWarn: {
    color: I.semanticDown,
  },
  track: {
    height: 6,
    borderRadius: BORDERS.radius.full,
    backgroundColor: I.surfaceSoft,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: I.primary,
    borderRadius: BORDERS.radius.full,
  },
  fillWarn: {
    backgroundColor: I.semanticDown,
  },
  overageMeta: {
    fontFamily: TYPOGRAPHY.fontFamily.sansRegular,
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: I.muted,
  },
  overageHint: {
    fontFamily: TYPOGRAPHY.fontFamily.sansRegular,
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: I.muted,
  },
});
