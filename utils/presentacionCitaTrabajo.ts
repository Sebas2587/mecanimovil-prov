/**
 * Avance del trabajo de una cita propia.
 *
 * Contrato del backend (CitaAgendaPersonalSerializer, lista y detalle):
 * checklist_estado es el enum de ChecklistInstance o null si no hay instancia.
 * Enums: PENDIENTE, EN_PROGRESO, PAUSADO, PENDIENTE_FIRMA_SUPERVISOR,
 * PENDIENTE_FIRMA_CLIENTE, COMPLETADO, CANCELADO.
 * estado_operativo siempre viene y es más grueso: firma pendiente también
 * sale como en_ejecucion. Sin instancia es agendado (hay técnico) o nuevo.
 *
 * Un checklist explícito afina ese grueso. Si el campo viene omitido, null,
 * vacío o con un valor desconocido, no se inventa «Agendado»: se lee
 * estado_operativo. Así una lista resumida no esconde una ejecución real
 * ni pierde cancelado o completado.
 */
import {
  ESTADO_OPERATIVO_LABELS,
  ESTADO_OPERATIVO_VARIANT,
  mapCitaEstadoOperativo,
  type EstadoOperativoUnificado,
} from '@/utils/estadoOperativo';

export type FaseCitaTrabajo =
  | 'nuevo'
  | 'esperando'
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
  /**
   * Enum del checklist, null si el serializer dijo que no hay instancia,
   * u omitido si la lista no trajo el campo.
   */
  checklist_estado?: string | null;
};

const CHECKLIST_CONOCIDO = new Set([
  'PENDIENTE',
  'EN_PROGRESO',
  'PAUSADO',
  'PENDIENTE_FIRMA_SUPERVISOR',
  'PENDIENTE_FIRMA_CLIENTE',
  'COMPLETADO',
  'CANCELADO',
]);

function armar(
  fase: FaseCitaTrabajo,
  trabajo: string,
  trabajoTono: PresentacionCitaTrabajo['trabajoTono'],
  explicacion = '',
): PresentacionCitaTrabajo {
  return { fase, trabajo, trabajoTono, explicacion };
}

function faseDeOperativo(op: EstadoOperativoUnificado): FaseCitaTrabajo {
  if (op === 'cerrado' || op === 'completado') return 'completado';
  if (op === 'cancelado') return 'cancelado';
  if (op === 'en_ejecucion') return 'en_ejecucion';
  if (op === 'por_agendar') return 'por_agendar';
  if (op === 'nuevo') return 'nuevo';
  if (op === 'esperando') return 'esperando';
  return 'agendado';
}

/** Sin checklist usable: el estado operativo real manda. No se degrada a Agendado. */
function desdeEstadoOperativo(cita: CitaTrabajoEntrada): PresentacionCitaTrabajo {
  const op = mapCitaEstadoOperativo(
    cita.estado_operativo,
    cita.estado ?? undefined,
    false,
  );
  return armar(faseDeOperativo(op), ESTADO_OPERATIVO_LABELS[op], ESTADO_OPERATIVO_VARIANT[op]);
}

export function checklistEstadoExplicito(valor: string | null | undefined): string | null {
  if (typeof valor !== 'string') return null;
  const checklist = valor.trim().toUpperCase();
  if (!checklist || !CHECKLIST_CONOCIDO.has(checklist)) return null;
  return checklist;
}

export function presentacionCitaTrabajo(cita: CitaTrabajoEntrada): PresentacionCitaTrabajo {
  const estado = String(cita.estado ?? '').trim().toLowerCase();
  const checklist = checklistEstadoExplicito(cita.checklist_estado);

  if (estado === 'cancelada') {
    return armar('cancelado', 'Cancelado', 'error');
  }
  if (estado === 'cerrada' || checklist === 'COMPLETADO') {
    return armar('completado', 'Completado', 'success');
  }
  if (checklist === 'CANCELADO') {
    return armar('cancelado', 'Cancelado', 'error');
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
  if (checklist === 'EN_PROGRESO' || checklist === 'PAUSADO') {
    return armar('en_ejecucion', 'En ejecución', 'warning');
  }
  if (checklist === 'PENDIENTE') {
    return armar('agendado', 'Agendado', 'info');
  }
  return desdeEstadoOperativo(cita);
}

/**
 * La cotización de origen puede verse en la cita, pero no tapa el avance.
 * Lista y detalle leen `presentacionCitaTrabajo` con los campos que cada una tenga.
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
