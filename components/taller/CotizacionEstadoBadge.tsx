import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { InstitutionalText } from '@/design-system/components/InstitutionalText';
import { COLORS } from '@/app/design-system/tokens';
import type { EstadoCotizacionVista } from '@/utils/cotizacionPresentacion';

const I = COLORS.institutional;

const PUNTO: Record<EstadoCotizacionVista | 'vista', string> = {
  borrador: I.muted,
  enviada: COLORS.warning.main,
  vista: I.primary,
  aceptada: I.semanticUp,
  agendada: I.ink,
  entregada: I.ink,
  rechazada: I.semanticDown,
};

type Props = {
  estado: EstadoCotizacionVista;
  label: string;
  suave?: boolean;
};

function CotizacionEstadoBadgeInner({ estado, label, suave = false }: Props) {
  const punto = label === 'Vista' ? PUNTO.vista : PUNTO[estado];
  return (
    <View style={[styles.badge, suave && styles.suave]}>
      <View style={[styles.punto, { backgroundColor: punto }]} />
      <InstitutionalText role="captionBold">{label}</InstitutionalText>
    </View>
  );
}

export const CotizacionEstadoBadge = memo(CotizacionEstadoBadgeInner);

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: I.paper,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  suave: {
    backgroundColor: I.surfaceSoft,
  },
  punto: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
