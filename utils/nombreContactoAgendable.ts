/** Nombre usable para agendar cita; descarta PSID Meta y placeholders. */
export function nombreContactoAgendable(...candidates: (string | null | undefined)[]): string {
  for (const raw of candidates) {
    const trimmed = String(raw ?? '').trim();
    if (!trimmed || trimmed === 'Contacto') continue;
    if (/^Cliente\s+···\d+$/i.test(trimmed)) continue;
    const compact = trimmed.replace(/\s/g, '');
    if (compact.length >= 8 && /^\d+$/.test(compact)) continue;
    return trimmed;
  }
  return '';
}
