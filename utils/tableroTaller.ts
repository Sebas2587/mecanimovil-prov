import { parseFechaLocal, startOfDay } from '@/utils/fechaLocal';

/** Cómo ve el asesor la visita, no el papel de la cotización. */
export type CarrilCita =
  | 'proxima'
  | 'en_taller'
  | 'esperando_firma'
  | 'sin_registro'
  | 'fuera';

export function carrilDeCita(input: {
  estado?: string | null;
  horarioPorConfirmar?: boolean;
  fecha?: string | null;
  checklistId?: number | null;
  checklistEstado?: string | null;
  hoy?: Date;
}): CarrilCita {
  const estado = (input.estado || '').toLowerCase();
  if (estado === 'cerrada' || estado === 'cancelada' || estado === 'cancelado') return 'fuera';
  if (input.horarioPorConfirmar) return 'fuera';
  const checklist = (input.checklistEstado || '').toUpperCase();
  if (checklist === 'PENDIENTE_FIRMA_CLIENTE') return 'esperando_firma';
  if (checklist === 'COMPLETADO') return 'fuera';
  if (input.checklistId) return 'en_taller';

  const dia = parseFechaLocal(input.fecha);
  const inicioHoy = startOfDay(input.hoy ?? new Date()).getTime();
  if (dia && dia.getTime() < inicioHoy) return 'sin_registro';
  return 'proxima';
}
