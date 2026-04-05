import React, { useState, useMemo, useCallback } from 'react';
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
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Briefcase, CheckCircle, Inbox, User, Car, Clock,
  ChevronRight, Wrench, AlertTriangle, Shield, CreditCard,
  PlusCircle, Package,
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
import Header from '@/components/Header';

type TabType = 'activas' | 'completadas';

const ESTADOS_ACTIVOS = ['enviada', 'vista', 'en_chat', 'aceptada', 'pendiente_pago', 'pagada', 'en_ejecucion'];
const ESTADOS_COMPLETADOS = ['completada', 'rechazada', 'retirada', 'expirada'];
const ESTADOS_TERMINALES_ORDEN = ['completado', 'cancelado', 'rechazada_por_proveedor', 'devuelto'];
const ESTADOS_TERMINALES_OFERTA = ['completada', 'rechazada', 'retirada', 'expirada'];

const ESTADO_COLORS: Record<string, { bg: string; dot: string; text: string }> = {
  pendiente_aceptacion_proveedor: { bg: '#FFF7ED', dot: '#F59E0B', text: '#92400E' },
  aceptada_por_proveedor: { bg: '#ECFDF5', dot: '#10B981', text: '#065F46' },
  en_proceso: { bg: '#EFF6FF', dot: '#3B82F6', text: '#1E40AF' },
  checklist_en_progreso: { bg: '#EFF6FF', dot: '#3B82F6', text: '#1E40AF' },
  servicio_iniciado: { bg: '#EFF6FF', dot: '#3B82F6', text: '#1E40AF' },
  cancelado: { bg: '#FEF2F2', dot: '#EF4444', text: '#991B1B' },
  rechazada_por_proveedor: { bg: '#FEF2F2', dot: '#EF4444', text: '#991B1B' },
  completado: { bg: '#ECFDF5', dot: '#10B981', text: '#065F46' },
  enviada: { bg: '#EFF6FF', dot: '#3B82F6', text: '#1E40AF' },
  vista: { bg: '#F5F3FF', dot: '#8B5CF6', text: '#5B21B6' },
  en_chat: { bg: '#FFF7ED', dot: '#F59E0B', text: '#92400E' },
  aceptada: { bg: '#ECFDF5', dot: '#10B981', text: '#065F46' },
  pendiente_pago: { bg: '#FFF7ED', dot: '#F59E0B', text: '#92400E' },
  pagada: { bg: '#ECFDF5', dot: '#10B981', text: '#065F46' },
  en_ejecucion: { bg: '#EFF6FF', dot: '#3B82F6', text: '#1E40AF' },
  completada: { bg: '#ECFDF5', dot: '#10B981', text: '#065F46' },
  rechazada: { bg: '#FEF2F2', dot: '#EF4444', text: '#991B1B' },
  retirada: { bg: '#FEF2F2', dot: '#EF4444', text: '#991B1B' },
  expirada: { bg: '#F3F4F6', dot: '#9CA3AF', text: '#374151' },
};

const OFERTA_LABELS: Record<string, string> = {
  enviada: 'Oferta Enviada',
  vista: 'Vista por Cliente',
  en_chat: 'En Conversación',
  aceptada: 'Aceptada',
  pendiente_pago: 'Pendiente de Pago',
  pagada: 'Pagada',
  en_ejecucion: 'En Ejecución',
  completada: 'Completada',
  rechazada: 'Rechazada',
  retirada: 'Retirada',
  expirada: 'Expirada',
};

