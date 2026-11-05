import {
  CAMPOS_ETIQUETA_HUMANA,
  DIAS_MAXIMOS,
  ETIQUETA_NETO,
  anclaGuardada,
  claveParaIntento,
  diasInclusivos,
  falloDesdeRespuesta,
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
  });

  it('un 404 sin ancla no es un período vacío y el ancla ajena sí se nombra', () => {
    expect(falloDesdeRespuesta(404, {}).mensaje).toMatch(/no está publicada/i);
    expect(falloDesdeRespuesta(404, {}).clase).toBe('api_ausente');
    expect(falloDesdeRespuesta(404, { code: 'ancla_ajena' }).mensaje).toMatch(/no es de este taller/i);
    expect(falloDesdeRespuesta(409, { code: 'reverso_mp_solo_webhook' }).mensaje).toMatch(/webhook/i);
    expect(falloDesdeRespuesta(null, null).clase).toBe('red');
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
    }).titulo).toBe('Ana · ABCD12');
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
});
