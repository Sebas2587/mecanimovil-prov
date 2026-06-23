import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, withOpacity, SPACING, TYPOGRAPHY, BORDERS } from '@/app/design-system/tokens';
import type { OrigenOrden } from '@/utils/ordenProveedorUnificada';

const I = COLORS.institutional;
const FF = TYPOGRAPHY.fontFamily;
const lh = (fontSize: number, lineHeightMult: number) => Math.round(fontSize * lineHeightMult);

type Props = {
  origen: OrigenOrden;
};

export function OrigenOrdenBadge({ origen }: Props) {
  const esPersonal = origen === 'personal';
  const bg = esPersonal ? withOpacity(I.primary, 0.12) : withOpacity(I.semanticUp, 0.12);
  const textColor = esPersonal ? I.primaryActive : I.semanticUp;
  const borderColor = esPersonal ? withOpacity(I.primary, 0.2) : withOpacity(I.semanticUp, 0.28);
  const label = esPersonal ? 'Personal' : 'Mecanimovil';

  return (
    <View style={[styles.badge, { backgroundColor: bg, borderColor }]}>
      <Text style={[styles.text, { color: textColor }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: SPACING.fixed.xs + 2,
    paddingVertical: 2,
    borderRadius: BORDERS.radius.sm,
    borderWidth: BORDERS.width.thin,
  },
  text: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontFamily: FF.sansSemiBold,
    lineHeight: lh(TYPOGRAPHY.fontSize.xs, TYPOGRAPHY.lineHeight.tight),
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
});
