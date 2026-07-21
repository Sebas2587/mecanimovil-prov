import { useCallback, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ordenesProveedorService,
  type Orden,
  dedupeOrdenesPorIdYOferta,
} from '@/services/ordenesProveedor';
import { obtenerMisOfertas, type OfertaProveedor } from '@/services/solicitudesService';
import {
  agendaProveedorService,
  type CitaAgendaPersonal,
} from '@/services/agendaProveedorService';
import {
  resolveEstadoEfectivoMarketplace,
  resolveEstadoEfectivoOrden,
  isActividadCompletada,
  isActividadRechazada,
} from '@/utils/estadoActividadProveedor';
import {
  buildMarketplaceItems,
  mergeOrdenesPorGrupo,
  type ActividadMarketplaceItem,
  type OrdenActivaItem,
} from '@/utils/ordenProveedorUnificada';

const ESTADOS_ACTIVOS = [
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
];

const SOLICITUD_ESTADOS_ACTIVOS = [
  'publicada',
  'con_ofertas',
  'seleccionando_servicios',
  'pendiente_confirmacion',
  'esperando_creditos_proveedor',
  'adjudicada',
  'pendiente_pago',
  'pagada',
  'pagada_parcialmente',
  'en_ejecucion',
];

const ESTADOS_COMPLETADOS_OK = ['completado', 'completada'];

const ESTADOS_RECHAZADAS = [
  'cancelado',
  'rechazada_por_proveedor',
  'devuelto',
  'rechazada',
  'retirada',
  'expirada',
];

async function fetchOrdenes(): Promise<Orden[]> {
  const [pendientesRes, activasRes, completadasRes, canceladasRes] = await Promise.all([
    ordenesProveedorService.obtenerPendientes(),
    ordenesProveedorService.obtenerActivas(),
    ordenesProveedorService.obtenerCompletadas(),
    ordenesProveedorService.obtenerTodas({ estado: 'cancelado' }),
  ]);

  const todas: Orden[] = [];
  if (pendientesRes.success && Array.isArray(pendientesRes.data)) todas.push(...pendientesRes.data);
  if (activasRes.success && Array.isArray(activasRes.data)) todas.push(...activasRes.data);
  if (completadasRes.success && Array.isArray(completadasRes.data)) todas.push(...completadasRes.data);
  if (canceladasRes.success && Array.isArray(canceladasRes.data)) todas.push(...canceladasRes.data);

  const unicas = dedupeOrdenesPorIdYOferta(todas);
  unicas.sort(
    (a, b) => new Date(b.fecha_hora_solicitud).getTime() - new Date(a.fecha_hora_solicitud).getTime(),
  );
  return unicas;
}

async function fetchOfertas(): Promise<OfertaProveedor[]> {
  const response = await obtenerMisOfertas();
  if (response.success && response.data) {
    const data = Array.isArray(response.data) ? response.data : [];
    data.sort((a, b) => new Date(b.fecha_envio || 0).getTime() - new Date(a.fecha_envio || 0).getTime());
    return data;
  }
  return [];
}

async function fetchCitasActivas(): Promise<CitaAgendaPersonal[]> {
  const result = await agendaProveedorService.obtenerCitasActivas();
  return result.success && result.data ? result.data : [];
}

async function fetchCitasAgenda(): Promise<{ cerradas: CitaAgendaPersonal[]; canceladas: CitaAgendaPersonal[] }> {
  const [cerradasRes, canceladasRes] = await Promise.all([
    agendaProveedorService.obtenerCitasCerradas(),
    agendaProveedorService.obtenerCitasCanceladas(),
  ]);
  return {
    cerradas: cerradasRes.success && cerradasRes.data ? cerradasRes.data : [],
    canceladas: canceladasRes.success && canceladasRes.data ? canceladasRes.data : [],
  };
}

export type UseOrdenesUnificadasResult = {
  activas: OrdenActivaItem[];
  completadas: OrdenActivaItem[];
  rechazadas: OrdenActivaItem[];
  activasMarketplace: ActividadMarketplaceItem[];
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => Promise<void>;
  refetchAll: () => Promise<void>;
  counts: {
    activas: number;
    completadas: number;
    rechazadas: number;
  };
};

