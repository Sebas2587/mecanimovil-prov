import type { Router } from 'expo-router';
import type { QueryClient } from '@tanstack/react-query';
import type { CitaAgendaPersonal } from '@/services/agendaProveedorService';
import type { OfertaProveedor, SolicitudPublica } from '@/services/solicitudesService';
import {
  prefetchSolicitudDetalle,
  seedSolicitudDetalleFromOferta,
  seedSolicitudDetalleFromSolicitud,
} from '@/hooks/useSolicitudDetalleQuery';
import { prefetchCitaPersonal } from '@/hooks/useCitaPersonalQuery';

export function openSolicitudDetalle(
  router: Router,
  queryClient: QueryClient,
  solicitudId: string,
  seed?: { solicitud?: SolicitudPublica; oferta?: OfertaProveedor },
  options?: { replace?: boolean },
) {
  let bundle = null;
  if (seed?.solicitud) {
    bundle = seedSolicitudDetalleFromSolicitud(seed.solicitud);
  } else if (seed?.oferta) {
    bundle = seedSolicitudDetalleFromOferta(solicitudId, seed.oferta);
  }
  void prefetchSolicitudDetalle(queryClient, solicitudId, bundle);
  const href = `/solicitud-detalle/${solicitudId}` as const;
  if (options?.replace) {
    router.replace(href);
  } else {
    router.push(href);
  }
}

export function openCitaPersonalDetalle(
  router: Router,
  queryClient: QueryClient,
  citaId: number,
  seed?: CitaAgendaPersonal,
) {
  void prefetchCitaPersonal(queryClient, citaId, seed ?? null);
  router.push(`/cita-agenda-personal/${citaId}`);
}

export function openOfertaDetalle(
  router: Router,
  queryClient: QueryClient,
  ofertaId: string,
  oferta?: OfertaProveedor,
) {
  if (oferta?.solicitud) {
    openSolicitudDetalle(router, queryClient, oferta.solicitud, { oferta });
    return;
  }

  const cachedOfertas = queryClient.getQueryData<OfertaProveedor[]>(['ofertas-proveedor']);
  const cached = cachedOfertas?.find((o) => String(o.id) === String(ofertaId));
  if (cached?.solicitud) {
    openSolicitudDetalle(router, queryClient, cached.solicitud, { oferta: cached });
    return;
  }

  router.push(`/oferta-detalle/${ofertaId}`);
}
