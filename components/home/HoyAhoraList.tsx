import React, { memo, useCallback, useMemo, useState } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { HostPaperSection, HostSectionKicker } from '@/design-system/components/HostSurfaces';
import { InstitutionalText } from '@/design-system/components/InstitutionalText';
import { SPACING } from '@/app/design-system/tokens';
import { HoyFilaDecision, type FilaDecision } from './HoyFilaDecision';

const MAX_VISIBLE = 5;

export type FilaAhora = FilaDecision & {
  verbo: 'Agendar' | 'Enviar' | 'Aceptar';
};

type Props = {
  filas: FilaAhora[];
  onPress: (id: string) => void;
};

function HoyAhoraListInner({ filas, onPress }: Props) {
  const [abierto, setAbierto] = useState(false);
  const visibles = useMemo(
    () => (abierto ? filas : filas.slice(0, MAX_VISIBLE)),
    [abierto, filas],
  );
  const toggle = useCallback(() => setAbierto((prev) => !prev), []);
  const hayMas = filas.length > MAX_VISIBLE;

  if (filas.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <HostSectionKicker label="Ahora" style={styles.kicker} />
        {hayMas ? (
          <TouchableOpacity onPress={toggle} hitSlop={8} accessibilityRole="button">
            <InstitutionalText role="captionBold" color="primary">
              {abierto ? 'Ver menos' : 'Ver todas'}
            </InstitutionalText>
          </TouchableOpacity>
        ) : null}
      </View>
      <HostPaperSection style={styles.paper}>
        {visibles.map((fila, index) => (
          <HoyFilaDecision
            key={fila.id}
            fila={fila}
            last={index === visibles.length - 1}
            onPress={onPress}
          />
        ))}
      </HostPaperSection>
    </View>
  );
}

export const HoyAhoraList = memo(HoyAhoraListInner);

const styles = StyleSheet.create({
  wrap: {
    gap: SPACING.fixed.xs,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  kicker: {
    marginTop: 0,
    marginBottom: 0,
  },
  paper: {
    paddingVertical: 0,
  },
});
