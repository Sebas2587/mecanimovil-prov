import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Image,
} from 'react-native';
import {
  Briefcase, CheckCircle, Inbox, User, Car, Clock,
  AlertTriangle, Shield, CreditCard,
  PlusCircle, Package, XCircle,
} from 'lucide-react-native';
import {
  ordenesProveedorService,
  type Orden,
  obtenerNombreSeguro,
  esClienteCompleto,
  dedupeOrdenesPorIdYOferta,
} from '@/services/ordenesProveedor';
import { obtenerMisOfertas, type OfertaProveedor } from '@/services/solicitudesService';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import TabScreenWrapper from '@/components/TabScreenWrapper';
import { EstadoBanner } from '@/components/solicitudes/EstadoBanner';
import { useFocusEffect } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import websocketService from '@/app/services/websocketService';
import Header from '@/components/Header';
import { COLORS, withOpacity, TYPOGRAPHY, BORDERS, SHADOWS, SPACING } from '@/app/design-system/tokens';
import { InstitutionalScreenTabs } from '@/app/design-system/components/InstitutionalScreenTabs';
import { TipoPagoClienteChip } from '@/components/solicitudes/TipoPagoClienteChip';
import { formatearMontoCLP } from '@/utils/formatearMontoCLP';

const I = COLORS.institutional;
const FF = TYPOGRAPHY.fontFamily;
const TS = TYPOGRAPHY.styles;
const hx = SPACING.container.horizontal;
const lh = (fontSize: number, lineHeightMult: number) => Math.round(fontSize * lineHeightMult);

type EstadoBadgeVariant = 'success' | 'error' | 'warning' | 'info' | 'neutral';

const ESTADO_VARIANT: Record<string, EstadoBadgeVariant> = {
  pendiente_aceptacion_proveedor: 'warning',
  aceptada_por_proveedor: 'success',
  en_proceso: 'info',
  checklist_en_progreso: 'info',
  servicio_iniciado: 'info',
  cancelado: 'error',
  rechazada_por_proveedor: 'error',
  completado: 'success',
  enviada: 'info',
  vista: 'info',
  en_chat: 'warning',
  pendiente_creditos: 'warning',
  aceptada: 'success',
  pendiente_pago: 'warning',
  pagada_parcialmente: 'warning',
  pagada: 'success',
  en_ejecucion: 'info',
  completada: 'success',
  rechazada: 'error',
  retirada: 'error',
  expirada: 'neutral',
};

function getEstadoBadgeColors(variant: EstadoBadgeVariant) {
  switch (variant) {
    case 'success':
      return { bg: withOpacity(I.semanticUp, 0.12), dot: I.semanticUp, text: I.semanticUp };
    case 'error':
      return { bg: withOpacity(I.semanticDown, 0.1), dot: I.semanticDown, text: I.semanticDown };
    case 'warning':
      return {
        bg: withOpacity(I.accentYellow, 0.22),
        dot: I.accentYellow,
        text: I.body,
      };
    case 'info':
      return { bg: withOpacity(I.primary, 0.1), dot: I.primary, text: I.primaryActive };
    case 'neutral':
    default:
      return { bg: I.surfaceStrong, dot: I.muted, text: I.body };
  }
}

type TabType = 'activas' | 'completadas' | 'rechazadas';

/** Una card en Activas: oferta y/o orden del mismo flujo (estado unificado) */
type ActividadActivaItem = {
  key: string;
  oferta?: OfertaProveedor;
  orden?: Orden;
  estadoEfectivo: string;
};

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

/** Solicitud pública aún «viva» para el proveedor (incluye adjudicada / pendiente de pago) */
const SOLICITUD_ESTADOS_ACTIVOS = [
  'publicada',
  'con_ofertas',
  'seleccionando_servicios',
  'pendiente_confirmacion',
  'esperando_creditos_proveedor',
  'adjudicada',
  'pendiente_pago',
  'pagada',
  'pagada_parcialmente', // pago parcial (repuestos): válido en oferta, puede llegar por dato obsoleto en solicitud
  'en_ejecucion',
];
/** Éxito: solo estos van al tab Completadas */
const ESTADOS_COMPLETADOS_OK = ['completado', 'completada'];
/** La orden (SolicitudServicio) ya cerró: no usar estado viejo de la oferta en caché. */
const ESTADOS_ORDEN_PRECEDENCIA_OFERTA = [
  'completado',
  'cancelado',
  'rechazada_por_proveedor',
  'devuelto',
];
/** Rechazo / cancelación / expiración: tab Rechazadas */
const ESTADOS_RECHAZADAS = [
  'cancelado',
  'rechazada_por_proveedor',
  'devuelto',
  'rechazada',
  'retirada',
  'expirada',
];
const OFERTA_LABELS: Record<string, string> = {
  enviada: 'Oferta Enviada',
  vista: 'Vista por Cliente',
  en_chat: 'En Conversación',
  pendiente_confirmacion: 'Confirmar asignación',
  pendiente_creditos: 'Pendiente créditos',
  aceptada: 'Adjudicada — espera pago',
  pendiente_pago: 'Pendiente de Pago',
  pagada_parcialmente: 'Pago parcial',
  pagada: 'Pagada',
  en_ejecucion: 'En Ejecución',
  completada: 'Completada',
  rechazada: 'Rechazada',
  retirada: 'Retirada',
  expirada: 'Expirada',
};

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
  unicas.sort((a, b) => new Date(b.fecha_hora_solicitud).getTime() - new Date(a.fecha_hora_solicitud).getTime());
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

