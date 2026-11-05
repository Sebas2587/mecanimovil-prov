import {
  alertasValidacionVisibles,
  vistaValidacionLinea,
} from '@/utils/validacionCotizacion';

describe('vistaValidacionLinea', () => {
  it('marca ok en verde y sin motivo', () => {
    const vista = vistaValidacionLinea({
      validacion_estado: 'ok',
      validacion_motivo: 'no debería verse',
      alertas: ['La ficha es un juego de 4.'],
    });
    expect(vista?.etiqueta).toBe('Verificado');
    expect(vista?.tono).toBe('success');
    expect(vista?.motivo).toBe('');
    expect(vista?.alertas).toEqual(['La ficha es un juego de 4.']);
    expect(vista?.colapsable).toBe(false);
  });

  it('marca el precio asumido en gris con su motivo', () => {
    const vista = vistaValidacionLinea({
      validacion_estado: 'asumido',
      validacion_motivo: 'No hay ficha. El precio es asumido.',
    });
    expect(vista?.etiqueta).toBe('Precio asumido');
    expect(vista?.tono).toBe('neutral');
    expect(vista?.motivo).toContain('No hay ficha');
  });

  it('usa ámbar y rojo para los otros estados', () => {
    expect(vistaValidacionLinea({ validacion_estado: 'sin_referencia_valida' })?.tono).toBe('warning');
    expect(vistaValidacionLinea({ validacion_estado: 'sin_referencia_valida' })?.etiqueta).toBe('Sin referencia válida');
    expect(vistaValidacionLinea({ validacion_estado: 'requiere_revision' })?.tono).toBe('error');
    expect(vistaValidacionLinea({ validacion_estado: 'requiere_revision' })?.etiqueta).toBe('Requiere revisión');
  });

  it('colapsa cuando hay más de dos alertas', () => {
    const vista = vistaValidacionLinea({
      validacion_estado: 'requiere_revision',
      validacion_motivo: 'El costo y el cobrado no calzan.',
      alertas: ['Una', 'Dos', 'Tres'],
    });
    expect(vista?.colapsable).toBe(true);
    expect(vista?.alertas).toHaveLength(3);
  });

  it('no arma badge si el estado falta o no se reconoce', () => {
    expect(vistaValidacionLinea({})).toBeNull();
    expect(vistaValidacionLinea({ validacion_estado: '' })).toBeNull();
    expect(vistaValidacionLinea({ validacion_estado: 'otro', alertas: 'no-es-lista' })).toBeNull();
  });
});

describe('alertasValidacionVisibles', () => {
  it('lista las filas de la cotización', () => {
    const filas = alertasValidacionVisibles([
      {
        repuesto: 'Filtro de aire',
        estado: 'asumido',
        motivo: 'No hay ficha.',
        alertas: [],
      },
    ]);
    expect(filas).toHaveLength(1);
    expect(filas[0].repuesto).toBe('Filtro de aire');
    expect(filas[0].etiqueta).toBe('Precio asumido');
    expect(filas[0].motivo).toBe('No hay ficha.');
  });

  it('no arma bloque si el campo falta', () => {
    expect(alertasValidacionVisibles(undefined)).toEqual([]);
    expect(alertasValidacionVisibles(null)).toEqual([]);
    expect(alertasValidacionVisibles({})).toEqual([]);
  });
});
