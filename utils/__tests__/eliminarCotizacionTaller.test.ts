import {
  MENSAJE_ELIMINAR_COTIZACION,
  TITULO_ELIMINAR_COTIZACION,
  mensajeErrorEliminarCotizacion,
  puedeEliminarCotizacion,
} from '@/utils/eliminarCotizacionTaller';

describe('eliminar cotización del taller', () => {
  it('permite borrar borrador, enviada y rechazada, no la aceptada en agenda', () => {
    expect(puedeEliminarCotizacion({ estado: 'borrador', tiene_horario_agendado: false, fecha_agendada: '' })).toBe(true);
    expect(puedeEliminarCotizacion({ estado: 'enviada', tiene_horario_agendado: false, fecha_agendada: '' })).toBe(true);
    expect(puedeEliminarCotizacion({ estado: 'cancelada', tiene_horario_agendado: false, fecha_agendada: '' })).toBe(true);
    expect(puedeEliminarCotizacion({ estado: 'aceptada', tiene_horario_agendado: false, fecha_agendada: '' })).toBe(false);
    expect(puedeEliminarCotizacion({
      estado: 'aceptada',
      tiene_horario_agendado: true,
      fecha_agendada: '2026-11-10',
    })).toBe(false);
  });

  it('el copy de confirmación es destructivo y el error usa el mensaje del backend', () => {
    expect(TITULO_ELIMINAR_COTIZACION).toBe('Eliminar cotización');
    expect(MENSAJE_ELIMINAR_COTIZACION).toMatch(/no se puede deshacer/i);
    expect(mensajeErrorEliminarCotizacion({
      response: { status: 409, data: { detail: 'Tiene un pago asociado.' } },
    })).toBe('Tiene un pago asociado.');
  });
});
