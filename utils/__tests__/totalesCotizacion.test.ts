import { textoObligacionCotizacion, textoTotalCotizacion } from '@/utils/cotizacionPresentacion';
import { resolverObligacionCotizacion, totalesDesdeLineas } from '@/utils/totalesCotizacion';

describe('totalesDesdeLineas', () => {
  it('suma precio por cantidad más mano de obra sin agregar otro IVA', () => {
    const totales = totalesDesdeLineas({
      repuestos: [{ nombre: 'Filtro', cantidad: 2, precio_unitario_clp: 1000 }],
      manoObraLineas: [{ monto_clp: 500 }],
      totalPersistido: 2500,
    });
    expect(totales.total_clp).toBe(2500);
    expect(totales.totales_completos).toBe(true);
    expect(totales.precios_iva).toBe('incluido');
    expect(totales.totales_fuente).toBe('lineas_respuesta');
  });

  it('un precio ausente deja el total nulo y la suma parcial aparte', () => {
    const totales = totalesDesdeLineas({
      repuestos: [
        { nombre: 'Filtro', cantidad: 1, precio_unitario_clp: 1000 },
        { nombre: 'Aceite', cantidad: 1, precio_unitario_clp: null },
      ],
      manoObraLineas: [{ monto_clp: 0 }],
    });
    expect(totales.total_clp).toBeNull();
    expect(totales.totales_completos).toBe(false);
    expect(totales.total_conocido_parcial_clp).toBe(1000);
    expect(totales.totales_faltantes).toContain('Aceite');
    expect(textoTotalCotizacion({
      total_clp: totales.total_clp,
      totales_completos: totales.totales_completos,
    })).toBe('Incompleto');
  });

  it('un cero explícito sigue siendo un total conocido', () => {
    expect(textoTotalCotizacion({ total_clp: 0, totales_completos: true })).toMatch(/\$0/);
  });

  it('una discrepancia deja la obligación en null y no en deuda cero', () => {
    const obligacion = resolverObligacionCotizacion({
      estado: 'aceptada',
      repuestos: [{ nombre: 'Filtro', cantidad: 1, precio_unitario_clp: 2500 }],
      manoObraLineas: [],
      totalPersistido: 1000,
    });
    expect(obligacion.obligacion_fuente).toBe('discrepancia');
    expect(obligacion.obligacion_clp).toBeNull();
    expect(obligacion.obligacion_conocida).toBe(false);
    expect(textoObligacionCotizacion(obligacion)).toBe('Obligación desconocida');
    expect(textoObligacionCotizacion(obligacion)).not.toMatch(/\$0/);
  });
});
