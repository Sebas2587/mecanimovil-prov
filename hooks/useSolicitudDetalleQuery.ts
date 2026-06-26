import { useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query';
import solicitudesService, {
  obtenerDetalleOferta,
  type OfertaProveedor,
  type SolicitudPublica,
} from '@/services/solicitudesService';
import { DASHBOARD_QUERY_STALE_MS } from '@/hooks/useDashboardFinanzas';

export type SolicitudDetalleBundle = {
  solicitud: SolicitudPublica;
  miOferta: OfertaProveedor | null;
  ofertasSecundarias: OfertaProveedor[];
};

export function solicitudDetalleQueryKey(solicitudId: string | null | undefined) {
  if (solicitudId == null || solicitudId === '') return null;
  return ['solicitud-detalle', String(solicitudId)] as const;
}

export async function fetchSolicitudDetalleBundle(
  solicitudId: string,
): Promise<SolicitudDetalleBundle> {
  const result = await solicitudesService.obtenerDetalleSolicitud(solicitudId);

  if (!result.success || !result.data) {
    throw new Error(result.error || 'No se pudo cargar la solicitud');
  }

  const solicitud = result.data;
  const ofertaSeleccionada = solicitud.oferta_seleccionada_detail as OfertaProveedor | null | undefined;
  let ofertaPropia: OfertaProveedor | null = null;

  if (ofertaSeleccionada && !ofertaSeleccionada.es_oferta_secundaria) {
    ofertaPropia = ofertaSeleccionada;
  } else {
    const misOfertas = await solicitudesService.obtenerMisOfertas();
    if (misOfertas.success && misOfertas.data) {
      ofertaPropia =
        misOfertas.data.find((o) => o.solicitud === solicitudId && !o.es_oferta_secundaria) ?? null;
    }
  }

  let miOferta: OfertaProveedor | null = null;
  let ofertasSecundarias: OfertaProveedor[] = [];

  if (ofertaPropia) {
    const detalleOferta = await obtenerDetalleOferta(ofertaPropia.id);
    miOferta = detalleOferta.success && detalleOferta.data ? detalleOferta.data : ofertaPropia;

    if (
      miOferta.estado === 'aceptada'
      || miOferta.estado === 'pagada'
      || miOferta.estado === 'en_ejecucion'
    ) {
      const ofertasSecResult = await solicitudesService.obtenerOfertasSecundarias(miOferta.id);
      if (ofertasSecResult.success && ofertasSecResult.data) {
        ofertasSecundarias = ofertasSecResult.data;
      }
    }
  }

  if (solicitud.ofertas_secundarias && solicitud.ofertas_secundarias.length > 0) {
    ofertasSecundarias = solicitud.ofertas_secundarias;
  }

  return { solicitud, miOferta, ofertasSecundarias };
}

export function seedSolicitudDetalleFromSolicitud(
  solicitud: SolicitudPublica,
): SolicitudDetalleBundle {
  const ofertaCatalogo = solicitud.oferta_seleccionada_detail as OfertaProveedor | null | undefined;
  return {
    solicitud,
    miOferta: ofertaCatalogo && !ofertaCatalogo.es_oferta_secundaria ? ofertaCatalogo : null,
    ofertasSecundarias: solicitud.ofertas_secundarias ?? [],
  };
}

export function seedSolicitudDetalleFromOferta(
  solicitudId: string,
  oferta: OfertaProveedor,
): SolicitudDetalleBundle | null {
  const det = oferta.solicitud_detail;
  if (!det) return null;

  const veh = det.vehiculo;
  const solicitud: SolicitudPublica = {
    id: solicitudId,
    cliente_nombre: det.cliente_nombre,
    vehiculo: veh?.id ?? 0,
    vehiculo_info: veh
      ? {
          id: veh.id,
          marca: veh.marca,
          modelo: veh.modelo,
          año: veh.año ?? undefined,
          patente: veh.patente,
          kilometraje: veh.kilometraje,
        }
      : { id: 0, marca: '', modelo: '' },
    descripcion_problema: det.descripcion_problema,
    urgencia: det.urgencia,
    servicios_solicitados: det.servicios_solicitados.map((s) => s.id),
    servicios_solicitados_detail: det.servicios_solicitados,
    fecha_preferida: det.fecha_preferida,
    hora_preferida: det.hora_preferida ?? null,
    direccion_servicio_texto: det.direccion_servicio_texto,
    detalles_ubicacion: det.detalles_ubicacion,
    fotos_necesidad: det.fotos_necesidad,
    tipo_solicitud: 'global',
    estado: (oferta.solicitud_estado as SolicitudPublica['estado']) ?? 'publicada',
    fecha_creacion: '',
    fecha_expiracion: '',
    puede_recibir_ofertas: false,
    puede_ver_datos_cliente: true,
    total_ofertas: 0,
    total_visualizaciones: 0,
    total_rechazos: 0,
  };

  return {
    solicitud,
    miOferta: oferta.es_oferta_secundaria ? null : oferta,
    ofertasSecundarias: [],
  };
}

export function patchSolicitudDetalleCache(
  queryClient: QueryClient,
  solicitudId: string,
  patch: Partial<Pick<SolicitudDetalleBundle, 'solicitud' | 'miOferta' | 'ofertasSecundarias'>>,
) {
  const key = solicitudDetalleQueryKey(solicitudId);
  if (!key) return;
  queryClient.setQueryData<SolicitudDetalleBundle>(key, (prev) => {
    if (!prev) return prev;
    return { ...prev, ...patch };
  });
}

export function prefetchSolicitudDetalle(
  queryClient: QueryClient,
  solicitudId: string,
  seed?: SolicitudDetalleBundle | null,
) {
  const key = solicitudDetalleQueryKey(solicitudId);
  if (!key) return Promise.resolve();

  if (seed) {
    queryClient.setQueryData(key, seed);
  }

  return queryClient.prefetchQuery({
    queryKey: key,
    queryFn: () => fetchSolicitudDetalleBundle(solicitudId),
    staleTime: DASHBOARD_QUERY_STALE_MS,
  });
}

export function useSolicitudDetalleQuery(solicitudId: string | null | undefined) {
  const key = solicitudDetalleQueryKey(solicitudId);

  return useQuery({
    queryKey: key ?? ['solicitud-detalle', '__disabled__'],
    queryFn: () => fetchSolicitudDetalleBundle(String(solicitudId)),
    enabled: key != null,
    staleTime: DASHBOARD_QUERY_STALE_MS,
    refetchOnWindowFocus: false,
    retry: 1,
    placeholderData: (previous) => previous,
  });
}

export function useInvalidateSolicitudDetalle() {
  const queryClient = useQueryClient();
  return (solicitudId?: string) => {
    if (solicitudId) {
      void queryClient.invalidateQueries({ queryKey: solicitudDetalleQueryKey(solicitudId) ?? undefined });
      return;
    }
    void queryClient.invalidateQueries({ queryKey: ['solicitud-detalle'] });
  };
}
