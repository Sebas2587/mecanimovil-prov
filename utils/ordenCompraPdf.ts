/** Id de cotización ya persistida. La vista previa de plantilla usa id negativo. */
export function cotizacionTieneOrdenCompraPdf(id: number | null | undefined): boolean {
  return typeof id === 'number' && Number.isFinite(id) && id > 0;
}

export function filenameDesdeContentDisposition(header: string | undefined, fallback: string): string {
  if (!header) return fallback;
  const star = /filename\*\s*=\s*(?:UTF-8''|utf-8'')([^;]+)/i.exec(header);
  if (star?.[1]) {
    const raw = star[1].trim().replace(/^"|"$/g, '');
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  }
  const plain = /filename\s*=\s*"([^"]+)"/i.exec(header)
    || /filename\s*=\s*([^;]+)/i.exec(header);
  if (plain?.[1]) return plain[1].trim().replace(/^"|"$/g, '');
  return fallback;
}

/** Nombre seguro para disco y para el atributo download. */
export function nombreArchivoPdfSeguro(nombre: string, id: number): string {
  const fallback = `orden-compra-${id}.pdf`;
  const base = (nombre || fallback).split(/[/\\]/).pop() || fallback;
  const limpio = base.replace(/[^\w.\- ()áéíóúüñÁÉÍÓÚÜÑ]+/g, '_').replace(/^\.+/, '').trim();
  const conExt = limpio
    ? (/\.pdf$/i.test(limpio) ? limpio : `${limpio}.pdf`)
    : fallback;
  return conExt.slice(0, 120);
}

export function leerHeader(headers: unknown, name: string): string {
  if (!headers || typeof headers !== 'object') return '';
  const bag = headers as { get?: (key: string) => unknown };
  if (typeof bag.get === 'function') {
    const value = bag.get(name);
    if (typeof value === 'string' && value.trim()) return value;
  }
  const record = headers as Record<string, unknown>;
  const direct = record[name] ?? record[name.toLowerCase()];
  return typeof direct === 'string' ? direct : '';
}

/** Normaliza el cuerpo binario que devuelve axios (ArrayBuffer, vista o string latin1). */
export function bytesPdfDesdeRespuesta(data: unknown): Uint8Array {
  if (data instanceof ArrayBuffer) return new Uint8Array(data);
  if (ArrayBuffer.isView(data)) {
    return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  }
  if (typeof data === 'string') {
    const out = new Uint8Array(data.length);
    for (let i = 0; i < data.length; i += 1) out[i] = data.charCodeAt(i) & 0xff;
    return out;
  }
  throw new Error('respuesta-pdf-invalida');
}

export function esPdf(bytes: Uint8Array): boolean {
  if (bytes.byteLength < 5) return false;
  return String.fromCharCode(bytes[0] ?? 0, bytes[1] ?? 0, bytes[2] ?? 0, bytes[3] ?? 0) === '%PDF';
}
