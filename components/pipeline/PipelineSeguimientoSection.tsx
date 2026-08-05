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
  Inbox,
  Instagram,
  Link2,
  MessageCircle,
  MessagesSquare,
  SlidersHorizontal,
  UserRound,
  XCircle,
} from 'lucide-react-native';
import {
  type PipelineComercialItem,
  type EstadoPipelineNormalizado,
  type OrigenPipeline,
  type LeadCategoria,
  ESTADO_PIPELINE_LABELS,
  ORIGEN_PIPELINE_LABELS,
  LEAD_CATEGORIA_LABELS,
  LEAD_CATEGORIA_VARIANT,
} from '@/services/pipelineComercialService';
import { usePipelineComercialQuery } from '@/hooks/usePipelineComercialQuery';
import cotizacionCanalService, { type CotizacionCanal } from '@/services/cotizacionCanalService';
import { CotizacionIaEditor } from '@/components/chats/CotizacionIaEditor';
import { BottomSheet } from '@/app/design-system/components/BottomSheet';
import { InstitutionalText } from '@/app/design-system/components/InstitutionalText';
import { InstitutionalTag } from '@/app/design-system/components/InstitutionalTag';
import { InstitutionalButton } from '@/app/design-system/components/InstitutionalButton';
import {
  HostSectionKicker,
  HOST_GUTTER,
  hostScreenStyles,
} from '@/app/design-system/components';
import { hostIconPlateStyle } from '@/app/design-system/styles/institutionalSemantic';
import { AsignarTecnicoBottomSheet, type AsignarTecnicoTarget } from '@/components/equipo/AsignarTecnicoBottomSheet';
import { ConfirmarHorarioCitaSheet } from '@/components/agenda/ConfirmarHorarioCitaSheet';
import {
  ESTADO_OPERATIVO_LABELS,
  ESTADO_OPERATIVO_VARIANT,
  mapPipelineEstadoToOperativo,
} from '@/utils/estadoOperativo';
import { COLORS, SPACING, BORDERS, TYPOGRAPHY, SHADOWS } from '@/app/design-system/tokens';
import { formatearMontoCLP } from '@/utils/formatearMontoCLP';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import { showAlert, showConfirm } from '@/utils/platformAlert';
import {
  agendaProveedorService,
  type CitaAgendaPersonal,
} from '@/services/agendaProveedorService';

const I = COLORS.institutional;
const T = TYPOGRAPHY.styles;
const FF = TYPOGRAPHY.fontFamily;

/**
 * Filtros de bandeja estilo Airbnb Hosts:
 * tabs tipográficos con underline (sin pills brand) + origen en bottom sheet.
 */
/**
 * Filtros reales del embudo (sin redundancias):
 * - Abiertos = nuevo + enviada + negociación (+ ejecución)
 * - Esperando / Negociando / Agendados / Perdidos = estados normalizados 1:1
 * Se eliminó "Nuevos": era subconjunto de Abiertos y confundía el flujo.
 */
const VISTAS_BANDEJA: Array<{
  key: EstadoPipelineNormalizado | 'abiertos';
  label: string;
}> = [
  { key: 'abiertos', label: 'Abiertos' },
  { key: 'cotizacion_enviada', label: 'Esperando' },
  { key: 'en_negociacion', label: 'Negociando' },
  { key: 'aceptado_agendado', label: 'Agendados' },
  { key: 'rechazado_perdido', label: 'Perdidos' },
];

