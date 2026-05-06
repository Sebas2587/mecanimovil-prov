/**
 * Etiqueta de vehículo para pills tipo sección (uppercase, compacta).
 * Usado en lista de chats y cabecera de chat por oferta.
 */
export type VehiculoChatLike = {
  marca?: string | null;
  modelo?: string | null;
  year?: number | string | null;
  año?: number | string | null;
  patente?: string | null;
};

export function formatVehiculoPillLabel(v: VehiculoChatLike | null | undefined): string {
  if (!v) return '';
  const marca = (v.marca ?? '').toString().trim();
  const modelo = (v.modelo ?? '').toString().trim();
  const yRaw = v.year ?? v.año;
  let yearPart = '';
  if (yRaw !== undefined && yRaw !== null && yRaw !== '') {
    const ys = String(yRaw);
    yearPart = ys.length >= 2 ? ` ${ys.slice(-2)}` : ` ${ys}`;
  }
  const pat = (v.patente ?? '').toString().trim();
  const patentePart = pat ? ` · ${pat.toUpperCase()}` : '';
  const line = `${marca} ${modelo}${yearPart}${patentePart}`.replace(/\s+/g, ' ').trim();
  return line ? line.toUpperCase() : '';
}
