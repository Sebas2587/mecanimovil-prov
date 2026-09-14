import React from 'react';
import { StyleSheet, View } from 'react-native';
import { InstitutionalButton } from '@/app/design-system/components/InstitutionalButton';
import { InstitutionalText } from '@/app/design-system/components/InstitutionalText';
import { SPACING } from '@/app/design-system/tokens';

type Props = {
  pendientesPrecio: number;
  puedeEnviarFirme: boolean;
  confirmDisabled?: boolean;
  sendDisabled?: boolean;
  loading?: boolean;
  enviarFirmeLabel?: string;
  onConfirmarPrecios: () => void;
  onEnviarFirme: () => void;
};

/**
 * Pie del borrador: un solo primario.
 * Confirmar precios abre la hoja (no envía). Enviar cotización manda el documento.
 * La estimación vive en esa hoja, no como segundo botón aquí.
 */
export function CotizacionBorradorAcciones({
  pendientesPrecio,
  puedeEnviarFirme,
  confirmDisabled = false,
  sendDisabled = false,
  loading = false,
  enviarFirmeLabel = 'Enviar cotización',
  onConfirmarPrecios,
  onEnviarFirme,
}: Props) {
  if (puedeEnviarFirme) {
    return (
      <InstitutionalButton
        label={enviarFirmeLabel}
        variant="primary"
        onPress={onEnviarFirme}
        disabled={sendDisabled}
        loading={loading}
      />
    );
  }

  return (
    <View style={styles.wrap}>
      {pendientesPrecio > 0 ? (
        <InstitutionalText role="caption" color="muted">
          {pendientesPrecio === 1 ? '1 precio sin fijar' : `${pendientesPrecio} precios sin fijar`}
        </InstitutionalText>
      ) : null}
      <InstitutionalButton
        label="Confirmar precios"
        variant="primary"
        onPress={onConfirmarPrecios}
        disabled={confirmDisabled}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: SPACING.fixed.xs,
  },
});

export default CotizacionBorradorAcciones;
