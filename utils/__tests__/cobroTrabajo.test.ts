import {
  cobroVisibleLista,
  cobroVisibleOferta,
  cobroVisibleOrden,
  cobroVisiblePipeline,
  resolverCobroTrabajo,
} from '@/utils/cobroTrabajo';
import { montoConocidoCLP } from '@/utils/formatearMontoCLP';
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
    expect(resolverCobroTrabajo({ origen: 'cotizacion', estado: 'aceptada' }).cobro).toBe('sin_informacion');
    expect(resolverCobroTrabajo({ origen: 'cita', estado: 'cerrada' }).cobro).toBe('sin_informacion');
    expect(resolverCobroTrabajo({ origen: 'orden', estado: 'aceptada' }).cobro).toBe('sin_informacion');
    expect(resolverCobroTrabajo({ origen: 'orden', estado: 'en_ejecucion' }).etiqueta).toBe('Pago sin información');
    expect(resolverCobroTrabajo({ origen: 'orden', estado: 'en_ejecucion' }).aclaracion).not.toMatch(/no hay un pago/i);
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

  it('deja sin información un estado que no es de pago', () => {
    expect(resolverCobroTrabajo({ origen: 'orden', estado: 'pago_validado' }).cobro).toBe('sin_informacion');
    expect(resolverCobroTrabajo({ origen: 'oferta' }).etiqueta).toBe('Pago sin información');
  });
});

