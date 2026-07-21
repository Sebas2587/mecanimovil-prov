import React, { useCallback, useEffect, useMemo, useRef, useState, type ReactElement } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  ScrollView,
  RefreshControl,
  type RefreshControlProps,
} from 'react-native';
import { router } from 'expo-router';
import {
  Check,
  ChevronDown,
  ChevronRight,
  Link2,
  MessageCircle,
  SlidersHorizontal,
  UserRound,
  XCircle,
} from 'lucide-react-native';
import {
  type PipelineComercialItem,
  type EstadoPipelineNormalizado,
  type OrigenPipeline,
  ESTADO_PIPELINE_LABELS,
  ORIGEN_PIPELINE_LABELS,
} from '@/services/pipelineComercialService';
import { usePipelineComercialQuery } from '@/hooks/usePipelineComercialQuery';
import cotizacionCanalService, { type CotizacionCanal } from '@/services/cotizacionCanalService';
import { CotizacionIaEditor } from '@/components/chats/CotizacionIaEditor';
import { BottomSheet } from '@/app/design-system/components/BottomSheet';
import { InstitutionalText } from '@/app/design-system/components/InstitutionalText';
import { InstitutionalTag } from '@/app/design-system/components/InstitutionalTag';
import { InstitutionalButton } from '@/app/design-system/components/InstitutionalButton';
import { AsignarTecnicoBottomSheet, type AsignarTecnicoTarget } from '@/components/equipo/AsignarTecnicoBottomSheet';
import {
  ESTADO_OPERATIVO_LABELS,
  ESTADO_OPERATIVO_VARIANT,
  mapPipelineEstadoToOperativo,
} from '@/utils/estadoOperativo';
import { COLORS, SPACING, BORDERS, TYPOGRAPHY, SHADOWS } from '@/app/design-system/tokens';
import { formatearMontoCLP } from '@/utils/formatearMontoCLP';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import { showAlert, showConfirm } from '@/utils/platformAlert';

const I = COLORS.institutional;
const T = TYPOGRAPHY.styles;
const FF = TYPOGRAPHY.fontFamily;

/**
 * Filtros de bandeja estilo Airbnb Hosts:
 * tabs tipográficos con underline (sin pills brand) + origen en bottom sheet.
 */
const VISTAS_BANDEJA: Array<{
  key: EstadoPipelineNormalizado | 'abiertos';
  label: string;
}> = [
  { key: 'abiertos', label: 'Abiertos' },
  { key: 'nuevo', label: 'Nuevos' },
  { key: 'cotizacion_enviada', label: 'Esperando' },
  { key: 'en_negociacion', label: 'Negociando' },
  { key: 'aceptado_agendado', label: 'Agendados' },
  { key: 'rechazado_perdido', label: 'Perdidos' },
];

const ESTADOS_ABIERTOS: EstadoPipelineNormalizado[] = [
  'nuevo',
  'cotizacion_enviada',
  'en_negociacion',
  'aceptado_agendado',
  'en_ejecucion',
];

const ORIGENES: Array<{ key: OrigenPipeline | 'todos'; label: string }> = [
  { key: 'todos', label: 'Todos' },
  { key: 'marketplace', label: 'Mecanimovil' },
  { key: 'catalogo', label: 'Catálogo' },
  { key: 'whatsapp', label: 'WhatsApp' },
  { key: 'instagram', label: 'Instagram' },
  { key: 'messenger', label: 'Messenger' },
  { key: 'directo', label: 'Link libre' },
  { key: 'manual', label: 'Personal' },
];

function inicialCliente(nombre: string): string {
  const t = (nombre || '').trim();
  if (!t) return '?';
  if (/^\d+$/.test(t)) return '#';
  return t.charAt(0).toUpperCase();
}