export function useOrdenesUnificadas(enabled: boolean): UseOrdenesUnificadasResult {
  const {
    data: ordenesCompletas = [],
    isLoading: loadingOrdenes,
    refetch: refetchOrdenes,
  } = useQuery({
    queryKey: ['ordenes-proveedor'],
    queryFn: fetchOrdenes,
    enabled,
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });

  const {
    data: ofertas = [],
    isLoading: loadingOfertas,
    refetch: refetchOfertas,
  } = useQuery({
    queryKey: ['ofertas-proveedor'],
    queryFn: fetchOfertas,
    enabled,
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });

  const {
    data: citasAgenda = { cerradas: [], canceladas: [] },
    isLoading: loadingCitas,
    refetch: refetchCitas,
  } = useQuery({
    queryKey: ['citas-agenda-proveedor'],
    queryFn: fetchCitasAgenda,
    enabled,
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });

  const {
    data: citasActivas = [],
    isLoading: loadingCitasActivas,
    refetch: refetchCitasActivas,
  } = useQuery({
    queryKey: ['citas-activas-proveedor'],
    queryFn: fetchCitasActivas,
    enabled,
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });

  const [refreshing, setRefreshing] = useState(false);

  const loading =
    (loadingOrdenes || loadingOfertas || loadingCitas || loadingCitasActivas)
    && ordenesCompletas.length === 0
    && ofertas.length === 0;

  const refetchAll = useCallback(async () => {
    await Promise.all([refetchOrdenes(), refetchOfertas(), refetchCitas(), refetchCitasActivas()]);
  }, [refetchOrdenes, refetchOfertas, refetchCitas, refetchCitasActivas]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetchAll();
    setRefreshing(false);
  }, [refetchAll]);

  const ofertasMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const oferta of ofertas) {
      map[String(oferta.id)] = oferta.estado;
    }
    return map;
  }, [ofertas]);

  const getEstadoEfectivo = useCallback(
    (orden: Orden): string => {
      const raw = resolveEstadoEfectivoOrden(orden, ofertasMap);
      return raw === 'completado' ? 'completada' : raw;
    },
    [ofertasMap],
  );

  const ordenPorOfertaId = useMemo(() => {
    const map = new Map<string, Orden>();
    for (const orden of ordenesCompletas) {
      if (!orden.oferta_proveedor_id) continue;
      const k = String(orden.oferta_proveedor_id);
      const prev = map.get(k);
      if (!prev || orden.id > prev.id) {
        map.set(k, orden);
      }
    }
    return map;
  }, [ordenesCompletas]);

  const getEstadoEfectivoOferta = useCallback(
    (oferta: OfertaProveedor): string => {
      const orden = ordenPorOfertaId.get(String(oferta.id));
      const ordenRef = orden ?? (oferta.estado_solicitud_servicio
        ? { estado: oferta.estado_solicitud_servicio }
        : null);
      return resolveEstadoEfectivoMarketplace(oferta, ordenRef);
    },
    [ordenPorOfertaId],
  );

  const ofertasActivas = useMemo(
    () =>
      ofertas.filter((oferta) => {
        if (oferta.es_oferta_secundaria) {
          if (!ESTADOS_ACTIVOS.includes(oferta.estado)) return false;
        } else if (!ESTADOS_ACTIVOS.includes(oferta.estado)) {
          return false;
        }

        const efectivo = getEstadoEfectivoOferta(oferta);
        if (isActividadCompletada(efectivo) || isActividadRechazada(efectivo)) {
          return false;
        }

        if (!oferta.solicitud_estado) return true;
        if (oferta.solicitud_estado === 'completada') return false;
        return SOLICITUD_ESTADOS_ACTIVOS.includes(oferta.solicitud_estado);
      }),
    [ofertas, getEstadoEfectivoOferta],
  );

  const ofertasById = useMemo(() => {
    const map = new Map<string, OfertaProveedor>();
    for (const o of ofertas) {
      map.set(String(o.id), o);
    }
    return map;
  }, [ofertas]);

  const ofertasTabCompletadas = useMemo(
    () =>
      ofertas.filter((o) => {
        if (o.estado === 'completada') return true;
        return isActividadCompletada(getEstadoEfectivoOferta(o));
      }),
    [ofertas, getEstadoEfectivoOferta],
  );

  const ofertasTabRechazadas = useMemo(
    () =>
      ofertas.filter((oferta) => {
        if (['completada', 'pagada', 'pagada_parcialmente', 'en_ejecucion'].includes(oferta.estado)) {
          return false;
        }
        if (['rechazada', 'retirada', 'expirada'].includes(oferta.estado)) return true;
        const solCancel =
          oferta.solicitud_estado === 'cancelada' || oferta.solicitud_estado === 'expirada';
        return solCancel;
      }),
    [ofertas],
  );

  const ordenesActivas = useMemo(
    () =>
      ordenesCompletas.filter((o) => {
        const efectivo = getEstadoEfectivo(o);
        return !ESTADOS_COMPLETADOS_OK.includes(efectivo) && !ESTADOS_RECHAZADAS.includes(efectivo);
      }),
    [ordenesCompletas, getEstadoEfectivo],
  );

  const ordenesCompletadasTab = useMemo(
    () =>
      ordenesCompletas.filter((o) => {
        const efectivo = getEstadoEfectivo(o);
        return ESTADOS_COMPLETADOS_OK.includes(efectivo);
      }),
    [ordenesCompletas, getEstadoEfectivo],
  );

  const ordenesRechazadasTab = useMemo(
    () =>
      ordenesCompletas.filter((o) => {
        const efectivo = getEstadoEfectivo(o);
        return ESTADOS_RECHAZADAS.includes(efectivo);
      }),
    [ordenesCompletas, getEstadoEfectivo],
  );

  const activasMarketplace = useMemo((): ActividadMarketplaceItem[] => {
    const items = buildMarketplaceItems(
      ordenesActivas,
      ofertasActivas,
      ofertasById,
      getEstadoEfectivo,
      getEstadoEfectivoOferta,
    );
    return items.filter(
      (item) =>
        !isActividadCompletada(item.estadoEfectivo) && !isActividadRechazada(item.estadoEfectivo),
    );
  }, [ofertasActivas, ordenesActivas, ofertasById, getEstadoEfectivo, getEstadoEfectivoOferta]);

  const ofertaIdsConOrden = useMemo(() => {
    const ids = new Set<string>();
    for (const o of ordenesCompletas) {
      if (o.oferta_proveedor_id) ids.add(String(o.oferta_proveedor_id));
    }
    return ids;
  }, [ordenesCompletas]);

  const ofertasCompletadasSinDuplicar = useMemo(
    () => ofertasTabCompletadas.filter((o) => !ofertaIdsConOrden.has(String(o.id))),
    [ofertasTabCompletadas, ofertaIdsConOrden],
  );

  const ofertasRechazadasSinDuplicar = useMemo(
    () => ofertasTabRechazadas.filter((o) => !ofertaIdsConOrden.has(String(o.id))),
    [ofertasTabRechazadas, ofertaIdsConOrden],
  );

  const citasCompletadasTab = citasAgenda.cerradas ?? [];
  const citasRechazadasTab = citasAgenda.canceladas ?? [];

  const marketplaceCompletadas = useMemo(
    () =>
      buildMarketplaceItems(
        ordenesCompletadasTab,
        ofertasCompletadasSinDuplicar,
        ofertasById,
        getEstadoEfectivo,
        getEstadoEfectivoOferta,
      ),
    [
      ordenesCompletadasTab,
      ofertasCompletadasSinDuplicar,
      ofertasById,
      getEstadoEfectivo,
      getEstadoEfectivoOferta,
    ],
  );

  const marketplaceRechazadas = useMemo(
    () =>
      buildMarketplaceItems(
        ordenesRechazadasTab,
        ofertasRechazadasSinDuplicar,
        ofertasById,
        getEstadoEfectivo,
        getEstadoEfectivoOferta,
      ),
    [
      ordenesRechazadasTab,
      ofertasRechazadasSinDuplicar,
      ofertasById,
      getEstadoEfectivo,
      getEstadoEfectivoOferta,
    ],
  );

  const activas = useMemo(
    () => mergeOrdenesPorGrupo(activasMarketplace, citasActivas),
    [activasMarketplace, citasActivas],
  );

  const completadas = useMemo(
    () => mergeOrdenesPorGrupo(marketplaceCompletadas, citasCompletadasTab, 'desc'),
    [marketplaceCompletadas, citasCompletadasTab],
  );

  const rechazadas = useMemo(
    () => mergeOrdenesPorGrupo(marketplaceRechazadas, citasRechazadasTab, 'desc'),
    [marketplaceRechazadas, citasRechazadasTab],
  );

  return {
    activas,
    completadas,
    rechazadas,
    activasMarketplace,
    loading,
    refreshing,
    onRefresh,
    refetchAll,
    counts: {
      activas: activas.length,
      completadas: completadas.length,
      rechazadas: rechazadas.length,
    },
  };
}
