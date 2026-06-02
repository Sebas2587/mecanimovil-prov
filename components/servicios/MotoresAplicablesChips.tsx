import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, SPACING, TYPOGRAPHY, BORDERS } from '@/app/design-system/tokens';
import {
  labelTipoMotor,
  motoresCatalogoUniversal,
  normalizeMotoresLista,
  resumenMotoresCatalogo,
  type TipoMotorCodigo,
} from '@/utils/tiposMotorCatalogo';

const I = COLORS.institutional;

type Props = {
  motores?: TipoMotorCodigo[] | string[] | null;
  tipoMotorOferta?: string | null;
  compact?: boolean;
};

export function MotoresAplicablesChips({ motores, tipoMotorOferta, compact }: Props) {
  const catalogo = normalizeMotoresLista(motores);
  const oferta = tipoMotorOferta ? normalizeMotoresLista([tipoMotorOferta])[0] : null;

  if (oferta) {
    return (
      <View style={styles.row}>
        <View style={[styles.chip, styles.chipPrimary]}>
          <Text style={[styles.chipText, styles.chipTextPrimary]}>{labelTipoMotor(oferta)}</Text>
        </View>
      </View>
    );
  }

  if (motoresCatalogoUniversal(catalogo)) {
    if (compact) return null;
    return (
      <View style={styles.row}>
        <View style={styles.chip}>
          <Text style={styles.chipText}>Todos los motores</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.row}>
      {catalogo.map((m) => (
        <View key={m} style={styles.chip}>
          <Text style={styles.chipText}>{labelTipoMotor(m)}</Text>
        </View>
      ))}
    </View>
  );
}

export function MotoresAplicablesHint({ motores }: { motores?: TipoMotorCodigo[] | string[] | null }) {
  const catalogo = normalizeMotoresLista(motores);
  return (
    <Text style={styles.hint}>
      Visible para clientes con: {resumenMotoresCatalogo(catalogo)}
    </Text>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.fixed.xs,
    marginTop: SPACING.fixed.xs,
  },
  chip: {
    paddingHorizontal: SPACING.fixed.sm,
    paddingVertical: 2,
    borderRadius: BORDERS.radius.full,
    backgroundColor: I.surfaceMuted,
    borderWidth: 1,
    borderColor: I.border,
  },
  chipPrimary: {
    backgroundColor: I.primaryMuted,
    borderColor: I.primary,
  },
  chipText: {
    ...TYPOGRAPHY.styles.caption,
    fontFamily: TYPOGRAPHY.fontFamily.medium,
    color: I.muted,
  },
  chipTextPrimary: {
    color: I.primary,
  },
  hint: {
    ...TYPOGRAPHY.styles.caption,
    color: I.muted,
    marginTop: SPACING.fixed.xs,
  },
});
