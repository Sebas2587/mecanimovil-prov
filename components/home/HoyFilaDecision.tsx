import React, { memo, useCallback } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { InstitutionalText } from '@/design-system/components/InstitutionalText';
import { COLORS, SPACING } from '@/app/design-system/tokens';

const I = COLORS.institutional;

export type VerboFila = 'Agendar' | 'Enviar' | 'Aceptar' | 'Escribir';

export type FilaDecision = {
  id: string;
  titulo: string;
  meta: string;
  verbo: VerboFila;
};

type Props = {
  fila: FilaDecision;
  last: boolean;
  onPress: (id: string) => void;
};

function HoyFilaDecisionInner({ fila, last, onPress }: Props) {
  const handlePress = useCallback(() => onPress(fila.id), [fila.id, onPress]);
  return (
    <TouchableOpacity
      style={[styles.row, last ? null : styles.rowBorder]}
      onPress={handlePress}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={`${fila.verbo}. ${fila.titulo}`}
    >
      <View style={styles.copy}>
        <InstitutionalText role="bodyBold" numberOfLines={1}>
          {fila.titulo}
        </InstitutionalText>
        {fila.meta ? (
          <InstitutionalText role="caption" color="muted" numberOfLines={1}>
            {fila.meta}
          </InstitutionalText>
        ) : null}
      </View>
      <InstitutionalText role="captionBold" color="primary">
        {fila.verbo}
      </InstitutionalText>
    </TouchableOpacity>
  );
}

export const HoyFilaDecision = memo(HoyFilaDecisionInner);

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.fixed.md,
    minHeight: 56,
    paddingVertical: 14,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: I.hairline,
  },
  copy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
});
