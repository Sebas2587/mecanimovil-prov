/**
 * Copy de UI a partir del contrato.
 * Número presente (incluido 0) se muestra; ausencia/NaN → "—", nunca 0 inventado.
 */

export function numeroPresente(value: unknown): number | null {
  if (value == null || value === '') return null;
  if (typeof value === 'string' && value.trim() === '') return null;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

/** Solo para aritmética cuando el caller ya confirmó un número. */
export function enteroSeguro(value: unknown, fallback = 0): number {
  return numeroPresente(value) ?? fallback;
}

export function etiquetaClientesConCotizaciones(count: unknown): string {
  const n = numeroPresente(count);
  if (n == null) return '—';
  return n === 1 ? '1 cliente con cotizaciones' : `${n} clientes con cotizaciones`;
}

export function etiquetaLiquidacionesPendientes(count: unknown): string {
  const n = numeroPresente(count);
  if (n == null) return '—';
  return n === 1 ? '1 liquidación pendiente' : `${n} liquidaciones pendientes`;
}

export function etiquetaUsoPlantilla(count: unknown): string {
  const n = numeroPresente(count);
  if (n == null) return '—';
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

/** Ventana informada por el payload. Sin campo → "—", no un 30 inventado. */
export function etiquetaVentanaDias(dias: unknown): string {
  const n = numeroPresente(dias);
  if (n == null) return '—';
  return `últimos ${n} días`;
}

export function textoOGuion(value: unknown): string {
  if (value == null || value === '') return '—';
  if (typeof value === 'number' && !Number.isFinite(value)) return '—';
  const s = String(value).trim();
  if (!s || s === 'undefined' || s === 'NaN' || s === 'null') return '—';
  return s;
}

export function creditosMostrados(value: unknown): string {
  const n = numeroPresente(value);
  return n == null ? '—' : String(n);
}
