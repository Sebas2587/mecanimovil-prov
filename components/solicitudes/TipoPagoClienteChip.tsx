import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Wallet } from 'lucide-react-native';
import {
  getResumenTipoPagoCliente,
  type OfertaCamposPago,
} from '@/utils/tipoPagoClienteLabel';

const CHIP = {
  bg: '#EEF2FF',
  border: '#C7D2FE',
  text: '#3730A3',
};

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

  return (
    <View style={[styles.chip, compact && styles.chipCompact]}>
      <Wallet size={compact ? 10 : 14} color={CHIP.text} />
      <Text style={[styles.text, compact && styles.textCompact]} numberOfLines={compact ? 2 : 3}>
        {texto}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: CHIP.bg,
    borderWidth: 1,
    borderColor: CHIP.border,
    borderRadius: 10,
    marginTop: 8,
  },
  chipCompact: {
    flex: 1,
    minWidth: 0,
    marginTop: 0,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  text: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: CHIP.text,
    lineHeight: 18,
  },
  textCompact: {
    fontSize: 10,
    fontWeight: '600',
    lineHeight: 13,
  },
});