const DEFAULT_STYLE = { bg: '#F3F4F6', dot: '#9CA3AF', text: '#374151' };

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
  const queryClient = useQueryClient();

  const [tabActivo, setTabActivo] = useState<TabType>(
    params.tab === 'completadas' ? 'completadas' : 'activas'
  );

  const isVerified = estadoProveedor?.verificado;

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
    const ofertaId = orden.oferta_proveedor_id ? String(orden.oferta_proveedor_id) : null;
    return (ofertaId && ofertasMap[ofertaId]) ? ofertasMap[ofertaId] : orden.estado;
  }, [ofertasMap]);

  const getTextoEstado = useCallback((orden: Orden): string => {
    const ofertaId = orden.oferta_proveedor_id ? String(orden.oferta_proveedor_id) : null;
    const estadoOferta = ofertaId ? ofertasMap[ofertaId] : null;
    if (estadoOferta && OFERTA_LABELS[estadoOferta]) return OFERTA_LABELS[estadoOferta];
    return orden.estado_display || orden.estado.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  }, [ofertasMap]);

  const ofertasActivas = useMemo(() => ofertas.filter(oferta => {
    if (oferta.estado === 'pagada' || oferta.estado === 'en_ejecucion') return false;
    const estadoActivo = ESTADOS_ACTIVOS.includes(oferta.estado);
    if (!oferta.solicitud_estado) return estadoActivo;
    const solicitudValida = oferta.solicitud_estado !== 'cancelada' && oferta.solicitud_estado !== 'expirada';
    return estadoActivo && solicitudValida;
  }), [ofertas]);

  const ofertasCompletadas = useMemo(() => ofertas.filter(oferta => {
    const estadoCompletado = ESTADOS_COMPLETADOS.includes(oferta.estado);
    const solicitudCancelada = oferta.solicitud_estado === 'cancelada' || oferta.solicitud_estado === 'expirada';
    return estadoCompletado || solicitudCancelada;
  }), [ofertas]);

  const ordenesActivas = useMemo(() => ordenesCompletas.filter(o => {
    const efectivo = getEstadoEfectivo(o);
    return !ESTADOS_TERMINALES_ORDEN.includes(efectivo) && !ESTADOS_TERMINALES_OFERTA.includes(efectivo);
  }), [ordenesCompletas, getEstadoEfectivo]);

  const ordenesCompletadasTab = useMemo(() => ordenesCompletas.filter(o => {
    const efectivo = getEstadoEfectivo(o);
    return ESTADOS_TERMINALES_ORDEN.includes(efectivo) || ESTADOS_TERMINALES_OFERTA.includes(efectivo);
  }), [ordenesCompletas, getEstadoEfectivo]);

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
    () => ofertasCompletadas.filter(o => !ofertaIdsConOrden.has(String(o.id))),
    [ofertasCompletadas, ofertaIdsConOrden]
  );

  const activasCount = ordenesActivas.length + ofertasActivas.length;
  const completadasCount = ordenesCompletadasTab.length + ofertasCompletadasSinDuplicar.length;

  const ordenesMostrar = tabActivo === 'activas' ? ordenesActivas : ordenesCompletadasTab;
  const ofertasMostrar = tabActivo === 'activas' ? ofertasActivas : ofertasCompletadasSinDuplicar;
  const tieneDatos = ordenesMostrar.length > 0 || ofertasMostrar.length > 0;

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

  const formatearPrecio = (precio: string | number) => {
    try {
      const num = typeof precio === 'string' ? parseFloat(precio.toString().replace(/[^0-9.-]+/g, '')) : precio;
      return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(num);
    } catch { return `$${precio}`; }
  };

  const obtenerNombreCompleto = (cliente: any): string => {
    if (cliente?.nombre && cliente?.apellido) return `${cliente.nombre} ${cliente.apellido}`.trim();
    if (cliente?.nombre) return cliente.nombre;
    return obtenerNombreSeguro(cliente);
  };

  const renderOfertaCard = useCallback((oferta: OfertaProveedor) => {
    const estadoStyle = ESTADO_COLORS[oferta.estado] || DEFAULT_STYLE;
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
        style={styles.glassCardOuter}
        onPress={() => handleOfertaPress(oferta)}
        activeOpacity={0.7}
      >
        <BlurView intensity={50} tint="light" style={styles.glassCardInner}>
          <View style={styles.cardTop}>
            <View style={[styles.statusBadge, { backgroundColor: estadoStyle.bg }]}>
              <View style={[styles.statusDot, { backgroundColor: estadoStyle.dot }]} />
              <Text style={[styles.statusText, { color: estadoStyle.text }]}>{textoEstado}</Text>
            </View>
            {oferta.es_oferta_secundaria && (
              <View style={styles.additionalBadge}>
                <PlusCircle size={10} color="#FFFFFF" />
                <Text style={styles.additionalBadgeText}>ADICIONAL</Text>
              </View>
            )}
            <View style={{ flex: 1 }} />
            <Text style={styles.cardPrice}>{precioFormateado}</Text>
          </View>

          <Text style={styles.cardTitle} numberOfLines={2}>{nombreServicio}</Text>

          <View style={styles.cardMeta}>
            <Clock size={13} color="#9CA3AF" />
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
                  <User size={14} color="#FFFFFF" />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.userName} numberOfLines={1}>{nombreCliente}</Text>
                {vehiculo && (
                  <View style={styles.vehicleRow}>
                    <Car size={12} color="#9CA3AF" />
                    <Text style={styles.vehicleText} numberOfLines={1}>
                      {vehiculo.marca} {vehiculo.modelo}{vehiculo.año ? ` (${vehiculo.año})` : ''}
                    </Text>
                  </View>
                )}
              </View>
            </View>
            {oferta.incluye_repuestos === true && (
              <View style={styles.repuestosBadge}>
                <Package size={10} color="#059669" />
                <Text style={styles.repuestosText}>Repuestos</Text>
              </View>
            )}
          </View>
        </BlurView>
      </TouchableOpacity>
    );
  }, [handleOfertaPress]);

  const renderOrdenCard = useCallback((orden: Orden) => {
    const estadoEfectivo = getEstadoEfectivo(orden);
    const estadoStyle = ESTADO_COLORS[estadoEfectivo] || DEFAULT_STYLE;
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
        style={styles.glassCardOuter}
        onPress={() => handleOrdenPress(orden)}
        activeOpacity={0.7}
      >
        <BlurView intensity={50} tint="light" style={styles.glassCardInner}>
          <View style={styles.cardTop}>
            <View style={[styles.statusBadge, { backgroundColor: estadoStyle.bg }]}>
              <View style={[styles.statusDot, { backgroundColor: estadoStyle.dot }]} />
              <Text style={[styles.statusText, { color: estadoStyle.text }]}>{textoEstado}</Text>
            </View>
            {urgencia && (
              <View style={styles.urgentBadge}>
                <AlertTriangle size={10} color="#FFFFFF" />
              </View>
            )}
            {!esClienteCompletoFlag && (
              <View style={styles.protectedBadge}>
                <Shield size={10} color="#F59E0B" />
              </View>
            )}
            <View style={{ flex: 1 }} />
            <Text style={styles.cardPrice}>{precioFormateado}</Text>
          </View>

          <Text style={styles.cardTitle} numberOfLines={2}>{nombreServicio}</Text>

          <View style={styles.cardMeta}>
            <Clock size={13} color="#9CA3AF" />
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
                  <User size={14} color="#FFFFFF" />
                </View>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.userName} numberOfLines={1}>{nombreCompleto2}</Text>
                <View style={styles.vehicleRow}>
                  <Car size={12} color="#9CA3AF" />
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
                  <Package size={10} color="#059669" />
                  <Text style={styles.repuestosText}>Repuestos</Text>
                </View>
              )}
              {orden.metodo_pago && (
                <View style={styles.pagoBadge}>
                  <CreditCard size={10} color="#6B7280" />
                  <Text style={styles.pagoText}>
                    {orden.metodo_pago === 'mercadopago' ? 'MP' :
                     orden.metodo_pago === 'transferencia' ? 'Transf.' :
                     orden.metodo_pago === 'efectivo' ? 'Efectivo' : orden.metodo_pago}
                  </Text>
                </View>
              )}
            </View>
          </View>
        </BlurView>
      </TouchableOpacity>
    );
  }, [getEstadoEfectivo, getTextoEstado, handleOrdenPress]);

  if (!isVerified) {
    return (
      <TabScreenWrapper>
        <LinearGradient colors={['#F3F5F8', '#FAFBFC', '#FFFFFF']} locations={[0, 0.3, 1]} style={styles.gradient}>
          <Header title="Órdenes y Ofertas" />
          <View style={styles.centeredContainer}>
            <Shield size={64} color="#9CA3AF" />
            <Text style={styles.noVerificadoTitle}>Perfil en Verificación</Text>
            <Text style={styles.noVerificadoMessage}>
              Tu perfil de proveedor está siendo revisado. Una vez verificado podrás gestionar órdenes y ofertas.
            </Text>
          </View>
        </LinearGradient>
      </TabScreenWrapper>
    );
  }

  return (
    <TabScreenWrapper>
      <LinearGradient colors={['#F3F5F8', '#FAFBFC', '#FFFFFF']} locations={[0, 0.3, 1]} style={styles.gradient}>
        <Header title="Órdenes y Ofertas" />

        {/* Glass Tabs */}
        <View style={styles.tabsOuter}>
          <BlurView intensity={40} tint="light" style={styles.tabsBlur}>
            <TouchableOpacity
              style={[styles.tabPill, tabActivo === 'activas' && styles.tabPillActive]}
              onPress={() => setTabActivo('activas')}
              activeOpacity={0.7}
            >
              <Briefcase size={15} color={tabActivo === 'activas' ? '#FFFFFF' : '#6B7280'} />
              <Text style={[styles.tabPillText, tabActivo === 'activas' && styles.tabPillTextActive]}>
                Activas
              </Text>
              {activasCount > 0 && (
                <View style={[styles.tabCount, tabActivo === 'activas' && styles.tabCountActive]}>
                  <Text style={[styles.tabCountText, tabActivo === 'activas' && styles.tabCountTextActive]}>
                    {activasCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabPill, tabActivo === 'completadas' && styles.tabPillActive]}
              onPress={() => setTabActivo('completadas')}
              activeOpacity={0.7}
            >
              <CheckCircle size={15} color={tabActivo === 'completadas' ? '#FFFFFF' : '#6B7280'} />
              <Text style={[styles.tabPillText, tabActivo === 'completadas' && styles.tabPillTextActive]}>
                Completadas
              </Text>
              {completadasCount > 0 && (
                <View style={[styles.tabCount, tabActivo === 'completadas' && styles.tabCountActive]}>
                  <Text style={[styles.tabCountText, tabActivo === 'completadas' && styles.tabCountTextActive]}>
                    {completadasCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </BlurView>
        </View>

        {/* Content */}
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {loading ? (
            <View style={styles.centeredContainer}>
              <ActivityIndicator size="large" color="#3B82F6" />
              <Text style={styles.loadingText}>Cargando...</Text>
            </View>
          ) : tieneDatos ? (
            <>
              {tabActivo === 'activas' && ofertasMostrar.length > 0 && (
                <View style={styles.bannerWrap}>
                  {ofertasMostrar.some(o => o.estado === 'aceptada' || o.estado === 'pendiente_pago') && (
                    <EstadoBanner
                      type="warning"
                      title="Esperando Confirmación de Pago"
                      message="No te dirijas al servicio hasta que veas el estado 'Pagada'. Te notificaremos."
                      icon="info"
                    />
                  )}
                  {ofertasMostrar.some(o => o.estado === 'pagada') && (
                    <EstadoBanner
                      type="success"
                      title="Servicios Listos para Realizar"
                      message="Las ofertas con estado 'Pagada' están confirmadas. Revisa fecha y hora."
                      icon="check-circle"
                    />
                  )}
                </View>
              )}

              {tabActivo === 'activas' ? (
                <>
                  {ofertasMostrar.length > 0 && (
                    <View style={styles.section}>
                      <View style={styles.sectionHeader}>
                        <Wrench size={18} color="#374151" />
                        <Text style={styles.sectionTitle}>Ofertas Enviadas</Text>
                        <Text style={styles.sectionCount}>{ofertasMostrar.length}</Text>
                      </View>
                      {ofertasMostrar.map(renderOfertaCard)}
                    </View>
                  )}

                  {ordenesMostrar.length > 0 && (
                    <View style={styles.section}>
                      <View style={styles.sectionHeader}>
                        <Briefcase size={18} color="#374151" />
                        <Text style={styles.sectionTitle}>Órdenes de Servicio</Text>
                        <Text style={styles.sectionCount}>{ordenesMostrar.length}</Text>
                      </View>
                      {ordenesMostrar.map(renderOrdenCard)}
                    </View>
                  )}
                </>
              ) : (
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <CheckCircle size={18} color="#374151" />
                    <Text style={styles.sectionTitle}>Historial</Text>
                    <Text style={styles.sectionCount}>{completadasCount}</Text>
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
                  <Inbox size={48} color="#9CA3AF" />
                ) : (
                  <CheckCircle size={48} color="#9CA3AF" />
                )}
              </View>
              <Text style={styles.emptyTitle}>
                {tabActivo === 'activas' ? 'Sin actividad' : 'Sin historial'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {tabActivo === 'activas'
                  ? 'No hay órdenes o ofertas activas por el momento'
                  : 'No hay órdenes o ofertas completadas aún'}
              </Text>
            </View>
          )}
        </ScrollView>
      </LinearGradient>
    </TabScreenWrapper>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 32,
  },
  centeredContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },

  // Tabs
  tabsOuter: {
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 4,
  },
  tabsBlur: {
    flexDirection: 'row',
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.6)',
    padding: 4,
    gap: 4,
  },
  tabPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 11,
    gap: 6,
  },
  tabPillActive: {
    backgroundColor: '#1F2937',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  tabPillText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  tabPillTextActive: {
    color: '#FFFFFF',
  },
  tabCount: {
    backgroundColor: '#E5E7EB',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  tabCountActive: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  tabCountText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#374151',
  },
  tabCountTextActive: {
    color: '#FFFFFF',
  },

  // Sections
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1F2937',
    flex: 1,
  },
  sectionCount: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9CA3AF',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    overflow: 'hidden',
  },

  // Glass Cards
  glassCardOuter: {
    marginBottom: 12,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.7)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  glassCardInner: {
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 5,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardPrice: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 6,
    lineHeight: 22,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 12,
  },
  cardMetaText: {
    fontSize: 13,
    color: '#6B7280',
    flex: 1,
  },
  serviceTypePill: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  serviceTypeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
  },
  cardDivider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.06)',
    marginBottom: 12,
  },
  cardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardUser: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#E5E7EB',
  },
  avatarPlaceholder: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#3B82F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1F2937',
  },
  vehicleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  vehicleText: {
    fontSize: 12,
    color: '#9CA3AF',
    flex: 1,
  },
  cardBadges: {
    flexDirection: 'row',
    gap: 6,
    flexShrink: 0,
  },
  repuestosBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 3,
  },
  repuestosText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#059669',
  },
  pagoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 3,
  },
  pagoText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#6B7280',
  },
  urgentBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#EF4444',
    alignItems: 'center',
    justifyContent: 'center',
  },
  protectedBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#FFF7ED',
    borderWidth: 1,
    borderColor: '#FDE68A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  additionalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F97316',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 3,
  },
  additionalBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  bannerWrap: {
    marginBottom: 16,
    gap: 8,
  },

  // Empty state
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 20,
  },

  // Not verified
  noVerificadoTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
    marginTop: 16,
    marginBottom: 8,
  },
  noVerificadoMessage: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
  },
});
