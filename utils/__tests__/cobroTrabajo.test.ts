import { resolverCobroTrabajo } from '@/utils/cobroTrabajo';
import { mapOrdenEstadoToOperativo } from '@/utils/estadoOperativo';
import { resumenPreciosOrden } from '@/utils/resumenPreciosOrden';

describe('resolverCobroTrabajo', () => {
  it('separa el avance del cobro cuando pagada y pendiente_pago se ven agendados', () => {
    expect(mapOrdenEstadoToOperativo('pagada')).toBe('agendado');
    expect(mapOrdenEstadoToOperativo('pendiente_pago')).toBe('agendado');

    const pagada = resolverCobroTrabajo({ origen: 'orden', estado: 'pagada' });
    const pendiente = resolverCobroTrabajo({ origen: 'orden', estado: 'pendiente_pago' });
    expect(pagada.etiqueta).toBe('Pagado');
    expect(pendiente.etiqueta).toBe('Por cobrar');
  });

  it('no convierte una cotización aceptada ni una cita en dinero cobrado', () => {
    expect(resolverCobroTrabajo({ origen: 'cotizacion', estado: 'aceptada' }).cobro).toBe('sin_registro');
    expect(resolverCobroTrabajo({ origen: 'cita', estado: 'cerrada' }).cobro).toBe('sin_registro');
    expect(resolverCobroTrabajo({ origen: 'orden', estado: 'aceptada' }).cobro).toBe('sin_registro');
    expect(resolverCobroTrabajo({ origen: 'orden', estado: 'completado' }).cobro).toBe('sin_registro');
  });

  it('usa los campos de pago y no declara pagado si falta una parte', () => {
    const parcial = resolverCobroTrabajo({
      origen: 'oferta',
      estado: 'pagada',
      estadoPagoRepuestos: 'pagado',
      estadoPagoServicio: 'pendiente',
    });
    expect(parcial.cobro).toBe('por_cobrar');
    expect(parcial.detalle).toBe('Falta la mano de obra.');

    const completo = resolverCobroTrabajo({
      origen: 'oferta',
      estado: 'en_ejecucion',
      estadoPagoRepuestos: 'pagado',
      estadoPagoServicio: 'pagado',
    });
    expect(completo.cobro).toBe('pagado');
  });

  it('deja sin registro un estado desconocido', () => {
    expect(resolverCobroTrabajo({ origen: 'orden', estado: 'pago_validado' }).cobro).toBe('sin_registro');
    expect(resolverCobroTrabajo({ origen: 'oferta' }).etiqueta).toBe('Sin registro');
  });
});

describe('resumenPreciosOrden', () => {
  it('no inventa comisión ni ganancia si falta el desglose', () => {
    const resumen = resumenPreciosOrden([
      { precio_final: '119000' },
      {
        precio_final: '50000',
        oferta_servicio_detail: {
          desglose_precios: {
            precio_final_cliente: '50000',
            comision_mecanmovil_20_porciento: '8000',
            ganancia_neta_proveedor: '30000',
          },
        },
      },
    ]);
    expect(resumen.desgloseCompleto).toBe(false);
    expect(resumen.comision).toBeNull();
    expect(resumen.despuesDeComision).toBeNull();
    expect(resumen.precioFinalCliente).toBe(169000);
  });

  it('suma el desglose solo cuando todas las líneas lo traen', () => {
    const resumen = resumenPreciosOrden([
      {
        oferta_servicio_detail: {
          desglose_precios: {
            costo_total_sin_iva: '10000',
            iva_19_porciento: '1900',
            precio_final_cliente: '11900',
            comision_mecanmovil_20_porciento: '2000',
            iva_sobre_comision: '380',
            ganancia_neta_proveedor: '7620',
          },
        },
      },
    ]);
    expect(resumen.desgloseCompleto).toBe(true);
    expect(resumen.comision).toBe(2000);
    expect(resumen.despuesDeComision).toBe(7620);
  });
});
