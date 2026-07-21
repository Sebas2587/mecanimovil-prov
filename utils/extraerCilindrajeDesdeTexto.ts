/**
 * Extrae cilindraje embebido en marca/modelo (ej. "3008 GT LINE 1.6 AUT" → "1.6").
 * Evita confundir códigos de modelo (3008, 208) con cc.
 */
export function extraerCilindrajeDesdeTexto(...partes: Array<string | null | undefined>): string {
  const texto = partes.filter(Boolean).join(' ').trim();
  if (!texto) return '';

  // Litros: 1.6, 2.0, 1.4L, 1.6 T (sin lookbehind por compatibilidad RN)
  const litros = texto.match(/(?:^|[^\d.])(\d\.\d{1,2})(?![0-9])/);
  if (litros?.[1]) return litros[1];

  // cc explícito: 1600 cc, 1368CC
  const cc = texto.match(/\b(\d{3,4})\s*[Cc][Cc]\b/);
  if (cc?.[1]) return cc[1];

  return '';
}

/** Usa el campo dedicado o, si viene vacío, infiere desde marca/modelo. */
export function cilindrajeEfectivo(
  cilindraje: string | null | undefined,
  ...marcaModelo: Array<string | null | undefined>
): string {
  const directo = (cilindraje || '').trim();
  if (directo) return directo;
  return extraerCilindrajeDesdeTexto(...marcaModelo);
}
