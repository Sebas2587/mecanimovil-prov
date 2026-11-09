import { coincideBusquedaCotizacion } from '@/utils/busquedaCotizacion';

const cotizacion = {
  cliente_nombre: 'José Costos',
  cliente_display: 'José Costos',
  cliente_telefono: '+56911112222',
  numero_publico: 'MM-000003',
  servicio_nombre: 'Cambio de filtro',
  vehiculo_marca: 'Toyota',
  vehiculo_modelo: 'Corolla',
  vehiculo_anio: 2018,
  vehiculo_patente: 'AB-CD-12',
};

describe('coincideBusquedaCotizacion', () => {
  it('encuentra por nombre parcial sin tilde', () => {
    expect(coincideBusquedaCotizacion(cotizacion, 'jose')).toBe(true);
    expect(coincideBusquedaCotizacion(cotizacion, 'JOSÉ cos')).toBe(true);
  });

  it('encuentra la patente sin guiones y en cualquier mayúscula', () => {
    expect(coincideBusquedaCotizacion(cotizacion, 'abcd12')).toBe(true);
    expect(coincideBusquedaCotizacion(cotizacion, 'ab-cd')).toBe(true);
  });

  it('encuentra marca y modelo escritos juntos', () => {
    expect(coincideBusquedaCotizacion(cotizacion, 'toyota corolla')).toBe(true);
    expect(coincideBusquedaCotizacion(cotizacion, 'corol')).toBe(true);
  });

  it('encuentra el nombre visible del contacto y la descripción', () => {
    expect(coincideBusquedaCotizacion({
      ...cotizacion,
      cliente_nombre: '',
      cliente_display: 'María Pérez',
      descripcion_problema: 'Falla al arrancar',
    }, 'maria perez')).toBe(true);
    expect(coincideBusquedaCotizacion({
      ...cotizacion,
      descripcion_problema: 'Falla al arrancar',
    }, 'arrancar')).toBe(true);
  });

  it('no mezcla un cliente con otro auto', () => {
    expect(coincideBusquedaCotizacion(cotizacion, 'toyota hilux')).toBe(false);
    expect(coincideBusquedaCotizacion(cotizacion, 'pedro')).toBe(false);
  });
});
