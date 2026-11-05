import {
  ALTO_BOTON_MAS,
  ALTO_NUEVA_COTIZACION,
  HUECO_ACCION,
  contenidoDespejaAccion,
  reservaNuevaCotizacion,
  reservaScrollSobreAccion,
} from '@/utils/reservaAccionFlotante';

describe('reservaAccionFlotante', () => {
  it('deja el contenido por encima del botón más de la ficha', () => {
    const pie = 108;
    const ancla = pie + HUECO_ACCION;
    const padding = reservaScrollSobreAccion(ancla, ALTO_BOTON_MAS);
    expect(contenidoDespejaAccion(padding, ancla, ALTO_BOTON_MAS)).toBe(true);
    expect(padding).toBeGreaterThan(ancla + ALTO_BOTON_MAS);
    expect(ancla).toBeGreaterThan(pie);
  });

  it('reserva en la lista el alto de Nueva cotización, no un desplazamiento a otro texto', () => {
    const base = 32;
    const padding = base + reservaNuevaCotizacion();
    const ancla = 0;
    expect(reservaNuevaCotizacion()).toBe(ALTO_NUEVA_COTIZACION + HUECO_ACCION + HUECO_ACCION);
    expect(contenidoDespejaAccion(padding, ancla, ALTO_NUEVA_COTIZACION)).toBe(true);
  });
});
