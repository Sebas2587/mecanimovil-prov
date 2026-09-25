import { useCallback, useState } from 'react';
import { router } from 'expo-router';
import cotizacionCanalService from '@/services/cotizacionCanalService';
import { showAlert, showConfirm } from '@/utils/platformAlert';

type Props = {
  cotizacionId: number;
  onCerrado?: () => void;
  onAceptada?: () => void;
};

/** Acciones del caso fuera del hilo: el chat las muestra en el botón flotante. */
export function useCasoCotizacionAcciones({ cotizacionId, onCerrado, onAceptada }: Props) {
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
            const actualizada = await cotizacionCanalService.marcarPerdida(cotizacionId);
            onCerrado?.();
            if (actualizada.cierre === 'terminada') {
              showAlert(
                'Orden terminada',
                'El servicio principal ya está cerrado. Los adicionales rechazados no lo vuelven a abrir.',
              );
            } else {
              showAlert('Caso cerrado', 'Quedó en Perdidos.');
            }
          } catch {
            showAlert('Error', 'No se pudo cerrar el caso.');
          } finally {
            setBusy(false);
          }
        },
      },
    );
  }, [cotizacionId, onCerrado]);

  return { busy, abrirFolio, marcarAceptada, cerrarCaso };
}
