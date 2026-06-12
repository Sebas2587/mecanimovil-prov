import type { ChecklistInstance } from '@/services/checklistService';
import type { OfertaProveedor } from '@/services/solicitudesService';
import { getResumenTipoPagoCliente } from '@/utils/tipoPagoClienteLabel';
import {
  checklistCompletadoTotal,
  checklistEsperandoFirmaCliente,
  checklistBloqueaCierre,
  tieneManoObraPendientePago,
  mensajeProximoPasoProveedor,
} from '@/utils/ofertaFlujoServicio';

export type BannerTipo = 'success' | 'warning' | 'info' | 'error';

export type BannerConfig = {
  type: BannerTipo;
  title: string;
  message: string;
  icon: string;
};

export type OfertaDetalleUiContext = {
  oferta: OfertaProveedor;
  checklist: ChecklistInstance | null | undefined;
  loadingChecklist: boolean;
  checklistLoadError: boolean;
};

function ctxFlags(ctx: OfertaDetalleUiContext) {
  const { oferta, checklist, loadingChecklist, checklistLoadError } = ctx;
  return {
    esperandoFirma: checklistEsperandoFirmaCliente(checklist),
    checklistCerrado: checklistCompletadoTotal(checklist),
    saldoMOPendiente: tieneManoObraPendientePago(oferta),
    checklistPendiente: checklistBloqueaCierre(checklist),
    pagoCompleto:
      oferta.estado_pago_servicio === 'pagado'
      && (oferta.estado_pago_repuestos === 'pagado' || oferta.estado_pago_repuestos === 'no_aplica'),
  };
}

/** Badge del header según oferta + checklist (no solo oferta.estado). */
export function resolverBadgeEstadoOferta(ctx: OfertaDetalleUiContext): {
  text: string;
  accentKey: 'primary' | 'semanticUp' | 'accentYellow' | 'muted' | 'semanticDown' | 'primaryActive' | 'body';
  icon: string;
} {
  const { oferta } = ctx;
  const f = ctxFlags(ctx);

  if (oferta.estado === 'en_ejecucion') {
    if (f.esperandoFirma) {
      return { text: 'Esperando firma del cliente', accentKey: 'primary', icon: 'schedule' };
    }
    if (f.checklistCerrado) {
      return { text: 'Servicio cerrado', accentKey: 'semanticUp', icon: 'check-circle' };
    }
    if (f.saldoMOPendiente) {
      return { text: 'En ejecución · cobro pendiente', accentKey: 'accentYellow', icon: 'payment' };
    }
    if (f.checklistPendiente) {
      return { text: 'Checklist en curso', accentKey: 'accentYellow', icon: 'assignment' };
    }
    return { text: 'En ejecución', accentKey: 'primary', icon: 'build' };
  }

  const map: Record<string, { text: string; accentKey: 'primary' | 'semanticUp' | 'accentYellow' | 'muted' | 'semanticDown' | 'primaryActive' | 'body'; icon: string }> = {
    enviada: { text: 'Enviada', accentKey: 'primary', icon: 'send' },
    vista: { text: 'Vista por cliente', accentKey: 'primary', icon: 'visibility' },
    en_chat: { text: 'En conversación', accentKey: 'primaryActive', icon: 'chat' },
    pendiente_creditos: { text: 'Pendiente créditos', accentKey: 'accentYellow', icon: 'account-balance-wallet' },
    aceptada: { text: 'Aceptada', accentKey: 'semanticUp', icon: 'check-circle' },
    pendiente_pago: { text: 'Cliente pagando…', accentKey: 'accentYellow', icon: 'payment' },
    pagada: { text: 'Pagada', accentKey: 'semanticUp', icon: 'paid' },
    pagada_parcialmente: { text: 'Pago parcial', accentKey: 'accentYellow', icon: 'payment' },
    completada: { text: 'Completada', accentKey: 'semanticUp', icon: 'check-circle' },
    rechazada: { text: 'Rechazada', accentKey: 'semanticDown', icon: 'cancel' },
    retirada: { text: 'Retirada', accentKey: 'muted', icon: 'undo' },
    expirada: { text: 'Expirada', accentKey: 'muted', icon: 'schedule' },
  };

  return map[oferta.estado] ?? { text: oferta.estado, accentKey: 'body', icon: 'info' };
}