function tiempoRelativo(fechaIso: string | null): string {
  if (!fechaIso) return '';
  const t = new Date(fechaIso).getTime();
  if (Number.isNaN(t)) return '';
  const mins = Math.max(0, Math.round((Date.now() - t) / 60_000));
  if (mins < 60) return `${Math.max(1, mins)}m`;
  const horas = Math.round(mins / 60);
  if (horas < 48) return `${horas}h`;
  const dias = Math.round(horas / 24);
  return `${dias}d`;
}

function navegarDetalleDirecto(item: PipelineComercialItem) {
  if (item.solicitud_id) {
    router.push(`/solicitud-detalle/${item.solicitud_id}`);
    return;
  }
  if (item.cita_id) {
    router.push(`/cita-agenda-personal/${item.cita_id}`);
    return;
  }
  if (item.orden_id) {
    router.push(`/orden-detalle/${item.orden_id}`);
    return;
  }
  if (item.conversation_id && item.tipo_entidad !== 'cotizacion_canal') {
    router.push(`/chat-omnicanal?conversationId=${item.conversation_id}`);
  }
}

const LeadCard = React.memo(function LeadCard({
  item,
  onPress,
}: {
  item: PipelineComercialItem;
  onPress: (item: PipelineComercialItem) => void;
}) {
  const handlePress = useCallback(() => onPress(item), [onPress, item]);
  const monto = item.monto_clp != null ? formatearMontoCLP(item.monto_clp) : null;
  const snippet =
    item.servicio_resumen
    || item.vehiculo_resumen
    || ESTADO_PIPELINE_LABELS[item.estado_normalizado];
  const origenLabel = ORIGEN_PIPELINE_LABELS[item.origen] || item.origen;
  const tiempo = tiempoRelativo(item.fecha_referencia);
  const estadoOperativo = mapPipelineEstadoToOperativo(item.estado_normalizado);
  const vehiculo = item.vehiculo_resumen?.trim();

  return (
    <TouchableOpacity
      style={styles.leadCard}
      onPress={handlePress}
      activeOpacity={0.88}
      accessibilityRole="button"
      accessibilityLabel={`Gestionar ${item.cliente_nombre}`}
    >
      <View style={styles.cardTop}>
        {item.esperando_respuesta_24h ? (
          <InstitutionalTag label="+24h" variant="warning" size="sm" />
        ) : item.demorado_48h ? (
          <InstitutionalTag label="+48h" variant="warning" size="sm" />
        ) : item.visto_sin_respuesta ? (
          <InstitutionalTag label="Visto" variant="warning" size="sm" />
        ) : (
          <InstitutionalTag
            label={ESTADO_OPERATIVO_LABELS[estadoOperativo]}
            variant={ESTADO_OPERATIVO_VARIANT[estadoOperativo]}
            size="sm"
          />
        )}
        <InstitutionalTag label={origenLabel} variant="neutral" size="sm" />
        {item.template_generado_por_ia ? (
          <InstitutionalTag label="Checklist IA" variant="info" size="sm" />
        ) : null}
        <View style={styles.cardTopSpacer} />
        {monto ? <Text style={styles.cardPrice}>{monto}</Text> : null}
      </View>

      <Text style={styles.cardTitle} numberOfLines={2}>
        {snippet}
      </Text>

      <View style={styles.cardMeta}>
        <View style={styles.avatarSoft}>
          <Text style={styles.avatarSoftText}>{inicialCliente(item.cliente_nombre)}</Text>
        </View>
        <View style={styles.cardMetaTextCol}>
          <Text style={styles.cardClient} numberOfLines={1}>
            {item.cliente_nombre}
          </Text>
          {vehiculo ? (
            <Text style={styles.cardVehicle} numberOfLines={1}>
              {vehiculo}
            </Text>
          ) : null}
        </View>
        {tiempo ? <Text style={styles.cardTime}>{tiempo}</Text> : null}
        <ChevronRight size={18} color={I.mutedSoft} strokeWidth={ICON_STROKE_WIDTH} />
      </View>
    </TouchableOpacity>
  );
});

