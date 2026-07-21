import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  Image,
} from 'react-native';
import {
  Briefcase, CheckCircle, Inbox, User, Car, Clock,
  AlertTriangle, Shield, XCircle,
} from 'lucide-react-native';
import {
  ordenesProveedorService,
  obtenerNombreSeguro,
  esClienteCompleto,
} from '@/services/ordenesProveedor';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import TabScreenWrapper from '@/components/TabScreenWrapper';
import { EstadoBanner } from '@/components/solicitudes/EstadoBanner';
import { useFocusEffect } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import { invalidateProveedorMarketplaceQueries } from '@/utils/invalidateProveedorMarketplace';
import websocketService from '@/app/services/websocketService';
import Header from '@/components/Header';
import { COLORS, withOpacity, TYPOGRAPHY, BORDERS, SPACING } from '@/app/design-system/tokens';
import {
  Card,
  HostSectionKicker,
  hostScreenStyles,
} from '@/app/design-system/components';
import { InstitutionalScreenTabs } from '@/app/design-system/components/InstitutionalScreenTabs';
import { InstitutionalTag } from '@/app/design-system/components/InstitutionalTag';
import { TipoPagoClienteChip } from '@/components/solicitudes/TipoPagoClienteChip';
import { formatearMontoCLP } from '@/utils/formatearMontoCLP';
import { nombreServicioCita } from '@/services/agendaProveedorService';
import { OrigenOrdenBadge } from '@/components/ordenes/OrigenOrdenBadge';
import { useOrdenesUnificadas } from '@/hooks/useOrdenesUnificadas';
import {
  navigateToOrdenActiva,
  type OrdenActivaItem,
} from '@/utils/ordenProveedorUnificada';
import {
  ESTADO_OPERATIVO_LABELS,
  ESTADO_OPERATIVO_VARIANT,
  mapCitaEstadoOperativo,
  mapOrdenEstadoToOperativo,
} from '@/utils/estadoOperativo';
import { parseFechaLocal } from '@/utils/fechaLocal';

const I = COLORS.institutional;
const FF = TYPOGRAPHY.fontFamily;
const TS = TYPOGRAPHY.styles;
const lh = (fontSize: number, lineHeightMult: number) => Math.round(fontSize * lineHeightMult);

