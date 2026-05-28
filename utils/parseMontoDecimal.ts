/**
 * Convierte texto de monto a número (formato chileno/latino, CLP sin centavos).
 * Ej.: "10.000" → 10000, "35.00" → 35000 (miles incompletos al escribir).
 * "35000.00" (API) → 35000.
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
    s = parseDotNotationClp(s);
  }

  const n = parseFloat(s);
  if (!Number.isFinite(n)) return 0;
  return negative ? -n : n;
}

/** Interpreta puntos como separador de miles (CLP), salvo decimales explícitos en montos grandes. */
function parseDotNotationClp(s: string): string {
  const parts = s.split('.');
  if (parts.length === 1) return s;
  if (parts.length > 2) {
    return parts.join('');
  }

  const intPart = parts[0];
  const fracPart = parts[1];
  const intVal = parseInt(intPart, 10) || 0;

  if (fracPart === '') {
    return intPart;
  }

  if (/^\d{3}$/.test(fracPart)) {
    return intPart + fracPart;
  }

  // API / montos ya en miles: "35000.00", "12500.50"
  if (intVal >= 1000 || intPart.length >= 5) {
    return `${intPart}.${fracPart}`;
  }

  // "35.0", "35.00" → miles incompletos (común al escribir en Chile)
  if (/^0+$/.test(fracPart) && fracPart.length <= 3) {
    return intPart + fracPart.padEnd(3, '0');
  }

  return `${intPart}.${fracPart}`;
}

/** Normaliza un monto para guardar en estado (entero CLP, sin separadores). */
export function formatMontoForInput(value: unknown): string {
  const n = parseMontoDecimal(value);
  if (n <= 0) return '';
  return String(Math.round(n));
}
