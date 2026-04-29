/**
 * RUT chileno: entrada compacta (hasta 9 caracteres: 8 del cuerpo + DV) y formato visual con puntos y guión.
 */

const FACTORS = [2, 3, 4, 5, 6, 7];

export function mergeRutCompactInput(raw: string): string {
  const only = raw.toUpperCase().replace(/[^0-9K]/g, '');
  let body = '';
  let dv = '';
  for (let i = 0; i < only.length; i++) {
    const c = only[i];
    if (body.length < 8 && /[0-9]/.test(c)) {
      body += c;
    } else if (body.length === 8 && dv.length === 0 && /[0-9K]/.test(c)) {
      dv = c;
      break;
    }
  }
  return body + dv;
}

function dotBody(body: string): string {
  const digits = body.replace(/\D/g, '');
  if (!digits) return '';
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export function formatRutForDisplay(compact: string): string {
  if (!compact) return '';
  if (compact.length <= 8) {
    return dotBody(compact);
  }
  const body = compact.slice(0, 8);
  const dv = compact.slice(8, 9);
  return `${dotBody(body)}-${dv}`;
}

export function calcularDvRut(body: string): string {
  const b = body.replace(/\D/g, '').padStart(8, '0');
  let total = 0;
  let fi = 0;
  for (let i = b.length - 1; i >= 0; i--) {
    const digit = parseInt(b.charAt(i), 10);
    total += digit * FACTORS[fi % 7];
    fi++;
  }
  const rest = total % 11;
  const dv = 11 - rest;
  if (dv === 11) return '0';
  if (dv === 10) return 'K';
  return String(dv);
}

/** True si el compacto tiene 9 caracteres y el DV coincide con módulo 11. */
export function rutCompactoEsValido(compact: string): boolean {
  if (compact.length !== 9) return false;
  const body = compact.slice(0, 8);
  const dv = compact.slice(8, 9).toUpperCase();
  if (!/^\d{8}$/.test(body)) return false;
  if (!/^[0-9K]$/.test(dv)) return false;
  return calcularDvRut(body).toUpperCase() === dv;
}
