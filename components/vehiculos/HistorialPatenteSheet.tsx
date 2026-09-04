import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { BottomSheet } from '@/app/design-system/components/BottomSheet';
import { InstitutionalText } from '@/app/design-system/components/InstitutionalText';
import { SPACING } from '@/app/design-system/tokens';
import { HistorialRedContenido } from '@/components/vehiculos/HistorialRedContenido';

type Props = {
  visible: boolean;
  onClose: () => void;
  patente: string;
};

/** Historial de la red sin salir de la cotización que el taller está editando. */
export function HistorialPatenteSheet({ visible, onClose, patente }: Props) {
  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={styles.head}>
        <InstitutionalText role="h5">Historial de {patente.toUpperCase()}</InstitutionalText>
        <InstitutionalText role="caption" color="muted">
          Servicios registrados por tu taller y por otros talleres de la red.
        </InstitutionalText>
      </View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollInner}
        showsVerticalScrollIndicator={false}
      >
        <HistorialRedContenido patente={patente} enabled={visible} />
      </ScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  head: {
    gap: 2,
    marginBottom: SPACING.fixed.md,
  },
  scroll: {
    flexGrow: 0,
  },
  scrollInner: {
    paddingBottom: SPACING.fixed.sm,
  },
});

export default HistorialPatenteSheet;
