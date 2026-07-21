import type { EstadoPipelineNormalizado } from '@/services/pipelineComercialService';

export type EstadoOperativoUnificado =
  | 'nuevo'
  | 'esperando'
  | 'por_agendar'
  | 'agendado'
  | 'en_ejecucion'
  | 'completado'
  | 'cerrado'
  | 'cancelado';

export const ESTADO_OPERATIVO_LABELS: Record<EstadoOperativoUnificado, string> = {
  nuevo: 'Nuevo',
  esperando: 'Esperando',
  por_agendar: 'Por agendar',
  agendado: 'Agendado',
  en_ejecucion: 'En ejecución',
  completado: 'Completado',
  cerrado: 'Cerrado',
  cancelado: 'Cancelado',
};

export const ESTADO_OPERATIVO_VARIANT: Record<
  EstadoOperativoUnificado,
  'neutral' | 'primary' | 'success' | 'warning' | 'error' | 'info'
> = {
  nuevo: 'primary',
  esperando: 'warning',
  por_agendar: 'warning',
  agendado: 'info',
  en_ejecucion: 'warning',
  completado: 'success',
  cerrado: 'neutral',
  cancelado: 'error',
};

export function mapPipelineEstadoToOperativo(
  estado: EstadoPipelineNormalizado | string,
  opts?: { horarioPorConfirmar?: boolean },
): EstadoOperativoUnificado {
  if (opts?.horarioPorConfirmar) return 'por_agendar';
  switch (estado) {
    case 'nuevo':
      return 'nuevo';
    case 'cotizacion_enviada':
      return 'esperando';
    case 'en_negociacion':
      return 'por_agendar';
    case 'aceptado_agendado':
      return 'agendado';
    case 'en_ejecucion':
      return 'en_ejecucion';
    case 'completado':
      return 'completado';
    case 'rechazado_perdido':
      return 'cancelado';
    default:
      return 'nuevo';
  }
}

export function mapCitaEstadoOperativo(
  estadoOperativo?: string | null,
  estadoCita?: string,
  horarioPorConfirmar?: boolean,
): EstadoOperativoUnificado {
  if (horarioPorConfirmar) return 'por_agendar';
  if (estadoOperativo) {
    const known = ESTADO_OPERATIVO_LABELS[estadoOperativo as EstadoOperativoUnificado];
    if (known) return estadoOperativo as EstadoOperativoUnificado;
  }
  if (estadoCita === 'cerrada') return 'cerrado';
  if (estadoCita === 'cancelada') return 'cancelado';
  return 'agendado';
}

/** Mapea estado de orden marketplace / oferta a estado operativo unificado. */
export function mapOrdenEstadoToOperativo(estado: string): EstadoOperativoUnificado {
  switch (estado) {
    case 'pendiente_aceptacion_proveedor':
    case 'pendiente':
    case 'pago_validado':
    case 'enviada':
    case 'vista':
    case 'en_chat':
    case 'pendiente_creditos':
    case 'nuevo':
      return 'nuevo';
    case 'aceptada_por_proveedor':
    case 'aceptada':
    case 'pendiente_pago':
    case 'pagada_parcialmente':
    case 'pagada':
    case 'pendiente_confirmacion':
    case 'confirmado':
      return 'agendado';
    case 'servicio_iniciado':
    case 'checklist_en_progreso':
    case 'checklist_completado':
    case 'en_proceso':
    case 'en_ejecucion':
    case 'pendiente_firma_cliente':
      return 'en_ejecucion';
    case 'completado':
    case 'completada':
      return 'completado';
    case 'cancelado':
    case 'rechazada_por_proveedor':
    case 'rechazada':
    case 'retirada':
    case 'expirada':
    case 'devuelto':
    case 'solicitud_cancelacion':
    case 'pendiente_devolucion':
      return 'cancelado';
    default:
      return 'agendado';
  }
}
