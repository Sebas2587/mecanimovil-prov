import React from 'react';
import { StyleSheet, View } from 'react-native';
import { InstitutionalText } from '@/app/design-system/components/InstitutionalText';
import { BORDERS, COLORS, SPACING, withOpacity } from '@/app/design-system/tokens';
import { TallerPildora } from '@/components/taller/TallerPildora';
import {
  puedeCerrarRevisionTaller,
  resumenRevisionTaller,
  type CotizacionDecision,
} from '@/utils/decisionCotizador';

const I = COLORS.institutional;

type Props = {
  cotizacion: CotizacionDecision;
  confirming?: boolean;
  onConfirmar?: () => void;
};

export function RevisionTallerBanner({
  cotizacion,
  confirming = false,
  onConfirmar,
}: Props) {
  const resumen = resumenRevisionTaller(cotizacion);
  if (!resumen.espera && !resumen.lista) return null;
  const listo = puedeCerrarRevisionTaller(cotizacion);
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
      {resumen.espera && onConfirmar ? (
        <TallerPildora
          label={listo ? 'Confirmar y continuar' : 'Faltan decisiones'}
          tono={listo ? 'coral' : 'suave'}
          onPress={onConfirmar}
          disabled={!listo || confirming}
          loading={confirming}
        />
      ) : null}
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
