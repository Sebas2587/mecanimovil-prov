import {
  creditosEntero,
  enteroSeguro,
  etiquetaClientesConCotizaciones,
  etiquetaLiquidacionesPendientes,
  etiquetaUsoPlantilla,
  etiquetaVentanaDias,
  formatFechaCortaEs,
  textoOGuion,
} from '@/utils/copyPresentacion';

describe('copyPresentacion', () => {
  it('no interpola undefined en conteos', () => {
    expect(enteroSeguro(undefined)).toBe(0);
    expect(enteroSeguro(null)).toBe(0);
    expect(enteroSeguro('')).toBe(0);
    expect(enteroSeguro(3)).toBe(3);
    expect(etiquetaClientesConCotizaciones(1)).toBe('1 cliente con cotizaciones');
    expect(etiquetaClientesConCotizaciones(2)).toBe('2 clientes con cotizaciones');
    expect(etiquetaClientesConCotizaciones(undefined)).toBe('0 clientes con cotizaciones');
    expect(etiquetaLiquidacionesPendientes(undefined)).toBe('0 liquidaciones pendientes');
    expect(etiquetaLiquidacionesPendientes(1)).toBe('1 liquidación pendiente');
    expect(etiquetaUsoPlantilla(undefined)).toBe('Usada 0 veces');
    expect(etiquetaUsoPlantilla(1)).toBe('Usada 1 vez');
    expect(etiquetaUsoPlantilla(3)).toBe('Usada 3 veces');
    expect(etiquetaVentanaDias(undefined, 30)).toBe('últimos 30 días');
    expect(creditosEntero(undefined)).toBe(0);
    expect(textoOGuion(undefined)).toBe('—');
    expect(textoOGuion(12)).toBe('12');
  });

  it('no muestra Invalid Date si falta actualizado_en', () => {
    expect(formatFechaCortaEs(undefined)).toBe('');
    expect(formatFechaCortaEs('no-es-fecha')).toBe('');
    expect(formatFechaCortaEs('2026-11-08T09:00:00-03:00')).toMatch(/2026/);
  });
});
