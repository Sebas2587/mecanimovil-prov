import { indiceLinea, serviciosDeCotizacion } from '@/utils/serviciosCotizacion';

const kit = {
  id: 'kit',
  nombre: 'Kit de embrague',
  identidad: 'kit_embrague',
  origen: 'pedido',
  cantidad: 1,
  precio_unitario_clp: 89000,
};
const aceite = {
  id: 'aceite',
  nombre: 'Aceite de caja de cambios',
  identidad: 'aceite_caja',
  origen: 'sugerencia',
  estado_sugerencia: 'pendiente',
  motivo_sugerencia: 'Al bajar la caja se pierde la valvulina.',
  cantidad: 1,
  precio_unitario_clp: 0,
  precio_estimado: true,
};
const suelto = {
  id: 'sensor',
  nombre: 'Sensor sin precio',
  identidad: 'sensor',
  origen: 'pedido',
  cantidad: 1,
  precio_unitario_clp: 0,
};

describe('serviciosDeCotizacion', () => {
  it('sin metadata.servicios[] deja la vista vieja', () => {
    expect(serviciosDeCotizacion({
      repuestos: [kit],
    })).toBeNull();
    expect(serviciosDeCotizacion({ metadata: {} })).toBeNull();
  });

  it('agrupa por identidad de metadata.servicios[]', () => {
    const grupos = serviciosDeCotizacion({
      metadata: {
        servicios: [{
          id: 'cambio_embrague',
          nombre: 'Cambio de embrague',
          solo_mano: false,
          vehiculo: { marca: 'Renault', modelo: 'Oroch', anio: 2019, motor: '1.6' },
          mano_obra: {
            monto_clp: 90000,
            horas: 6,
            tarifa_hora_clp: 15000,
            origen: 'estimada',
            estimada: true,
            motivo: 'Bajar la caja y cambiar el embrague son unas 6 horas de taller.',
          },
          repuestos_requeridos: [
            { identidad: 'kit_embrague', nombre: 'Kit de embrague', motivo: '' },
          ],
          sugeridos: [
            { identidad: 'aceite_caja', nombre: 'Aceite de caja de cambios', motivo: 'Al bajar la caja se pierde la valvulina.' },
          ],
        }],
      },
      repuestos: [kit, aceite, suelto],
    });
    expect(grupos).toHaveLength(2);
    expect(grupos?.[0].nombre).toBe('Cambio de embrague');
    expect(grupos?.[0].manoObra.monto_clp).toBe(90000);
    expect(grupos?.[0].manoObra.horas).toBe(6);
    expect(grupos?.[0].manoObra.estimada).toBe(true);
    expect(grupos?.[0].manoObra.motivo).toMatch(/6 horas/);
    expect(grupos?.[0].pedidos).toHaveLength(1);
    expect(grupos?.[0].pedidos[0].nombre).toBe('Kit de embrague');
    expect(grupos?.[0].sugeridos[0].identidad).toBe('aceite_caja');
    expect(grupos?.[1].esOtros).toBe(true);
    expect(grupos?.[1].nombre).toBe('Otros repuestos');
    expect(grupos?.[1].pedidos[0].nombre).toBe('Sensor sin precio');
  });

  it('solo_mano no pide repuestos', () => {
    const grupos = serviciosDeCotizacion({
      metadata: {
        servicios: [{
          id: 'hidraulico',
          nombre: 'Revisión hidráulica de frenos',
          solo_mano: true,
          mano_obra: { monto_clp: 25000, horas: 1, origen: 'catalogo', estimada: false },
          repuestos_requeridos: [{ identidad: 'kit_embrague', nombre: 'No debería entrar', motivo: '' }],
          sugeridos: [],
        }],
      },
      repuestos: [kit],
    });
    expect(grupos?.[0].soloMano).toBe(true);
    expect(grupos?.[0].pedidos).toHaveLength(0);
    expect(grupos?.[1].nombre).toBe('Otros repuestos');
    expect(grupos?.[1].pedidos[0].identidad).toBe('kit_embrague');
  });

  it('indiceLinea encuentra por identidad, id o nombre', () => {
    const lista = [{ id: 'kit', nombre: 'Kit', identidad: 'kit_embrague' }, { id: 'x', nombre: 'Pastillas' }];
    expect(indiceLinea(lista, { identidad: 'kit_embrague' })).toBe(0);
    expect(indiceLinea(lista, { id: 'kit' })).toBe(0);
    expect(indiceLinea(lista, { nombre: 'Pastillas' })).toBe(1);
    expect(indiceLinea(lista, { id: 'no' })).toBe(-1);
  });
});
