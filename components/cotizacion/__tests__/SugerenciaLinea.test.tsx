import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { SugerenciaLinea } from '@/components/cotizacion/SugerenciaLinea';

describe('SugerenciaLinea y dudas', () => {
  it('muestra el motivo y deja aceptar o descartar una sugerencia pendiente', async () => {
    const onDecidir = jest.fn();
    const view = await render(
      <SugerenciaLinea
        editable
        onDecidir={onDecidir}
        rep={{
          id: 'bomba',
          nombre: 'Bomba de embrague',
          origen: 'sugerencia',
          motivo_sugerencia: 'Suele ir con el kit en LCKS17.',
          estado_sugerencia: 'pendiente',
        }}
      />,
    );
    expect(view.getByText('Sugerido')).toBeTruthy();
    expect(view.getByText('Suele ir con el kit en LCKS17.')).toBeTruthy();
    expect(view.getByText(/no se suma al total/i)).toBeTruthy();
    fireEvent.press(view.getByLabelText('Aceptar'));
    expect(onDecidir).toHaveBeenCalledWith('aceptada');
    fireEvent.press(view.getByLabelText('Descartar'));
    expect(onDecidir).toHaveBeenCalledWith('descartada');
  });
});
