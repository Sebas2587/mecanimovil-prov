import React from 'react';
import { StyleSheet, View } from 'react-native';
import { InstitutionalText } from '@/app/design-system/components/InstitutionalText';
import { BORDERS, COLORS, SPACING, withOpacity } from '@/app/design-system/tokens';
import { resumenRevisionTaller, type CotizacionDecision } from '@/utils/decisionCotizador';

const I = COLORS.institutional;

type Props = {
  cotizacion: CotizacionDecision;
};

export function RevisionTallerBanner({ cotizacion }: Props) {
  const resumen = resumenRevisionTaller(cotizacion);
  if (!resumen.espera && !resumen.lista) return null;
  return (
    <View
      style={[styles.caja, resumen.lista ? styles.lista : styles.espera]}
      testID="revision-taller-banner"
      accessibilityLabel={resumen.texto}
    >
      <InstitutionalText role="bodyBold">
        {resumen.lista ? 'Lista para el agente' : 'Tu opinión'}
      </InstitutionalText>
      <InstitutionalText role="caption" color="body">
        {resumen.texto}
      </InstitutionalText>
    </View>
  );
}

const styles = StyleSheet.create({
  caja: {
    gap: SPACING.fixed.xs,
    borderRadius: BORDERS.radius.md,
    padding: SPACING.fixed.sm,
  },
  espera: {
    backgroundColor: withOpacity(I.accentYellow, 0.12),
  },
  lista: {
    backgroundColor: withOpacity(I.semanticUp, 0.12),
  },
});
