import { extraerMensajeErrorApi } from '@/utils/extraerMensajeErrorApi';
import { showAlert, showAlertButtons } from '@/utils/platformAlert';
import { estadoCotizacionVista, type EstadoCotizacionVista } from '@/utils/cotizacionPresentacion';
import type { CotizacionCanal } from '@/services/cotizacionCanalService';

export const TITULO_ELIMINAR_COTIZACION = 'Eliminar cotización';
export const MENSAJE_ELIMINAR_COTIZACION =
  'Se borra de la lista. Esta acción no se puede deshacer.';
export const FALLBACK_ELIMINAR_COTIZACION = 'No se pudo eliminar la cotización.';

export function puedeEliminarCotizacion(
  cotizacion: Pick<CotizacionCanal, 'estado' | 'tiene_horario_agendado' | 'fecha_agendada'> & {
    cita_personal_id?: number | null;
    cita_ultima_estado?: string | null;
  } | null | undefined,
): boolean {
  if (!cotizacion) return false;
  const vista: EstadoCotizacionVista = estadoCotizacionVista(cotizacion);
  return vista === 'borrador' || vista === 'enviada' || vista === 'rechazada';
}

export function mensajeErrorEliminarCotizacion(error: unknown): string {
  return extraerMensajeErrorApi(
    error as { message?: string; response?: { data?: unknown; status?: number } },
    FALLBACK_ELIMINAR_COTIZACION,
  );
}

export function pedirConfirmacionEliminarCotizacion(onConfirm: () => void | Promise<void>) {
  showAlertButtons(
    TITULO_ELIMINAR_COTIZACION,
    MENSAJE_ELIMINAR_COTIZACION,
    [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar',
        style: 'destructive',
        onPress: () => {
          void Promise.resolve(onConfirm()).catch((error) => {
            showAlert('No se pudo eliminar', mensajeErrorEliminarCotizacion(error));
          });
        },
      },
    ],
  );
}
