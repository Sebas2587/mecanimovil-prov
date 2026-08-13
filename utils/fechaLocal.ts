/**
 * Utilidades de fecha en zona horaria local (evita desfase con `new Date('YYYY-MM-DD')` UTC).
 */

export function parseFechaLocal(fecha: string | null | undefined): Date | null {
  if (!fecha) return null;
  const iso = String(fecha).split('T')[0];
  const [y, m, d] = iso.split('-').map((p) => parseInt(p, 10));
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

export function formatDateApi(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate()
  );
}

export function esHoy(fecha: Date): boolean {
  return isSameDay(fecha, new Date());
}

export function esPasada(fecha: Date): boolean {
  return startOfDay(fecha) < startOfDay(new Date());
}

export function parseReferenciaDate(fecha?: string, hora?: string | null): Date {
  const parsed = parseFechaLocal(fecha);
  const base = parsed ?? startOfDay(new Date());
  base.setHours(8, 0, 0, 0);
  if (hora) {
    const [h, min] = String(hora).substring(0, 5).split(':').map((p) => parseInt(p, 10));
    if (!Number.isNaN(h)) {
      base.setHours(h, Number.isNaN(min) ? 0 : min, 0, 0);
    }
  }
  return base;
}

export function fechasProximosDias(cantidad = 21): string[] {
  const hoy = startOfDay(new Date());
  const out: string[] = [];
  for (let i = 0; i < cantidad; i += 1) {
    const d = new Date(hoy);
    d.setDate(hoy.getDate() + i);
    out.push(formatDateApi(d));
  }
  return out;
}

export function formatFechaHoraPropuesta(
  fecha?: string | null,
  hora?: string | null,
): string {
  const parsed = parseFechaLocal(fecha);
  if (!parsed) return '';
  const fechaTxt = parsed.toLocaleDateString('es-CL', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
  const horaTxt = (hora || '').substring(0, 5);
  return horaTxt ? `${fechaTxt} a las ${horaTxt}` : fechaTxt;
}
