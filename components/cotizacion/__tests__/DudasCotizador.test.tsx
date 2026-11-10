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

  it('muestra las dudas nuevas de precio estimado y pieza', async () => {
    const view = await render(
      <DudasCotizador
        editable
        dudas={[
          {
            id: 'precio-estimado-sensor-de-detonacion',
            texto: 'El precio de Sensor de detonación es estimado, sin ficha de tienda.',
            confirmada: false,
          },
          {
            id: 'kit-composicion',
            texto: 'Confirma si el kit incluye el rodamiento piloto.',
            confirmada: false,
          },
        ]}
      />,
    );
    expect(view.getByText(/precio de Sensor de detonación es estimado/)).toBeTruthy();
    expect(view.getByText(/kit incluye el rodamiento piloto/)).toBeTruthy();
  });
});
