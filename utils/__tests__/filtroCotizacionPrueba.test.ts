import { esCotizacionDePrueba } from '@/utils/filtroCotizacionPrueba';

describe('filtro de cotizaciones de prueba', () => {
  it('reconoce TEST en el título y se puede volver a mostrar', () => {
    const prueba = { servicio_nombre: 'TEST pastillas' };
    const real = { servicio_nombre: 'Cambio de aceite' };
    const lista = [prueba, real];
    const ocultas = lista.filter((item) => !esCotizacionDePrueba(item));
    expect(ocultas).toEqual([real]);
    expect(lista.filter(() => true)).toEqual([prueba, real]);
    expect(esCotizacionDePrueba({ servicio_nombre: 'contestado' })).toBe(false);
    expect(esCotizacionDePrueba({ servicio_nombre: 'test' })).toBe(true);
  });
});
