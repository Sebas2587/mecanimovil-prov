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
  TextInput,
  type RefreshControlProps,
} from 'react-native';
import { router } from 'expo-router';
import {
  Check,
  ChevronDown,
  ChevronRight,
  FileText,
  Inbox,
  Instagram,
  Link2,
  MessageCircle,
  MessagesSquare,
  SlidersHorizontal,
} from 'lucide-react-native';
import {
  LEAD_CATEGORIA_VARIANT,
  ESTADO_PIPELINE_LABELS,
  ORIGEN_PIPELINE_LABELS,
  type PipelineComercialItem,
  type EstadoPipelineNormalizado,
  type OrigenPipeline,
} from '@/services/pipelineComercialService';
import {
  leadCategoriaLabel,
  leadCategoriaOf,
  leadMetaHint,
  leadOperativoTag,
  leadSheetHint,
  shouldShowLeadCategoria,
} from '@/utils/leadBandejaPresentation';
import { usePipelineComercialQuery } from '@/hooks/usePipelineComercialQuery';
import cotizacionCanalService, { type CotizacionCanal } from '@/services/cotizacionCanalService';
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
import { institutionalInputPlaceholder, institutionalInputStyles } from '@/app/design-system/styles/institutionalInputs';
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
import { omnichannelChatHref } from '@/utils/chatRoutes';
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
 * - Abiertos = nuevo + enviada + negociación (+ ejecución, incluye por agendar)
 * - Por agendar = aceptado sin día/hora (`horario_por_confirmar`)
 * - Negociando = negociación real (excluye por agendar)
 * - Esperando / Agendados / Perdidos = estados normalizados 1:1
 */
type VistaBandeja = EstadoPipelineNormalizado | 'abiertos' | 'por_agendar';

const VISTAS_BANDEJA: Array<{
  key: VistaBandeja;
  label: string;
}> = [
  { key: 'abiertos', label: 'Abiertos' },
  { key: 'cotizacion_enviada', label: 'Esperando' },
  { key: 'en_negociacion', label: 'Negociando' },
  { key: 'por_agendar', label: 'Por agendar' },
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

function OrigenIcon({ origen, tipo }: { origen: string; tipo?: string }) {
  const props = { size: 18, color: I.ink, strokeWidth: ICON_STROKE_WIDTH } as const;
  if (tipo === 'cotizacion_canal') {
    return origen === 'directo' ? <Link2 {...props} /> : <FileText {...props} />;
  }
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
  const esCotizacion = item.tipo_entidad === 'cotizacion_canal';
  const folio = item.numero_publico?.trim();
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
  const leadCat = leadCategoriaOf(item);
  const showLeadTag = shouldShowLeadCategoria(item);
  const operativoTag = leadOperativoTag(
    item,
    ESTADO_OPERATIVO_LABELS[estadoOperativo],
    ESTADO_OPERATIVO_VARIANT[estadoOperativo],
  );
  const metaHint = leadMetaHint(item);
  const titulo = esCotizacion
    ? (item.cliente_nombre || 'Cliente')
    : servicio;

  return (
    <TouchableOpacity
      style={[styles.leadRow, !last && styles.leadRowBorder]}
      onPress={handlePress}
      activeOpacity={0.7}
      accessibilityRole="button"
    >
      <View style={hostIconPlateStyle}>
        <OrigenIcon origen={item.origen} tipo={item.tipo_entidad} />
      </View>

      <View style={styles.leadBody}>
        <View style={styles.leadLine1}>
          <Text style={styles.leadServicio} numberOfLines={2}>
            {titulo}
          </Text>
          <View style={styles.leadPriceChevron}>
            {monto ? <Text style={styles.leadPrice}>{monto}</Text> : null}
            <ChevronRight size={18} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
          </View>
        </View>

        {(folio || vehiculo) && esCotizacion ? (
          <View style={styles.leadTags}>
            {folio ? (
              <InstitutionalTag label={folio} variant="neutral" size="sm" />
            ) : null}
            {vehiculo ? (
              <InstitutionalTag label={vehiculo} variant="neutral" size="sm" />
            ) : null}
          </View>
        ) : null}

        <View style={styles.leadTags}>
          <InstitutionalTag label={origenLabel} variant={origenVariant} size="sm" uppercase />
          <InstitutionalTag
            label={operativoTag.label}
            variant={operativoTag.variant}
            size="sm"
          />
          {item.template_generado_por_ia ? (
            <InstitutionalTag label="Checklist IA" variant="info" size="sm" />
          ) : null}
          {item.es_cotizacion_adicional ? (
            <InstitutionalTag label="Adicional" variant="info" size="sm" />
          ) : null}
          {showLeadTag ? (
            <InstitutionalTag
              label={leadCategoriaLabel(item)}
              variant={LEAD_CATEGORIA_VARIANT[leadCat] || 'neutral'}
              size="sm"
            />
          ) : null}
          {tiempo ? <Text style={styles.leadTime}>{tiempo}</Text> : null}
        </View>

        <Text style={styles.leadMeta} numberOfLines={1}>
          {esCotizacion
            ? [servicio, metaHint].filter(Boolean).join(' · ')
            : [
                item.cliente_nombre || 'Cliente',
                vehiculo,
                metaHint,
              ].filter(Boolean).join(' · ')}
        </Text>
      </View>
    </TouchableOpacity>
  );
});

