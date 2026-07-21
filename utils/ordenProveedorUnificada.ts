import type { Router } from 'expo-router';
import type { QueryClient } from '@tanstack/react-query';
import type { Orden } from '@/services/ordenesProveedor';
import type { OfertaProveedor } from '@/services/solicitudesService';
import type { CitaAgendaPersonal } from '@/services/agendaProveedorService';
import {
  OFERTA_LABELS,
  resolveTextoEstadoActividad,
} from '@/utils/estadoActividadProveedor';
import { parseReferenciaDate } from '@/utils/fechaLocal';
import {
  openCitaPersonalDetalle,
  openOfertaDetalle,
  openSolicitudDetalle,
} from '@/utils/navigateProveedorDetalle';

export type OrigenOrden = 'mecanimovil' | 'personal';

/** Item marketplace en cualquier tab (oferta y/o orden del mismo flujo). */
export type ActividadMarketplaceItem = {
  key: string;
  oferta?: OfertaProveedor;
  orden?: Orden;
  estadoEfectivo: string;
};

export type OrdenActivaItem =
  | ({ origen: 'mecanimovil' } & ActividadMarketplaceItem)
  | { origen: 'personal'; key: string; cita: CitaAgendaPersonal; estadoEfectivo: string };

/** @deprecated Use mergeOrdenesPorGrupo */
export const mergeOrdenesActivas = mergeOrdenesPorGrupo;

export function labelEstadoPersonal(estado: string): string {
  return estadoUnificadoLabel(estado, 'personal');
}

/** Etiqueta unificada marketplace + personal. */
export function estadoUnificadoLabel(
  estado: string,
  origen: OrigenOrden = 'mecanimovil',
  orden?: Orden | null,
): string {
  if (origen === 'personal') {
    switch (estado) {
      case 'activa':
        return 'Activa';
      case 'cerrada':
        return 'Completada';
      case 'cancelada':
        return 'Cancelada';
      default:
        return OFERTA_LABELS[estado] ?? estado.replace(/_/g, ' ');
    }
  }
  return resolveTextoEstadoActividad(estado, orden ?? undefined);
}

export function origenOrdenPresentation(origen: OrigenOrden) {
  const esPersonal = origen === 'personal';
  return {
    label: esPersonal ? 'Personal' : 'Mecanimovil',
    tagVariant: (esPersonal ? 'primary' : 'success') as 'primary' | 'success',
  };
}

function timestampServicio(fecha: string | null | undefined, hora: string | null | undefined): number {
  if (!fecha) return Number.MAX_SAFE_INTEGER;
  const ts = parseReferenciaDate(String(fecha).split('T')[0], hora).getTime();
  return Number.isNaN(ts) ? Number.MAX_SAFE_INTEGER : ts;
}

function timestampMarketplaceItem(item: ActividadMarketplaceItem): number {
  const orden = item.orden;
  const oferta = item.oferta;
  const fecha =
    orden?.fecha_servicio
    || oferta?.fecha_disponible
    || orden?.fecha_hora_solicitud?.split('T')[0]
    || oferta?.fecha_envio?.split('T')[0]
    || null;
  const hora = orden?.hora_servicio || oferta?.hora_disponible || null;
  return timestampServicio(fecha, hora);
}

function timestampItem(item: OrdenActivaItem): number {
  if (item.origen === 'personal') {
    return timestampServicio(item.cita.fecha_servicio, item.cita.hora_servicio);
  }
  return timestampMarketplaceItem(item);
}

export type OrdenCronologico = 'asc' | 'desc';

/**
 * Combina marketplace + citas personales.
 * - `asc` (default): próximo servicio primero (Activas).
 * - `desc`: más reciente primero (Completadas / Rechazadas).
 */
export function mergeOrdenesPorGrupo(
  marketplace: ActividadMarketplaceItem[],
  citas: CitaAgendaPersonal[],
  orden: OrdenCronologico = 'asc',
): OrdenActivaItem[] {
  const items: OrdenActivaItem[] = [
    ...marketplace.map((m) => ({ origen: 'mecanimovil' as const, ...m })),
    ...citas.map((cita) => ({
      origen: 'personal' as const,
      key: `personal-${cita.id}`,
      cita,
      estadoEfectivo: cita.estado,
    })),
  ];

  items.sort((a, b) => {
    const diff = timestampItem(a) - timestampItem(b);
    return orden === 'desc' ? -diff : diff;
  });
  return items;
}

/** Arma ítems marketplace a partir de listas de órdenes y ofertas (sin duplicar oferta+orden). */
export function buildMarketplaceItems(
  ordenes: Orden[],
  ofertas: OfertaProveedor[],
  ofertasById: Map<string, OfertaProveedor>,
  getEstadoOrden: (orden: Orden) => string,
  getEstadoOferta: (oferta: OfertaProveedor) => string,
): ActividadMarketplaceItem[] {
  const ordenPorOferta = new Map<string, Orden>();
  for (const orden of ordenes) {
    if (!orden.oferta_proveedor_id) continue;
    const k = String(orden.oferta_proveedor_id);
    const prev = ordenPorOferta.get(k);
    if (!prev || orden.id > prev.id) {
      ordenPorOferta.set(k, orden);
    }
  }

  const items: ActividadMarketplaceItem[] = [];
  const ofertaIdsUsados = new Set<string>();

  for (const oferta of ofertas) {
    const id = String(oferta.id);
    ofertaIdsUsados.add(id);
    const orden = ordenPorOferta.get(id);
    items.push({
      key: orden ? `u-${orden.id}` : `u-oferta-${id}`,
      oferta,
      orden,
      estadoEfectivo: orden ? getEstadoOrden(orden) : getEstadoOferta(oferta),
    });
  }

  for (const orden of ordenes) {
    const ofertaId = orden.oferta_proveedor_id ? String(orden.oferta_proveedor_id) : null;
    if (ofertaId && ofertaIdsUsados.has(ofertaId)) continue;
    items.push({
      key: `u-orden-${orden.id}`,
      oferta: ofertaId ? ofertasById.get(ofertaId) : undefined,
      orden,
      estadoEfectivo: getEstadoOrden(orden),
    });
  }

  return items;
}

export function navigateToOrdenActiva(
  router: Router,
  queryClient: QueryClient,
  item: OrdenActivaItem,
): void {
  if (item.origen === 'personal') {
    openCitaPersonalDetalle(router, queryClient, item.cita.id, item.cita);
    return;
  }

  const { orden, oferta } = item;
  if (orden) {
    if (orden.oferta_proveedor_id) {
      openOfertaDetalle(router, queryClient, String(orden.oferta_proveedor_id), oferta);
    } else {
      router.push(`/servicio-detalle/${orden.id}`);
    }
    return;
  }

  if (oferta) {
    if (oferta.solicitud) {
      openSolicitudDetalle(router, queryClient, oferta.solicitud, { oferta });
    } else {
      openOfertaDetalle(router, queryClient, oferta.id, oferta);
    }
  }
}
