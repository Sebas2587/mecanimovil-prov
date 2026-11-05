/**
 * Avance del trabajo de una cita propia.
 * La lista y el detalle deben usar esta misma lectura.
 *
 * Fuente: estado de la cita y estado del checklist.
 * `estado_operativo` del API no puede inventar «En ejecución» si el checklist
 * no empezó o si ya espera la firma. La cotización aceptada es otro dato:
 * no reemplaza este avance y no prueba un pago.
 */
export type FaseCitaTrabajo =
  | 'por_agendar'
  | 'agendado'
  | 'en_ejecucion'
  | 'falta_revision'
  | 'falta_firma'
  | 'completado'
  | 'cancelado';

export type PresentacionCitaTrabajo = {
  fase: FaseCitaTrabajo;
  trabajo: string;
  trabajoTono: 'neutral' | 'primary' | 'success' | 'warning' | 'error' | 'info';
  /** Frase corta cuando el avance no se entiende solo con el chip. */
  explicacion: string;
};

export type CitaTrabajoEntrada = {
  estado?: string | null;
  estado_operativo?: string | null;
  horario_por_confirmar?: boolean | null;
  checklist_estado?: string | null;
};

const EJECUCION = new Set(['EN_PROGRESO', 'PAUSADO']);

function armar(
  fase: FaseCitaTrabajo,
  trabajo: string,
  trabajoTono: PresentacionCitaTrabajo['trabajoTono'],
  explicacion = '',
): PresentacionCitaTrabajo {
  return { fase, trabajo, trabajoTono, explicacion };
}

export function presentacionCitaTrabajo(cita: CitaTrabajoEntrada): PresentacionCitaTrabajo {
  const estado = String(cita.estado ?? '').trim().toLowerCase();
  const checklist = String(cita.checklist_estado ?? '').trim().toUpperCase();

  if (estado === 'cancelada') {
    return armar('cancelado', 'Cancelado', 'error');
  }
  if (estado === 'cerrada' || checklist === 'COMPLETADO') {
    return armar('completado', 'Completado', 'success');
  }
  if (cita.horario_por_confirmar) {
    return armar(
      'por_agendar',
      'Horario por confirmar',
      'warning',
      'El cliente aceptó. Falta día y hora.',
    );
  }
  if (checklist === 'PENDIENTE_FIRMA_CLIENTE') {
    return armar(
      'falta_firma',
      'Falta la firma',
      'warning',
      'El trabajo ya está registrado. Falta que el cliente firme.',
    );
  }
  if (checklist === 'PENDIENTE_FIRMA_SUPERVISOR') {
    return armar(
      'falta_revision',
      'Falta la revisión',
      'warning',
      'El mecánico ya terminó su parte. Falta la revisión del taller.',
    );
  }
  if (EJECUCION.has(checklist)) {
    return armar('en_ejecucion', 'En ejecución', 'warning');
  }
  return armar('agendado', 'Agendado', 'info');
}

/**
 * La cotización de origen puede verse en la cita, pero no tapa el avance.
 * Lista y detalle leen `presentacionCitaTrabajo`.
 */
export function lecturaCitaListaYDetalle(cita: CitaTrabajoEntrada & {
  muestraDocumentoComercial?: boolean;
}) {
  const presentacion = presentacionCitaTrabajo(cita);
  return {
    lista: presentacion.trabajo,
    detalle: presentacion.trabajo,
    fase: presentacion.fase,
    explicacion: presentacion.explicacion,
    documentoVisible: Boolean(cita.muestraDocumentoComercial),
    trabajoVisibleConDocumento: true,
  };
}
