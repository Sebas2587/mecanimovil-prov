import React from 'react';
import { render } from '@testing-library/react-native';
import { FuenteFichaInterna } from '@/components/cotizacion/FuenteFichaInterna';

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));

describe('FuenteFichaInterna', () => {
  it('no repite Imaparts ni un segundo enlace si ya está junto al precio', async () => {
    const view = await render(
      <FuenteFichaInterna
        rep={{
          nombre: 'Kit de embrague',
          cantidad: 1,
          precio_unitario_clp: 89000,
          proveedor_nombre: 'Imaparts',
          url_producto: 'https://www.imaparts.cl/kit-embrague-oroch',
          nombre_producto: 'Kit de embrague Renault Oroch 2019',
          precio_marketplace_clp: 89000,
        }}
      />,
    );
    expect(view.queryByText('Imaparts')).toBeNull();
    expect(view.queryByLabelText('Abrir ficha de la tienda')).toBeNull();
    expect(view.getByText('Kit de embrague Renault Oroch 2019')).toBeTruthy();
  });
});
