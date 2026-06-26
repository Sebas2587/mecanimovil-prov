import type { Router } from 'expo-router';
import type { QueryClient } from '@tanstack/react-query';
import type { Orden } from '@/services/ordenesProveedor';
import type { OfertaProveedor } from '@/services/solicitudesService';
import type { CitaAgendaPersonal } from '@/services/agendaProveedorService';
import {
  openCitaPersonalDetalle,
  openOfertaDetalle,
  openSolicitudDetalle,
} from '@/utils/navigateProveedorDetalle';

export type OrigenOrden = 'mecanimovil' | 'personal';

/** Item marketplace en tab Activas (oferta y/o orden del mismo flujo). */
export type ActividadMarketplaceItem = {
  key: string;
  oferta?: OfertaProveedor;
  orden?: Orden;
  estadoEfectivo: string;
};

export type OrdenActivaItem =
  | ({ origen: 'mecanimovil' } & ActividadMarketplaceItem)
  | { origen: 'personal'; key: string; cita: CitaAgendaPersonal };

export function labelEstadoPersonal(estado: string): string {
  switch (estado) {
    case 'activa':
      return 'Activa';
    case 'cerrada':
      return 'Completada';
    case 'cancelada':
      return 'Cancelada';
    default:
      return estado;
  }
}

function timestampServicio(fecha: string | null | undefined, hora: string | null | undefined): number {
  if (!fecha) return Number.MAX_SAFE_INTEGER;
  const horaNorm = hora ? String(hora).substring(0, 8) : '00:00:00';
  const iso = `${String(fecha).split('T')[0]}T${horaNorm}`;
  const ts = new Date(iso).getTime();
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

/** Combina marketplace + citas personales activas; próximos servicios primero. */
export function mergeOrdenesActivas(
  marketplace: ActividadMarketplaceItem[],
  citasActivas: CitaAgendaPersonal[],
): OrdenActivaItem[] {
  const items: OrdenActivaItem[] = [
    ...marketplace.map((m) => ({ origen: 'mecanimovil' as const, ...m })),
    ...citasActivas.map((cita) => ({
      origen: 'personal' as const,
      key: `personal-${cita.id}`,
      cita,
    })),
  ];

  items.sort((a, b) => {
    const tsA =
      a.origen === 'mecanimovil'
        ? timestampMarketplaceItem(a)
        : timestampServicio(a.cita.fecha_servicio, a.cita.hora_servicio);
    const tsB =
      b.origen === 'mecanimovil'
        ? timestampMarketplaceItem(b)
        : timestampServicio(b.cita.fecha_servicio, b.cita.hora_servicio);
    return tsA - tsB;
  });

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
