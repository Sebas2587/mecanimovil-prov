import type { EventoAgendaUnificado } from '@/services/agendaProveedorService';
import { isSameDay, parseFechaLocal } from '@/utils/fechaLocal';

const CANCELADOS = new Set(['cancelada', 'cancelado', 'rechazada', 'rechazado']);

export type ResumenDia = {
  hoyCount: number;
  siguiente: EventoAgendaUnificado | null;
  frase: string;
};

function instante(evento: EventoAgendaUnificado, dia: Date): number {
  const [hora, minuto] = (evento.hora_servicio || '00:00').split(':');
  const marca = new Date(dia);
  marca.setHours(parseInt(hora, 10) || 0, parseInt(minuto, 10) || 0, 0, 0);
  return marca.getTime();
}

function horaCorta(hora: string | undefined): string {
  if (!hora) return '';
  return hora.slice(0, 5);
}

function etiquetaCuando(dia: Date, hoy: Date): string {
  if (isSameDay(dia, hoy)) return 'hoy';
  const manana = new Date(hoy);
  manana.setDate(hoy.getDate() + 1);
  if (isSameDay(dia, manana)) return 'mañana';
  return dia.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'short' });
}

function fraseVisita(evento: EventoAgendaUnificado, cuando: string): string {
  const nombre = (evento.cliente_nombre || 'un cliente').trim();
  const servicio = (evento.servicio_nombre || 'el servicio').trim();
  const hora = horaCorta(evento.hora_servicio);
  const horaTxt = hora ? ` a las ${hora}` : '';
  if (cuando === 'hoy') {
    return `El siguiente es ${servicio} de ${nombre}${horaTxt}.`;
  }
  return `El siguiente es ${cuando}${horaTxt}, ${servicio} de ${nombre}.`;
}

export function resumenDia(
  eventos: EventoAgendaUnificado[],
  ahora: Date = new Date(),
): ResumenDia {
  const vigentes = eventos.filter((evento) => !CANCELADOS.has(String(evento.estado || '').toLowerCase()));
  const conFecha = vigentes
    .map((evento) => {
      const dia = parseFechaLocal(evento.fecha_servicio);
      return dia ? { evento, dia, marca: instante(evento, dia) } : null;
    })
    .filter((fila): fila is { evento: EventoAgendaUnificado; dia: Date; marca: number } => fila != null)
    .sort((a, b) => a.marca - b.marca);

  const deHoy = conFecha.filter((fila) => isSameDay(fila.dia, ahora));
  const hoyCount = deHoy.length;
  const proximoHoy = deHoy.find((fila) => fila.marca + (fila.evento.duracion_minutos || 60) * 60_000 >= ahora.getTime());
  if (proximoHoy) {
    return {
      hoyCount,
      siguiente: proximoHoy.evento,
      frase: `Hoy, ${hoyCount} ${hoyCount === 1 ? 'auto' : 'autos'}. ${fraseVisita(proximoHoy.evento, 'hoy')}`,
    };
  }
  if (hoyCount > 0) {
    return {
      hoyCount,
      siguiente: deHoy[deHoy.length - 1].evento,
      frase: `Hoy, ${hoyCount} ${hoyCount === 1 ? 'auto' : 'autos'}. Las visitas de hoy ya pasaron.`,
    };
  }
  const futuro = conFecha.find((fila) => fila.marca >= ahora.getTime());
  if (futuro) {
    return {
      hoyCount: 0,
      siguiente: futuro.evento,
      frase: `Hoy no hay autos. ${fraseVisita(futuro.evento, etiquetaCuando(futuro.dia, ahora))}`,
    };
  }
  return {
    hoyCount: 0,
    siguiente: null,
    frase: 'Hoy no hay autos.',
  };
}
