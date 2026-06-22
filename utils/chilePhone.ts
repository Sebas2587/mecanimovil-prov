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

/** Extrae 9 dígitos nacionales desde valor guardado (+569..., 9 dígitos o parcial en edición) */
export function extraerNueveDigitosDesdeGuardado(stored: string | undefined | null): string {
  if (!stored) return '';
  const d = stored.replace(/\D/g, '');
  if (!d) return '';

  // Formato internacional (+56 / 569...)
  if (d.startsWith('569') && d.length >= 4) {
    return mergeNineMobileDigits(d.slice(2));
  }
  if (d.startsWith('56') && d.length > 2) {
    return mergeNineMobileDigits(d.slice(2));
  }

  // Dígitos nacionales (completos o mientras el usuario escribe)
  return mergeNineMobileDigits(d);
}

/** Normaliza a +569XXXXXXXX para persistir; vacío si aún no es válido. */
export function normalizarTelefonoChileParaGuardar(stored: string): string {
  const nacional = extraerNueveDigitosDesdeGuardado(stored);
  return telefonoCompletoDesdeNacional(nacional) || nacional.trim();
}
