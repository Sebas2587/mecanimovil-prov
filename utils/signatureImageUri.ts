/**
 * Firma guardada: payload base64 plano o data URI completa (app usuario vs proveedor).
 */
export function signatureStoredToImageUri(stored: string | null | undefined): string | null {
  if (stored == null || typeof stored !== 'string') return null;
  const s = stored.trim();
  if (!s) return null;
  if (/^data:image\//i.test(s)) return s;
  return `data:image/png;base64,${s}`;
}
