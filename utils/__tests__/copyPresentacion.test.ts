import {
  creditosMostrados,
  enteroSeguro,
  etiquetaClientesConCotizaciones,
  etiquetaLiquidacionesPendientes,
  etiquetaUsoPlantilla,
  etiquetaVentanaDias,
  formatFechaCortaEs,
  numeroPresente,
  textoOGuion,
} from '@/utils/copyPresentacion';

describe('copyPresentacion', () => {
  it('no convierte ausencia en cero', () => {
    expect(numeroPresente(undefined)).toBeNull();
    expect(numeroPresente(null)).toBeNull();
    expect(numeroPresente('')).toBeNull();
    expect(numeroPresente(0)).toBe(0);
    expect(numeroPresente(3)).toBe(3);
    expect(etiquetaClientesConCotizaciones(1)).toBe('1 cliente con cotizaciones');
    expect(etiquetaClientesConCotizaciones(2)).toBe('2 clientes con cotizaciones');
    expect(etiquetaClientesConCotizaciones(undefined)).toBe('—');
    expect(etiquetaClientesConCotizaciones(0)).toBe('0 clientes con cotizaciones');
    expect(etiquetaLiquidacionesPendientes(undefined)).toBe('—');
    expect(etiquetaLiquidacionesPendientes(0)).toBe('0 liquidaciones pendientes');
    expect(etiquetaLiquidacionesPendientes(1)).toBe('1 liquidación pendiente');
    expect(etiquetaUsoPlantilla(undefined)).toBe('—');
    expect(etiquetaUsoPlantilla(1)).toBe('Usada 1 vez');
    expect(etiquetaUsoPlantilla(3)).toBe('Usada 3 veces');
    expect(etiquetaVentanaDias(undefined)).toBe('—');
    expect(etiquetaVentanaDias(30)).toBe('últimos 30 días');
    expect(etiquetaVentanaDias(0)).toBe('últimos 0 días');
    expect(creditosMostrados(undefined)).toBe('—');
    expect(creditosMostrados(0)).toBe('0');
    expect(creditosMostrados(12)).toBe('12');
    expect(textoOGuion(undefined)).toBe('—');
    expect(textoOGuion(12)).toBe('12');
  });

  it('enteroSeguro queda para aritmética, no para copy de ausencia', () => {
    expect(enteroSeguro(undefined)).toBe(0);
    expect(enteroSeguro(4)).toBe(4);
  });

  it('no muestra Invalid Date si falta actualizado_en', () => {
    expect(formatFechaCortaEs(undefined)).toBe('');
    expect(formatFechaCortaEs('no-es-fecha')).toBe('');
    expect(formatFechaCortaEs('2026-11-08T09:00:00-03:00')).toMatch(/2026/);
  });
});
