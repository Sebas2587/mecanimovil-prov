import React, { useCallback, useState } from 'react';
import { router } from 'expo-router';
import { InstitutionalButton } from '@/app/design-system/components/InstitutionalButton';
import { HistorialPatenteSheet } from '@/components/vehiculos/HistorialPatenteSheet';
import { patenteHistorialValida, rutaHistorialPatente } from '@/services/vehiculoService';

type Props = {
  patente: string;
  size?: 'default' | 'compact';
  /**
   * 'sheet' abre el historial encima del contenido actual. Obligatorio dentro de
   * modales: un router.push queda tapado por el modal y parece que nada pasó.
   */
  presentacion?: 'sheet' | 'pantalla';
};

export function VerHistorialPatenteLink({
  patente,
  size = 'compact',
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
      <InstitutionalButton
        label="Ver historial"
        variant="tertiary"
        size={size}
        onPress={handlePress}
        accessibilityLabel="Ver historial de la patente en la red"
        style={{ alignSelf: 'flex-start' }}
      />
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

export default VerHistorialPatenteLink;
