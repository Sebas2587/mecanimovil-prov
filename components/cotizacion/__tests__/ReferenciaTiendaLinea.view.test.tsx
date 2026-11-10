import React from 'react';
import { render } from '@testing-library/react-native';
import { ReferenciaTiendaLinea } from '@/components/cotizacion/ReferenciaTiendaLinea';

jest.mock('lucide-react-native', () => new Proxy({}, { get: () => () => null }));

describe('ReferenciaTiendaLinea', () => {
  it('pinta Imaparts junto al enlace y Adriazola como casa sugerida', async () => {
    const view = await render(
      <ReferenciaTiendaLinea
        rep={{
          url_producto: 'https://www.imaparts.cl/kit-embrague-oroch',
          proveedor_nombre: 'Imaparts',
          casa_sugerida: 'Adriazola',
          casa_repuesto_nombre: 'Adriazola',
          precio_verificado_en_casa: false,
          nota_referencia: 'Precio referencial de Imaparts, no verificado en Adriazola.',
        }}
      />,
    );
    expect(view.getAllByText(/Imaparts/).length).toBeGreaterThan(0);
    expect(view.getByLabelText('Ver en Imaparts')).toBeTruthy();
    expect(view.getByText('Casa sugerida: Adriazola')).toBeTruthy();
    expect(view.getByText(/no verificado en Adriazola/)).toBeTruthy();
  });
});
