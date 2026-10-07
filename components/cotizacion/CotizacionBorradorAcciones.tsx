import React from 'react';
import { StyleSheet, View } from 'react-native';
import { InstitutionalText } from '@/app/design-system/components/InstitutionalText';
import { SPACING } from '@/app/design-system/tokens';
import { TallerPildora } from '@/components/taller/TallerPildora';

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
      <TallerPildora
        label={enviarFirmeLabel}
        tono="coral"
        forma="hoja"
        onPress={onEnviarFirme}
        disabled={sendDisabled}
        loading={loading}
        style={styles.full}
      />
    );
  }

  return (
    <View style={styles.wrap}>
      {pendientesPrecio > 0 ? (
        <InstitutionalText role="caption" color="muted" style={styles.nota}>
          {pendientesPrecio === 1 ? '1 precio sin fijar' : `${pendientesPrecio} precios sin fijar`}
        </InstitutionalText>
      ) : <View style={styles.nota} />}
      <TallerPildora
        label="Confirmar precios"
        tono="coral"
        forma="hoja"
        onPress={onConfirmarPrecios}
        disabled={confirmDisabled}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.fixed.md,
  },
  nota: {
    flex: 1,
    minWidth: 0,
  },
  full: {
    alignSelf: 'stretch',
  },
});

export default CotizacionBorradorAcciones;