type TabType = 'activas' | 'completadas' | 'rechazadas';

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

  const {
    activas,
    completadas,
    rechazadas,
    activasMarketplace,
    loading,
    refreshing,
    onRefresh,
    refetchAll,
    counts,
  } = useOrdenesUnificadas(!!isVerified);

  const invalidateOrdenesYOfertas = useCallback(() => {
    invalidateProveedorMarketplaceQueries(queryClient);
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

  useFocusEffect(
    useCallback(() => {
      if (isVerified) {
        refetchAll();
      }
    }, [isVerified, refetchAll]),
  );

  const itemsTab =
    tabActivo === 'activas'
      ? activas
      : tabActivo === 'completadas'
        ? completadas
        : rechazadas;

  const tieneDatos = itemsTab.length > 0;

  const formatearFecha = (fecha: string) => {
    // Date-only (`YYYY-MM-DD`) con `new Date()` se interpreta UTC y en Chile resta 1 día.
    const parsed = parseFechaLocal(fecha) ?? new Date(fecha);
    return parsed.toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const formatearPrecio = (precio: string | number) => formatearMontoCLP(precio);

  const obtenerNombreCompleto = (cliente: any): string => {
    if (cliente?.nombre && cliente?.apellido) return `${cliente.nombre} ${cliente.apellido}`.trim();
    if (cliente?.nombre) return cliente.nombre;
    return obtenerNombreSeguro(cliente);
  };

  const renderOrdenUnificadaCard = useCallback(
    (item: OrdenActivaItem) => {
      if (item.origen === 'personal') {
        const { cita } = item;
        const estadoOperativo = mapCitaEstadoOperativo(
          cita.estado_operativo,
          cita.estado,
          Boolean(cita.horario_por_confirmar),
        );
        const textoEstado = ESTADO_OPERATIVO_LABELS[estadoOperativo];
        const estadoVariant = ESTADO_OPERATIVO_VARIANT[estadoOperativo];
        const nombreServicio = nombreServicioCita(cita);
        const precioFormateado = cita.detalle.precio_referencia
          ? formatearPrecio(cita.detalle.precio_referencia)
          : '';

        return (
          <Card
            key={item.key}
            elevated
            padding="host"
            style={styles.listCard}
            onPress={() => navigateToOrdenActiva(router, queryClient, item)}
          >
            <View style={styles.cardTop}>
              <InstitutionalTag label={textoEstado} variant={estadoVariant} size="sm" />
              {cita.template_generado_por_ia ? (
                <InstitutionalTag label="Checklist IA" variant="info" size="sm" />
              ) : null}
              <OrigenOrdenBadge origen="personal" />
              <View style={{ flex: 1 }} />
              {precioFormateado ? <Text style={styles.cardPrice}>{precioFormateado}</Text> : null}
            </View>

            <Text style={styles.cardTitle} numberOfLines={2}>{nombreServicio}</Text>

            <View style={styles.cardMeta}>
              <Clock size={13} color={I.muted} />
              <Text style={styles.cardMetaText}>
                {formatearFecha(cita.fecha_servicio)}
                {cita.hora_servicio && ` · ${cita.hora_servicio.substring(0, 5)}`}
              </Text>
              <InstitutionalTag
                label={cita.tipo_servicio === 'domicilio' ? 'Domicilio' : 'Taller'}
                variant="neutral"
                size="sm"
              />
            </View>

            <View style={styles.cardDivider} />

            <View style={styles.cardBottom}>
              <View style={styles.cardUser}>
                <View style={styles.avatarPlaceholder}>
                  <User size={14} color={I.onPrimary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.userName} numberOfLines={1}>{cita.detalle.cliente_nombre}</Text>
                  <View style={styles.vehicleRow}>
                    <Car size={12} color={I.muted} />
                    <Text style={styles.vehicleText} numberOfLines={1}>
                      {cita.detalle.vehiculo_marca} {cita.detalle.vehiculo_modelo}
                      {cita.detalle.vehiculo_anio ? ` (${cita.detalle.vehiculo_anio})` : ''}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </Card>
        );
      }

      const { oferta, orden, estadoEfectivo } = item;
      const estadoOperativo = mapOrdenEstadoToOperativo(estadoEfectivo);
      const textoEstado = ESTADO_OPERATIVO_LABELS[estadoOperativo];
      const estadoVariant = ESTADO_OPERATIVO_VARIANT[estadoOperativo];
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
        <Card
          key={item.key}
          elevated
          padding="host"
          style={styles.listCard}
          onPress={() => navigateToOrdenActiva(router, queryClient, item)}
        >
          <View style={styles.cardTop}>
            <InstitutionalTag label={textoEstado} variant={estadoVariant} size="sm" />
            <OrigenOrdenBadge origen="mecanimovil" />
            {oferta?.es_oferta_secundaria ? (
              <InstitutionalTag label="Adicional" variant="primary" size="sm" />
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
            {(orden?.tipo_servicio || oferta) ? (
              <InstitutionalTag
                label={
                  orden?.tipo_servicio === 'domicilio'
                    ? 'Domicilio'
                    : orden?.tipo_servicio
                      ? 'Taller'
                      : 'Mecanimovil'
                }
                variant="neutral"
                size="sm"
              />
            ) : null}
          </View>

          {oferta && tabActivo === 'activas' ? (
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
                <InstitutionalTag label="Repuestos" variant="success" size="sm" />
              ) : null}
            </View>
          </View>
        </Card>
      );
    },
    [queryClient, tabActivo],
  );

  const sectionMeta =
    tabActivo === 'activas'
      ? { title: 'Próximos servicios', count: counts.activas }
      : tabActivo === 'completadas'
        ? { title: 'Completadas', count: counts.completadas }
        : { title: 'Rechazadas y canceladas', count: counts.rechazadas };

  if (!isVerified) {
    return (
      <TabScreenWrapper>
        <View style={styles.screenRoot}>
          <Header title="Servicios" backgroundColor={COLORS.background.default} titleColor={I.ink} />
          <View style={styles.centeredContainer}>
            <Shield size={64} color={I.muted} />
            <Text style={styles.noVerificadoTitle}>Perfil en Verificación</Text>
            <Text style={styles.noVerificadoMessage}>
              Tu perfil de proveedor está siendo revisado. Una vez verificado podrás gestionar tus servicios.
            </Text>
          </View>
        </View>
      </TabScreenWrapper>
    );
  }

  return (
    <TabScreenWrapper>
      <View style={styles.screenRoot}>
        <Header title="Servicios" backgroundColor={COLORS.background.default} titleColor={I.ink} />

        <View style={[styles.tabsOuter, hostScreenStyles.gutterX]}>
          <InstitutionalScreenTabs
            activeKey={tabActivo}
            onChange={setTabActivo}
            tabs={[
              {
                key: 'activas',
                label: 'Activas',
                leading: <Briefcase size={14} color={tabActivo === 'activas' ? I.onPrimary : I.muted} />,
                badge: counts.activas > 0 ? counts.activas : undefined,
              },
              {
                key: 'completadas',
                label: 'Completadas',
                leading: <CheckCircle size={14} color={tabActivo === 'completadas' ? I.onPrimary : I.muted} />,
                badge: counts.completadas > 0 ? counts.completadas : undefined,
              },
              {
                key: 'rechazadas',
                label: 'Rechazadas',
                leading: <XCircle size={14} color={tabActivo === 'rechazadas' ? I.onPrimary : I.muted} />,
                badge: counts.rechazadas > 0 ? counts.rechazadas : undefined,
              },
            ]}
          />
        </View>

        <ScrollView
          style={hostScreenStyles.scroll}
          contentContainerStyle={[hostScreenStyles.scrollInner, styles.scrollContent]}
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
              {tabActivo === 'activas' && activasMarketplace.length > 0 && (
                <View style={styles.bannerWrap}>
                  {activasMarketplace.some(
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
                  {activasMarketplace.some((i) => i.estadoEfectivo === 'pagada') && (
                    <EstadoBanner
                      type="success"
                      title="Listo para realizar"
                      message="Servicios pagados: revisa fecha, hora y checklist en el detalle."
                      icon="check-circle"
                    />
                  )}
                  {activasMarketplace.some((i) => i.estadoEfectivo === 'pendiente_confirmacion') && (
                    <EstadoBanner
                      type="info"
                      title="Confirma la asignación"
                      message="Hay servicios de catálogo esperando tu confirmación en el detalle de la solicitud."
                      icon="info"
                    />
                  )}
                </View>
              )}

              <View style={styles.section}>
                <HostSectionKicker
                  label={
                    sectionMeta.count > 0
                      ? `${sectionMeta.title} · ${sectionMeta.count}`
                      : sectionMeta.title
                  }
                />
                {itemsTab.map(renderOrdenUnificadaCard)}
              </View>
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
                  ? 'No hay servicios programados. Las solicitudes Mecanimovil aparecerán aquí; también puedes agendar citas desde Calendario.'
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
    backgroundColor: COLORS.background.default,
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

  listCard: {
    marginBottom: SPACING.fixed.sm,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.xs,
    marginBottom: SPACING.fixed.sm,
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
