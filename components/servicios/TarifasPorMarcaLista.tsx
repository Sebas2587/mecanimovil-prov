import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, SPACING, TYPOGRAPHY, BORDERS, withOpacity } from '@/app/design-system/tokens';
import type { TarifaPorMarca } from '@/utils/tarifasPorMarca';
import { formatearPrecioCLP } from '@/utils/tarifasPorMarca';

const I = COLORS.institutional;
const FF = TYPOGRAPHY.fontFamily;

type Props = {
  tarifas: TarifaPorMarca[];
  compact?: boolean;
  showSoloSiVarias?: boolean;
};

export default function TarifasPorMarcaLista({
  tarifas,
  compact = false,
  showSoloSiVarias = true,
}: Props) {
  if (!tarifas?.length) return null;

  const preciosUnicos = new Set(
    tarifas.map((t) => (t.precioPublico != null ? Math.round(t.precioPublico) : -1)),
  );
  if (showSoloSiVarias && preciosUnicos.size <= 1 && tarifas.length <= 1) {
    return null;
  }

  return (
    <View style={[styles.wrap, compact && styles.wrapCompact]}>
      {tarifas.map((t) => (
        <View key={t.ofertaId} style={styles.row}>
          <Text style={[styles.marca, compact && styles.marcaCompact]} numberOfLines={1}>
            {t.marcaLabel}
          </Text>
          <Text
            style={[
              styles.precio,
              compact && styles.precioCompact,
              !t.disponible && styles.precioOff,
            ]}
            numberOfLines={1}
          >
            {formatearPrecioCLP(t.precioPublico)}
          </Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: SPACING.fixed.sm,
    paddingTop: SPACING.fixed.sm,
    borderTopWidth: BORDERS.width.thin,
    borderTopColor: I.hairline,
    gap: SPACING.fixed.xs,
  },
  wrapCompact: {
    marginTop: SPACING.fixed.xs,
    paddingTop: SPACING.fixed.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.fixed.sm,
  },
  marca: {
    flex: 1,
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansMedium,
    color: I.muted,
  },
  marcaCompact: {
    fontSize: TYPOGRAPHY.fontSize.xs,
  },
  precio: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansSemiBold,
    color: I.ink,
  },
  precioCompact: {
    fontSize: TYPOGRAPHY.fontSize.xs,
  },
  precioOff: {
    color: I.mutedSoft,
    textDecorationLine: 'line-through',
  },
});
