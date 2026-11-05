import { textoReferenciaTienda } from '@/utils/referenciaTienda';
import { formatearMontoCLP } from '@/utils/formatearMontoCLP';

describe('textoReferenciaTienda', () => {
  it('arma tienda y precio cuando hay ficha', () => {
    const ref = textoReferenciaTienda({
      url_referencia: 'https://tienda.cl/pieza',
      tienda_referencia: 'TodoAuto Chile',
      precio_verificado_clp: 12990,
    });
    expect(ref).toEqual({
      texto: `TodoAuto Chile ${formatearMontoCLP(12990)}`,
      url: 'https://tienda.cl/pieza',
    });
  });

  it('omite el nombre o el monto si el backend los manda vacíos', () => {
    expect(textoReferenciaTienda({
      url_referencia: 'https://tienda.cl/pieza',
      tienda_referencia: '',
      precio_verificado_clp: 5000,
    })?.texto).toBe(formatearMontoCLP(5000));

    expect(textoReferenciaTienda({
      url_referencia: 'https://tienda.cl/pieza',
      tienda_referencia: 'Comercial Ramírez',
      precio_verificado_clp: null,
    })?.texto).toBe('Comercial Ramírez');
  });

  it('oculta la referencia si no hay URL', () => {
    expect(textoReferenciaTienda({
      url_referencia: '',
      tienda_referencia: 'TodoAuto Chile',
      precio_verificado_clp: 1000,
    })).toBeNull();
    expect(textoReferenciaTienda({
      url_referencia: '   ',
      tienda_referencia: 'TodoAuto Chile',
      precio_verificado_clp: 1000,
    })).toBeNull();
  });
});
