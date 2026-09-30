/**
 * Patentes chilenas en un mensaje.
 * Auto nuevo: ABCD12. Auto antiguo: BB1234. Moto: LEK715.
 * Acepta un espacio, punto o guión (LEK-715, LEK 715).
 */
const PATENTE_RE =
  /(?:^|[^A-Za-z0-9])([A-Za-z]{4}[\s.\-]?[0-9]{2}|[A-Za-z]{2}[\s.\-]?[0-9]{4}|[A-Za-z]{3}[\s.\-]?[0-9]{3})(?![A-Za-z0-9])/g;

export function normalizarPatenteChile(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

export function extraerPatentesChile(texto: string): string[] {
  if (typeof texto !== 'string' || !texto) return [];
  const found: string[] = [];
  const seen = new Set<string>();
  for (const match of texto.matchAll(PATENTE_RE)) {
    const patente = normalizarPatenteChile(match[1] || '');
    if (patente.length < 5 || seen.has(patente)) continue;
    seen.add(patente);
    found.push(patente);
  }
  return found;
}
