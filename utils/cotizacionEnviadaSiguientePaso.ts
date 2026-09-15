import { addDays, differenceInCalendarDays, differenceInHours } from 'date-fns';
import { clampDiasValidez, type CotizacionCanal } from '@/services/cotizacionCanalService';

export type SiguientePasoEnviada = {
  kicker: string;
  titulo: string;
  cuerpo: string;
  validezLabel: string | null;
  urgencia: 'info' | 'warning';
};

function fechaExpiracionDe(c: CotizacionCanal): Date | null {
  const raw = c.fecha_expiracion_publica;
  if (raw) {
    const d = new Date(raw);
    if (!Number.isNaN(d.getTime())) return d;
  }
  const enviada = c.enviada_en ? new Date(c.enviada_en) : null;
  if (!enviada || Number.isNaN(enviada.getTime())) return null;
  return addDays(enviada, clampDiasValidez(c.dias_validez));
}

function validezLabelDe(c: CotizacionCanal, now: Date): string | null {
  const expira = fechaExpiracionDe(c);
  if (!expira) return null;
  const dias = differenceInCalendarDays(expira, now);
  if (dias < 0) return 'La vigencia ya venció';
  if (dias === 0) return 'Vence hoy';
  if (dias === 1) return 'Vigente 1 día más';
  return `Vigente ${dias} días más`;
}

/** Qué debe hacer el taller con una cotización ya enviada. */
export function siguientePasoCotizacionEnviada(
  c: Pick<
    CotizacionCanal,
    | 'estado'
    | 'emision_pendiente'
    | 'entrega_pendiente_compartir'
    | 'visto_en'
    | 'enviada_en'
    | 'dias_validez'
    | 'fecha_expiracion_publica'
  >,
  now: Date = new Date(),
): SiguientePasoEnviada | null {
  if (c.estado !== 'enviada') return null;
  const validezLabel = validezLabelDe(c as CotizacionCanal, now);
  const enviada = c.enviada_en ? new Date(c.enviada_en) : null;
  const horas = enviada && !Number.isNaN(enviada.getTime())
    ? differenceInHours(now, enviada)
    : 0;

  if (c.emision_pendiente) {
    return {
      kicker: 'Actualización pendiente',
      titulo: 'El cliente aún ve la versión anterior',
      cuerpo: 'Envía esta actualización para que el link muestre los cambios. Si ya aceptó por teléfono, márcala aceptada.',
      validezLabel,
      urgencia: 'warning',
    };
  }
  if (c.entrega_pendiente_compartir) {
    return {
      kicker: 'Por compartir',
      titulo: 'Todavía no la recibió',
      cuerpo: 'Copia el link o ábrelo en WhatsApp. Hasta que el cliente lo abra, no hay respuesta que esperar.',
      validezLabel,
      urgencia: 'warning',
    };
  }
  if (c.visto_en && horas >= 24) {
    return {
      kicker: 'Sin respuesta',
      titulo: 'Abrió el enlace y no contestó',
      cuerpo: 'Escribe, recuérdale por WhatsApp o cierra el caso. Si aceptó por teléfono, márcala aceptada. La IA solo envía un recordatorio automático.',
      validezLabel,
      urgencia: 'warning',
    };
  }
  if (c.visto_en) {
    return {
      kicker: 'Visto',
      titulo: 'El cliente abrió el enlace',
      cuerpo: 'Si no escribe, recuérdale por WhatsApp o espera. Si aceptó por teléfono, márcala aceptada.',
      validezLabel,
      urgencia: 'info',
    };
  }
  if (horas >= 48) {
    return {
      kicker: 'Sin respuesta +48h',
      titulo: 'Nadie contestó esta cotización',
      cuerpo: 'Escribe, recuérdale por WhatsApp o cierra el caso. No hace falta seguir esperando en silencio.',
      validezLabel,
      urgencia: 'warning',
    };
  }
  if (horas >= 24) {
    return {
      kicker: 'Sin respuesta',
      titulo: 'Sigue sin respuesta desde ayer',
      cuerpo: 'La IA puede recordar una sola vez por WhatsApp. Si no contestan, escribe tú, marca aceptada o cierra el caso.',
      validezLabel,
      urgencia: 'warning',
    };
  }
  return {
    kicker: 'Esperando respuesta',
    titulo: 'Cotización enviada',
    cuerpo: 'La IA puede enviar un recordatorio si no contestan. Tú decides el cierre: escribir, marcar aceptada o pasar el caso a Perdidos.',
    validezLabel,
    urgencia: 'info',
  };
}
