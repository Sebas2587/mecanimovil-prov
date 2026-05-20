/**
 * URLs de adjuntos de chat (R2 presigned, cPanel legacy o file:// local).
 */
export function resolveChatAttachmentUri(
  uri: string | null | undefined,
  getMediaBase?: () => string | null | undefined
): string {
  if (!uri) return '';
  const trimmed = uri.trim();
  if (
    trimmed.startsWith('http://') ||
    trimmed.startsWith('https://') ||
    trimmed.startsWith('file://')
  ) {
    return trimmed;
  }
  const base = getMediaBase?.();
  if (base) {
    const root = base.replace(/\/$/, '');
    return `${root}${trimmed.startsWith('/') ? '' : '/'}${trimmed}`;
  }
  return trimmed;
}

/** Detecta imagen aunque la URL R2 lleve query string (?X-Amz-...) */
export function isChatAttachmentImage(uri: string | null | undefined): boolean {
  if (!uri || typeof uri !== 'string') return false;
  if (uri.startsWith('file://')) return true;
  const path = uri.split('?')[0];
  if (/\.(jpeg|jpg|png|gif|webp|bmp|heic)$/i.test(path)) return true;
  if (/chat_(solicitudes|attachments)\//i.test(uri)) return true;
  return false;
}
