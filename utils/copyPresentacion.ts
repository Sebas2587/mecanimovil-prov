/** Copy de UI a partir de contratos numéricos/fecha. No inventa datos: si falta, cae a 0 / vacío / — */

export function enteroSeguro(value: unknown, fallback = 0): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function etiquetaClientesConCotizaciones(count: unknown): string {
  const n = enteroSeguro(count);
  return n === 1 ? '1 cliente con cotizaciones' : `${n} clientes con cotizaciones`;
}

export function etiquetaLiquidacionesPendientes(count: unknown): string {
  const n = enteroSeguro(count);
  return n === 1 ? '1 liquidación pendiente' : `${n} liquidaciones pendientes`;
}

export function etiquetaUsoPlantilla(count: unknown): string {
  const n = enteroSeguro(count);
  return n === 1 ? 'Usada 1 vez' : `Usada ${n} veces`;
}

export function formatFechaCortaEs(iso: unknown): string {
  if (iso == null || String(iso).trim() === '') return '';
  const d = new Date(String(iso));
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('es-CL', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function etiquetaVentanaDias(dias: unknown, fallback = 30): string {
  return `últimos ${enteroSeguro(dias, fallback)} días`;
}

export function textoOGuion(value: unknown): string {
  if (value == null || value === '') return '—';
  if (typeof value === 'number' && !Number.isFinite(value)) return '—';
  const s = String(value).trim();
  if (!s || s === 'undefined' || s === 'NaN') return '—';
  return s;
}

export function creditosEntero(value: unknown): number {
  return enteroSeguro(value, 0);
}
