import {
  CAMPOS_ETIQUETA_HUMANA,
  DIAS_MAXIMOS,
  ETIQUETA_NETO,
  anclaGuardada,
  claveParaIntento,
  diasInclusivos,
  entradaManualDevolvible,
  falloDesdeRespuesta,
  etiquetaTipoMovimiento,
  fechaRealIso,
  motivoFechaCobro,
  cuerpoDesdeEntrada,
  duenoCaja,
  guardarIntentoIncierto,
  leerIntentoIncierto,
  olvidarIntentosCaja,
  resultadoAmbiguo,
  textoFaltantesResumen,
  periodoMesHastaHoy,
  textoMargenContratado,
  textoMargenReal,
  textoResultadoCaja,
  textoSaldo,
  tituloHumano,
  validarPeriodo,
  type CuerpoCobro,
} from '@/utils/cajaTaller';

const cuerpo: CuerpoCobro = {
  ancla_tipo: 'cita',
  ancla_id: '15',
  tipo: 'entrada',
  componente: 'total',
  monto_clp: 30,
  fecha_efectiva: '2026-11-05',
  movimiento_origen_id: null,
  motivo: 'abono',
  confirmar_sobrepago: false,
};

describe('caja del taller', () => {
  it('arma el mes de Santiago y rechaza más de 366 días', () => {
    const periodo = periodoMesHastaHoy(new Date('2026-11-05T15:00:00Z'));
    expect(periodo.desde).toBe('2026-11-01');
    expect(periodo.hasta).toBe('2026-11-05');
    expect(diasInclusivos(periodo.desde, periodo.hasta)).toBe(5);
    expect(validarPeriodo('2025-01-01', '2026-01-02')).toMatch(String(DIAS_MAXIMOS));
    expect(validarPeriodo('2026-11-01', '2026-11-05')).toBeNull();
    expect(fechaRealIso('2026-02-31')).toBe(false);
    expect(fechaRealIso('2026-02-30')).toBe(false);
    expect(motivoFechaCobro('2026-02-30')).toMatch(/no guarda/i);
    expect(motivoFechaCobro('2026-02-30T15:04:00')).toMatch(/no guarda/i);
    expect(motivoFechaCobro('2026-11-05')).toBeNull();
    expect(motivoFechaCobro('2026-11-05T15:04:00')).toMatch(/YYYY-MM-DD/);
    expect(validarPeriodo('2026-02-31', '2026-03-02')).toMatch(/no existe/i);
    expect(validarPeriodo('2026-02-30T15:04:00', '2026-03-02')).toMatch(/no existe/i);
  });

  it('muestra el neto del API y no calcula el margen con el exigible', () => {
    const caso = {
      ancla_tipo: 'cita',
      ancla_id: '15',
      monto_exigible_clp: 100,
      exigible_conocido: true,
      neto_acumulado_clp: 20,
      saldo_clp: 80,
      saldo_conocido: true,
      margen_real_clp: null as number | null,
    };
    expect(ETIQUETA_NETO).toBe('Cobros menos devoluciones');
    expect(caso.neto_acumulado_clp).toBe(20);
    expect(textoSaldo(caso.saldo_clp, caso.saldo_conocido).texto).toBe('80');
    expect(textoMargenReal(caso)).toBe('Margen real incompleto');
    expect(textoMargenReal({ ancla_id: '15' })).toBeNull();
    expect(textoSaldo(null, false)).toEqual({ texto: 'Sin saldo contable', esCeroContable: false });
  });

  it('repite la misma clave solo si el cuerpo no cambió', () => {
    const primero = claveParaIntento(null, cuerpo);
    const reintento = claveParaIntento(primero, cuerpo);
    expect(reintento.clave).toBe(primero.clave);
    const otro = claveParaIntento(primero, { ...cuerpo, monto_clp: 40 });
    expect(otro.clave).not.toBe(primero.clave);
    const incierto = claveParaIntento({ ...primero, incierto: true }, { ...cuerpo, motivo: 'otro' });
    expect(incierto.clave).toBe(primero.clave);
    expect(incierto.cuerpo).toEqual(primero.cuerpo);
  });

  it('un 404 sin ancla no es un período vacío y el ancla ajena sí se nombra', () => {
    expect(falloDesdeRespuesta(404, {}).mensaje).toMatch(/no está publicada/i);
    expect(falloDesdeRespuesta(404, {}).clase).toBe('api_ausente');
    expect(falloDesdeRespuesta(404, { code: 'ancla_ajena' }).mensaje).toMatch(/no es de este taller/i);
    expect(falloDesdeRespuesta(409, { code: 'reverso_mp_solo_webhook' }).mensaje).toMatch(/webhook/i);
    const fecha = falloDesdeRespuesta(400, { code: 'fecha_invalida', detail: 'La fecha efectiva no existe en el calendario.' });
    expect(fecha.mensaje).toMatch(/no guardó/i);
    expect(fecha.mensaje).not.toMatch(/no se sabe/i);
    const sinRespuesta = falloDesdeRespuesta(null, null);
    expect(sinRespuesta.clase).toBe('red');
    expect(sinRespuesta.mensaje).toMatch(/no se sabe si/i);
    expect(sinRespuesta.mensaje).not.toMatch(/no cambió/i);
    expect(textoFaltantesResumen(['legacy_sin_movimiento'])).toBe('Faltan datos: fuente sin movimiento.');
    expect(textoFaltantesResumen(['legacy_sin_movimiento'])).not.toMatch(/0/);
    expect(textoFaltantesResumen({ moneda_no_clp: 0 })).toBeNull();
    expect(entradaManualDevolvible({
      id: 'abc',
      ancla_tipo: 'cita',
      ancla_id: '15',
      componente: 'total',
      origen: 'manual',
      tipo: 'entrada',
      estado: 'confirmado',
      monto_clp: 30,
      moneda: 'CLP',
      contabiliza_clp: true,
      fecha_efectiva: '2026-11-05',
      fecha_local: '2026-11-05',
    })).toBe(true);
    expect(entradaManualDevolvible({
      id: 'mp-1',
      ancla_tipo: 'cita',
      ancla_id: '15',
      componente: 'total',
      origen: 'mp',
      tipo: 'entrada',
      estado: 'confirmado',
      monto_clp: 30,
      moneda: 'CLP',
      contabiliza_clp: true,
      fecha_efectiva: '2026-11-05',
      fecha_local: '2026-11-05',
    })).toBe(false);
  });

  it('sin nombre humano muestra la ancla y no inventa cliente', () => {
    expect(tituloHumano({ ancla_tipo: 'cita', ancla_id: '15' })).toEqual({
      titulo: 'Cita 15',
      sinNombre: true,
    });
    expect(tituloHumano({
      ancla_tipo: 'cita',
      ancla_id: '15',
      cliente_nombre: 'Ana',
      vehiculo_patente: 'ABCD12',
      folio: 'MM-1',
    }).titulo).toBe('Ana · ABCD12 · MM-1');
    expect(tituloHumano({
      ancla_tipo: 'cita',
      ancla_id: '15',
      cliente_nombre: null,
      vehiculo_patente: '  ',
      folio: '',
    })).toEqual({ titulo: 'Cita 15', sinNombre: true });
    expect(tituloHumano({
      ancla_tipo: 'cita',
      ancla_id: '15',
      cliente_nombre: null,
      vehiculo_patente: null,
      folio: null,
    }).titulo).toBe('Cita 15');
    expect(etiquetaTipoMovimiento('contracargo')).toBe('Contracargo');
    expect(CAMPOS_ETIQUETA_HUMANA).toEqual(['cliente_nombre', 'vehiculo_patente', 'folio']);
  });

  it('usa el ancla de la respuesta y no calcula el margen real con el exigible', () => {
    const guardada = anclaGuardada(
      { ancla_tipo: 'solicitud', ancla_id: '4' },
      { ancla_tipo: 'oferta', ancla_id: '9' },
    );
    expect(guardada).toEqual({ ancla_tipo: 'oferta', ancla_id: '9', distinta: true });
    const caso = {
      monto_exigible_clp: 100,
      costo_registrado_clp: 40,
      margen_real_clp: null,
      resultado_caja_clp: null,
      margen_contratado_clp: 60,
    };
    expect(textoMargenReal(caso)).toBe('Margen real incompleto');
    expect(textoResultadoCaja(caso)).toBe('Resultado de caja incompleto');
    expect(textoMargenContratado(caso)).toBe('60');
    expect(textoMargenReal({ monto_exigible_clp: 100 })).toBeNull();
  });

  it('muestra el resultado que mandó el API, incluso si es negativo', () => {
    expect(textoResultadoCaja({ resultado_caja_clp: -20 })).toBe('-20');
    expect(textoMargenReal({ margen_real_clp: -20 })).toBe('-20');
  });

  it('nombra el 409 de ancla distinta sin reenviar', () => {
    const fallo = falloDesdeRespuesta(409, { code: 'reverso_ancla_distinta' });
    expect(fallo.clase).toBe('conflicto');
    expect(fallo.mensaje).toMatch(/mismo caso/i);
  });

  it('un 502, un 504 y un 408 no son un rechazo; un 400 y un 409 sí', () => {
    for (const status of [null, 408, 500, 502, 504]) {
      const fallo = falloDesdeRespuesta(status, {});
      expect(resultadoAmbiguo(status)).toBe(true);
      expect(fallo.mensaje).toMatch(/no se sabe/i);
      expect(fallo.mensaje).not.toMatch(/rechaz/i);
      expect(fallo.mensaje).not.toMatch(/no cambió/i);
    }
    expect(resultadoAmbiguo(400)).toBe(false);
    expect(resultadoAmbiguo(409)).toBe(false);
    const fecha = falloDesdeRespuesta(400, { code: 'fecha_invalida' });
    expect(fecha.mensaje).toMatch(/no guardó/i);
    expect(fecha.mensaje).not.toMatch(/no se sabe/i);
  });

  it('la devolución precarga el día de Santiago y no el timestamp de la entrada', () => {
    const entrada = {
      id: 'manual-30',
      ancla_tipo: 'cita',
      ancla_id: '15',
      componente: 'total',
      origen: 'manual',
      tipo: 'entrada',
      estado: 'confirmado',
      monto_clp: 30,
      moneda: 'CLP',
      contabiliza_clp: true,
      fecha_efectiva: '2026-03-02T15:04:00-03:00',
      fecha_local: '2026-03-02',
    };
    const deDia = cuerpoDesdeEntrada(entrada, new Date('2026-11-05T15:04:00-03:00'));
    expect(deDia.fecha_efectiva).toBe('2026-11-05');
    expect(deDia.fecha_efectiva).not.toContain('T');
    const cruce = cuerpoDesdeEntrada(entrada, new Date('2026-11-05T02:30:00Z'));
    expect(cruce.fecha_efectiva).toBe('2026-11-04');
    expect(cruce.movimiento_origen_id).toBe('manual-30');
  });

  it('un módulo nuevo recupera el intento de esa cuenta y no el de otra', () => {
    const bolsa = new Map<string, string>();
    Object.defineProperty(globalThis, 'sessionStorage', {
      configurable: true,
      value: {
        getItem: (clave: string) => bolsa.get(clave) ?? null,
        setItem: (clave: string, valor: string) => { bolsa.set(clave, valor); },
        removeItem: (clave: string) => { bolsa.delete(clave); },
      },
    });
    olvidarIntentosCaja();
    const dueno = duenoCaja(7, 3);
    const ajeno = duenoCaja(8, 3);
    const intento = claveParaIntento(null, cuerpo);
    guardarIntentoIncierto(dueno, { ...intento, incierto: true });
    guardarIntentoIncierto(null, { ...intento, incierto: true, clave: 'no-se-guarda' });
    const caja: {
      leido: { clave?: string; cuerpo?: CuerpoCobro } | null;
      otro: { clave?: string } | null;
    } = { leido: null, otro: null };
    jest.isolateModules(() => {
      const mod = require('@/utils/cajaTaller');
      caja.leido = mod.leerIntentoIncierto(mod.duenoCaja(7, 3));
      caja.otro = mod.leerIntentoIncierto(mod.duenoCaja(8, 3));
    });
    expect(caja.leido?.clave).toBe(intento.clave);
    expect(caja.leido?.cuerpo).toEqual(cuerpo);
    expect(caja.otro).toBeNull();
    guardarIntentoIncierto(ajeno, { ...intento, incierto: true, clave: 'del-otro' });
    guardarIntentoIncierto(dueno, null);
    expect(leerIntentoIncierto(dueno)).toBeNull();
    expect(leerIntentoIncierto(ajeno)?.clave).toBe('del-otro');
    sessionStorage.setItem('mecanimovil.caja.intento-incierto', JSON.stringify({
      ...intento,
      incierto: true,
      clave: 'suelto',
    }));
    olvidarIntentosCaja();
    expect(leerIntentoIncierto(dueno)).toBeNull();
    expect(sessionStorage.getItem('mecanimovil.caja.intento-incierto')).toBeNull();
    guardarIntentoIncierto(ajeno, null);
  });
});