export default function OrdenesScreen() {
  const params = useLocalSearchParams<{ tab?: string }>();
  const { estadoProveedor } = useAuth();

  const [tabActivo, setTabActivo] = useState<TabType>(() => {
    if (params.tab === 'completadas') return 'completadas';
    if (params.tab === 'rechazadas') return 'rechazadas';
    return 'activas';
  });

  const isVerified = estadoProveedor?.estado_verificacion === 'aprobado';
  const queryClient = useQueryClient();

  const invalidateOrdenesYOfertas = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['ordenes-proveedor'] });
    queryClient.invalidateQueries({ queryKey: ['ofertas-proveedor'] });
  }, [queryClient]);

  useEffect(() => {
    if (!isVerified) return;
    const unsubCerrado = websocketService.onServicioCerradoPorCliente(invalidateOrdenesYOfertas);
    const unsubLista = websocketService.onOrdenesListRefresh(invalidateOrdenesYOfertas);
    return () => {
      unsubCerrado();
      unsubLista();
    };
  }, [isVerified, invalidateOrdenesYOfertas]);

  const {
    data: ordenesCompletas = [],
    isLoading: loadingOrdenes,
    refetch: refetchOrdenes,
  } = useQuery({
    queryKey: ['ordenes-proveedor'],
    queryFn: fetchOrdenes,
    enabled: !!isVerified,
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
    enabled: !!isVerified,
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });

  const loading = (loadingOrdenes || loadingOfertas) && ordenesCompletas.length === 0 && ofertas.length === 0;
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (isVerified) {
        refetchOrdenes();
        refetchOfertas();
      }
    }, [isVerified, refetchOrdenes, refetchOfertas])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchOrdenes(), refetchOfertas()]);
    setRefreshing(false);
  }, [refetchOrdenes, refetchOfertas]);

  const ofertasMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const oferta of ofertas) {
      map[String(oferta.id)] = oferta.estado;
    }
    return map;
  }, [ofertas]);

  const getEstadoEfectivo = useCallback((orden: Orden): string => {
    if (ESTADOS_ORDEN_PRECEDENCIA_OFERTA.includes(orden.estado)) {
      return orden.estado;
    }
    const ofertaId = orden.oferta_proveedor_id ? String(orden.oferta_proveedor_id) : null;
    return (ofertaId && ofertasMap[ofertaId]) ? ofertasMap[ofertaId] : orden.estado;
  }, [ofertasMap]);

  const getTextoEstado = useCallback((orden: Orden): string => {
    if (ESTADOS_ORDEN_PRECEDENCIA_OFERTA.includes(orden.estado)) {
      if (orden.estado === 'completado') {
        return OFERTA_LABELS.completada;
      }
      return orden.estado_display || orden.estado.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
    const ofertaId = orden.oferta_proveedor_id ? String(orden.oferta_proveedor_id) : null;
    const estadoOferta = ofertaId ? ofertasMap[ofertaId] : null;
    if (estadoOferta && OFERTA_LABELS[estadoOferta]) return OFERTA_LABELS[estadoOferta];
    return orden.estado_display || orden.estado.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }, [ofertasMap]);

  const ofertasActivas = useMemo(
    () =>
      ofertas.filter((oferta) => {
        if (oferta.es_oferta_secundaria) {
          // Secundarias activas: mismo criterio de estado de oferta
          if (!ESTADOS_ACTIVOS.includes(oferta.estado)) return false;
        } else if (!ESTADOS_ACTIVOS.includes(oferta.estado)) {
          return false;
        }
        if (!oferta.solicitud_estado) return true;
        return SOLICITUD_ESTADOS_ACTIVOS.includes(oferta.solicitud_estado);
      }),
    [ofertas],
  );

  const ofertasById = useMemo(() => {
    const map = new Map<string, OfertaProveedor>();
    for (const o of ofertas) {
      map.set(String(o.id), o);
    }
    return map;
  }, [ofertas]);

  const ofertasTabCompletadas = useMemo(
    () => ofertas.filter(o => o.estado === 'completada'),
    [ofertas]
  );

  const ofertasTabRechazadas = useMemo(() => ofertas.filter(oferta => {
    // Nunca considerar como rechazada una oferta activa (con pago total, parcial o en ejecución)
    if (['completada', 'pagada', 'pagada_parcialmente', 'en_ejecucion'].includes(oferta.estado)) {
      return false;
    }
    if (['rechazada', 'retirada', 'expirada'].includes(oferta.estado)) return true;
    const solCancel = oferta.solicitud_estado === 'cancelada' || oferta.solicitud_estado === 'expirada';
    return solCancel;
  }), [ofertas]);

  const ordenesActivas = useMemo(() => ordenesCompletas.filter(o => {
    const efectivo = getEstadoEfectivo(o);
    return !ESTADOS_COMPLETADOS_OK.includes(efectivo) && !ESTADOS_RECHAZADAS.includes(efectivo);
  }), [ordenesCompletas, getEstadoEfectivo]);

  const ordenesCompletadasTab = useMemo(() => ordenesCompletas.filter(o => {
    const efectivo = getEstadoEfectivo(o);
    return ESTADOS_COMPLETADOS_OK.includes(efectivo);
  }), [ordenesCompletas, getEstadoEfectivo]);

  const ordenesRechazadasTab = useMemo(() => ordenesCompletas.filter(o => {
    const efectivo = getEstadoEfectivo(o);
    return ESTADOS_RECHAZADAS.includes(efectivo);
  }), [ordenesCompletas, getEstadoEfectivo]);

  const activasUnificadas = useMemo((): ActividadActivaItem[] => {
    const ordenes = ordenesActivas ?? [];
    const ofertasAct = ofertasActivas ?? [];
    const ordenPorOferta = new Map<string, Orden>();
    for (const orden of ordenes) {
      if (!orden.oferta_proveedor_id) continue;
      const k = String(orden.oferta_proveedor_id);
      const prev = ordenPorOferta.get(k);
      if (!prev || orden.id > prev.id) {
        ordenPorOferta.set(k, orden);
      }
    }

    const items: ActividadActivaItem[] = [];
    const ofertaIdsUsados = new Set<string>();

    for (const oferta of ofertasAct) {
      const id = String(oferta.id);
      ofertaIdsUsados.add(id);
      const orden = ordenPorOferta.get(id);
      items.push({
        key: orden ? `u-${orden.id}` : `u-oferta-${id}`,
        oferta,
        orden,
        estadoEfectivo: orden ? getEstadoEfectivo(orden) : oferta.estado,
      });
    }

    for (const orden of ordenes) {
      const ofertaId = orden.oferta_proveedor_id ? String(orden.oferta_proveedor_id) : null;
      if (ofertaId && ofertaIdsUsados.has(ofertaId)) continue;
      items.push({
        key: `u-orden-${orden.id}`,
        oferta: ofertaId ? ofertasById.get(ofertaId) : undefined,
        orden,
        estadoEfectivo: getEstadoEfectivo(orden),
      });
    }

    const ts = (item: ActividadActivaItem) => {
      const raw =
        item.orden?.fecha_hora_solicitud
        || item.orden?.fecha_servicio
        || item.oferta?.fecha_envio
        || item.oferta?.fecha_disponible
        || '';
      return raw ? new Date(raw).getTime() : 0;
    };
    items.sort((a, b) => ts(b) - ts(a));
    return items;
  }, [ofertasActivas, ordenesActivas, ofertasById, getEstadoEfectivo]);

  // In completadas tab, de-duplicate: if an order references an offer via oferta_proveedor_id,
  // don't show that offer separately -- the order card already shows the effective state.
  const ofertaIdsConOrden = useMemo(() => {
    const ids = new Set<string>();
    for (const o of ordenesCompletas) {
      if (o.oferta_proveedor_id) ids.add(String(o.oferta_proveedor_id));
    }
    return ids;
  }, [ordenesCompletas]);

  const ofertasCompletadasSinDuplicar = useMemo(
    () => ofertasTabCompletadas.filter(o => !ofertaIdsConOrden.has(String(o.id))),
    [ofertasTabCompletadas, ofertaIdsConOrden]
  );

  const ofertasRechazadasSinDuplicar = useMemo(
    () => ofertasTabRechazadas.filter(o => !ofertaIdsConOrden.has(String(o.id))),
    [ofertasTabRechazadas, ofertaIdsConOrden]
  );

  const activasCount = activasUnificadas.length;
  const completadasCount = ordenesCompletadasTab.length + ofertasCompletadasSinDuplicar.length;
  const rechazadasCount = ordenesRechazadasTab.length + ofertasRechazadasSinDuplicar.length;

  const ordenesMostrar =
    tabActivo === 'activas'
      ? ordenesActivas
      : tabActivo === 'completadas'
        ? ordenesCompletadasTab
        : ordenesRechazadasTab;
  const ofertasMostrar =
    tabActivo === 'activas'
      ? ofertasActivas
      : tabActivo === 'completadas'
        ? ofertasCompletadasSinDuplicar
        : ofertasRechazadasSinDuplicar;
  const tieneDatos =
    tabActivo === 'activas'
      ? activasUnificadas.length > 0
      : ordenesMostrar.length > 0 || ofertasMostrar.length > 0;

  const handleOrdenPress = useCallback((orden: Orden) => {
    if (orden.oferta_proveedor_id) {
      router.push(`/oferta-detalle/${orden.oferta_proveedor_id}`);
    } else {
      router.push(`/servicio-detalle/${orden.id}`);
    }
  }, []);

  const handleOfertaPress = useCallback((oferta: OfertaProveedor) => {
    router.push(`/oferta-detalle/${oferta.id}`);
  }, []);

  const formatearFecha = (fecha: string) => new Date(fecha).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' });

  const formatearPrecio = (precio: string | number) => formatearMontoCLP(precio);

  const obtenerNombreCompleto = (cliente: any): string => {
    if (cliente?.nombre && cliente?.apellido) return `${cliente.nombre} ${cliente.apellido}`.trim();
    if (cliente?.nombre) return cliente.nombre;
    return obtenerNombreSeguro(cliente);
  };

  const renderOfertaCard = useCallback((oferta: OfertaProveedor) => {
    const estadoStyle = getEstadoBadgeColors(ESTADO_VARIANT[oferta.estado] || 'neutral');
    const textoEstado = OFERTA_LABELS[oferta.estado] || oferta.estado;
    const clienteFoto = oferta.solicitud_detail?.cliente_foto;
    const nombreCliente = oferta.solicitud_detail?.cliente_nombre || 'Cliente';
    const vehiculo = oferta.solicitud_detail?.vehiculo;
    const serviciosNombres = oferta.solicitud_detail?.servicios_solicitados?.map(s => s.nombre) || [];
    const nombreServicio = serviciosNombres.length > 0
      ? (serviciosNombres.length === 1 ? serviciosNombres[0] : serviciosNombres.join(', '))
      : 'Servicio';
    const precioFormateado = formatearPrecio(oferta.precio_total_ofrecido);
    const fechaDisponible = oferta.fecha_disponible
      ? new Date(oferta.fecha_disponible).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })
      : '';

    return (
      <TouchableOpacity
        key={`oferta-${oferta.id}`}
        style={styles.listCardOuter}
        onPress={() => handleOfertaPress(oferta)}
        activeOpacity={0.88}
      >
        <View style={styles.listCardInner}>
          <View style={styles.cardTop}>
            <View style={[styles.statusBadge, { backgroundColor: estadoStyle.bg }]}>
              <View style={[styles.statusDot, { backgroundColor: estadoStyle.dot }]} />
              <Text style={[styles.statusText, { color: estadoStyle.text }]}>{textoEstado}</Text>
            </View>
            {oferta.es_oferta_secundaria && (
              <View style={styles.additionalBadge}>
                <PlusCircle size={10} color={I.onPrimary} />
                <Text style={styles.additionalBadgeText}>Adicional</Text>
              </View>
            )}
            <View style={{ flex: 1 }} />
            <Text style={styles.cardPrice}>{precioFormateado}</Text>
          </View>

          <Text style={styles.cardTitle} numberOfLines={2}>{nombreServicio}</Text>

          <View style={styles.cardMeta}>
            <Clock size={13} color={I.muted} />
            <Text style={styles.cardMetaText}>
              {fechaDisponible || formatearFecha(oferta.fecha_envio)}
              {oferta.hora_disponible && ` · ${oferta.hora_disponible.substring(0, 5)}`}
            </Text>
          </View>

          <View style={styles.cardDivider} />

          <View style={styles.cardBottom}>
            <View style={styles.cardUser}>
              {clienteFoto ? (
                <Image source={{ uri: clienteFoto }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <User size={14} color={I.onPrimary} />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.userName} numberOfLines={1}>{nombreCliente}</Text>
                {vehiculo && (
                  <View style={styles.vehicleRow}>
                    <Car size={12} color={I.muted} />
                    <Text style={styles.vehicleText} numberOfLines={1}>
                      {vehiculo.marca} {vehiculo.modelo}{vehiculo.año ? ` (${vehiculo.año})` : ''}
                    </Text>
                  </View>
                )}
              </View>
            </View>
            {oferta.incluye_repuestos === true && (
              <View style={styles.repuestosBadge}>
                <Package size={10} color={I.semanticUp} />
                <Text style={styles.repuestosText}>Repuestos</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [handleOfertaPress]);

  const renderOrdenCard = useCallback((orden: Orden) => {
    const estadoEfectivo = getEstadoEfectivo(orden);
    const estadoStyle = getEstadoBadgeColors(ESTADO_VARIANT[estadoEfectivo] || 'neutral');
    const textoEstado = getTextoEstado(orden);
    const clienteFoto = (orden.cliente_detail as any)?.foto_perfil;
    const nombreCompleto2 = obtenerNombreCompleto(orden.cliente_detail);
    const esClienteCompletoFlag = esClienteCompleto(orden.cliente_detail);
    const tieneRepuestos = orden.lineas?.some(linea => linea.con_repuestos) || false;
    const urgencia = ordenesProveedorService.esOrdenUrgente(orden);
    const serviciosNombres = orden.lineas?.map(linea => linea.servicio_nombre) || [];
    const nombreServicio = serviciosNombres.length > 0
      ? (serviciosNombres.length === 1 ? serviciosNombres[0] : serviciosNombres.join(', '))
      : 'Servicio';
    const precioFormateado = formatearPrecio(orden.total);

    return (
      <TouchableOpacity
        key={`orden-${orden.id}`}
        style={styles.listCardOuter}
        onPress={() => handleOrdenPress(orden)}
        activeOpacity={0.88}
      >
        <View style={styles.listCardInner}>
          <View style={styles.cardTop}>
            <View style={[styles.statusBadge, { backgroundColor: estadoStyle.bg }]}>
              <View style={[styles.statusDot, { backgroundColor: estadoStyle.dot }]} />
              <Text style={[styles.statusText, { color: estadoStyle.text }]}>{textoEstado}</Text>
            </View>
            {urgencia && (
              <View style={styles.urgentBadge}>
                <AlertTriangle size={10} color={I.onPrimary} />
              </View>
            )}
            {!esClienteCompletoFlag && (
              <View style={styles.protectedBadge}>
                <Shield size={10} color={I.accentYellow} />
              </View>
            )}
            <View style={{ flex: 1 }} />
            <Text style={styles.cardPrice}>{precioFormateado}</Text>
          </View>

          <Text style={styles.cardTitle} numberOfLines={2}>{nombreServicio}</Text>

          <View style={styles.cardMeta}>
            <Clock size={13} color={I.muted} />
            <Text style={styles.cardMetaText}>
              {formatearFecha(orden.fecha_servicio || orden.fecha_hora_solicitud)}
              {orden.hora_servicio && ` · ${orden.hora_servicio.substring(0, 5)}`}
            </Text>
            <View style={styles.serviceTypePill}>
              <Text style={styles.serviceTypeText}>
                {orden.tipo_servicio === 'domicilio' ? 'Domicilio' : 'Taller'}
              </Text>
            </View>
          </View>

          <View style={styles.cardDivider} />

          <View style={styles.cardBottom}>
            <View style={styles.cardUser}>
              {clienteFoto ? (
                <Image source={{ uri: clienteFoto }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <User size={14} color={I.onPrimary} />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.userName} numberOfLines={1}>{nombreCompleto2}</Text>
                <View style={styles.vehicleRow}>
                  <Car size={12} color={I.muted} />
                  <Text style={styles.vehicleText} numberOfLines={1}>
                    {orden.vehiculo_detail?.marca} {orden.vehiculo_detail?.modelo}
                    {orden.vehiculo_detail?.año ? ` (${orden.vehiculo_detail.año})` : ''}
                  </Text>
                </View>
              </View>
            </View>
            <View style={styles.cardBadges}>
              {tieneRepuestos && (
                <View style={styles.repuestosBadge}>
                  <Package size={10} color={I.semanticUp} />
                  <Text style={styles.repuestosText}>Repuestos</Text>
                </View>
              )}
              {orden.metodo_pago && (
                <View style={styles.pagoBadge}>
                  <CreditCard size={10} color={I.muted} />
                  <Text style={styles.pagoText}>
                    {orden.metodo_pago === 'mercadopago' ? 'MP' :
                     orden.metodo_pago === 'transferencia' ? 'Transf.' :
                     orden.metodo_pago === 'efectivo' ? 'Efectivo' : orden.metodo_pago}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  }, [getEstadoEfectivo, getTextoEstado, handleOrdenPress]);

  const renderActividadUnificadaCard = useCallback(
    (item: ActividadActivaItem) => {
      const { oferta, orden, estadoEfectivo } = item;
      const estadoStyle = getEstadoBadgeColors(ESTADO_VARIANT[estadoEfectivo] || 'neutral');
      const textoEstado = orden
        ? getTextoEstado(orden)
        : OFERTA_LABELS[estadoEfectivo] || estadoEfectivo;

      const onPress = () => {
        if (orden) {
          handleOrdenPress(orden);
        } else if (oferta) {
          handleOfertaPress(oferta);
        }
      };

      const precioRaw = orden?.total ?? oferta?.precio_total_ofrecido ?? '0';
      const precioFormateado = formatearPrecio(precioRaw);

      const serviciosFromOrden = orden?.lineas?.map((l) => l.servicio_nombre) || [];
      const serviciosFromOferta =
        oferta?.solicitud_detail?.servicios_solicitados?.map((s) => s.nombre) || [];
      const serviciosNombres = serviciosFromOrden.length > 0 ? serviciosFromOrden : serviciosFromOferta;
      const nombreServicio =
        serviciosNombres.length > 0
          ? serviciosNombres.length === 1
            ? serviciosNombres[0]
            : serviciosNombres.join(', ')
          : 'Servicio';

      const fechaRaw = orden?.fecha_servicio || oferta?.fecha_disponible || orden?.fecha_hora_solicitud;
      const horaRaw = orden?.hora_servicio || oferta?.hora_disponible;
      const fechaTexto = fechaRaw
        ? formatearFecha(fechaRaw)
        : oferta?.fecha_envio
          ? formatearFecha(oferta.fecha_envio)
          : '';

      const clienteFoto =
        (orden?.cliente_detail as { foto_perfil?: string } | undefined)?.foto_perfil
        || oferta?.solicitud_detail?.cliente_foto;
      const nombreCliente = orden
        ? obtenerNombreCompleto(orden.cliente_detail)
        : oferta?.solicitud_detail?.cliente_nombre || 'Cliente';

      const vehiculo = orden?.vehiculo_detail || oferta?.solicitud_detail?.vehiculo;
      const esClienteCompletoFlag = orden ? esClienteCompleto(orden.cliente_detail) : true;
      const urgencia = orden ? ordenesProveedorService.esOrdenUrgente(orden) : false;
      const tieneRepuestos =
        orden?.lineas?.some((l) => l.con_repuestos)
        || oferta?.incluye_repuestos === true;

      return (
        <TouchableOpacity
          key={item.key}
          style={styles.listCardOuter}
          onPress={onPress}
          activeOpacity={0.88}
        >
          <View style={styles.listCardInner}>
            <View style={styles.cardTop}>
              <View style={[styles.statusBadge, { backgroundColor: estadoStyle.bg }]}>
                <View style={[styles.statusDot, { backgroundColor: estadoStyle.dot }]} />
                <Text style={[styles.statusText, { color: estadoStyle.text }]}>{textoEstado}</Text>
              </View>
              {oferta?.es_oferta_secundaria ? (
                <View style={styles.additionalBadge}>
                  <PlusCircle size={10} color={I.onPrimary} />
                  <Text style={styles.additionalBadgeText}>Adicional</Text>
                </View>
              ) : null}
              {urgencia ? (
                <View style={styles.urgentBadge}>
                  <AlertTriangle size={10} color={I.onPrimary} />
                </View>
              ) : null}
              {orden && !esClienteCompletoFlag ? (
                <View style={styles.protectedBadge}>
                  <Shield size={10} color={I.accentYellow} />
                </View>
              ) : null}
              <View style={{ flex: 1 }} />
              <Text style={styles.cardPrice}>{precioFormateado}</Text>
            </View>

            <Text style={styles.cardTitle} numberOfLines={2}>
              {nombreServicio}
            </Text>

            <View style={styles.cardMeta}>
              <Clock size={13} color={I.muted} />
              <Text style={styles.cardMetaText}>
                {fechaTexto}
                {horaRaw ? ` · ${String(horaRaw).substring(0, 5)}` : ''}
              </Text>
              {orden?.tipo_servicio ? (
                <View style={styles.serviceTypePill}>
                  <Text style={styles.serviceTypeText}>
                    {orden.tipo_servicio === 'domicilio' ? 'Domicilio' : 'Taller'}
                  </Text>
                </View>
              ) : null}
            </View>

            {oferta ? (
              <View style={styles.tipoPagoRow}>
                <TipoPagoClienteChip oferta={oferta} compact />
              </View>
            ) : null}

            <View style={styles.cardDivider} />

            <View style={styles.cardBottom}>
              <View style={styles.cardUser}>
                {clienteFoto ? (
                  <Image source={{ uri: clienteFoto }} style={styles.avatar} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <User size={14} color={I.onPrimary} />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.userName} numberOfLines={1}>
                    {nombreCliente}
                  </Text>
                  {vehiculo ? (
                    <View style={styles.vehicleRow}>
                      <Car size={12} color={I.muted} />
                      <Text style={styles.vehicleText} numberOfLines={1}>
                        {vehiculo.marca} {vehiculo.modelo}
                        {'año' in vehiculo && vehiculo.año ? ` (${vehiculo.año})` : ''}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>
              <View style={styles.cardBadges}>
                {tieneRepuestos ? (
                  <View style={styles.repuestosBadge}>
                    <Package size={10} color={I.semanticUp} />
                    <Text style={styles.repuestosText}>Repuestos</Text>
                  </View>
                ) : null}
                {orden?.metodo_pago ? (
                  <View style={styles.pagoBadge}>
                    <CreditCard size={10} color={I.muted} />
                    <Text style={styles.pagoText}>
                      {orden.metodo_pago === 'mercadopago'
                        ? 'MP'
                        : orden.metodo_pago === 'transferencia'
                          ? 'Transf.'
                          : orden.metodo_pago === 'efectivo'
                            ? 'Efectivo'
                            : orden.metodo_pago}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>
          </View>
        </TouchableOpacity>
      );
    },
    [getTextoEstado, handleOrdenPress, handleOfertaPress],
  );

  if (!isVerified) {
    return (
      <TabScreenWrapper>
        <View style={styles.screenRoot}>
          <Header title="Órdenes y Ofertas" backgroundColor={I.canvas} titleColor={I.ink} />
          <View style={styles.centeredContainer}>
            <Shield size={64} color={I.muted} />
            <Text style={styles.noVerificadoTitle}>Perfil en Verificación</Text>
            <Text style={styles.noVerificadoMessage}>
              Tu perfil de proveedor está siendo revisado. Una vez verificado podrás gestionar órdenes y ofertas.
            </Text>
          </View>
        </View>
      </TabScreenWrapper>
    );
  }

  return (
    <TabScreenWrapper>
      <View style={styles.screenRoot}>
        <Header title="Órdenes y Ofertas" backgroundColor={I.canvas} titleColor={I.ink} />

        <View style={[styles.tabsOuter, { paddingHorizontal: hx }]}>
          <InstitutionalScreenTabs
            activeKey={tabActivo}
            onChange={setTabActivo}
            tabs={[
              {
                key: 'activas',
                label: 'Activas',
                leading: <Briefcase size={14} color={tabActivo === 'activas' ? I.onPrimary : I.muted} />,
                badge: activasCount > 0 ? activasCount : undefined,
              },
              {
                key: 'completadas',
                label: 'Completadas',
                leading: <CheckCircle size={14} color={tabActivo === 'completadas' ? I.onPrimary : I.muted} />,
                badge: completadasCount > 0 ? completadasCount : undefined,
              },
              {
                key: 'rechazadas',
                label: 'Rechazadas',
                leading: <XCircle size={14} color={tabActivo === 'rechazadas' ? I.onPrimary : I.muted} />,
                badge: rechazadasCount > 0 ? rechazadasCount : undefined,
              },
            ]}
          />
        </View>

        {/* Content */}
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingHorizontal: hx }]}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={I.primary} />}
        >
          {loading ? (
            <View style={styles.centeredContainer}>
              <ActivityIndicator size="large" color={I.primary} />
              <Text style={styles.loadingText}>Cargando…</Text>
            </View>
          ) : tieneDatos ? (
            <>
              {tabActivo === 'activas' && activasUnificadas.length > 0 && (
                <View style={styles.bannerWrap}>
                  {activasUnificadas.some(
                    (i) =>
                      i.estadoEfectivo === 'aceptada' || i.estadoEfectivo === 'pendiente_pago',
                  ) && (
                    <EstadoBanner
                      type="warning"
                      title="Esperando pago del cliente"
                      message="La misma tarjeta pasará a «Pagada» cuando el cliente pague. No vayas al servicio antes."
                      icon="info"
                    />
                  )}
                  {activasUnificadas.some((i) => i.estadoEfectivo === 'pagada') && (
                    <EstadoBanner
                      type="success"
                      title="Listo para realizar"
                      message="Servicios pagados: revisa fecha, hora y checklist en el detalle."
                      icon="check-circle"
                    />
                  )}
                  {activasUnificadas.some((i) => i.estadoEfectivo === 'pendiente_confirmacion') && (
                    <EstadoBanner
                      type="info"
                      title="Confirma la asignación"
                      message="Hay servicios de catálogo esperando tu confirmación en el detalle de la solicitud."
                      icon="info"
                    />
                  )}
                </View>
              )}

              {tabActivo === 'activas' ? (
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <Briefcase size={18} color={I.ink} />
                    <Text style={styles.sectionTitle}>Servicios activos</Text>
                    <Text style={styles.sectionCount}>{activasUnificadas.length}</Text>
                  </View>
                  {activasUnificadas.map(renderActividadUnificadaCard)}
                </View>
              ) : tabActivo === 'completadas' ? (
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <CheckCircle size={18} color={I.ink} />
                    <Text style={styles.sectionTitle}>Completadas</Text>
                    <Text style={styles.sectionCount}>{completadasCount}</Text>
                  </View>
                  {ordenesMostrar.map(renderOrdenCard)}
                  {ofertasMostrar.map(renderOfertaCard)}
                </View>
              ) : (
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <XCircle size={18} color={I.ink} />
                    <Text style={styles.sectionTitle}>Rechazadas y canceladas</Text>
                    <Text style={styles.sectionCount}>{rechazadasCount}</Text>
                  </View>
                  {ordenesMostrar.map(renderOrdenCard)}
                  {ofertasMostrar.map(renderOfertaCard)}
                </View>
              )}
            </>
          ) : (
            <View style={styles.centeredContainer}>
              <View style={styles.emptyIconWrap}>
                {tabActivo === 'activas' ? (
                  <Inbox size={48} color={I.muted} />
                ) : tabActivo === 'completadas' ? (
                  <CheckCircle size={48} color={I.muted} />
                ) : (
                  <XCircle size={48} color={I.muted} />
                )}
              </View>
              <Text style={styles.emptyTitle}>
                {tabActivo === 'activas'
                  ? 'Sin actividad'
                  : tabActivo === 'completadas'
                    ? 'Sin completadas'
                    : 'Sin rechazadas'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {tabActivo === 'activas'
                  ? 'No hay servicios activos por el momento'
                  : tabActivo === 'completadas'
                    ? 'Aquí verás servicios finalizados con éxito'
                    : 'Aquí verás ofertas rechazadas, expiradas u órdenes canceladas'}
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
    </TabScreenWrapper>
  );
}

const styles = StyleSheet.create({
  screenRoot: {
    flex: 1,
    backgroundColor: I.surfaceSoft,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: SPACING.fixed.sm,
    paddingBottom: SPACING.fixed.xl,
  },
  centeredContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: SPACING.fixed.lg,
  },
  loadingText: {
    marginTop: SPACING.fixed.sm,
    fontSize: TS.body.fontSize,
    fontFamily: FF.sansRegular,
    lineHeight: lh(TS.body.fontSize, TS.body.lineHeight),
    color: I.body,
  },

  tabsOuter: {
    paddingTop: SPACING.fixed.sm,
    paddingBottom: SPACING.fixed.xs,
  },
  section: {
    marginBottom: SPACING.fixed.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.sm,
    marginBottom: SPACING.fixed.sm,
  },
  sectionTitle: {
    fontSize: TS.h4.fontSize,
    fontFamily: FF.sansSemiBold,
    lineHeight: lh(TS.h4.fontSize, TS.h4.lineHeight),
    letterSpacing: TS.h4.letterSpacing,
    color: I.ink,
    flex: 1,
  },
  sectionCount: {
    fontSize: TS.caption.fontSize,
    fontFamily: FF.sansSemiBold,
    lineHeight: lh(TS.caption.fontSize, TS.caption.lineHeight),
    color: I.muted,
    backgroundColor: I.surfaceStrong,
    paddingHorizontal: SPACING.fixed.sm,
    paddingVertical: 2,
    borderRadius: BORDERS.radius.md,
    overflow: 'hidden',
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
  },

  listCardOuter: {
    marginBottom: SPACING.fixed.sm,
    borderRadius: BORDERS.radius.lg,
    overflow: 'hidden',
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
    backgroundColor: I.canvas,
    ...SHADOWS.editorial,
  },
  listCardInner: {
    padding: SPACING.fixed.md,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.xs,
    marginBottom: SPACING.fixed.sm,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.fixed.sm,
    paddingVertical: SPACING.fixed.xxs,
    borderRadius: BORDERS.radius.pill,
    gap: 5,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  statusText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansSemiBold,
    lineHeight: lh(TYPOGRAPHY.fontSize.sm, TYPOGRAPHY.lineHeight.normal),
  },
  cardPrice: {
    fontSize: TS.numberDisplay.fontSize,
    fontFamily: FF.monoMedium,
    lineHeight: lh(TS.numberDisplay.fontSize, TS.numberDisplay.lineHeight),
    color: I.ink,
  },
  cardTitle: {
    fontSize: TS.h4.fontSize,
    fontFamily: FF.sansSemiBold,
    lineHeight: lh(TS.h4.fontSize, TS.h4.lineHeight),
    letterSpacing: TS.h4.letterSpacing,
    color: I.ink,
    marginBottom: SPACING.fixed.xs,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: SPACING.fixed.sm,
  },
  cardMetaText: {
    fontSize: TS.caption.fontSize,
    fontFamily: FF.monoMedium,
    lineHeight: lh(TS.caption.fontSize, TS.caption.lineHeight),
    color: I.body,
    flex: 1,
  },
  serviceTypePill: {
    backgroundColor: I.surfaceStrong,
    paddingHorizontal: SPACING.fixed.sm,
    paddingVertical: 2,
    borderRadius: BORDERS.radius.md,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
  },
  serviceTypeText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontFamily: FF.sansSemiBold,
    lineHeight: lh(TYPOGRAPHY.fontSize.xs, TYPOGRAPHY.lineHeight.normal),
    color: I.body,
  },
  cardDivider: {
    height: BORDERS.width.thin,
    backgroundColor: I.hairline,
    marginBottom: SPACING.fixed.sm,
  },
  cardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardUser: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.sm,
    flex: 1,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: I.surfaceStrong,
  },
  avatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: I.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userName: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontFamily: FF.sansSemiBold,
    lineHeight: lh(TYPOGRAPHY.fontSize.base, TS.captionBold.lineHeight),
    color: I.ink,
  },
  vehicleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  vehicleText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: FF.sansRegular,
    lineHeight: lh(TYPOGRAPHY.fontSize.sm, TYPOGRAPHY.lineHeight.normal),
    color: I.muted,
    flex: 1,
  },
  cardBadges: {
    flexDirection: 'row',
    gap: SPACING.fixed.xs,
    flexShrink: 0,
  },
  repuestosBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: withOpacity(I.semanticUp, 0.1),
    paddingHorizontal: SPACING.fixed.xs + 2,
    paddingVertical: 3,
    borderRadius: BORDERS.radius.md,
    gap: 3,
    borderWidth: BORDERS.width.thin,
    borderColor: withOpacity(I.semanticUp, 0.25),
  },
  repuestosText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontFamily: FF.sansSemiBold,
    lineHeight: lh(TYPOGRAPHY.fontSize.xs, TYPOGRAPHY.lineHeight.normal),
    color: I.semanticUp,
  },
  tipoPagoRow: {
    marginTop: SPACING.fixed.xs,
  },
  pagoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: I.surfaceStrong,
    paddingHorizontal: SPACING.fixed.xs + 2,
    paddingVertical: 3,
    borderRadius: BORDERS.radius.md,
    gap: 3,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
  },
  pagoText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontFamily: FF.sansMedium,
    lineHeight: lh(TYPOGRAPHY.fontSize.xs, TYPOGRAPHY.lineHeight.normal),
    color: I.body,
  },
  urgentBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: I.semanticDown,
    alignItems: 'center',
    justifyContent: 'center',
  },
  protectedBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: withOpacity(I.accentYellow, 0.2),
    borderWidth: BORDERS.width.thin,
    borderColor: I.accentYellow,
    alignItems: 'center',
    justifyContent: 'center',
  },
  additionalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: I.primary,
    paddingHorizontal: SPACING.fixed.xs + 2,
    paddingVertical: 2,
    borderRadius: BORDERS.radius.sm,
    gap: 3,
  },
  additionalBadgeText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontFamily: FF.sansSemiBold,
    lineHeight: lh(TYPOGRAPHY.fontSize.xs, TYPOGRAPHY.lineHeight.tight),
    color: I.onPrimary,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  bannerWrap: {
    marginBottom: SPACING.fixed.md,
    gap: SPACING.fixed.sm,
  },

  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: I.surfaceStrong,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.fixed.md,
    borderWidth: BORDERS.width.thin,
    borderColor: I.hairline,
  },
  emptyTitle: {
    fontSize: TS.h4.fontSize,
    fontFamily: FF.sansSemiBold,
    lineHeight: lh(TS.h4.fontSize, TS.h4.lineHeight),
    color: I.ink,
    marginBottom: SPACING.fixed.xs,
  },
  emptySubtitle: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontFamily: FF.sansRegular,
    lineHeight: lh(TYPOGRAPHY.fontSize.base, TYPOGRAPHY.lineHeight.normal),
    color: I.muted,
    textAlign: 'center',
  },

  noVerificadoTitle: {
    fontSize: TS.h3.fontSize,
    fontFamily: FF.sansSemiBold,
    lineHeight: lh(TS.h3.fontSize, TS.h3.lineHeight),
    color: I.ink,
    marginTop: SPACING.fixed.md,
    marginBottom: SPACING.fixed.sm,
  },
  noVerificadoMessage: {
    fontSize: TYPOGRAPHY.fontSize.base,
    fontFamily: FF.sansRegular,
    lineHeight: lh(TYPOGRAPHY.fontSize.base, TYPOGRAPHY.lineHeight.normal),
    color: I.body,
    textAlign: 'center',
  },
});
