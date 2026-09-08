import React, { useCallback, useState } from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { History } from 'lucide-react-native';
import { InstitutionalText } from '@/app/design-system/components/InstitutionalText';
import { COLORS, SPACING } from '@/app/design-system/tokens';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import { HistorialPatenteSheet } from '@/components/vehiculos/HistorialPatenteSheet';
import { patenteHistorialValida, rutaHistorialPatente } from '@/services/vehiculoService';

const I = COLORS.institutional;

type Props = {
  patente: string;
  size?: 'default' | 'compact';
  /**
   * 'sheet' abre el historial encima del contenido actual. Obligatorio dentro de
   * modales: un router.push queda tapado por el modal y parece que nada pasó.
   */
  presentacion?: 'sheet' | 'pantalla';
};

/** Link quieto Host: abre el historial clínico de la patente en la red, no la ficha GetAPI. */
export function VerHistorialPatenteLink({
  patente,
  presentacion = 'sheet',
}: Props) {
  const [sheetVisible, setSheetVisible] = useState(false);

  const handlePress = useCallback(() => {
    if (!patenteHistorialValida(patente)) return;
    if (presentacion === 'pantalla') {
      router.push(rutaHistorialPatente(patente));
      return;
    }
    setSheetVisible(true);
  }, [patente, presentacion]);

  if (!patenteHistorialValida(patente)) return null;

  return (
    <>
      <TouchableOpacity
        onPress={handlePress}
        accessibilityRole="link"
        accessibilityLabel="Ver historial de la patente en la red"
        hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
        style={styles.link}
      >
        <History size={14} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
        <InstitutionalText role="captionBold" color="primary">
          Ver historial
        </InstitutionalText>
      </TouchableOpacity>
      {presentacion === 'sheet' ? (
        <HistorialPatenteSheet
          visible={sheetVisible}
          onClose={() => setSheetVisible(false)}
          patente={patente}
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.xs,
    paddingVertical: 2,
  },
});

export default VerHistorialPatenteLink;