interface Props {
  compact?: boolean;
  limite?: number;
  filtroEsperando24h?: boolean;
  filtroOrigen?: OrigenPipeline;
  /** @deprecated Usar invalidación TanStack Query; se mantiene por compatibilidad. */
  refreshKey?: number;
  hideTitle?: boolean;
  listRefreshControl?: ReactElement<RefreshControlProps>;
}

export function PipelineSeguimientoSection({
  compact = false,
  limite = compact ? 5 : 50,
  filtroEsperando24h = false,
  filtroOrigen,
  refreshKey = 0,
  hideTitle = false,
  listRefreshControl,
}: Props) {
  const [vista, setVista] = useState<EstadoPipelineNormalizado | 'abiertos'>('abiertos');
  const [origen, setOrigen] = useState<OrigenPipeline | 'todos'>(filtroOrigen ?? 'todos');
  const [origenSheetVisible, setOrigenSheetVisible] = useState(false);
  const [asignarTarget, setAsignarTarget] = useState<AsignarTecnicoTarget | null>(null);
  const [asignarVisible, setAsignarVisible] = useState(false);
  const [leadActivo, setLeadActivo] = useState<PipelineComercialItem | null>(null);
  const [cotizacionDetalle, setCotizacionDetalle] = useState<CotizacionCanal | null>(null);
  const [cotizacionDetalleLoading, setCotizacionDetalleLoading] = useState(false);
  const cotizacionCacheRef = useRef<Map<number, CotizacionCanal>>(new Map());
  const [accionLoading, setAccionLoading] = useState(false);

  useEffect(() => {
    const cotizacionId = leadActivo?.cotizacion_id;
    if (!cotizacionId) {
      setCotizacionDetalle(null);
      setCotizacionDetalleLoading(false);
      return;
    }
    const cached = cotizacionCacheRef.current.get(cotizacionId);
    if (cached) {
      setCotizacionDetalle(cached);
      setCotizacionDetalleLoading(false);
      return;
    }
    let cancelled = false;
    setCotizacionDetalle(null);
    setCotizacionDetalleLoading(true);
    void cotizacionCanalService
      .obtener(cotizacionId)
      .then((full) => {
        if (cancelled) return;
        cotizacionCacheRef.current.set(cotizacionId, full);
        setCotizacionDetalle(full);
      })
      .catch(() => {
        if (!cancelled) setCotizacionDetalle(null);
      })
      .finally(() => {
        if (!cancelled) setCotizacionDetalleLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [leadActivo?.cotizacion_id]);

  useEffect(() => {
    if (filtroOrigen) setOrigen(filtroOrigen);
  }, [filtroOrigen]);

  useEffect(() => {
    if (filtroEsperando24h) setVista('cotizacion_enviada');
  }, [filtroEsperando24h]);

  const queryParams = useMemo(
    () => ({
      limite,
      origen: origen === 'todos' ? undefined : origen,
      esperando_24h: filtroEsperando24h || undefined,
      estado_normalizado: filtroEsperando24h ? ('cotizacion_enviada' as EstadoPipelineNormalizado) : undefined,
      fetchAllEstados: !filtroEsperando24h,
    }),
    [limite, origen, filtroEsperando24h],
  );

  const { data, isPending, isFetching, refetch } = usePipelineComercialQuery(queryParams);

  useEffect(() => {
    if (refreshKey > 0) {
      void refetch();
    }
  }, [refreshKey, refetch]);

  const rawResults = data?.results ?? [];

  const items = useMemo(() => {
    if (filtroEsperando24h) return rawResults;
    if (vista === 'abiertos') {
      return rawResults.filter((row) => ESTADOS_ABIERTOS.includes(row.estado_normalizado));
    }
    return rawResults.filter((row) => row.estado_normalizado === vista);
  }, [rawResults, vista, filtroEsperando24h]);

  const vistaBadgeCounts = useMemo(() => {
    const counts: Record<string, number> = { abiertos: 0 };
    for (const v of VISTAS_BANDEJA) {
      if (v.key !== 'abiertos') counts[v.key] = 0;
    }
    for (const row of rawResults) {
      if (ESTADOS_ABIERTOS.includes(row.estado_normalizado)) counts.abiertos += 1;
      if (row.estado_normalizado in counts) {
        counts[row.estado_normalizado] += 1;
      }
    }
    return counts;
  }, [rawResults]);

  const esperando24h = data?.esperando_respuesta_24h_count ?? 0;
  const loading = isPending && rawResults.length === 0;

  const handlePress = useCallback((item: PipelineComercialItem) => {
    if (item.tipo_entidad === 'cotizacion_canal') {
      setLeadActivo(item);
      return;
    }
    if (item.cita_id || item.orden_id || item.oferta_id) {
      setLeadActivo(item);
      return;
    }
    navegarDetalleDirecto(item);
  }, []);

  const abrirAsignarDesdeLead = useCallback((item: PipelineComercialItem) => {
    if (item.cita_id) {
      setAsignarTarget({
        tipo: 'cita_personal',
        citaId: item.cita_id,
        miembroActualId: item.miembro_taller_id,
      });
    } else if (item.orden_id) {
      setAsignarTarget({
        tipo: 'orden',
        ordenId: item.orden_id,
        miembroActualId: item.miembro_taller_id,
      });
    } else if (item.oferta_id) {
      setAsignarTarget({
        tipo: 'oferta',
        ofertaId: item.oferta_id,
        miembroActualId: item.miembro_taller_id,
      });
    } else {
      return;
    }
    setLeadActivo(null);
    setAsignarVisible(true);
  }, []);

  const cerrarLeadCotizacion = useCallback(() => {
    if (!leadActivo?.cotizacion_id) return;
    const cotizacionId = leadActivo.cotizacion_id;
    showConfirm('Cerrar caso', 'El lead pasará a Perdidos. Podrás seguir viéndolo en ese filtro.', {
      confirmText: 'Cerrar caso',
      onConfirm: async () => {
        setAccionLoading(true);
        try {
          await cotizacionCanalService.marcarPerdida(cotizacionId);
          setLeadActivo(null);
          await refetch();
          showAlert('Caso cerrado', 'La cotización quedó en Perdidos.');
        } catch {
          showAlert('Error', 'No se pudo cerrar el caso.');
        } finally {
          setAccionLoading(false);
        }
      },
    });
  }, [leadActivo, refetch]);

  const marcarAceptadaLead = useCallback(async () => {
    if (!leadActivo?.cotizacion_id) return;
    setAccionLoading(true);
    try {
      await cotizacionCanalService.marcarAceptada(leadActivo.cotizacion_id);
      setLeadActivo(null);
      await refetch();
      showAlert('Cotización aceptada', 'El caso quedó marcado como aceptado.');
    } catch {
      showAlert('Error', 'Solo cotizaciones enviadas pueden marcarse como aceptadas.');
    } finally {
      setAccionLoading(false);
    }
  }, [leadActivo, refetch]);

  const renderItem = useCallback(
    ({ item }: { item: PipelineComercialItem }) => (
      <LeadCard item={item} onPress={handlePress} />
    ),
    [handlePress],
  );

  const leadPuedeCerrar =
    leadActivo?.tipo_entidad === 'cotizacion_canal'
    && !!leadActivo.cotizacion_id
    && !['aceptada', 'rechazada', 'cancelada'].includes(leadActivo.estado_raw);
  const leadPuedeAceptar =
    leadActivo?.tipo_entidad === 'cotizacion_canal'
    && leadActivo.estado_raw === 'enviada';
  const leadPuedeChat = !!leadActivo?.conversation_id;
  const leadPuedeAsignar = !!(
    leadActivo
    && (leadActivo.cita_id || leadActivo.orden_id || leadActivo.oferta_id)
  );

  const keyExtractor = useCallback(
    (item: PipelineComercialItem) => `${item.tipo_entidad}-${item.entidad_id}`,
    [],
  );

  const origenActivoLabel = useMemo(() => {
    if (origen === 'todos') return null;
    return ORIGEN_PIPELINE_LABELS[origen] || origen;
  }, [origen]);

  const refreshControl = useMemo(() => {
    if (compact) return undefined;
    if (listRefreshControl) return listRefreshControl;
    return (
      <RefreshControl
        refreshing={isFetching && !isPending}
        onRefresh={() => void refetch()}
        tintColor={I.primary}
        colors={[I.primary]}
      />
    );
  }, [compact, listRefreshControl, isFetching, isPending, refetch]);

  if (loading && items.length === 0) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator color={I.primary} />
      </View>
    );
  }

  if (
    compact
    && !loading
    && items.length === 0
    && vista === 'abiertos'
    && origen === 'todos'
    && !filtroEsperando24h
  ) {
    return null;
  }

  const listHeader = (
    <View style={styles.headerBlock}>
      {!hideTitle ? (
        <View style={styles.sectionHeader}>
          <View>
            <InstitutionalText role="h5">Bandeja</InstitutionalText>
            <InstitutionalText role="caption" color="muted">
              Solicitudes y cotizaciones del taller
            </InstitutionalText>
          </View>
          {compact ? (
            <TouchableOpacity
              style={styles.headerLink}
              onPress={() => router.push('/(tabs)/bandeja')}
              activeOpacity={0.75}
            >
              <InstitutionalText role="small" color="primary">
                Bandeja
              </InstitutionalText>
              <ChevronRight size={16} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}

      {filtroEsperando24h ? (
        <View style={styles.noticeRow}>
          <View style={styles.noticeCopy}>
            <InstitutionalText role="captionBold" color="ink">
              Sin respuesta +24h
            </InstitutionalText>
            <InstitutionalText role="caption" color="muted">
              Cotizaciones esperando al cliente
            </InstitutionalText>
          </View>
          <TouchableOpacity onPress={() => router.replace('/(tabs)/bandeja')} hitSlop={8}>
            <InstitutionalText role="captionBold" color="primary">
              Ver todas
            </InstitutionalText>
          </TouchableOpacity>
        </View>
      ) : null}

      {!compact && !filtroEsperando24h && esperando24h > 0 ? (
        <TouchableOpacity
          style={styles.noticeRow}
          onPress={() => router.push('/(tabs)/bandeja?filtro=esperando_24h')}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={`${esperando24h} cotizaciones sin respuesta hace más de 24 horas`}
        >
          <View style={styles.noticeCopy}>
            <InstitutionalText role="captionBold" color="ink">
              {esperando24h} sin respuesta +24h
            </InstitutionalText>
            <InstitutionalText role="caption" color="muted">
              Revisar cotizaciones pendientes
            </InstitutionalText>
          </View>
          <ChevronRight size={18} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
        </TouchableOpacity>
      ) : null}

      {!filtroEsperando24h ? (
        <View style={styles.filterBar}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.vistasTrack}
          >
            {VISTAS_BANDEJA.map((v) => {
              const active = vista === v.key;
              const badge = vistaBadgeCounts[v.key] ?? 0;
              return (
                <TouchableOpacity
                  key={v.key}
                  style={[styles.vistaTab, active && styles.vistaTabActive]}
                  onPress={() => setVista(v.key)}
                  activeOpacity={0.75}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                >
                  <Text style={[styles.vistaLabel, active && styles.vistaLabelActive]}>
                    {v.label}
                  </Text>
                  {badge > 0 ? (
                    <Text style={[styles.vistaCount, active && styles.vistaCountActive]}>
                      {badge}
                    </Text>
                  ) : null}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {!compact ? (
            <TouchableOpacity
              style={styles.origenTrigger}
              onPress={() => setOrigenSheetVisible(true)}
              activeOpacity={0.75}
              accessibilityRole="button"
              accessibilityLabel={
                origenActivoLabel
                  ? `Filtrar origen: ${origenActivoLabel}`
                  : 'Filtrar por origen'
              }
            >
              <SlidersHorizontal size={15} color={I.ink} strokeWidth={ICON_STROKE_WIDTH} />
              <Text style={styles.origenTriggerText} numberOfLines={1}>
                {origenActivoLabel ?? 'Origen'}
              </Text>
              <ChevronDown size={14} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}
    </View>
  );

  return (
    <View style={[styles.section, !compact && styles.sectionFill]}>
      {listHeader}
      <FlatList
        data={items}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        scrollEnabled={!compact}
        nestedScrollEnabled={compact}
        style={!compact ? styles.listFill : undefined}
        refreshControl={refreshControl}
        contentContainerStyle={[
          styles.listContentPad,
          items.length === 0 && styles.listContentEmpty,
        ]}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <InstitutionalText role="bodyBold">Nada aquí</InstitutionalText>
            <InstitutionalText role="caption" color="muted" style={styles.emptySub}>
              No hay elementos en esta vista.
            </InstitutionalText>
          </View>
        }
      />

      <AsignarTecnicoBottomSheet
        visible={asignarVisible}
        onClose={() => {
          setAsignarVisible(false);
          setAsignarTarget(null);
        }}
        target={asignarTarget}
        onAsignado={() => {
          void refetch();
          const citaId = asignarTarget?.tipo === 'cita_personal' ? asignarTarget.citaId : null;
          if (citaId && leadActivo?.horario_por_confirmar) {
            setLeadActivo(null);
            setAsignarVisible(false);
            setAsignarTarget(null);
            router.push(`/cita-agenda-personal/${citaId}`);
          }
        }}
      />

      <BottomSheet
        visible={Boolean(leadActivo)}
        onClose={() => setLeadActivo(null)}
        style={styles.leadSheet}
      >
        {leadActivo ? (
          <ScrollView
            style={styles.leadScroll}
            contentContainerStyle={styles.leadScrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <InstitutionalText role="h4" style={styles.sheetTitle}>
              {leadActivo.cliente_nombre}
            </InstitutionalText>
            <InstitutionalText role="caption" color="muted" style={styles.sheetSubtitle}>
              {(leadActivo.servicio_resumen || 'Caso comercial').slice(0, 120)}
              {' · '}
              {ORIGEN_PIPELINE_LABELS[leadActivo.origen] || leadActivo.origen}
              {leadActivo.vehiculo_resumen ? ` · ${leadActivo.vehiculo_resumen}` : ''}
            </InstitutionalText>

            {leadActivo.cotizacion_id ? (
              cotizacionDetalleLoading && !cotizacionDetalle ? (
                <View style={styles.cotizacionLoading}>
                  <ActivityIndicator color={I.ink} />
                  <InstitutionalText role="caption" color="muted">
                    Cargando cotización…
                  </InstitutionalText>
                </View>
              ) : cotizacionDetalle ? (
                <CotizacionIaEditor
                  cotizacion={cotizacionDetalle}
                  readonly
                  onChange={() => undefined}
                />
              ) : (
                <InstitutionalText role="caption" color="muted">
                  No se pudo cargar el resumen de la cotización.
                </InstitutionalText>
              )
            ) : null}

            <View style={styles.leadActions}>
              {leadPuedeChat ? (
                <InstitutionalButton
                  label="Ver conversación"
                  variant="secondary"
                  leading={<MessageCircle size={18} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />}
                  onPress={() => {
                    const id = leadActivo.conversation_id;
                    setLeadActivo(null);
                    if (id) router.push(`/chat-omnicanal?conversationId=${id}`);
                  }}
                />
              ) : null}
              {leadActivo.cita_id && leadActivo.horario_por_confirmar ? (
                <InstitutionalButton
                  label="Confirmar horario y agendar"
                  onPress={() => {
                    const id = leadActivo.cita_id;
                    setLeadActivo(null);
                    if (id) router.push(`/cita-agenda-personal/${id}`);
                  }}
                />
              ) : null}
              {leadActivo.solicitud_id || leadActivo.cita_id || leadActivo.orden_id ? (
                <InstitutionalButton
                  label="Ver detalle"
                  variant="secondary"
                  leading={<UserRound size={18} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />}
                  onPress={() => {
                    const item = leadActivo;
                    setLeadActivo(null);
                    navegarDetalleDirecto(item);
                  }}
                />
              ) : null}
              {leadPuedeAsignar ? (
                <InstitutionalButton
                  label={leadActivo.horario_por_confirmar ? 'Asignar y agendar' : 'Asignar técnico'}
                  variant="secondary"
                  onPress={() => abrirAsignarDesdeLead(leadActivo)}
                />
              ) : null}
              {leadPuedeAceptar ? (
                <InstitutionalButton
                  label="Marcar aceptada"
                  loading={accionLoading}
                  onPress={() => void marcarAceptadaLead()}
                />
              ) : null}
              {leadPuedeCerrar ? (
                <InstitutionalButton
                  label="Cerrar caso"
                  variant="destructiveOutline"
                  loading={accionLoading}
                  leading={<XCircle size={18} color={I.semanticDown} strokeWidth={ICON_STROKE_WIDTH} />}
                  onPress={cerrarLeadCotizacion}
                />
              ) : null}
              {(cotizacionDetalle?.share_url || cotizacionDetalle?.url_publica) ? (
                <InstitutionalButton
                  label="Ver link público"
                  variant="tertiary"
                  leading={<Link2 size={18} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />}
                  onPress={() => {
                    const url = cotizacionDetalle?.share_url || cotizacionDetalle?.url_publica;
                    if (url) showAlert('Link de cotización', url);
                  }}
                />
              ) : null}
            </View>
          </ScrollView>
        ) : null}
      </BottomSheet>

      <BottomSheet
        visible={origenSheetVisible}
        onClose={() => setOrigenSheetVisible(false)}
      >
        <InstitutionalText role="h4" style={styles.sheetTitle}>
          Origen
        </InstitutionalText>
        <InstitutionalText role="caption" color="muted" style={styles.sheetSubtitle}>
          Filtra solicitudes y cotizaciones por canal
        </InstitutionalText>
        <View style={styles.sheetList}>
          {ORIGENES.map((o) => {
            const active = origen === o.key;
            return (
              <TouchableOpacity
                key={o.key}
                style={[styles.sheetRow, active && styles.sheetRowActive]}
                onPress={() => {
                  setOrigen(o.key);
                  setOrigenSheetVisible(false);
                }}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <InstitutionalText role="body" color={active ? 'ink' : 'body'}>
                  {o.label}
                </InstitutionalText>
                {active ? (
                  <Check size={18} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
                ) : null}
              </TouchableOpacity>
            );
          })}
        </View>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: SPACING.fixed.sm },
  sectionFill: { flex: 1 },
  headerBlock: { gap: SPACING.fixed.sm, marginBottom: SPACING.fixed.sm },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: SPACING.fixed.sm,
  },
  headerLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingTop: 4,
  },
  noticeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.fixed.sm,
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: I.hairline,
    paddingHorizontal: SPACING.fixed.md,
    paddingVertical: SPACING.fixed.sm + 2,
  },
  noticeCopy: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  filterBar: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: SPACING.fixed.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: I.hairline,
  },
  vistasTrack: {
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingRight: SPACING.fixed.xs,
    minHeight: 44,
  },
  vistaTab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: SPACING.fixed.sm,
    paddingBottom: SPACING.fixed.sm,
    paddingTop: SPACING.fixed.xs,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    marginBottom: -StyleSheet.hairlineWidth,
  },
  vistaTabActive: {
    borderBottomColor: I.ink,
  },
  vistaLabel: {
    fontFamily: FF.sansMedium,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: I.muted,
  },
  vistaLabelActive: {
    fontFamily: FF.sansSemiBold,
    color: I.ink,
  },
  vistaCount: {
    fontFamily: FF.sansRegular,
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: I.mutedSoft,
  },
  vistaCountActive: {
    fontFamily: FF.sansMedium,
    color: I.muted,
  },
  origenTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 4,
    maxWidth: 118,
    paddingHorizontal: SPACING.fixed.sm,
    paddingVertical: SPACING.fixed.xs + 2,
    borderRadius: BORDERS.radius.sm,
    backgroundColor: I.surfaceSoft,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: I.hairline,
    marginBottom: SPACING.fixed.xs,
  },
  origenTriggerText: {
    flexShrink: 1,
    fontFamily: FF.sansMedium,
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: I.ink,
  },
  sheetTitle: {
    marginBottom: 4,
  },
  sheetSubtitle: {
    marginBottom: SPACING.fixed.md,
  },
  sheetList: {
    gap: SPACING.fixed.xxs,
    paddingBottom: SPACING.fixed.sm,
  },
  sheetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.fixed.md,
    paddingHorizontal: SPACING.fixed.sm,
    borderRadius: BORDERS.radius.md,
  },
  sheetRowActive: {
    backgroundColor: I.surfaceSoft,
  },
  leadSheet: {
    maxHeight: '94%',
  },
  leadScroll: {
    maxHeight: '100%',
  },
  leadScrollContent: {
    gap: SPACING.fixed.md,
    paddingBottom: SPACING.fixed.sm,
  },
  cotizacionLoading: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.fixed.sm,
    paddingVertical: SPACING.fixed.lg,
  },
  leadActions: {
    gap: SPACING.fixed.sm,
    paddingBottom: SPACING.fixed.sm,
  },
  listFill: { flex: 1 },
  listContentPad: {
    paddingBottom: SPACING.fixed['2xl'],
    gap: SPACING.fixed.sm,
  },
  listContentEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  leadCard: {
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: I.hairline,
    padding: SPACING.fixed.md,
    gap: SPACING.fixed.sm,
    ...SHADOWS.editorial,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: SPACING.fixed.xs,
  },
  cardTopSpacer: { flex: 1, minWidth: 8 },
  cardPrice: {
    fontFamily: FF.sansSemiBold,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: I.ink,
  },
  cardTitle: {
    fontFamily: FF.sansSemiBold,
    fontSize: T.h4.fontSize,
    color: I.ink,
    lineHeight: Math.round(T.h4.fontSize * 1.3),
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.sm,
    paddingTop: SPACING.fixed.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: I.hairline,
  },
  avatarSoft: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: I.surfaceStrong,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: I.hairline,
  },
  avatarSoftText: {
    fontFamily: FF.sansSemiBold,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: I.ink,
  },
  cardMetaTextCol: { flex: 1, minWidth: 0, gap: 2 },
  cardClient: {
    fontFamily: FF.sansSemiBold,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: I.ink,
  },
  cardVehicle: {
    fontFamily: FF.sansRegular,
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: I.muted,
  },
  cardTime: {
    fontFamily: FF.sansRegular,
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: I.muted,
  },
  emptyWrap: {
    paddingVertical: SPACING.fixed['2xl'],
    paddingHorizontal: SPACING.fixed.lg,
    alignItems: 'center',
    gap: SPACING.fixed.xxs,
  },
  emptySub: { textAlign: 'center' },
  loadingWrap: { paddingVertical: SPACING.fixed.lg, alignItems: 'center' },
});

export default PipelineSeguimientoSection;
