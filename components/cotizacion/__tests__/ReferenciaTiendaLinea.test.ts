import {
  lineaPrecioEstimado,
  textoEspecificacionLinea,
  tiendaPrecioLinea,
  vistaReferenciaTienda,
} from '@/utils/referenciaTienda';
import { formatearMontoCLP } from '@/utils/formatearMontoCLP';
import {
  cobradoUnitarioLinea,
  margenLineaRepuesto,
  resumenMargenRepuestos,
  textoCobradoClp,
  textoMargenClp,
} from '@/utils/margenRepuestos';

describe('vistaReferenciaTienda', () => {
  it('usa proveedor_nombre y url_producto; nunca casa_sugerida como tienda del precio', () => {
    const ref = vistaReferenciaTienda({
      url_producto: 'https://www.imaparts.cl/kit-embrague-oroch',
      proveedor_nombre: 'Imaparts',
      casa_sugerida: 'Adriazola',
      casa_repuesto_nombre: 'Adriazola',
      precio_verificado_en_casa: false,
      nota_referencia: 'Precio referencial de Imaparts, no verificado en Adriazola.',
    });
    expect(ref?.tienda).toBe('Imaparts');
    expect(ref?.url).toContain('imaparts.cl');
    expect(ref?.casaSugerida).toBe('Adriazola');
    expect(ref?.nota).toContain('no verificado en Adriazola');
    expect(ref?.tienda).not.toBe('Adriazola');
  });

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

  it('sin URL aún muestra la tienda del precio y la casa sugerida', () => {
    const ref = vistaReferenciaTienda({
      url_referencia: '',
      tienda_referencia: 'TodoAuto Chile',
      casa_sugerida: 'Adriazola',
      precio_verificado_en_casa: false,
      nota_referencia: 'Precio referencial de TodoAuto, no verificado en Adriazola.',
    });
    expect(ref?.url).toBeNull();
    expect(ref?.tienda).toBe('TodoAuto Chile');
    expect(ref?.casaSugerida).toBe('Adriazola');
    expect(ref?.nota).toContain('no verificado en Adriazola');
  });

  it('no inventa referencia si no hay tienda, casa ni URL', () => {
    expect(vistaReferenciaTienda({})).toBeNull();
  });

  it('un false por omisión no inventa aviso si no hay casa ni nota', () => {
    expect(vistaReferenciaTienda({
      precio_verificado_en_casa: false,
      proveedor_nombre: 'Imaparts',
      url_producto: 'https://www.imaparts.cl/kit',
    })?.nota).toBe('');
  });
});

describe('lineaPrecioEstimado y especificación', () => {
  it('marca Estimado si precio_estimado es true o si está asumido sin URL', () => {
    expect(lineaPrecioEstimado({ precio_estimado: true })).toBe(true);
    expect(lineaPrecioEstimado({
      precio_estimado: false,
      certeza: 'asumido',
      url_producto: 'https://www.imaparts.cl/kit',
    })).toBe(false);
    expect(lineaPrecioEstimado({ certeza: 'asumido' })).toBe(true);
    expect(lineaPrecioEstimado({})).toBe(false);
  });

  it('muestra especificación y cantidad cuando vienen', () => {
    expect(textoEspecificacionLinea({
      especificacion: '75W-80 · 2.5 L',
      cantidad: 3,
    })).toBe('75W-80 · 2.5 L · 3 un.');
    expect(textoEspecificacionLinea({ cantidad: 1 })).toBe('');
  });

  it('tiendaPrecioLinea no cae a casa_sugerida', () => {
    expect(tiendaPrecioLinea({
      casa_sugerida: 'Adriazola',
      casa_repuesto_nombre: 'Adriazola',
    })).toBe('');
    expect(tiendaPrecioLinea({
      tienda_referencia: 'Imaparts',
      casa_sugerida: 'Adriazola',
    })).toBe('Imaparts');
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
      margen_pct: 40,
    });
    expect(m.margenClp).toBeNull();
    expect(m.margenPct).toBeNull();
    expect(m.costoLinea).toBeNull();
  });

  it('usa el costo estimado congelado y no vuelve a aplicar el porcentaje', () => {
    const m = margenLineaRepuesto({
      costo_unitario_clp: null,
      costo_estimado_clp: 6000,
      cantidad: 2,
      precio_unitario_clp: 10000,
      margen_pct: 80,
    });
    expect(m.costoLinea).toBe(12000);
    expect(m.cobradoLinea).toBe(20000);
    expect(m.margenClp).toBe(8000);
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
  it('anula costo y ganancia del total si una línea no tiene costo', () => {
    const r = resumenMargenRepuestos([
      { costo_unitario_clp: 6000, cantidad: 2, precio_unitario_clp: 8000 },
      { costo_unitario_clp: null, cantidad: 1, precio_unitario_clp: 5000 },
    ]);
    expect(r.ganancia).toBeNull();
    expect(r.costoTotal).toBeNull();
    expect(r.cobradoTotal).toBe(21000);
    expect(r.margenPct).toBeNull();
    expect(r.haySinCosto).toBe(true);
    expect(textoMargenClp(r.ganancia)).toBe('sin costo registrado');
    expect(textoMargenClp(0)).not.toBe('sin costo registrado');
  });

  it('no convierte un cobrado nulo en $0', () => {
    expect(cobradoUnitarioLinea({ precio_unitario_clp: null, precio_cobrado_clp: null })).toBeNull();
    expect(textoCobradoClp(null)).toBe('Incompleto');
    expect(textoCobradoClp(0)).toBe('$0');
    const r = resumenMargenRepuestos([
      { costo_unitario_clp: 6000, cantidad: 1, precio_unitario_clp: null },
    ]);
    expect(r.cobradoTotal).toBeNull();
    expect(r.ganancia).toBeNull();
    expect(r.costoTotal).toBe(6000);
    expect(textoCobradoClp(r.cobradoTotal)).toBe('Incompleto');
  });
});
