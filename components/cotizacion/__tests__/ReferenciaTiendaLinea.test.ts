import { vistaReferenciaTienda } from '@/utils/referenciaTienda';
import { formatearMontoCLP } from '@/utils/formatearMontoCLP';
import { margenLineaRepuesto, resumenMargenRepuestos, textoMargenClp } from '@/utils/margenRepuestos';

describe('vistaReferenciaTienda', () => {
  it('nombra la tienda del link y deja la casa sugerida aparte', () => {
    const ref = vistaReferenciaTienda({
      url_referencia: 'https://todoauto.cl/pieza',
      tienda_referencia: 'TodoAuto Chile',
      precio_verificado_clp: 12990,
      casa_sugerida: 'Adriazola',
      precio_verificado_en_casa: false,
      nota_referencia: 'Precio referencial de TodoAuto, no verificado en Adriazola.',
    });
    expect(ref?.tienda).toBe('TodoAuto Chile');
    expect(ref?.precio).toBe(formatearMontoCLP(12990));
    expect(ref?.casaSugerida).toBe('Adriazola');
    expect(ref?.nota).toContain('no verificado en Adriazola');
    expect(ref?.tienda).not.toBe('Adriazola');
  });

  it('no muestra aviso si el precio sí es de la casa', () => {
    const ref = vistaReferenciaTienda({
      url_referencia: 'https://adriazola.cl/pieza',
      tienda_referencia: 'Adriazola',
      casa_sugerida: 'Adriazola',
      precio_verificado_en_casa: true,
      nota_referencia: '',
    });
    expect(ref?.nota).toBe('');
  });

  it('oculta la referencia si no hay URL', () => {
    expect(vistaReferenciaTienda({
      url_referencia: '',
      tienda_referencia: 'TodoAuto Chile',
      casa_sugerida: 'Adriazola',
      precio_verificado_en_casa: false,
      nota_referencia: 'Precio referencial de TodoAuto, no verificado en Adriazola.',
    })).toBeNull();
  });
});

describe('margenLineaRepuesto', () => {
  it('recalcula al cambiar el cobrado', () => {
    const base = { costo_unitario_clp: 6000, cantidad: 2, precio_cobrado_clp: 10000 };
    const antes = margenLineaRepuesto({ ...base, precio_unitario_clp: 10000 });
    expect(antes.margenClp).toBe(8000);
    // margenPct ahora es markup on cost: (8000 / 12000) * 100 = 66.67
    expect(Math.round((antes.margenPct || 0) * 100) / 100).toBeCloseTo(66.67, 1);

    const despues = margenLineaRepuesto({ ...base, precio_unitario_clp: 8000 });
    expect(despues.margenClp).toBe(4000);
    // margenPct ahora es markup on cost: (4000 / 12000) * 100 = 33.33
    expect(Math.round((despues.margenPct || 0) * 100) / 100).toBeCloseTo(33.33, 1);
    expect(despues.cobradoUnitario).toBe(8000);
  });

  it('no inventa margen si el costo es desconocido', () => {
    const m = margenLineaRepuesto({
      costo_unitario_clp: null,
      cantidad: 1,
      precio_unitario_clp: 8000,
    });
    expect(m.margenClp).toBeNull();
    expect(m.margenPct).toBeNull();
    expect(m.costoLinea).toBeNull();
  });

  it('deja el margen negativo cuando el cobrado no cubre el costo', () => {
    const m = margenLineaRepuesto({
      costo_unitario_clp: 10000,
      cantidad: 1,
      precio_unitario_clp: 7000,
    });
    expect(m.margenClp).toBe(-3000);
    expect(textoMargenClp(m.margenClp).startsWith('−')).toBe(true);
  });
});

describe('resumenMargenRepuestos', () => {
  it('suma ganancia en vivo y marca líneas sin costo', () => {
    const r = resumenMargenRepuestos([
      { costo_unitario_clp: 6000, cantidad: 2, precio_unitario_clp: 8000 },
      { costo_unitario_clp: null, cantidad: 1, precio_unitario_clp: 5000 },
    ]);
    expect(r.ganancia).toBe(4000);
    expect(r.cobradoTotal).toBe(21000);
    expect(r.costoTotal).toBe(12000);
    // margenPct ahora es markup on cost: (4000 / 12000) * 100 = 33.33
    expect(Math.round((r.margenPct || 0) * 100) / 100).toBeCloseTo(33.33, 1);
    expect(r.haySinCosto).toBe(true);
  });
});
