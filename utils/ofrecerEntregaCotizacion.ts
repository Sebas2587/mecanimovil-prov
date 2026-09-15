import { showAlert, showAlertButtons } from '@/utils/platformAlert';
import {
  CLIPBOARD_LINK_COPIADO,
  CLIPBOARD_MENSAJE_COPIADO,
  cuerpoEnvioExitoso,
  tituloEnvioExitoso,
} from '@/utils/entregaCotizacionCopy';
import {
  abrirWhatsAppCotizacion,
  copiarLinkCotizacion,
  mensajeCotizacionParaCliente,
  nombresTrabajosCotizacion,
} from '@/utils/compartirCotizacionCliente';
import type { CotizacionCanal } from '@/services/cotizacionCanalService';

export async function avisarCopiaLink(url: string): Promise<void> {
  const via = await copiarLinkCotizacion(url);
  if (via === 'clipboard') {
    showAlert('Link copiado', CLIPBOARD_LINK_COPIADO);
  }
}

export async function compartirCotizacionPorWhatsApp(
  url: string,
  cot: CotizacionCanal,
  opts?: { actualizada?: boolean },
): Promise<void> {
  const mensaje = mensajeCotizacionParaCliente({
    clienteNombre: cot.cliente_nombre,
    numeroPublico: cot.numero_publico,
    servicio: cot.servicio_nombre,
    totalClp: cot.total_clp,
    url,
    actualizada: Boolean(opts?.actualizada),
    trabajos: nombresTrabajosCotizacion(cot),
  });
  const via = await abrirWhatsAppCotizacion({
    telefono: cot.cliente_telefono,
    mensaje,
    url,
  });
  if (via === 'clipboard') {
    showAlert('Mensaje copiado', CLIPBOARD_MENSAJE_COPIADO);
  }
}

/** Tras enviar a un cliente sin canal: copiar link o abrir WhatsApp personal. */
export function ofrecerEntregaCotizacionEnviada(opts: {
  url: string;
  cotizacion: CotizacionCanal;
  titulo?: string;
  cuerpo?: string;
  actualizada?: boolean;
  esLibre?: boolean;
  channelDisconnected?: boolean;
}): void {
  const cot = opts.cotizacion;
  const tieneTel = Boolean(cot.cliente_telefono?.trim());
  const titulo = opts.titulo || tituloEnvioExitoso(cot.numero_publico, {
    actualizada: opts.actualizada,
  });
  const cuerpo = opts.cuerpo || cuerpoEnvioExitoso({
    entregaVia: cot.entrega_via || 'link_publico',
    numeroPublico: cot.numero_publico,
    esLibre: opts.esLibre ?? (cot.es_libre || !cot.conversation),
    tieneTelefono: tieneTel,
    channelDisconnected: opts.channelDisconnected,
    actualizada: opts.actualizada,
  });
  showAlertButtons(titulo, cuerpo, [
    {
      text: 'Copiar link',
      onPress: () => {
        void avisarCopiaLink(opts.url);
      },
    },
    ...(tieneTel
      ? [{
          text: 'Abrir WhatsApp',
          onPress: () => {
            void compartirCotizacionPorWhatsApp(opts.url, cot, {
              actualizada: opts.actualizada,
            });
          },
        }]
      : []),
    { text: 'Ahora no', style: 'cancel' },
  ]);
}