const ESTADOS_ABIERTOS: EstadoPipelineNormalizado[] = [
  'nuevo',
  'cotizacion_enviada',
  'en_negociacion',
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

const ORIGEN_TAG_VARIANT: Partial<Record<string, 'primary' | 'info' | 'neutral' | 'warning'>> = {
  whatsapp: 'primary',
  instagram: 'info',
  messenger: 'info',
  directo: 'neutral',
  manual: 'neutral',
  app: 'neutral',
};

function OrigenIcon({ origen }: { origen: string }) {
  const props = { size: 18, color: I.ink, strokeWidth: ICON_STROKE_WIDTH } as const;
  switch (origen) {
    case 'whatsapp':
      return <MessageCircle {...props} />;
    case 'instagram':
      return <Instagram {...props} />;
    case 'messenger':
      return <MessagesSquare {...props} />;
    case 'directo':
      return <Link2 {...props} />;
    default:
      return <Inbox {...props} />;
  }
}

/**
 * Fila Host dentro de un único paper de lista.
 * Alertas (+24h / visto) viven en la fila — no en cards de aviso separadas.
 */
const LeadCard = React.memo(function LeadCard({
  item,
  onPress,
  last,
}: {
  item: PipelineComercialItem;
  onPress: (item: PipelineComercialItem) => void;
  last?: boolean;
}) {
  const handlePress = useCallback(() => onPress(item), [onPress, item]);
  const monto = item.monto_clp != null ? formatearMontoCLP(item.monto_clp) : null;
  const servicio =
    item.servicio_resumen?.trim()
    || ESTADO_PIPELINE_LABELS[item.estado_normalizado];
  const origenLabel = ORIGEN_PIPELINE_LABELS[item.origen] || item.origen;
  const origenVariant = ORIGEN_TAG_VARIANT[item.origen] || 'neutral';
  const tiempo = tiempoRelativo(item.fecha_referencia);
  const estadoOperativo = mapPipelineEstadoToOperativo(item.estado_normalizado, {
    horarioPorConfirmar: item.horario_por_confirmar,
  });
  const vehiculo = item.vehiculo_resumen?.trim();
  const leadCat = (item.lead_categoria || 'sin_calificar') as LeadCategoria;
  const showLeadTag = leadCat !== 'sin_calificar';

  return (
    <TouchableOpacity
      style={[styles.leadRow, !last && styles.leadRowBorder]}
      onPress={handlePress}
      activeOpacity={0.7}
      accessibilityRole="button"
    >
      <View style={hostIconPlateStyle}>
        <OrigenIcon origen={item.origen} />
      </View>

      <View style={styles.leadBody}>
        <View style={styles.leadLine1}>
          <Text style={styles.leadServicio} numberOfLines={2}>
            {servicio}
          </Text>
          <View style={styles.leadPriceChevron}>
            {monto ? <Text style={styles.leadPrice}>{monto}</Text> : null}
            <ChevronRight size={18} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
          </View>
        </View>

        <View style={styles.leadTags}>
          <InstitutionalTag label={origenLabel} variant={origenVariant} size="sm" uppercase />
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
          {item.template_generado_por_ia ? (
            <InstitutionalTag label="Checklist IA" variant="info" size="sm" />
          ) : null}
          {item.es_cotizacion_adicional ? (
            <InstitutionalTag label="Adicional" variant="info" size="sm" />
          ) : null}
          {showLeadTag ? (
            <InstitutionalTag
              label={LEAD_CATEGORIA_LABELS[leadCat] || leadCat}
              variant={LEAD_CATEGORIA_VARIANT[leadCat] || 'neutral'}
              size="sm"
            />
          ) : null}
          {tiempo ? <Text style={styles.leadTime}>{tiempo}</Text> : null}
        </View>

        <Text style={styles.leadMeta} numberOfLines={1}>
          {item.cliente_nombre || 'Cliente'}
          {vehiculo ? ` · ${vehiculo}` : ''}
        </Text>
      </View>
    </TouchableOpacity>
  );
});

interface Props {
  compact?: boolean;
  limite?: number;
  filtroEsperando24h?: boolean;
  filtroOrigen?: OrigenPipeline;
  filtroEstadoInicial?: EstadoPipelineNormalizado;
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
  filtroEstadoInicial,
  refreshKey = 0,
  hideTitle = false,
  listRefreshControl,
}: Props) {
  const [vista, setVista] = useState<EstadoPipelineNormalizado | 'abiertos'>('abiertos');
  const [origen, setOrigen] = useState<OrigenPipeline | 'todos'>(filtroOrigen ?? 'todos');
  const [origenSheetVisible, setOrigenSheetVisible] = useState(false);
  const [asignarTarget, setAsignarTarget] = useState<AsignarTecnicoTarget | null>(null);
  const [asignarVisible, setAsignarVisible] = useState(false);
  /** Tras elegir técnico, abrir calendario de esa cita (flujo unificado). */
  const [agendarTrasAsignar, setAgendarTrasAsignar] = useState(false);
  const [citaParaHorario, setCitaParaHorario] = useState<CitaAgendaPersonal | null>(null);
  const [miembroParaHorario, setMiembroParaHorario] = useState<number | null>(null);
  const [confirmarHorarioVisible, setConfirmarHorarioVisible] = useState(false);
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

  useEffect(() => {
    if (filtroEstadoInicial) setVista(filtroEstadoInicial);
  }, [filtroEstadoInicial]);

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

  const abrirAsignarDesdeLead = useCallback((item: PipelineComercialItem, opts?: { luegoAgendar?: boolean }) => {
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
    setAgendarTrasAsignar(Boolean(opts?.luegoAgendar));
    setLeadActivo(null);
    setAsignarVisible(true);
  }, []);

  const abrirCalendarioCita = useCallback(async (citaId: number, miembroId: number | null) => {
    setAccionLoading(true);
    try {
      const res = await agendaProveedorService.obtenerCita(citaId);
      if (!res.success || !res.data) {
        showAlert('Error', res.message || 'No se pudo cargar la cita para agendar.');
        return;
      }
      setCitaParaHorario(res.data);
      setMiembroParaHorario(miembroId);
      setConfirmarHorarioVisible(true);
    } finally {
      setAccionLoading(false);
    }
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
    ({ item, index }: { item: PipelineComercialItem; index: number }) => {
      const last = index === items.length - 1;
      return (
        <View
          style={[
            styles.paperListItem,
            index === 0 && styles.paperListFirst,
            last && styles.paperListLast,
          ]}
        >
          <LeadCard item={item} onPress={handlePress} last={last} />
        </View>
      );
    },
    [handlePress, items.length],
  );

  const leadPuedeCerrar =
    leadActivo?.tipo_entidad === 'cotizacion_canal'
    && !!leadActivo.cotizacion_id
    && leadActivo.estado_raw !== 'borrador'
    && !['aceptada', 'rechazada', 'cancelada'].includes(leadActivo.estado_raw);
  const leadPuedeAceptar =
    leadActivo?.tipo_entidad === 'cotizacion_canal'
    && leadActivo.estado_raw === 'enviada';
  const leadPuedeChat = !!leadActivo?.conversation_id;
  const leadHorarioPendiente = !!(leadActivo?.cita_id && leadActivo.horario_por_confirmar);
  /** Con horario pendiente, asignar va dentro de «Confirmar horario» (técnico → calendario). */
  const leadPuedeAsignar = !!(
    leadActivo
    && !leadHorarioPendiente
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
          <View style={styles.titleBlock}>
            <HostSectionKicker label="Bandeja" />
            <InstitutionalText role="caption" color="muted">
              Enviadas y por agendar aquí · citas confirmadas en Agenda
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
        <View style={styles.filterHint}>
          <HostSectionKicker label="Sin respuesta +24h" />
          <TouchableOpacity onPress={() => router.replace('/(tabs)/bandeja')} hitSlop={8}>
            <InstitutionalText role="captionBold" color="primary">
              Ver todas
            </InstitutionalText>
          </TouchableOpacity>
        </View>
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
              const alertBadge =
                v.key === 'cotizacion_enviada' && esperando24h > 0 ? esperando24h : 0;
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
                  {alertBadge > 0 ? (
                    <Text style={styles.vistaCountAlert}>+{alertBadge}</Text>
                  ) : badge > 0 ? (
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
      <View style={!compact ? hostScreenStyles.gutterX : undefined}>
        {listHeader}
      </View>
      <FlatList
        data={items}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        scrollEnabled={!compact}
        nestedScrollEnabled={compact}
        style={!compact ? hostScreenStyles.scroll : undefined}
        refreshControl={refreshControl}
        contentContainerStyle={[
          styles.listContentPad,
          !compact && { paddingHorizontal: HOST_GUTTER },
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
        continuarACalendario={agendarTrasAsignar}
        onClose={() => {
          setAsignarVisible(false);
          setAsignarTarget(null);
          setAgendarTrasAsignar(false);
        }}
        target={asignarTarget}
        onAsignado={(miembroId) => {
          void refetch();
          const citaId = asignarTarget?.tipo === 'cita_personal' ? asignarTarget.citaId : null;
          const seguirAgendando = agendarTrasAsignar && citaId != null;
          setAsignarVisible(false);
          setAsignarTarget(null);
          setAgendarTrasAsignar(false);
          if (seguirAgendando && citaId != null) {
            void abrirCalendarioCita(citaId, miembroId);
          }
        }}
      />

      <ConfirmarHorarioCitaSheet
        visible={confirmarHorarioVisible}
        onClose={() => {
          setConfirmarHorarioVisible(false);
          setCitaParaHorario(null);
          setMiembroParaHorario(null);
        }}
        cita={citaParaHorario}
        miembroTallerId={miembroParaHorario}
        onConfirmado={() => {
          setConfirmarHorarioVisible(false);
          setCitaParaHorario(null);
          setMiembroParaHorario(null);
          void refetch();
          showAlert('Cita agendada', 'Día y hora confirmados. Ya puedes iniciar el servicio desde el detalle.');
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
            <View style={styles.sheetHeaderRow}>
              <View style={styles.sheetHeaderCopy}>
                <InstitutionalText role="h4" style={styles.sheetTitle} numberOfLines={2}>
                  {(
                    cotizacionDetalle?.servicio_nombre
                    || leadActivo.servicio_resumen
                    || 'Caso comercial'
                  ).slice(0, 120)}
                </InstitutionalText>
                <InstitutionalText role="caption" color="muted" style={styles.sheetSubtitle}>
                  {ORIGEN_PIPELINE_LABELS[leadActivo.origen] || leadActivo.origen}
                </InstitutionalText>
              </View>
              {(cotizacionDetalle?.share_url || cotizacionDetalle?.url_publica) ? (
                <TouchableOpacity
                  style={styles.sheetLinkBtn}
                  onPress={() => {
                    const url = cotizacionDetalle?.share_url || cotizacionDetalle?.url_publica;
                    if (url) showAlert('Link de cotización', url);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Ver link público"
                  hitSlop={8}
                >
                  <Link2 size={18} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
                  <InstitutionalText role="captionBold" color="primary">
                    Link
                  </InstitutionalText>
                </TouchableOpacity>
              ) : null}
            </View>

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
                  compactHeader
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
                  variant="outline"
                  leading={<MessageCircle size={18} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />}
                  onPress={() => {
                    const id = leadActivo.conversation_id;
                    setLeadActivo(null);
                    if (id) router.push(`/chat-omnicanal?conversationId=${id}`);
                  }}
                />
              ) : null}
              {leadHorarioPendiente ? (
                <InstitutionalButton
                  label="Confirmar horario"
                  variant="primary"
                  loading={accionLoading}
                  onPress={() => abrirAsignarDesdeLead(leadActivo, { luegoAgendar: true })}
                />
              ) : null}
              {leadActivo.solicitud_id || leadActivo.cita_id || leadActivo.orden_id ? (
                <InstitutionalButton
                  label="Ver detalle"
                  variant="outline"
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
                  label="Asignar técnico"
                  variant="secondary"
                  onPress={() => abrirAsignarDesdeLead(leadActivo)}
                />
              ) : null}
              {leadPuedeAceptar ? (
                <InstitutionalButton
                  label="Marcar aceptada"
                  variant="success"
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
  titleBlock: { flex: 1, minWidth: 0 },
  headerLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingTop: SPACING.fixed.md,
  },
  filterHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.fixed.sm,
    marginBottom: SPACING.fixed.xs,
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
  vistaCountAlert: {
    fontFamily: FF.sansSemiBold,
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: I.accentYellow,
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
  sheetHeaderRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.fixed.sm,
    marginBottom: SPACING.fixed.sm,
  },
  sheetHeaderCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  sheetTitle: {
    marginBottom: 0,
  },
  sheetSubtitle: {
    marginBottom: 0,
  },
  sheetLinkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
    paddingTop: 2,
    paddingHorizontal: SPACING.fixed.sm,
    paddingVertical: SPACING.fixed.xs,
    borderRadius: BORDERS.radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: I.hairline,
    backgroundColor: I.surfaceSoft,
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
  listContentPad: {
    paddingBottom: SPACING.fixed['2xl'],
    gap: 0,
  },
  listContentEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  /** Un solo paper Host para la lista (no una card por lead). */
  paperListItem: {
    backgroundColor: COLORS.background.paper,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderColor: I.hairline,
    paddingHorizontal: SPACING.fixed.md,
  },
  paperListFirst: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopLeftRadius: BORDERS.radius.lg,
    borderTopRightRadius: BORDERS.radius.lg,
    overflow: 'hidden',
  },
  paperListLast: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomLeftRadius: BORDERS.radius.lg,
    borderBottomRightRadius: BORDERS.radius.lg,
    overflow: 'hidden',
    marginBottom: SPACING.fixed.sm,
    ...SHADOWS.editorial,
  },
  leadRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.fixed.sm,
    paddingVertical: 14,
    backgroundColor: 'transparent',
  },
  leadRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: I.hairline,
  },
  leadBody: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  leadLine1: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.fixed.sm,
  },
  leadServicio: {
    flex: 1,
    minWidth: 0,
    fontFamily: FF.sansSemiBold,
    fontSize: T.h4.fontSize,
    color: I.ink,
    lineHeight: Math.round(T.h4.fontSize * 1.25),
  },
  leadPriceChevron: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    flexShrink: 0,
    paddingTop: 2,
  },
  leadPrice: {
    fontFamily: FF.sansSemiBold,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: I.ink,
  },
  leadTags: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: SPACING.fixed.xs,
  },
  leadTime: {
    marginLeft: 'auto',
    fontFamily: FF.sansRegular,
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: I.muted,
  },
  leadMeta: {
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
