import React, { memo, useCallback, useMemo, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { HostPaperSection } from '@/design-system/components/HostSurfaces';
import { InstitutionalText } from '@/design-system/components/InstitutionalText';
import { SPACING } from '@/app/design-system/tokens';
import { HoyFilaDecision, type FilaDecision } from './HoyFilaDecision';

export type FilaEspera = {
  id: string;
  titulo: string;
  meta: string;
};

type Props = {
  filas: FilaEspera[];
  onPress: (id: string) => void;
};

function HoyEsperandoLineaInner({ filas, onPress }: Props) {
  const [abierto, setAbierto] = useState(false);
  const toggle = useCallback(() => setAbierto((prev) => !prev), []);
  const filasDecision = useMemo(
    () => filas.map((fila): FilaDecision => ({ ...fila, verbo: 'Escribir' })),
    [filas],
  );

  if (filas.length === 0) return null;

  const etiqueta = filas.length === 1
    ? '1 esperando respuesta'
    : `${filas.length} esperando respuesta`;

  return (
    <View style={styles.wrap}>
      <TouchableOpacity
        onPress={toggle}
        activeOpacity={0.75}
        accessibilityRole="button"
        hitSlop={8}
      >
        <InstitutionalText role="captionBold" color="primary">
          {etiqueta}
        </InstitutionalText>
      </TouchableOpacity>
      {abierto ? (
        <HostPaperSection style={styles.paper}>
          {filasDecision.map((fila, index) => (
            <HoyFilaDecision
              key={fila.id}
              fila={fila}
              last={index === filasDecision.length - 1}
              onPress={onPress}
            />
          ))}
        </HostPaperSection>
      ) : null}
    </View>
  );
}

export const HoyEsperandoLinea = memo(HoyEsperandoLineaInner);

const styles = StyleSheet.create({
  wrap: {
    gap: SPACING.fixed.xs,
  },
  paper: {
    paddingVertical: 0,
  },
});
