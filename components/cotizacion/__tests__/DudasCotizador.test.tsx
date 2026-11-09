import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { DudasCotizador } from '@/components/cotizacion/DudasCotizador';

describe('DudasCotizador', () => {
  it('una duda pendiente pide respuesta o confirmación', async () => {
    const onResponder = jest.fn();
    const onConfirmar = jest.fn();
    const view = await render(
      <DudasCotizador
        editable
        onResponder={onResponder}
        onConfirmar={onConfirmar}
        dudas={[{
          id: 'd1',
          pregunta: 'El kit incluye el rodamiento',
          contexto: 'LCKS17 kit de embrague',
          estado: 'pendiente',
        }]}
      />,
    );
    expect(view.getByTestId('dudas-cotizador')).toBeTruthy();
    expect(view.getByText('El kit incluye el rodamiento')).toBeTruthy();
    fireEvent.press(view.getByLabelText('Confirmar'));
    expect(onConfirmar).toHaveBeenCalledWith('d1');
  });
});
