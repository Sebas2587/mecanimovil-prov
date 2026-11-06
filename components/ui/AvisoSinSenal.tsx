import React from 'react';
import { StyleSheet, View } from 'react-native';
import { BORDERS, COLORS, SPACING, withOpacity } from '@/app/design-system/tokens';
import { InstitutionalText } from '@/app/design-system/components/InstitutionalText';
import { useSenalRed } from '@/hooks/useSenalRed';

const I = COLORS.institutional;

const TEXTO = {
  cotizacion: 'Sin señal. No se puede cotizar, guardar ni enviar hasta que vuelva la red. Nada queda en una cola local.',
  caja: 'Sin señal. La caja no consulta ni registra movimientos hasta que vuelva la red.',
} as const;

export function AvisoSinSenal({ ambito }: { ambito: keyof typeof TEXTO }) {
  const enLinea = useSenalRed();
  if (enLinea !== false) return null;
  return (
    <View accessibilityRole="alert" style={styles.aviso}>
      <InstitutionalText role="caption" color="ink">{TEXTO[ambito]}</InstitutionalText>
    </View>
  );
}

const styles = StyleSheet.create({
  aviso: {
    backgroundColor: withOpacity(I.accentYellow, 0.16),
    borderRadius: BORDERS.radius.md,
    paddingVertical: SPACING.fixed.sm,
    paddingHorizontal: SPACING.fixed.md,
  },
});
