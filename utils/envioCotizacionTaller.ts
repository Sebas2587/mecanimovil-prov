import {
  avisoEnviarSinSugerencias,
  type CotizacionDecision,
} from '@/utils/decisionCotizador';
import { showAlert, showAlertButtons } from '@/utils/platformAlert';
import { envioTotalBloqueado } from '@/utils/totalesCotizacion';

/**
 * Dudas y total incompleto bloquean. Sugerencias pendientes avisan y dejan enviar.
 */
export function gateEnviarCotizacionTaller(
  cotizacion: CotizacionDecision | null | undefined,
  onContinuar: () => void | Promise<void>,
): void {
  const bloqueo = envioTotalBloqueado(cotizacion ?? {});
  if (bloqueo) {
    showAlert(bloqueo.includes('duda') ? 'Falta tu opinión' : 'Total incompleto', bloqueo);
    return;
  }
  const aviso = avisoEnviarSinSugerencias(cotizacion);
  if (!aviso) {
    void Promise.resolve(onContinuar());
    return;
  }
  showAlertButtons('Sugerencias sin decidir', aviso, [
    { text: 'Revisar', style: 'cancel' },
    { text: 'Enviar igual', onPress: () => { void onContinuar(); } },
  ]);
}