describe('contrato de la ficha', () => {
  it('campos de pago completos sin estado quedan en Pagado', () => {
    const cobro = cobroVisibleOrden({
      estado_pago_repuestos: 'pagado',
      estado_pago_servicio: 'pagado',
    });
    expect(cobro.etiqueta).toBe('Pagado');
  });

  it('un pago confirmado sigue en Pagado cuando la orden ya está completada', () => {
    const orden = cobroVisibleOrden({
      estado: 'completado',
      estado_pago_repuestos: 'no_aplica',
      estado_pago_servicio: 'pagado',
    });
    const lista = cobroVisibleLista({
      estadoEfectivo: 'completado',
      orden: { estado: 'completado' },
      oferta: {
        estado_pago_repuestos: 'pagado',
        estado_pago_servicio: 'pagado',
      },
    });
    expect(orden.etiqueta).toBe('Pagado');
    expect(lista.etiqueta).toBe('Pagado');
    expect(mapOrdenEstadoToOperativo('completado')).toBe('completado');
  });

  it('reembolso o fallo no quedan en Pagado aunque el estado siga en pagada', () => {
    const reembolso = cobroVisibleOrden({
      estado: 'pagada',
      estado_pago_servicio: 'reembolsado',
    });
    const fallido = cobroVisibleOferta({
      estado: 'pagada',
      estado_pago_repuestos: 'pagado',
      estado_pago_servicio: 'fallido',
    });
    const cancelado = cobroVisibleOrden({
      estado: 'pagada',
      estado_pago_servicio: 'cancelado',
    });
    expect(reembolso.etiqueta).not.toBe('Pagado');
    expect(reembolso.detalle).toMatch(/reembolsado/i);
    expect(fallido.etiqueta).not.toBe('Pagado');
    expect(cancelado.etiqueta).not.toBe('Pagado');
  });

  it('el pago parcial no se muestra como Pagado', () => {
    expect(cobroVisibleOrden({ estado: 'pagada_parcialmente' }).etiqueta).toBe('Por cobrar');
    expect(cobroVisibleOferta({
      estado: 'pagada',
      estado_pago_repuestos: 'parcial',
      estado_pago_servicio: 'pagado',
    }).etiqueta).toBe('Por cobrar');
  });

  it('sin datos no afirma que no hubo pago ni muestra $0', () => {
    const cobro = cobroVisibleOrden({ estado: 'completado', total: null } as { estado: string; total: null });
    expect(cobro.etiqueta).toBe('Pago sin información');
    expect(cobro.aclaracion).toMatch(/no tiene información/i);
    expect(cobro.aclaracion).not.toMatch(/no hay un pago/i);
    expect(montoConocidoCLP(null)).toBeNull();
    expect(montoConocidoCLP('')).toBeNull();
    expect(montoConocidoCLP(undefined)).toBeNull();
    expect(montoConocidoCLP('no-es-monto')).toBeNull();
    expect(montoConocidoCLP(0)).toBe('$0');
    expect(montoConocidoCLP('0')).toBe('$0');
  });

  it('la orden sin oferta y la oferta leen los mismos campos persistentes', () => {
    const payload = {
      estado: 'en_ejecucion',
      estado_pago_repuestos: 'pagado',
      estado_pago_servicio: 'pendiente',
    };
    expect(cobroVisibleOrden(payload).detalle).toBe('Falta la mano de obra.');
    expect(cobroVisibleOferta(payload).detalle).toBe('Falta la mano de obra.');
    expect(cobroVisibleLista({
      estadoEfectivo: 'servicio_iniciado',
      orden: payload,
    }).detalle).toBe('Falta la mano de obra.');
  });

  it('pipeline y cita no inventan un cobro con el avance', () => {
    expect(cobroVisiblePipeline({
      tipo_entidad: 'cotizacion_canal',
      estado: 'aceptada',
    }).etiqueta).toBe('Pago sin información');
    expect(cobroVisiblePipeline({
      tipo_entidad: 'orden_directa',
      estado: 'completado',
    }).etiqueta).toBe('Pago sin información');
    expect(cobroVisiblePipeline({
      tipo_entidad: 'cita_personal',
      estado: 'cerrada',
    }).cobro).toBe('sin_informacion');
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

  it('no completa con cero un desglose parcial en todas las líneas', () => {
    const resumen = resumenPreciosOrden([
      {
        precio_final: '10000',
        oferta_servicio_detail: {
          desglose_precios: {
            precio_final_cliente: '10000',
            costo_total_sin_iva: '8000',
          },
        },
      },
      {
        precio_final: '20000',
        oferta_servicio_detail: {
          desglose_precios: {
            precio_final_cliente: '',
            comision_mecanmovil_20_porciento: null,
            ganancia_neta_proveedor: undefined,
          },
        },
      },
    ]);
    expect(resumen.desgloseCompleto).toBe(false);
    expect(resumen.comision).toBeNull();
    expect(resumen.despuesDeComision).toBeNull();
    expect(resumen.iva).toBeNull();
    expect(resumen.precioFinalCliente).toBe(30000);
  });

  it('acepta el cero explícito y rechaza vacío o no numérico', () => {
    const completo = resumenPreciosOrden([
      {
        oferta_servicio_detail: {
          desglose_precios: {
            costo_total_sin_iva: '10000',
            iva_19_porciento: '1900',
            precio_final_cliente: '11900',
            comision_mecanmovil_20_porciento: 0,
            iva_sobre_comision: '0',
            ganancia_neta_proveedor: '7620',
          },
        },
      },
    ]);
    expect(completo.desgloseCompleto).toBe(true);
    expect(completo.comision).toBe(0);
    expect(completo.ivaComision).toBe(0);
    expect(completo.despuesDeComision).toBe(7620);

    const roto = resumenPreciosOrden([
      {
        precio_final: '11900',
        oferta_servicio_detail: {
          desglose_precios: {
            costo_total_sin_iva: '10000',
            iva_19_porciento: '1900',
            precio_final_cliente: '11900',
            comision_mecanmovil_20_porciento: 'no-num',
            iva_sobre_comision: '380',
            ganancia_neta_proveedor: '7620',
          },
        },
      },
    ]);
    expect(roto.desgloseCompleto).toBe(false);
    expect(roto.comision).toBeNull();
    expect(roto.precioFinalCliente).toBe(11900);
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

  it('no arma un total si alguna línea no trae precio', () => {
    const resumen = resumenPreciosOrden([
      { precio_final: '1000' },
      { precio_final: null },
    ]);
    expect(resumen.precioFinalCliente).toBeNull();
    expect(resumen.comision).toBeNull();
  });

  it('un pagado de fuente sin contabilizar no es deuda y un pendiente 0 no lo pisa', () => {
    const vista = resolverCobroTrabajo({
      origen: 'oferta',
      estadoCobroUi: 'pagado_segun_oferta',
      pagoContabilizable: false,
      saldoConocido: false,
      pendientesNoSumadosClp: 0,
      estadoPagoRepuestos: 'pagado',
    });
    expect(vista.etiqueta).toBe('Pagado según la fuente');
    expect(vista.aclaracion).toMatch(/no es una deuda/i);
    expect(vista.aclaracion).toMatch(/no es cero/i);
  });

  it('un reembolso del API gana al pagado anterior', () => {
    const vista = cobroVisibleOferta({
      estado_cobro_ui: 'reembolsado',
      estado_pago_repuestos: 'pagado',
      estado_pago_servicio: 'pagado',
    });
    expect(vista.etiqueta).toBe('Reembolsado');
  });

  it('no reescribe un por cobrar que ya mandó el API', () => {
    const vista = resolverCobroTrabajo({
      origen: 'oferta',
      estadoCobroUi: 'por_cobrar',
      estadoPagoRepuestos: 'pagado',
      saldoConocido: false,
    });
    expect(vista.etiqueta).toBe('Por cobrar');
    expect(vista.aclaracion).toMatch(/sin saldo contable/i);
  });

  it('un pagado legacy con aviso sin efecto no es deuda', () => {
    const vista = cobroVisibleOferta({
      estado_cobro_ui: 'pagado_segun_oferta',
      pago_contabilizable: false,
      pago_provenance: {
        aviso_libro: 'sin_efecto_contable',
        saldo_clp: null,
        saldo_conocido: false,
        pendientes_no_sumados_clp: 0,
      },
    });
    expect(vista.etiqueta).toBe('Pagado según la fuente');
    expect(vista.aclaracion).toMatch(/no es una deuda/i);
    expect(vista.aclaracion).toMatch(/no es cero/i);
  });

  it('sin estado_cobro_ui la cita sigue sin información de pago', () => {
    expect(resolverCobroTrabajo({
      origen: 'cita',
      estado: 'cerrada',
      pendientesNoSumadosClp: 0,
    }).etiqueta).toBe('Pago sin información');
  });
});
