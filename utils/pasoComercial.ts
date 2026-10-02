export type PasoComercial =
  | 'por_enviar'
  | 'esperando'
  | 'por_agendar'
  | 'en_agenda'
  | 'cerrado';

export const PASO_ETIQUETA: Record<PasoComercial, string> = {
  por_enviar: 'Por enviar',
  esperando: 'Esperando',
  por_agendar: 'Por agendar',
  en_agenda: 'En agenda',
  cerrado: 'Cerrado',
};

export const PASO_FRASE: Record<PasoComercial, string> = {
  por_enviar: 'Revisa la cotización y envíala al cliente.',
  esperando: 'Esperando que acepte.',
  por_agendar: 'Aceptó. Elige día y hora para empezar.',
  en_agenda: 'Ya está en la agenda.',
  cerrado: 'Cerrado.',
};

type CasoPaso = {
  estado_normalizado?: string;
  estado_raw?: string;
  horario_por_confirmar?: boolean;
  fecha_agendada?: string | null;
  en_edicion?: boolean;
  listo_para_enviar?: boolean;
};

export function pasoDeCaso(caso: CasoPaso): PasoComercial {
  const estado = caso.estado_normalizado || '';
  if (estado === 'rechazado_perdido' || estado === 'completado') return 'cerrado';
  if (caso.horario_por_confirmar && !caso.fecha_agendada) return 'por_agendar';
  if (caso.en_edicion || caso.estado_raw === 'borrador' || caso.listo_para_enviar) {
    return 'por_enviar';
  }
  if (estado === 'nuevo' || estado === 'cotizacion_enviada' || estado === 'en_negociacion') {
    return 'esperando';
  }
  if (estado === 'aceptado_agendado' || estado === 'en_ejecucion' || caso.fecha_agendada) {
    return 'en_agenda';
  }
  return 'cerrado';
}

export function esPasoComercial(value: string | null | undefined): value is PasoComercial {
  return value === 'por_enviar'
    || value === 'esperando'
    || value === 'por_agendar'
    || value === 'en_agenda'
    || value === 'cerrado';
}
