import React from 'react';
import { StyleSheet, View } from 'react-native';
import { SPACING } from '@/app/design-system/tokens';
import { InstitutionalText } from '@/app/design-system/components/InstitutionalText';
import { InstitutionalTag } from '@/app/design-system/components/InstitutionalTag';
import type { CobroVista } from '@/utils/cobroTrabajo';

type Props = {
  trabajo: string;
  trabajoTono?: 'neutral' | 'primary' | 'success' | 'warning' | 'error' | 'info';
  cobro: CobroVista;
  /** Monto ya formateado. Vacío si no hay cifra. */
  monto?: string | null;
};

/** Avance del trabajo y cobro, en dos datos distintos. El texto puede partir línea. */
export function EstadoTrabajoCobro({ trabajo, trabajoTono = 'info', cobro, monto }: Props) {
  const mostrarAclaracion = Boolean(monto) && cobro.cobro === 'sin_informacion';
  return (
    <View style={styles.bloque} accessibilityLabel={`Trabajo ${trabajo}. Cobro ${cobro.etiqueta}`}>
      <View style={styles.tags}>
        <InstitutionalTag label={trabajo} variant={trabajoTono} size="sm" uppercase={false} />
        <InstitutionalTag label={cobro.etiqueta} variant={cobro.tono} size="sm" uppercase={false} />
      </View>
      {cobro.detalle ? (
        <InstitutionalText role="caption" color="body">
          {cobro.detalle}
        </InstitutionalText>
      ) : null}
      {monto ? (
        <InstitutionalText role="caption" color="ink">
          {cobro.etiquetaMonto} {monto}
        </InstitutionalText>
      ) : null}
      {mostrarAclaracion ? (
        <InstitutionalText role="caption" color="muted">
          {cobro.aclaracion}
        </InstitutionalText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bloque: {
    gap: SPACING.fixed.xxs,
    alignSelf: 'stretch',
    maxWidth: '100%',
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.fixed.xs,
    alignItems: 'center',
  },
});
