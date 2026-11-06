import { ANCHO_MIN_PRECIO_UNITARIO, estilosPartes } from '@/components/cotizacion/editor/estilosPartesEditor';

const card = 16;

function anchoUtil(viewport: number, gutter: number): number {
  return viewport - gutter * 2 - card * 2;
}

describe('precio unitario a 320 px', () => {
  const cant = estilosPartes.gridColCant.width as number;
  const subtotal = estilosPartes.gridColSubtotal.width as number;
  const gap = estilosPartes.repuestoGrid.gap as number;

  it('impide que la columna del precio se aplaste hasta el signo peso', () => {
    expect(estilosPartes.repuestoGrid.flexWrap).toBe('wrap');
    expect(estilosPartes.gridColPrecio.flexShrink).toBe(0);
    expect(estilosPartes.gridColPrecio.flexGrow).toBe(1);
    expect(estilosPartes.gridColPrecio.minWidth).toBe(ANCHO_MIN_PRECIO_UNITARIO);
    expect(estilosPartes.gridColPrecio.maxWidth).toBe('100%');
    expect(ANCHO_MIN_PRECIO_UNITARIO).toBeGreaterThan(56);
  });

  it('a 320 px el subtotal baja y el precio conserva sitio para el monto', () => {
    const inner = anchoUtil(320, 16);
    const tresColumnas = cant + subtotal + ANCHO_MIN_PRECIO_UNITARIO + gap * 2;
    expect(tresColumnas).toBeGreaterThan(inner);
    const precioAlEnvolver = inner - cant - gap;
    expect(precioAlEnvolver).toBeGreaterThanOrEqual(ANCHO_MIN_PRECIO_UNITARIO);
  });

  it('a 390 px cantidad, precio y subtotal siguen en una fila', () => {
    const inner = anchoUtil(390, 18);
    const tresColumnas = cant + subtotal + ANCHO_MIN_PRECIO_UNITARIO + gap * 2;
    expect(tresColumnas).toBeLessThanOrEqual(inner);
  });
});
