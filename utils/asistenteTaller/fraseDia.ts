import type { EventoAgendaUnificado } from '@/services/agendaProveedorService';
import { isSameDay, parseFechaLocal } from '@/utils/fechaLocal';

function horaCorta(hora: string | undefined): string {
  return (hora || '').slice(0, 5);
}

function cerrado(estado: string): boolean {
  const p = estado.toLowerCase();
  return p.includes('cerrad') || p.includes('complet');
}

export function fraseDelDia(eventos: EventoAgendaUnificado[], hoy = new Date()): string | null {
  const delDia = eventos
    .filter((evento) => {
      const fecha = parseFechaLocal(evento.fecha_servicio);
      return fecha ? isSameDay(fecha, hoy) : false;
    })
    .sort((a, b) => horaCorta(a.hora_servicio).localeCompare(horaCorta(b.hora_servicio)));

  if (delDia.length === 0) return null;

  const siguiente = delDia.find((evento) => !cerrado(evento.estado)) ?? delDia[0];
  const servicio = (siguiente.servicio_nombre || siguiente.etiqueta || 'servicio').trim();
  const cliente = (siguiente.cliente_nombre || 'el cliente').trim();
  const hora = horaCorta(siguiente.hora_servicio);
  const mecanico = (siguiente.mecanico_nombre || '').trim();
  const conQuien = mecanico ? `, con ${mecanico}` : '';
  const autos = delDia.length === 1 ? '1 auto' : `${delDia.length} autos`;
  return `Hoy, ${autos}. El siguiente es ${servicio} de ${cliente} a las ${hora}${conQuien}.`;
}
