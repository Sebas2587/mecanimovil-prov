/**
 * Convierte texto de monto a número (soporta formato chileno/latino).
 * Ej.: "10.000" → 10000 (parseFloat nativo devolvería 10).
 */
export function parseMontoDecimal(input: unknown): number {
  if (input === null || input === undefined) return 0;
  if (typeof input === 'number') return Number.isFinite(input) ? input : 0;

  let s = String(input).trim().replace(/\s/g, '');
  if (!s) return 0;

  const negative = s.startsWith('-');
  if (negative) s = s.slice(1);

  s = s.replace(/[^\d,.]/g, '');
  if (!s) return 0;

  const lastComma = s.lastIndexOf(',');
  const lastDot = s.lastIndexOf('.');

  if (lastComma !== -1 && lastDot !== -1) {
    if (lastComma > lastDot) {
      s = s.replace(/\./g, '').replace(',', '.');
    } else {
      s = s.replace(/,/g, '');
    }
  } else if (lastComma !== -1) {
    const parts = s.split(',');
    if (parts.length === 2 && parts[1].length <= 2) {
      s = parts[0].replace(/\./g, '') + '.' + parts[1];
    } else {
      s = s.replace(/,/g, '');
    }
  } else if (lastDot !== -1) {
    const parts = s.split('.');
    if (parts.length > 1) {
      const last = parts[parts.length - 1];
      if (/^\d{3}$/.test(last) && parts.length >= 2) {
        s = parts.join('');
      }
    }
  }

  const n = parseFloat(s);
  if (!Number.isFinite(n)) return 0;
  return negative ? -n : n;
}
