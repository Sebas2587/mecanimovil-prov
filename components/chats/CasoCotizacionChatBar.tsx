import React, { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { InstitutionalButton } from '@/app/design-system/components/InstitutionalButton';
import { InstitutionalText } from '@/app/design-system/components/InstitutionalText';
import { COLORS, SPACING } from '@/app/design-system/tokens';
import cotizacionCanalService from '@/services/cotizacionCanalService';
import { showAlert, showConfirm } from '@/utils/platformAlert';

const I = COLORS.institutional;

type Props = {
  cotizacionId: number;
  onCerrado?: () => void;
};

/** Acciones del caso cuando el chat no basta (canal caído o cliente en silencio). */
export function CasoCotizacionChatBar({ cotizacionId, onCerrado }: Props) {
  const [cerrando, setCerrando] = useState(false);

  const abrirFolio = useCallback(() => {
    router.push(`/cotizacion-canal/${cotizacionId}`);
  }, [cotizacionId]);

  const cerrarCaso = useCallback(() => {
    showConfirm(
      'Cerrar caso',
      'El lead pasa a Perdidos. Podrás seguir viéndolo en ese filtro de Bandeja.',
      {
        confirmText: 'Cerrar caso',
        onConfirm: async () => {
          setCerrando(true);
          try {
            await cotizacionCanalService.marcarPerdida(cotizacionId);
            onCerrado?.();
            showAlert('Caso cerrado', 'Quedó en Perdidos.');
          } catch {
            showAlert('Error', 'No se pudo cerrar el caso.');
          } finally {
            setCerrando(false);
          }
        },
      },
    );
  }, [cotizacionId, onCerrado]);

  return (
    <View style={styles.bar}>
      <InstitutionalText role="caption" color="muted">
        Cotización enviada. El cliente no contestó: abre el folio o cierra el caso.
      </InstitutionalText>
      <View style={styles.row}>
        <InstitutionalButton
          label="Cerrar caso"
          variant="destructiveOutline"
          size="compact"
          style={styles.btn}
          loading={cerrando}
          onPress={cerrarCaso}
        />
        <InstitutionalButton
          label="Ver cotización"
          variant="primary"
          size="compact"
          style={styles.btn}
          onPress={abrirFolio}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    gap: SPACING.fixed.xs,
    paddingHorizontal: SPACING.fixed.md,
    paddingTop: SPACING.fixed.sm,
    backgroundColor: I.canvas,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: I.hairline,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: SPACING.fixed.sm,
  },
  btn: {
    flex: 1,
    minWidth: 0,
  },
});

export default CasoCotizacionChatBar;
