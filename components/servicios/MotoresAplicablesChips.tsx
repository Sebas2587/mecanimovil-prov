import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, SPACING, TYPOGRAPHY, BORDERS } from '@/app/design-system/tokens';
import {
  labelTipoMotor,
  motoresCatalogoUniversal,
  normalizeMotoresLista,
  requiereSelectorAlcanceMotor,
  resumenMotoresCatalogo,
  type TipoMotorCodigo,
} from '@/utils/tiposMotorCatalogo';

const I = COLORS.institutional;

type Props = {
  motores?: TipoMotorCodigo[] | string[] | null;
  tipoMotorOferta?: string | null;
  /** inline = selector/catálogo; card = listas Mis servicios y cards */
  variant?: 'inline' | 'card';
  /** Sin contenedor externo: chips sueltas en fila compartida */
  embed?: boolean;
};

export function MotoresAplicablesChips({
  motores,
  tipoMotorOferta,
  variant = 'inline',
  embed = false,
}: Props) {
  const catalogo = normalizeMotoresLista(motores);
  const oferta = tipoMotorOferta ? normalizeMotoresLista([tipoMotorOferta])[0] : null;
  const universal = motoresCatalogoUniversal(catalogo);
  const chipStyle = variant === 'card' ? styles.chipCard : styles.chip;

  const wrapContent = (content: React.ReactNode) => {
    if (embed) return content;
    return (
      <View style={[styles.wrap, variant === 'card' && styles.wrapCard]}>
        {content}
      </View>
    );
  };

  const rowContent = (children: React.ReactNode) =>
    embed ? <>{children}</> : <View style={styles.row}>{children}</View>;

  const mostrarPrecioEspecifico =
    !!oferta && requiereSelectorAlcanceMotor(catalogo);

  if (mostrarPrecioEspecifico) {
    return wrapContent(
      rowContent(
        <>
          <View style={[chipStyle, styles.chipPrimary]}>
            <Text style={[styles.chipText, styles.chipTextPrimary]}>
              {labelTipoMotor(oferta)}
            </Text>
          </View>
          <View style={[chipStyle, styles.chipMuted]}>
            <Text style={styles.chipTextMuted}>Precio específico</Text>
          </View>
        </>,
      ),
    );
  }

  if (universal) {
    return wrapContent(
      rowContent(
        <View style={[chipStyle, styles.chipNeutral]}>
          <Text style={styles.chipText}>Todos los motores</Text>
        </View>,
      ),
    );
  }

  if (catalogo.length === 1) {
    return wrapContent(
      rowContent(
        <View style={[chipStyle, styles.chipCatalog]}>
          <Text style={styles.chipText}>{labelTipoMotor(catalogo[0])}</Text>
        </View>,
      ),
    );
  }

  return wrapContent(
    rowContent(
      <>
        {catalogo.map((m) => (
          <View key={m} style={[chipStyle, styles.chipCatalog]}>
            <Text style={styles.chipText}>{labelTipoMotor(m)}</Text>
          </View>
        ))}
      </>,
    ),
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
  wrap: {
    marginTop: SPACING.fixed.xs,
  },
  wrapCard: {
    marginTop: 0,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    alignContent: 'flex-start',
    gap: SPACING.fixed.xxs + 2,
  },
  chip: {
    alignSelf: 'flex-start',
    flexShrink: 0,
    paddingHorizontal: SPACING.fixed.sm,
    paddingVertical: 3,
    borderRadius: BORDERS.radius.full,
    backgroundColor: I.surfaceMuted,
    borderWidth: 1,
    borderColor: I.hairline,
  },
  chipCard: {
    paddingHorizontal: SPACING.fixed.sm,
    paddingVertical: 4,
    borderRadius: BORDERS.radius.full,
    backgroundColor: I.surfaceSoft,
    borderWidth: 1,
    borderColor: I.hairline,
  },
  chipCatalog: {
    backgroundColor: I.surfaceSoft,
    borderColor: I.hairline,
  },
  chipNeutral: {
    backgroundColor: I.surfaceMuted,
    borderColor: I.hairline,
  },
  chipPrimary: {
    backgroundColor: I.primaryMuted,
    borderColor: I.primary,
  },
  chipMuted: {
    backgroundColor: I.canvas,
    borderColor: I.hairline,
    paddingHorizontal: SPACING.fixed.xs + 2,
    paddingVertical: 3,
  },
  chipText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontFamily: TYPOGRAPHY.fontFamily.medium,
    color: I.ink,
    lineHeight: Math.round(TYPOGRAPHY.fontSize.xs * 1.35),
  },
  chipTextPrimary: {
    color: I.primary,
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
  },
  chipTextMuted: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontFamily: TYPOGRAPHY.fontFamily.sansRegular,
    color: I.muted,
    lineHeight: Math.round(TYPOGRAPHY.fontSize.xs * 1.35),
  },
  hint: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontFamily: TYPOGRAPHY.fontFamily.sansRegular,
    color: I.muted,
    marginTop: SPACING.fixed.xs,
    lineHeight: Math.round(TYPOGRAPHY.fontSize.xs * 1.45),
  },
});
