export type EntregaVia =
  | 'app'
  | 'sesion_meta'
  | 'whatsapp_template'
  | 'link_publico'
  | string
  | null
  | undefined;

export function folioCotizacionLabel(numeroPublico?: string | null): string {
  const n = (numeroPublico || '').trim();
  return n ? `#${n}` : '';
}

export function tituloEnvioExitoso(numeroPublico?: string | null): string {
  const folio = folioCotizacionLabel(numeroPublico);
  return folio ? `Cotización enviada · ${folio}` : 'Cotización enviada';
}

export function requiereCompartirWhatsApp(via?: EntregaVia): boolean {
  return via === 'link_publico' || via === 'whatsapp_template';
}

export function cuerpoEnvioExitoso(opts: {
  entregaVia?: EntregaVia;
  numeroPublico?: string | null;
  channelDisconnected?: boolean;
  esLibre?: boolean;
}): string {
  const folio = folioCotizacionLabel(opts.numeroPublico);
  const folioParen = folio ? ` (${folio})` : '';
  if (opts.channelDisconnected) {
    return (
      `La cotización ya está lista${folioParen}. El canal no está conectado; `
      + 'comparte el link. Puedes reconectarlo en Configuración de canales.'
    );
  }
  if (opts.entregaVia === 'link_publico') {
    return (
      `La cotización ya está lista${folioParen}. WhatsApp no deja mandarla por el chat `
      + 'conectado (pasaron más de 24 h o el canal no está disponible). Compártela con el link.'
    );
  }
  if (opts.entregaVia === 'whatsapp_template') {
    return (
      `La cotización ya está lista${folioParen}. Intentamos avisarle por WhatsApp; `
      + 'si no le llega, comparte el link.'
    );
  }
  if (opts.entregaVia === 'sesion_meta' || opts.entregaVia === 'app') {
    return (
      'El cliente la recibió en el chat y puede aceptarla o rechazarla.'
      + (folio ? ` Folio ${folio}.` : '')
    );
  }
  if (opts.esLibre) {
    return folio ? `Link listo para compartir (${folio}).` : 'Link listo para compartir.';
  }
  return folio
    ? `La cotización ya está lista (${folio}).`
    : 'La cotización ya está lista.';
}

export const CLIPBOARD_MENSAJE_COPIADO =
  'Mensaje copiado. Pégalo en WhatsApp del cliente.';