type LeadQuietAction = {
  id: string;
  label: string;
  destructive?: boolean;
  onPress: () => void;
};

const LeadQuietRow = React.memo(function LeadQuietRow({
  action,
  last,
}: {
  action: LeadQuietAction;
  last: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.quietRow, !last && styles.quietRowBorder]}
      onPress={action.onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
    >
      <InstitutionalText
        role="body"
        color={action.destructive ? 'semanticDown' : 'ink'}
      >
        {action.label}
      </InstitutionalText>
      {action.destructive ? null : (
        <ChevronRight size={16} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
      )}
    </TouchableOpacity>
  );
});

interface Props {
  compact?: boolean;
  limite?: number;
  filtroEsperando24h?: boolean;
  filtroPorAgendar?: boolean;
  filtroOrigen?: OrigenPipeline;
  filtroEstadoInicial?: EstadoPipelineNormalizado;
  /** Busqueda inicial (deep link `?q=MM-000098`). */
  busquedaInicial?: string;
  /** @deprecated Usar invalidación TanStack Query; se mantiene por compatibilidad. */
  refreshKey?: number;
  hideTitle?: boolean;
  listRefreshControl?: ReactElement<RefreshControlProps>;
}

export function PipelineSeguimientoSection({
  compact = false,
  limite = compact ? 5 : 50,
  filtroEsperando24h = false,
  filtroPorAgendar = false,
  filtroOrigen,
  filtroEstadoInicial,
  busquedaInicial = '',
  refreshKey = 0,
  hideTitle = false,
  listRefreshControl,
}: Props) {
  const [vista, setVista] = useState<VistaBandeja>('abiertos');
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
  const [busqueda, setBusqueda] = useState(busquedaInicial);
  const [qDebounced, setQDebounced] = useState(busquedaInicial.trim());
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
    if (filtroPorAgendar) setVista('por_agendar');
  }, [filtroPorAgendar]);

  useEffect(() => {
    if (filtroEstadoInicial) setVista(filtroEstadoInicial);
  }, [filtroEstadoInicial]);

  useEffect(() => {
    const next = busquedaInicial.trim();
    setBusqueda(next);
    setQDebounced(next);
  }, [busquedaInicial]);

  useEffect(() => {
    const handle = setTimeout(() => setQDebounced(busqueda.trim()), 300);
    return () => clearTimeout(handle);
  }, [busqueda]);

  const queryParams = useMemo(
    () => ({
      limite,
      origen: origen === 'todos' ? undefined : origen,
      esperando_24h: filtroEsperando24h || undefined,
      estado_normalizado: filtroEsperando24h ? ('cotizacion_enviada' as EstadoPipelineNormalizado) : undefined,
      fetchAllEstados: !filtroEsperando24h,
      q: qDebounced || undefined,
    }),
    [limite, origen, filtroEsperando24h, qDebounced],
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
    if (vista === 'por_agendar') {
      return rawResults.filter((row) => row.horario_por_confirmar);
    }
    if (vista === 'abiertos') {
      return rawResults.filter((row) => ESTADOS_ABIERTOS.includes(row.estado_normalizado));
    }
    if (vista === 'en_negociacion') {
      return rawResults.filter(
        (row) => row.estado_normalizado === 'en_negociacion' && !row.horario_por_confirmar,
      );
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
      if (row.horario_por_confirmar) {
        counts.por_agendar += 1;
        continue;
      }
      if (row.estado_normalizado in counts) {
        counts[row.estado_normalizado] += 1;
      }
    }
    return counts;
  }, [rawResults]);

  const esperando24h = data?.esperando_respuesta_24h_count ?? 0;
  const loading = isPending && rawResults.length === 0;

  const handlePress = useCallback((item: PipelineComercialItem) => {
    if (item.horario_por_confirmar && item.cita_id) {
      setLeadActivo(item);
      return;
    }
    if (item.tipo_entidad === 'cotizacion_canal' && item.cotizacion_id) {
      router.push(`/cotizacion-canal/${item.cotizacion_id}`);
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
  const leadSheetHintText = leadActivo ? leadSheetHint(leadActivo) : null;
  /** Con horario pendiente, asignar va dentro de «Confirmar horario» (técnico → calendario). */
  const leadPuedeAsignar = !!(
    leadActivo
    && !leadHorarioPendiente
    && (leadActivo.cita_id || leadActivo.orden_id || leadActivo.oferta_id)
  );

  const irLeadConversacion = useCallback(() => {
    const id = leadActivo?.conversation_id;
    setLeadActivo(null);
    if (id) router.push(omnichannelChatHref(id));
  }, [leadActivo?.conversation_id]);

  const irLeadCotizacion = useCallback(() => {
    const cotId = leadActivo?.cotizacion_id;
    setLeadActivo(null);
    if (cotId) router.push(`/cotizacion-canal/${cotId}`);
  }, [leadActivo?.cotizacion_id]);

  const irLeadDetalle = useCallback(() => {
    const item = leadActivo;
    setLeadActivo(null);
    if (item) navegarDetalleDirecto(item);
  }, [leadActivo]);

  const irLeadCitaPrincipal = useCallback(() => {
    const citaId = leadActivo?.cita_id;
    setLeadActivo(null);
    if (citaId) router.push(`/cita-agenda-personal/${citaId}`);
  }, [leadActivo?.cita_id]);

  const leadSheetModel = useMemo(() => {
    if (!leadActivo) return null;

    let primary: {
      id: string;
      label: string;
      onPress: () => void;
      loading?: boolean;
    } | null = null;

    if (leadHorarioPendiente) {
      primary = {
        id: 'horario',
        label: 'Confirmar horario',
        loading: accionLoading,
        onPress: () => abrirAsignarDesdeLead(leadActivo, { luegoAgendar: true }),
      };
    } else if (leadActivo.tipo_entidad === 'cotizacion_canal' && leadActivo.cotizacion_id) {
      primary = {
        id: 'cotizacion',
        label: leadActivo.numero_publico
          ? `Abrir cotización ${leadActivo.numero_publico}`
          : 'Abrir cotización',
        onPress: irLeadCotizacion,
      };
    } else if (leadPuedeChat) {
      primary = {
        id: 'chat',
        label: 'Ver conversación',
        onPress: irLeadConversacion,
      };
    } else {
      primary = {
        id: 'detalle',
        label: 'Ver detalle',
        onPress: irLeadDetalle,
      };
    }

    const quiet: LeadQuietAction[] = [];
    if (leadPuedeChat && primary.id !== 'chat') {
      quiet.push({ id: 'chat', label: 'Ver conversación', onPress: irLeadConversacion });
    }
    if (leadActivo.cotizacion_id && primary.id !== 'cotizacion') {
      quiet.push({ id: 'cotizacion', label: 'Ver cotización', onPress: irLeadCotizacion });
    }
    if (leadActivo.es_cotizacion_adicional && leadActivo.cita_id) {
      quiet.push({
        id: 'principal',
        label: 'Ver servicio principal',
        onPress: irLeadCitaPrincipal,
      });
    }
    const mostrarDetalle =
      !leadHorarioPendiente
      && primary.id !== 'detalle'
      && !leadActivo.cotizacion_id
      && !!(leadActivo.solicitud_id || leadActivo.cita_id || leadActivo.orden_id);
    if (mostrarDetalle) {
      quiet.push({ id: 'detalle', label: 'Ver detalle', onPress: irLeadDetalle });
    }
    if (leadPuedeAsignar) {
      quiet.push({
        id: 'asignar',
        label: 'Asignar técnico',
        onPress: () => abrirAsignarDesdeLead(leadActivo),
      });
    }
    if (leadPuedeAceptar) {
      quiet.push({
        id: 'aceptar',
        label: 'Marcar aceptada',
        onPress: () => void marcarAceptadaLead(),
      });
    }
    if (leadPuedeCerrar) {
      quiet.push({
        id: 'cerrar',
        label: 'Cerrar caso',
        destructive: true,
        onPress: cerrarLeadCotizacion,
      });
    }

    return { primary, quiet };
  }, [
    leadActivo,
    leadHorarioPendiente,
    leadPuedeChat,
    leadPuedeAsignar,
    leadPuedeAceptar,
    leadPuedeCerrar,
    accionLoading,
    abrirAsignarDesdeLead,
    irLeadConversacion,
    irLeadCotizacion,
    irLeadDetalle,
    irLeadCitaPrincipal,
    marcarAceptadaLead,
    cerrarLeadCotizacion,
  ]);

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
              Cada cotización es un caso con folio MM. Ábrela para editarla; el chat es secundario.
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
          <View style={styles.filterHintCopy}>
            <HostSectionKicker label="Sin respuesta +24h" />
            <InstitutionalText role="caption" color="muted">
              Abre la cotización (folio MM) o cierra el caso. Si aceptó por teléfono, márcala aceptada.
            </InstitutionalText>
          </View>
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

      {hideTitle && !filtroEsperando24h && vista === 'por_agendar' ? (
        <View style={styles.filterHint}>
          <InstitutionalText role="caption" color="muted">
            El cliente aceptó. Falta horario. Las visitas confirmadas están en Agenda y Servicios.
          </InstitutionalText>
        </View>
      ) : null}

      {!compact ? (
        <View style={styles.searchWrap}>
          <TextInput
            style={institutionalInputStyles.input}
            value={busqueda}
            onChangeText={setBusqueda}
            placeholder="MM-000098, cliente o patente"
            placeholderTextColor={institutionalInputPlaceholder}
            autoCapitalize="characters"
            autoCorrect={false}
            clearButtonMode="while-editing"
            returnKeyType="search"
          />
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
              {vista === 'por_agendar'
                ? 'No hay cotizaciones aceptadas esperando horario.'
                : filtroEsperando24h
                  ? 'No hay cotizaciones sin respuesta. Cuando un cliente no contesta, aparece aquí para abrir el folio o cerrar el caso.'
                  : vista === 'cotizacion_enviada'
                    ? 'No hay cotizaciones esperando respuesta. Busca por folio MM si no la ves en Abiertos.'
                    : qDebounced
                      ? `Sin resultados para «${qDebounced}».`
                    : 'No hay elementos en esta vista.'}
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
      >
        {leadActivo && leadSheetModel ? (
          <View style={styles.leadSheetBody}>
            <View style={styles.sheetHeaderRow}>
              <View style={styles.sheetHeaderCopy}>
                <InstitutionalText role="h4" style={styles.sheetTitle} numberOfLines={2}>
                  {(
                    cotizacionDetalle?.servicio_nombre
                    || leadActivo.servicio_resumen
                    || 'Caso comercial'
                  ).slice(0, 120)}
                </InstitutionalText>
                <InstitutionalText role="caption" color="muted" numberOfLines={1}>
                  {ORIGEN_PIPELINE_LABELS[leadActivo.origen] || leadActivo.origen}
                  {leadActivo.cliente_nombre ? ` · ${leadActivo.cliente_nombre}` : ''}
                </InstitutionalText>
                {leadSheetHintText ? (
                  <InstitutionalText role="caption" color="body" numberOfLines={2}>
                    {leadSheetHintText}
                  </InstitutionalText>
                ) : null}
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
                </TouchableOpacity>
              ) : null}
            </View>

            <InstitutionalButton
              label={leadSheetModel.primary.label}
              variant="primary"
              size="compact"
              loading={leadSheetModel.primary.loading}
              leading={
                leadSheetModel.primary.id === 'chat' ? (
                  <MessageCircle
                    size={18}
                    color={I.onPrimary}
                    strokeWidth={ICON_STROKE_WIDTH}
                  />
                ) : undefined
              }
              onPress={leadSheetModel.primary.onPress}
            />

            {leadSheetModel.quiet.length > 0 ? (
              <View style={styles.quietList}>
                {leadSheetModel.quiet.map((action, index) => (
                  <LeadQuietRow
                    key={action.id}
                    action={action}
                    last={index === leadSheetModel.quiet.length - 1}
                  />
                ))}
              </View>
            ) : null}
          </View>
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
  searchWrap: {
    marginTop: SPACING.fixed.xs,
  },
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
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: SPACING.fixed.sm,
    marginBottom: SPACING.fixed.xs,
  },
  filterHintCopy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
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
  leadSheetBody: {
    gap: SPACING.fixed.sm,
    paddingBottom: SPACING.fixed.sm,
  },
  quietList: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: I.hairline,
    marginTop: SPACING.fixed.xxs,
  },
  quietRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
    paddingVertical: SPACING.fixed.sm,
  },
  quietRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: I.hairline,
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
