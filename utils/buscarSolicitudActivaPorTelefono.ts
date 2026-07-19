import { extraerNueveDigitosDesdeGuardado } from '@/utils/chilePhone';
import type { OfertaProveedor } from '@/services/solicitudesService';
import type { InboxChatItem } from '@/services/omnichannelService';
import {
  isActividadCompletada,
  isActividadRechazada,
  resolveEstadoEfectivoMarketplace,
} from '@/utils/estadoActividadProveedor';

const ESTADOS_OFERTA_ACTIVA = new Set([
  'enviada',
  'vista',
  'en_chat',
  'pendiente_confirmacion',
  'pendiente_creditos',
  'aceptada',
  'pendiente_pago',
  'pagada_parcialmente',
  'pagada',
  'en_ejecucion',
]);

export type SolicitudActivaPorTelefonoMatch = {
  ofertaId: string;
  solicitudId: string;
  clienteNombre?: string;
};

export function telefonosCoinciden(a: string | null | undefined, b: string | null | undefined): boolean {
  const da = extraerNueveDigitosDesdeGuardado(a);
  const db = extraerNueveDigitosDesdeGuardado(b);
  return da.length === 9 && db.length === 9 && da === db;
}

function esOfertaMarketplaceActiva(oferta: OfertaProveedor): boolean {
  if (!ESTADOS_OFERTA_ACTIVA.has(oferta.estado)) return false;
  const efectivo = resolveEstadoEfectivoMarketplace(oferta);
  if (isActividadCompletada(efectivo) || isActividadRechazada(efectivo)) return false;
  if (oferta.solicitud_estado === 'completada' || oferta.solicitud_estado === 'cancelada') {
    return false;
  }
  return true;
}

/** Busca oferta/solicitud Mecanimovil activa vinculada al teléfono (inbox + ofertas del proveedor). */
export function buscarSolicitudActivaPorTelefono(
  telefono: string,
  ofertas: OfertaProveedor[],
  inboxItems: InboxChatItem[] = [],
): SolicitudActivaPorTelefonoMatch | null {
  const telefonoObjetivo = extraerNueveDigitosDesdeGuardado(telefono);
  if (telefonoObjetivo.length !== 9) return null;

  const ofertasActivas = ofertas.filter(esOfertaMarketplaceActiva);
  const ofertasById = new Map(ofertasActivas.map((o) => [String(o.id), o]));

  for (const item of inboxItems) {
    const telContacto = item.otra_persona?.telefono;
    if (!telefonosCoinciden(telefonoObjetivo, telContacto)) continue;

    if (item.oferta_id && ofertasById.has(String(item.oferta_id))) {
      const oferta = ofertasById.get(String(item.oferta_id))!;
      return {
        ofertaId: String(item.oferta_id),
        solicitudId: item.solicitud_id ?? oferta.solicitud,
        clienteNombre: item.otra_persona?.nombre || oferta.solicitud_detail?.cliente_nombre,
      };
    }

    if (item.solicitud_id) {
      const oferta = ofertasActivas.find((o) => o.solicitud === item.solicitud_id);
      if (oferta) {
        return {
          ofertaId: String(oferta.id),
          solicitudId: String(item.solicitud_id),
          clienteNombre: item.otra_persona?.nombre || oferta.solicitud_detail?.cliente_nombre,
        };
      }
    }
  }

  return null;
}
