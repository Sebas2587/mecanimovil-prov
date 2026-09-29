import { router } from 'expo-router';
import type { PipelineComercialItem } from '@/services/pipelineComercialService';
import cotizacionCanalService from '@/services/cotizacionCanalService';
import { abrirWhatsAppCotizacion } from '@/utils/compartirCotizacionCliente';
import { omnichannelChatHref } from '@/utils/chatRoutes';
import { openCitaPersonalDetalle, openOfertaDetalle } from '@/utils/navigateProveedorDetalle';
import type { QueryClient } from '@tanstack/react-query';
import type { VerboId } from '@/utils/asistenteTaller/verboLead';

export type ResultadoVerbo = {
  texto: string;
  abrirDia?: boolean;
};

export async function ejecutarVerbo(
  verbo: VerboId,
  item: PipelineComercialItem,
  queryClient: QueryClient,
): Promise<ResultadoVerbo> {
  const quien = (item.cliente_nombre || 'el cliente').trim();

  if (verbo === 'marcar_aceptada' && item.cotizacion_id) {
    const actualizada = await cotizacionCanalService.marcarAceptada(item.cotizacion_id);
    if (actualizada.cita_personal_id) {
      router.push(`/cita-agenda-personal/${actualizada.cita_personal_id}?agendar=1`);
    }
    return {
      texto: `${quien} quedó aceptado. Confirma el mecánico y la hora en la cita.`,
    };
  }

  if ((verbo === 'agendar' || verbo === 'empezar') && item.cita_id) {
    if (verbo === 'agendar') {
      router.push(`/cita-agenda-personal/${item.cita_id}?agendar=1`);
      return { texto: `Hora de ${quien}. El cupo queda en el día cuando lo confirmes.` };
    }
    openCitaPersonalDetalle(router, queryClient, item.cita_id);
    return { texto: `Abro el trabajo de ${quien}.` };
  }

  if (verbo === 'contestar') {
    const folio = (item.numero_publico || '').trim();
    const mensaje = folio
      ? `Hola, te escribo por la cotización ${folio}.`
      : 'Hola, te escribo por el servicio que conversamos.';
    if (item.cliente_telefono) {
      await abrirWhatsAppCotizacion({
        telefono: item.cliente_telefono,
        mensaje,
        url: '',
      });
      return { texto: `WhatsApp de ${quien} quedó abierto. Al volver, el caso sigue aquí.` };
    }
    if (item.conversation_id) {
      router.push(omnichannelChatHref(item.conversation_id));
      return { texto: `Abro el chat de ${quien}.` };
    }
    return { texto: `${quien} no tiene teléfono para escribirle.` };
  }

  if (verbo === 'cotizar') {
    if (item.conversation_id) {
      router.push(omnichannelChatHref(item.conversation_id));
      return { texto: `Cotiza desde el chat de ${quien}. El auto ya está en esa conversación.` };
    }
    router.push('/cotizar-ia');
    return { texto: `Nueva cotización para ${quien}.` };
  }

  if ((verbo === 'enviar' || verbo === 'revisar_precios') && item.cotizacion_id) {
    router.push(`/cotizacion-canal/${item.cotizacion_id}`);
    return {
      texto: verbo === 'enviar'
        ? `Revisa y envía la cotización de ${quien}.`
        : `Faltan precios en la cotización de ${quien}.`,
    };
  }

  if (verbo === 'confirmar') {
    if (item.solicitud_id) router.push(`/solicitud-detalle/${item.solicitud_id}`);
    else if (item.oferta_id) openOfertaDetalle(router, queryClient, item.oferta_id);
    else if (item.orden_id) router.push(`/orden-detalle/${item.orden_id}`);
    return { texto: `Orden de ${quien}. Confírmala en el detalle.` };
  }

  if (item.orden_id) {
    router.push(`/orden-detalle/${item.orden_id}`);
    return { texto: `Abro el servicio de ${quien}.` };
  }
  if (item.cotizacion_id) {
    router.push(`/cotizacion-canal/${item.cotizacion_id}`);
    return { texto: `Abro la cotización de ${quien}.` };
  }
  return { texto: `No encuentro el siguiente paso de ${quien}.` };
}
