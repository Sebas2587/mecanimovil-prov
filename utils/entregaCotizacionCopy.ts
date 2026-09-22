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

/** Folio de caso (siempre MM-xxxxxx). Sin fallback inventado. */
export function folioIdentidadCita(opts: {
  numeroPublico?: string | null;
  citaId?: number | null;
}): string {
  return (opts.numeroPublico || '').trim().replace(/^#/, '');
}

export function folioIdentidadLabel(opts: {
  numeroPublico?: string | null;
  citaId?: number | null;
}): string {
  const id = folioIdentidadCita(opts);
  return id ? `#${id}` : '';
}

export function tituloEnvioExitoso(
  numeroPublico?: string | null,
  opts?: { actualizada?: boolean },
): string {
  const folio = folioCotizacionLabel(numeroPublico);
  if (opts?.actualizada) {
    return folio ? `Cotización actualizada · ${folio}` : 'Cotización actualizada';
  }
  return folio ? `Cotización enviada · ${folio}` : 'Cotización enviada';
}

export function requiereCompartirWhatsApp(via?: EntregaVia): boolean {
  return via === 'link_publico' || via === 'whatsapp_template';
}

export function requiereEntregaManual(opts: {
  entregaVia?: EntregaVia;
  esLibre?: boolean;
  conversationId?: number | null;
  channelDisconnected?: boolean;
  channelWindowClosed?: boolean;
}): boolean {
  if (opts.channelDisconnected || opts.channelWindowClosed) return true;
  if (opts.esLibre || opts.conversationId == null) return true;
  return requiereCompartirWhatsApp(opts.entregaVia);
}

export function cuerpoEnvioExitoso(opts: {
  entregaVia?: EntregaVia;
  numeroPublico?: string | null;
  channelDisconnected?: boolean;
  esLibre?: boolean;
  tieneTelefono?: boolean;
  actualizada?: boolean;
}): string {
  const folio = folioCotizacionLabel(opts.numeroPublico);
  const folioParen = folio ? ` (${folio})` : '';
  const avisoUpdate = opts.actualizada
    ? ' El cliente ve los ítems nuevos en el mismo enlace.'
    : '';
  const comoCompartir = opts.tieneTelefono
    ? ' Ábrela en WhatsApp con el teléfono que registraste, o copia el link para enviarlo después.'
    : ' Copia el link y envíaselo al cliente por el canal que uses.';
  if (opts.channelDisconnected) {
    return (
      `La cotización ya está lista${folioParen}. El canal no está conectado; `
      + 'comparte el link. Puedes reconectarlo en Configuración de canales.'
      + avisoUpdate
    );
  }
  if (opts.esLibre) {
    return (
      `El cliente no está en un canal conectado, así que la cotización no se envió sola${folioParen}.`
      + comoCompartir
      + avisoUpdate
    );
  }
  if (opts.entregaVia === 'link_publico') {
    return (
      `La cotización ya está lista${folioParen}. WhatsApp no deja mandarla por el chat `
      + 'conectado (pasaron más de 24 h o el canal no está disponible). Compártela con el link.'
      + avisoUpdate
    );
  }
  if (opts.entregaVia === 'whatsapp_template') {
    return (
      `La cotización ya está lista${folioParen}. Intentamos avisarle por WhatsApp; `
      + 'si no le llega, comparte el link.'
      + avisoUpdate
    );
  }
  if (opts.entregaVia === 'sesion_meta' || opts.entregaVia === 'app') {
    return (
      (opts.actualizada
        ? 'Le avisamos al cliente que actualizaste la cotización. Puede ver los ítems nuevos y responder.'
        : 'El cliente la recibió en el chat y puede aceptarla o rechazarla.')
      + (folio ? ` Folio ${folio}.` : '')
    );
  }
  return (
    `La cotización ya está lista${folioParen}.`
    + (opts.tieneTelefono || opts.esLibre ? comoCompartir : '')
    + avisoUpdate
  );
}

export const CLIPBOARD_MENSAJE_COPIADO =
  'Mensaje copiado. Pégalo en WhatsApp del cliente.';

export const CLIPBOARD_LINK_COPIADO =
  'Link copiado. Pégalo en WhatsApp o el canal que uses.';

export const HINT_CLIENTE_SIN_CANAL =
  'Este cliente no está en un canal. Al enviar podrás copiar el link o abrirlo en WhatsApp si registras el teléfono.';

export const HINT_CLIENTE_SIN_CANAL_CON_TELEFONO =
  'Este cliente no está en un canal. Al enviar podrás copiar el link o abrirlo en WhatsApp con este teléfono.';

export const HINT_CLIENTE_SIN_CANAL_SIN_TELEFONO =
  'Este cliente no está en un canal. Agrega un teléfono para enviarla por WhatsApp, o copia el link al enviar.';
