import React, { useCallback } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { BottomSheet } from '@/app/design-system/components/BottomSheet';
import { HostPaperSection, HostSectionKicker } from '@/app/design-system/components';
import { InstitutionalText } from '@/app/design-system/components/InstitutionalText';
import { SPACING } from '@/app/design-system/tokens';
import { PlantillaCotizacionRow } from '@/components/chats/PlantillaCotizacionRow';
import type { CotizacionPlantilla } from '@/services/cotizacionCanalService';

type Props = {
  visible: boolean;
  onClose: () => void;
  plantillas: CotizacionPlantilla[];
  marca?: string;
  modelo?: string;
  disabled?: boolean;
  onUsar: (plantilla: CotizacionPlantilla) => void;
};

/** Cotizaciones ya hechas para el mismo modelo, sin salir del intake. */
export function PlantillasModeloSheet({
  visible,
  onClose,
  plantillas,
  marca,
  modelo,
  disabled = false,
  onUsar,
}: Props) {
  const vehiculoTxt = [marca, modelo].filter(Boolean).join(' ').trim();

  const handleUsar = useCallback((plantilla: CotizacionPlantilla) => {
    onClose();
    onUsar(plantilla);
  }, [onClose, onUsar]);

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={styles.head}>
        <HostSectionKicker label="Histórico de cotizaciones" style={styles.kicker} />
        {vehiculoTxt ? (
          <InstitutionalText role="captionBold" color="ink">
            {vehiculoTxt}
          </InstitutionalText>
        ) : null}
        <InstitutionalText role="caption" color="muted">
          Toca una para partir desde ella en vez de generar de cero.
        </InstitutionalText>
      </View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollInner}
        showsVerticalScrollIndicator={false}
      >
        <HostPaperSection>
          {plantillas.map((plantilla, index) => (
            <PlantillaCotizacionRow
              key={plantilla.id}
              plantilla={plantilla}
              last={index === plantillas.length - 1}
              onPress={handleUsar}
              disabled={disabled}
            />
          ))}
        </HostPaperSection>
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

export default PlantillasModeloSheet;
