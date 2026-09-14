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
  onAceptada?: () => void;
};

/** Acciones del caso cuando el chat no basta (canal caído o cliente en silencio). */
export function CasoCotizacionChatBar({ cotizacionId, onCerrado, onAceptada }: Props) {
  const [busy, setBusy] = useState(false);

  const abrirFolio = useCallback(() => {
    router.push(`/cotizacion-canal/${cotizacionId}`);
  }, [cotizacionId]);

  const marcarAceptada = useCallback(async () => {
    setBusy(true);
    try {
      await cotizacionCanalService.marcarAceptada(cotizacionId);
      onAceptada?.();
      showAlert('Cotización aceptada', 'Confirma el horario en Bandeja.');
    } catch {
      showAlert('Error', 'Solo cotizaciones enviadas pueden marcarse como aceptadas.');
    } finally {
      setBusy(false);
    }
  }, [cotizacionId, onAceptada]);

  const cerrarCaso = useCallback(() => {
    showConfirm(
      'Cerrar caso',
      'El lead pasa a Perdidos. Podrás seguir viéndolo en ese filtro de Bandeja.',
      {
        confirmText: 'Cerrar caso',
        onConfirm: async () => {
          setBusy(true);
          try {
            await cotizacionCanalService.marcarPerdida(cotizacionId);
            onCerrado?.();
            showAlert('Caso cerrado', 'Quedó en Perdidos.');
          } catch {
            showAlert('Error', 'No se pudo cerrar el caso.');
          } finally {
            setBusy(false);
          }
        },
      },
    );
  }, [cotizacionId, onCerrado]);

  return (
    <View style={styles.bar}>
      <InstitutionalText role="caption" color="muted">
        Cotización enviada. Escribe aquí, marca aceptada si ya cerraron, o cierra el caso.
        La IA solo recuerda una vez por WhatsApp.
      </InstitutionalText>
      <View style={styles.row}>
        <InstitutionalButton
          label="Cerrar caso"
          variant="destructiveOutline"
          size="compact"
          style={styles.btn}
          loading={busy}
          onPress={cerrarCaso}
        />
        <InstitutionalButton
          label="Marcar aceptada"
          variant="success"
          size="compact"
          style={styles.btn}
          loading={busy}
          onPress={() => void marcarAceptada()}
        />
      </View>
      <InstitutionalButton
        label="Ver cotización"
        variant="outline"
        size="compact"
        onPress={abrirFolio}
      />
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
