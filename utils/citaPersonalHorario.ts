const SLOT_STEP = 15;

export function parseHoraMinutos(hora: string): number {
  const [h, m] = hora.substring(0, 5).split(':').map((p) => parseInt(p, 10));
  return (Number.isNaN(h) ? 0 : h) * 60 + (Number.isNaN(m) ? 0 : m);
}

export function minutosAHoraStr(totalMinutos: number): string {
  const h = Math.floor(totalMinutos / 60);
  const m = totalMinutos % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function sumarMinutosAHora(hora: string, minutos: number): string {
  return minutosAHoraStr(parseHoraMinutos(hora) + minutos);
}

export function calcularDuracionMinutos(horaInicio: string, horaFin: string): number {
  const diff = parseHoraMinutos(horaFin) - parseHoraMinutos(horaInicio);
  return diff > 0 ? diff : 0;
}

export function esRangoHorarioValido(horaInicio: string | null, horaFin: string | null): boolean {
  if (!horaInicio || !horaFin) return false;
  return calcularDuracionMinutos(horaInicio, horaFin) >= SLOT_STEP;
}

export function slotsDespuesDe(horaInicio: string, slots: string[]): string[] {
  const minInicio = parseHoraMinutos(horaInicio) + SLOT_STEP;
  return slots.filter((slot) => parseHoraMinutos(slot) >= minInicio);
}
