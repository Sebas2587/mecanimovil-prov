import React from 'react';
import { StyleSheet } from 'react-native';
import { Wallet } from 'lucide-react-native';
import { InstitutionalTag } from '@/app/design-system/components/InstitutionalTag';
import { institutionalTagIconColor } from '@/app/design-system/styles/institutionalTags';
import {
  getResumenTipoPagoCliente,
  type OfertaCamposPago,
} from '@/utils/tipoPagoClienteLabel';

type Props = {
  oferta: OfertaCamposPago;
  /** Una sola línea compacta para cards de lista */
  compact?: boolean;
};

export function TipoPagoClienteChip({ oferta, compact = false }: Props) {
  const resumen = getResumenTipoPagoCliente(oferta);
  if (!resumen.visible) return null;

  const texto = compact
    ? resumen.lineaCompleta
    : resumen.estadoLabel
      ? `${resumen.planLabel}\n${resumen.estadoLabel}`
      : resumen.planLabel;

  const iconColor = institutionalTagIconColor('info');

  return (
    <InstitutionalTag
      label={texto}
      variant="info"
      size={compact ? 'sm' : 'md'}
      uppercase={false}
      leading={<Wallet size={compact ? 10 : 14} color={iconColor} />}
      style={[compact ? styles.chipCompact : styles.chip]}
    />
  );
}

const styles = StyleSheet.create({
  chip: {
    marginTop: 8,
    alignSelf: 'stretch',
  },
  chipCompact: {
    flex: 1,
    minWidth: 0,
    marginTop: 0,
  },
});
