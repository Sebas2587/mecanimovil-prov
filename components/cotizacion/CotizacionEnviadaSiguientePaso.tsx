import React from 'react';
import { StyleSheet } from 'react-native';
import { HostPaperSection, InstitutionalTag } from '@/app/design-system/components';
import { InstitutionalText } from '@/app/design-system/components/InstitutionalText';
import { SPACING } from '@/app/design-system/tokens';
import { siguientePasoCotizacionEnviada } from '@/utils/cotizacionEnviadaSiguientePaso';
import type { CotizacionCanal } from '@/services/cotizacionCanalService';

type Props = {
  cotizacion: CotizacionCanal;
};

/** Estado de una cotización ya enviada. Las acciones viven en el flotante. */
export function CotizacionEnviadaSiguientePaso({ cotizacion }: Props) {
  const paso = siguientePasoCotizacionEnviada(cotizacion);
  if (!paso) return null;

  return (
    <HostPaperSection style={styles.card}>
      <InstitutionalTag
        label={paso.kicker}
        variant={paso.urgencia === 'warning' ? 'warning' : 'info'}
        size="sm"
        uppercase={false}
      />
      <InstitutionalText role="h5">{paso.titulo}</InstitutionalText>
      <InstitutionalText role="caption" color={paso.urgencia === 'warning' ? 'body' : 'muted'}>
        {paso.cuerpo}
      </InstitutionalText>
      {paso.validezLabel ? (
        <InstitutionalText role="caption" color="muted">
          {paso.validezLabel}
        </InstitutionalText>
      ) : null}
    </HostPaperSection>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: SPACING.fixed.xs,
  },
});

export default CotizacionEnviadaSiguientePaso;
