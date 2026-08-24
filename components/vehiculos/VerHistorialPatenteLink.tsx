import React, { useCallback } from 'react';
import { router } from 'expo-router';
import { InstitutionalButton } from '@/app/design-system/components/InstitutionalButton';
import { patenteHistorialValida, rutaHistorialPatente } from '@/services/vehiculoService';

type Props = {
  patente: string;
  size?: 'default' | 'compact';
};

export function VerHistorialPatenteLink({ patente, size = 'compact' }: Props) {
  const handlePress = useCallback(() => {
    if (!patenteHistorialValida(patente)) return;
    router.push(rutaHistorialPatente(patente));
  }, [patente]);

  if (!patenteHistorialValida(patente)) return null;

  return (
    <InstitutionalButton
      label="Ver historial"
      variant="tertiary"
      size={size}
      onPress={handlePress}
      accessibilityLabel="Ver historial de la patente en la red"
      style={{ alignSelf: 'flex-start' }}
    />
  );
}
