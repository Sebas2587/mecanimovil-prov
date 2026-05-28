/** URI de imagen nueva (local) vs ya alojada en el servidor. */
export function esFotoLocalParaSubir(uri: string): boolean {
  const u = (uri || '').trim();
  if (!u) return false;
  if (
    u.startsWith('blob:') ||
    u.startsWith('data:') ||
    u.startsWith('file:') ||
    u.startsWith('content://') ||
    u.startsWith('ph://')
  ) {
    return true;
  }
  if (u.startsWith('http://') || u.startsWith('https://')) {
    return false;
  }
  return true;
}

export function extraerUrlsFotosApi(fotosData: unknown): string[] {
  const list = Array.isArray(fotosData)
    ? fotosData
    : (fotosData as { results?: unknown[] })?.results;
  if (!Array.isArray(list)) return [];
  return list
    .map((f: { imagen_url?: string; imagen?: string }) => f.imagen_url || f.imagen)
    .filter((url): url is string => Boolean(url));
}
