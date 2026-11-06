import { esCotizacionDePrueba } from '@/utils/filtroCotizacionPrueba';

describe('filtro de cotizaciones de prueba', () => {
  it('oculta TEST en el cliente o en el servicio y conserva la lista', () => {
    const porCliente = {
      cliente_nombre: 'TEST Cotización IA 12',
      servicio_nombre: 'Cambio de aceite',
    };
    const porServicio = { servicio_nombre: 'TEST pastillas' };
    const real = { cliente_nombre: 'Ana', servicio_nombre: 'Cambio de aceite' };
    const contestado = { cliente_nombre: 'contestado', servicio_nombre: 'contestado' };
    const lista = [porCliente, porServicio, real, contestado];

    const ocultas = lista.filter((item) => !esCotizacionDePrueba(item));
    expect(ocultas).toEqual([real, contestado]);
    expect(lista).toEqual([porCliente, porServicio, real, contestado]);
    expect(esCotizacionDePrueba({ cliente_display: 'TEST Cotización IA 34', servicio_nombre: 'Cambio de aceite' })).toBe(true);
    expect(esCotizacionDePrueba({ servicio_nombre: 'test' })).toBe(true);
  });
});
