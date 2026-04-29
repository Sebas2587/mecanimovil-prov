/** Móvil Chile: 9 dígitos comenzando en 9. Salida internacional +569XXXXXXXX */

export function mergeNineMobileDigits(raw: string): string {
  const d = raw.replace(/\D/g, '');
  if (!d) return '';
  let out = d;
  if (out.startsWith('569') && out.length > 9) {
    out = out.slice(-9);
  } else if (out.startsWith('56') && out.length >= 11) {
    out = out.slice(-9);
  }
  if (out.length > 9) out = out.slice(0, 9);
  return out;
}

export function telefonoCompletoDesdeNacional(nueveDigitos: string): string {
  const d = mergeNineMobileDigits(nueveDigitos);
  if (d.length !== 9 || d[0] !== '9') return '';
  return `+56${d}`;
}

export function telefonoMovilChileValido(nueveDigitos: string): boolean {
  const d = mergeNineMobileDigits(nueveDigitos);
  return d.length === 9 && d[0] === '9';
}

/** Extrae 9 dígitos nacionales desde valor guardado (+569..., espacios, etc.) */
export function extraerNueveDigitosDesdeGuardado(stored: string | undefined | null): string {
  if (!stored) return '';
  let d = stored.replace(/\D/g, '');
  if (d.startsWith('56') && d.length >= 11) {
    d = d.slice(2);
  }
  if (d.length >= 9) {
    const last = d.slice(-9);
    if (last[0] === '9') return last;
  }
  if (d.length === 9 && d[0] === '9') return d;
  return '';
}
