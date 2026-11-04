import {
  bytesPdfDesdeRespuesta,
  cotizacionTieneOrdenCompraPdf,
  esPdf,
  filenameDesdeContentDisposition,
  nombreArchivoPdfSeguro,
} from '@/utils/ordenCompraPdf';

describe('cotizacionTieneOrdenCompraPdf', () => {
  it('exige un id de cotización guardado', () => {
    expect(cotizacionTieneOrdenCompraPdf(42)).toBe(true);
    expect(cotizacionTieneOrdenCompraPdf(0)).toBe(false);
    expect(cotizacionTieneOrdenCompraPdf(-8)).toBe(false);
    expect(cotizacionTieneOrdenCompraPdf(undefined)).toBe(false);
    expect(cotizacionTieneOrdenCompraPdf(Number.NaN)).toBe(false);
  });
});

describe('filename de la orden de compra', () => {
  it('lee Content-Disposition y cae al nombre por id', () => {
    expect(filenameDesdeContentDisposition(undefined, 'orden-compra-3.pdf')).toBe('orden-compra-3.pdf');
    expect(filenameDesdeContentDisposition(
      'attachment; filename="orden-compra-12.pdf"',
      'orden-compra-3.pdf',
    )).toBe('orden-compra-12.pdf');
    expect(filenameDesdeContentDisposition(
      "attachment; filename*=UTF-8''orden%20compra.pdf",
      'orden-compra-3.pdf',
    )).toBe('orden compra.pdf');
  });

  it('limpia separadores de ruta', () => {
    expect(nombreArchivoPdfSeguro('../etc/passwd', 9)).toBe('passwd.pdf');
    expect(nombreArchivoPdfSeguro('orden compra.pdf', 9)).toBe('orden compra.pdf');
  });
});

describe('bytesPdfDesdeRespuesta', () => {
  it('acepta un PDF en ArrayBuffer', () => {
    const raw = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]);
    const bytes = bytesPdfDesdeRespuesta(raw.buffer);
    expect(esPdf(bytes)).toBe(true);
  });

  it('rechaza un cuerpo que no es PDF', () => {
    const bytes = bytesPdfDesdeRespuesta(JSON.stringify({ detail: 'no' }));
    expect(esPdf(bytes)).toBe(false);
  });
});
