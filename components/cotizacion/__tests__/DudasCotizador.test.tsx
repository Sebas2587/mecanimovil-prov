import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { DudasCotizador } from '@/components/cotizacion/DudasCotizador';

describe('DudasCotizador', () => {
  it('una duda pendiente se confirma', async () => {
    const onConfirmar = jest.fn();
    const view = await render(
      <DudasCotizador
        editable
        onConfirmar={onConfirmar}
        dudas={[{
          id: 'd1',
          texto: 'El kit incluye el rodamiento',
          confirmada: false,
        }]}
      />,
    );
    expect(view.getByTestId('dudas-cotizador')).toBeTruthy();
    expect(view.getByText('El kit incluye el rodamiento')).toBeTruthy();
    fireEvent.press(view.getByLabelText('Confirmar'));
    expect(onConfirmar).toHaveBeenCalledWith('d1');
  });
});
