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
          id: 'rod',
          nombre: 'Rodamiento de volante',
          origen: 'sugerencia',
          motivo_sugerencia: 'No viene en el kit (disco, prensa y collarín de empuje).',
          estado_sugerencia: 'pendiente',
        }}
      />,
    );
    expect(view.getByText('Sugerido')).toBeTruthy();
    expect(view.getByText(/No viene en el kit/)).toBeTruthy();
    expect(view.getByText(/no se suma al total/i)).toBeTruthy();
    fireEvent.press(view.getByLabelText('Aceptar'));
    expect(onDecidir).toHaveBeenCalledWith('aceptada');
    fireEvent.press(view.getByLabelText('Descartar'));
    expect(onDecidir).toHaveBeenCalledWith('descartada');
  });
});
