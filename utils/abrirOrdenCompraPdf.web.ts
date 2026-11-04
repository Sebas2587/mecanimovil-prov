function blobPart(bytes: Uint8Array): BlobPart {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy;
}

/** Descarga el PDF en el navegador. */
export async function abrirOrdenCompraPdf(bytes: Uint8Array, filename: string): Promise<void> {
  const doc = globalThis.document;
  if (!doc?.body) {
    throw new Error('descarga-no-disponible');
  }
  const blob = new Blob([blobPart(bytes)], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const anchor = doc.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  doc.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
