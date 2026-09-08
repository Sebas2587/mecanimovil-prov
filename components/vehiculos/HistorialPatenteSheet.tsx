import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { BottomSheet } from '@/app/design-system/components/BottomSheet';
import { HostSectionKicker } from '@/app/design-system/components';
import { InstitutionalText } from '@/app/design-system/components/InstitutionalText';
import { SPACING } from '@/app/design-system/tokens';
import { HistorialRedContenido } from '@/components/vehiculos/HistorialRedContenido';
import { compactarPatente } from '@/services/vehiculoService';

type Props = {
  visible: boolean;
  onClose: () => void;
  patente: string;
};

/** Historial clínico de la red, sin salir de la cotización. */
export function HistorialPatenteSheet({ visible, onClose, patente }: Props) {
  const placa = compactarPatente(patente);

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={styles.head}>
        <HostSectionKicker label="Historial de la red" style={styles.kicker} />
        <InstitutionalText role="captionBold" color="ink">
          {placa}
        </InstitutionalText>
        <InstitutionalText role="caption" color="muted">
          El cobro de tu taller aparece si quedó registrado. El de otros no.
        </InstitutionalText>
      </View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollInner}
        showsVerticalScrollIndicator={false}
      >
        <HistorialRedContenido patente={patente} enabled={visible} superficie="sheet" />
      </ScrollView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  head: {
    gap: SPACING.fixed.xs,
    marginBottom: SPACING.fixed.md,
  },
  kicker: {
    marginTop: 0,
    marginBottom: 0,
  },
  scroll: {
    flexGrow: 0,
  },
  scrollInner: {
    paddingBottom: SPACING.fixed.sm,
  },
});

export default HistorialPatenteSheet;