/** Un solo banner contextual (evita repetir el mismo aviso 3–4 veces). */
export function resolverBannerPrincipal(ctx: OfertaDetalleUiContext): BannerConfig | null {
  const { oferta, loadingChecklist, checklistLoadError } = ctx;
  const f = ctxFlags(ctx);

  switch (oferta.estado) {
    case 'pendiente_creditos':
      return {
        type: 'warning',
        title: 'Confirmá con créditos',
        message: 'Comprá los créditos necesarios en la tienda antes del plazo para confirmar esta adjudicación.',
        icon: 'account-balance-wallet',
      };
    case 'aceptada':
      return {
        type: 'warning',
        title: 'Esperando confirmación de pago',
        message: 'El cliente aceptó tu oferta. No te dirijas al servicio hasta que se confirme el pago.',
        icon: 'info',
      };
    case 'pendiente_pago':
      return {
        type: 'warning',
        title: 'Cliente procesando el pago',
        message: 'Te avisaremos cuando el pago quede confirmado.',
        icon: 'payment',
      };
    case 'pagada':
      return {
        type: 'success',
        title: 'Pago confirmado',
        message: 'Podés iniciar el servicio cuando estés listo.',
        icon: 'check-circle',
      };
    case 'pagada_parcialmente':
      return {
        type: 'warning',
        title: 'Pago parcial',
        message: f.saldoMOPendiente
          ? 'El cliente pagó repuestos y gestión. La mano de obra se cobra al final del servicio.'
          : 'Revisa el plan de pago del cliente.',
        icon: 'payment',
      };
    case 'en_ejecucion': {
      if (loadingChecklist) {
        return {
          type: 'info',
          title: 'Servicio en progreso',
          message: 'Verificando estado del checklist…',
          icon: 'build',
        };
      }
      if (checklistLoadError) {
        return {
          type: 'error',
          title: 'No se pudo cargar el checklist',
          message: 'Recarga la pantalla para ver el estado actual.',
          icon: 'error-outline',
        };
      }
      if (f.esperandoFirma) {
        const extra = f.saldoMOPendiente
          ? ' También debe pagar la mano de obra pendiente desde su app.'
          : '';
        return {
          type: 'info',
          title: 'Esperando firma del cliente',
          message: `Tu firma del checklist ya está registrada. El cliente debe firmar desde su app para cerrar la orden.${extra}`,
          icon: 'schedule',
        };
      }
      if (f.checklistCerrado) {
        return {
          type: 'success',
          title: 'Servicio cerrado',
          message: 'Checklist completado con ambas firmas.',
          icon: 'check-circle',
        };
      }
      if (f.saldoMOPendiente && !f.checklistPendiente) {
        return {
          type: 'warning',
          title: 'Mano de obra pendiente',
          message: 'El cliente debe pagar la mano de obra desde su app antes de cerrar la orden.',
          icon: 'payment',
        };
      }
      const msg = mensajeProximoPasoProveedor(oferta, ctx.checklist ?? null, loadingChecklist, checklistLoadError);
      return {
        type: f.checklistPendiente ? 'warning' : 'info',
        title: f.checklistPendiente ? 'Completa el checklist' : 'Servicio en progreso',
        message: msg,
        icon: f.checklistPendiente ? 'assignment' : 'build',
      };
    }
    case 'completada':
      return {
        type: 'success',
        title: 'Servicio completado',
        message: 'La orden se cerró cuando el cliente firmó desde su app.',
        icon: 'check-circle',
      };
    case 'vista':
      return {
        type: 'info',
        title: 'Cliente revisando tu oferta',
        message: 'Pronto recibirás una respuesta o podrías conversar para aclarar dudas.',
        icon: 'visibility',
      };
    case 'en_chat':
      return {
        type: 'info',
        title: 'En conversación',
        message: 'Responde las dudas del cliente para que pueda decidir.',
        icon: 'chat',
      };
    case 'rechazada':
      return {
        type: 'error',
        title: 'Oferta rechazada',
        message: oferta.rechazada_por_expiracion
          ? 'El cliente no completó el pago dentro del plazo.'
          : 'El cliente eligió otra oferta.',
        icon: 'cancel',
      };
    case 'expirada':
      return {
        type: 'error',
        title: 'Oferta expirada',
        message: 'Esta oferta expiró sin ser aceptada.',
        icon: 'schedule',
      };
    default:
      return null;
  }
}

/** Plan de pago: solo fases pre-ejecución o si aún hay saldo pendiente. */
export function mostrarSeccionPlanPago(ctx: OfertaDetalleUiContext): boolean {
  const { oferta } = ctx;
  const resumen = getResumenTipoPagoCliente(oferta);
  if (!resumen.visible) return false;

  const f = ctxFlags(ctx);
  if (oferta.estado === 'completada') return false;
  if (oferta.estado === 'en_ejecucion' && f.pagoCompleto && !f.saldoMOPendiente) {
    return false;
  }
  return true;
}

/** Detalle desglosado de montos pagados/pendientes. */
export function mostrarDetallePago(ctx: OfertaDetalleUiContext): boolean {
  const { oferta } = ctx;
  const f = ctxFlags(ctx);

  if (oferta.estado === 'completada') return false;
  if (oferta.estado === 'en_ejecucion' && f.pagoCompleto && !f.saldoMOPendiente) {
    return false;
  }

  const resumen = getResumenTipoPagoCliente(oferta);
  if (
    oferta.estado === 'pagada_parcialmente'
    || oferta.estado === 'pagada'
    || (resumen.visible && oferta.estado !== 'en_ejecucion')
  ) {
    return true;
  }

  return (
    oferta.estado === 'en_ejecucion'
    && (f.saldoMOPendiente || oferta.estado_pago_repuestos === 'pagado')
  );
}

/** Banner dentro de la sección checklist: solo si requiere acción del proveedor. */
export function resolverBannerChecklistAccion(ctx: OfertaDetalleUiContext): BannerConfig | null {
  const { checklist, loadingChecklist } = ctx;
  const f = ctxFlags(ctx);

  if (loadingChecklist || !checklist) return null;
  if (f.esperandoFirma || f.checklistCerrado) return null;

  if (checklist.estado === 'PENDIENTE') {
    return {
      type: 'warning',
      title: 'Checklist pendiente',
      message: 'Inicia el checklist para documentar el servicio.',
      icon: 'assignment',
    };
  }

  return {
    type: 'warning',
    title: 'Checklist en progreso',
    message: 'Completa todos los ítems y firma como técnico responsable.',
    icon: 'assignment',
  };
}

/** Footer con texto duplicado del banner principal. */
export function mostrarAvisoFooterEspera(ctx: OfertaDetalleUiContext): boolean {
  return false;
}
