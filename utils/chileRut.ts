/**
 * RUT chileno: entrada compacta (hasta 9 caracteres: 8 del cuerpo + DV) y formato visual con puntos y guión.
 */

// 6 factores; ciclan con fi % 6 (igual que itertools.cycle en el backend)
const FACTORS = [2, 3, 4, 5, 6, 7];

/**
 * Interpreta el texto del input (con o sin puntos/guion) y devuelve el compacto interno:
 * solo dígitos del cuerpo (máx. 8) o cuerpo + dígito verificador (0-9 o K).
 * Importante: 8 dígitos seguidos = cuerpo incompleto (aún falta el DV); el noveno dígito es el DV.
 */
export function mergeRutCompactInput(raw: string): string {
  const u = raw.toUpperCase().replace(/[^0-9K]/g, '');
  if (!u) return '';

  if (u.endsWith('K')) {
    const bodyDigits = u
      .slice(0, -1)
      .replace(/[^0-9]/g, '')
      .slice(0, 8);
    return `${bodyDigits}K`;
  }

  const digits = u.replace(/[^0-9]/g, '');
  if (digits.length <= 8) {
    return digits;
  }
  return digits.slice(0, 8) + digits.charAt(8);
}

function dotBody(body: string): string {
  const digits = body.replace(/\D/g, '');
  if (!digits) return '';
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export function calcularDvRut(body: string): string {
  const b = body.replace(/\D/g, '').padStart(8, '0');
  let total = 0;
  let fi = 0;
  for (let i = b.length - 1; i >= 0; i--) {
    const digit = parseInt(b.charAt(i), 10);
    total += digit * FACTORS[fi % 6];
    fi++;
  }
  const rest = total % 11;
  const dv = 11 - rest;
  if (dv === 11) return '0';
  if (dv === 10) return 'K';
  return String(dv);
}

/**
 * True si cuerpo (1–8 dígitos) + dígito verificador coinciden con módulo 11.
 * Acepta compacto de 8 (ej. 7 dígitos + K) o 9 (8 dígitos + DV).
 */
export function rutCompactoEsValido(compact: string): boolean {
  if (!compact || compact.length < 2 || compact.length > 9) return false;
  const u = compact.toUpperCase();

  const dv = u.slice(-1);
  if (!/^[0-9K]$/.test(dv)) return false;
  const body = u.slice(0, -1);
  if (!/^\d+$/.test(body) || body.length < 1 || body.length > 8) return false;
  const padded = body.padStart(8, '0');
  return calcularDvRut(padded).toUpperCase() === dv;
}

export function formatRutForDisplay(compact: string): string {
  if (!compact) return '';
  const u = compact.toUpperCase();

  if (u.endsWith('K')) {
    const bodyDigits = u
      .slice(0, -1)
      .replace(/[^0-9]/g, '')
      .slice(0, 8);
    if (bodyDigits.length < 1) return '';
    return `${dotBody(bodyDigits)}-K`;
  }

  if (rutCompactoEsValido(u)) {
    const dv = u.slice(-1);
    const bodyDigits = u.slice(0, -1).replace(/[^0-9]/g, '');
    return `${dotBody(bodyDigits)}-${dv}`;
  }

  const digits = u.replace(/[^0-9]/g, '');
  if (digits.length >= 9) {
    const body = digits.slice(0, 8);
    const dv = digits.charAt(8);
    return `${dotBody(body)}-${dv}`;
  }

  return dotBody(digits.slice(0, 8));
}
