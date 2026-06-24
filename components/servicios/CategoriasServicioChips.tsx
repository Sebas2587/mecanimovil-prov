import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, SPACING, TYPOGRAPHY, BORDERS } from '@/app/design-system/tokens';

const I = COLORS.institutional;
const FF = TYPOGRAPHY.fontFamily;

export type CategoriaServicioChip = { id: number; nombre: string };

type Props = {
  categorias: CategoriaServicioChip[];
  /** En fila compartida con otras chips (motor, etc.) */
  embed?: boolean;
};

export function CategoriasServicioChips({ categorias, embed = false }: Props) {
  const items = useMemo(
    () =>
      [...categorias]
        .filter((c) => c?.id && c?.nombre?.trim())
        .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
    [categorias],
  );

  if (items.length === 0) return null;

  const chips = items.map((cat) => (
    <View key={cat.id} style={styles.chip}>
      <Text style={styles.chipText} numberOfLines={2}>
        {cat.nombre}
      </Text>
    </View>
  ));

  if (embed) {
    return <>{chips}</>;
  }

  return <View style={styles.row}>{chips}</View>;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    alignContent: 'flex-start',
    gap: SPACING.fixed.xxs + 2,
    width: '100%',
  },
  chip: {
    alignSelf: 'flex-start',
    flexShrink: 0,
    maxWidth: '100%',
    paddingVertical: 4,
    paddingHorizontal: SPACING.fixed.sm,
    borderRadius: BORDERS.radius.pill,
    backgroundColor: I.surfaceStrong,
    borderWidth: 1,
    borderColor: I.hairline,
  },
  chipText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    lineHeight: Math.round(TYPOGRAPHY.fontSize.xs * 1.35),
    fontFamily: FF.sansMedium,
    color: I.primary,
  },
});
