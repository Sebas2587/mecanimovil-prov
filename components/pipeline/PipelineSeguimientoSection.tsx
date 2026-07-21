import React, { useCallback, useEffect, useMemo, useState, type ReactElement } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  ScrollView,
  RefreshControl,
  type RefreshControlProps,
} from 'react-native';
import { router } from 'expo-router';
import { ChevronRight, Filter, MessageCircle } from 'lucide-react-native';
import {
  type PipelineComercialItem,
  type EstadoPipelineNormalizado,
  type OrigenPipeline,
  ESTADO_PIPELINE_LABELS,
  ORIGEN_PIPELINE_LABELS,
} from '@/services/pipelineComercialService';
import { usePipelineComercialQuery } from '@/hooks/usePipelineComercialQuery';
import { InstitutionalText } from '@/app/design-system/components/InstitutionalText';
import { InstitutionalTag } from '@/app/design-system/components/InstitutionalTag';
import { AsignarTecnicoBottomSheet, type AsignarTecnicoTarget } from '@/components/equipo/AsignarTecnicoBottomSheet';
import {
  ESTADO_OPERATIVO_LABELS,
  ESTADO_OPERATIVO_VARIANT,
  mapPipelineEstadoToOperativo,
} from '@/utils/estadoOperativo';
import { COLORS, SPACING, BORDERS, TYPOGRAPHY } from '@/app/design-system/tokens';
import { formatearMontoCLP } from '@/utils/formatearMontoCLP';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';

const I = COLORS.institutional;
const T = TYPOGRAPHY.styles;

/**
 * Vistas de bandeja (estilo Intercom "Your inbox"), una sola fila horizontal.
 * El origen queda detrás del botón Filtro — no como segunda fila de chips.
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

function navegarItem(item: PipelineComercialItem) {
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
  if (item.conversation_id) {
    router.push(`/chat-omnicanal?conversationId=${item.conversation_id}`);
    return;
  }
  if (item.cotizacion_id && item.origen === 'directo') {
    return;
  }
}

const InboxRow = React.memo(function InboxRow({
  item,
  onPress,
  onAsignar,
}: {
  item: PipelineComercialItem;
  onPress: (item: PipelineComercialItem) => void;
  onAsignar?: (item: PipelineComercialItem) => void;
}) {
  const handlePress = useCallback(() => onPress(item), [onPress, item]);
  const handleAsignar = useCallback(
    (e?: { stopPropagation?: () => void }) => {
      e?.stopPropagation?.();
      onAsignar?.(item);
    },
    [onAsignar, item],
  );
  const monto = item.monto_clp != null ? formatearMontoCLP(item.monto_clp) : null;
  const snippet =
    item.servicio_resumen
    || item.vehiculo_resumen
    || ESTADO_PIPELINE_LABELS[item.estado_normalizado];
  const origenLabel = ORIGEN_PIPELINE_LABELS[item.origen] || item.origen;
  const tiempo = tiempoRelativo(item.fecha_referencia);
  const estadoOperativo = mapPipelineEstadoToOperativo(item.estado_normalizado);
  const puedeAsignar = !!onAsignar && (item.cita_id || item.orden_id || item.oferta_id);

  return (
    <TouchableOpacity
      style={styles.row}
      onPress={handlePress}
      activeOpacity={0.72}
      accessibilityRole="button"
      accessibilityLabel={`Abrir ${item.cliente_nombre}`}
    >
      <View style={styles.avatar}>
        <InstitutionalText role="bodyBold" color="onPrimary">
          {inicialCliente(item.cliente_nombre)}
        </InstitutionalText>
      </View>

      <View style={styles.rowBody}>
        <View style={styles.rowTop}>
          <InstitutionalText role="bodyBold" numberOfLines={1} style={styles.cliente}>
            {item.cliente_nombre}
          </InstitutionalText>
          {tiempo ? (
            <InstitutionalText role="small" color="muted">
              {tiempo}
            </InstitutionalText>
          ) : null}
        </View>

        <InstitutionalText role="caption" color="muted" numberOfLines={1} style={styles.snippet}>
          {snippet}
        </InstitutionalText>

        <View style={styles.rowMeta}>
          <View style={styles.origenPill}>
            {item.conversation_id ? (
              <MessageCircle size={11} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
            ) : null}
            <InstitutionalText role="small" color="muted">
              {origenLabel}
            </InstitutionalText>
          </View>
          {item.template_generado_por_ia ? (
            <InstitutionalTag label="Checklist IA" variant="info" size="sm" />
          ) : null}
          {item.esperando_respuesta_24h ? (
            <InstitutionalText role="small" style={styles.warnText}>
              +24h
            </InstitutionalText>
          ) : item.demorado_48h ? (
            <InstitutionalText role="small" style={styles.warnText}>
              +48h
            </InstitutionalText>
          ) : item.visto_sin_respuesta ? (
            <InstitutionalTag label="Visto" variant="warning" size="sm" />
          ) : (
            <InstitutionalTag
              label={ESTADO_OPERATIVO_LABELS[estadoOperativo]}
              variant={ESTADO_OPERATIVO_VARIANT[estadoOperativo]}
              size="sm"
            />
          )}
          {monto ? (
            <InstitutionalText role="small" style={styles.monto}>
              {monto}
            </InstitutionalText>
          ) : null}
        </View>
      </View>

      <View style={styles.rowActions}>
        {puedeAsignar ? (
          <TouchableOpacity
            onPress={() => handleAsignar()}
            style={styles.asignarBtn}
            accessibilityRole="button"
            accessibilityLabel="Asignar técnico"
          >
            <InstitutionalText role="small" color="primary">
              Técnico
            </InstitutionalText>
          </TouchableOpacity>
        ) : null}
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

const ListSeparator = React.memo(function ListSeparator() {
  return <View style={styles.separator} />;
});

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
  const [mostrarOrigenes, setMostrarOrigenes] = useState(false);
  const [asignarTarget, setAsignarTarget] = useState<AsignarTecnicoTarget | null>(null);
  const [asignarVisible, setAsignarVisible] = useState(false);

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
    navegarItem(item);
  }, []);

  const handleAsignar = useCallback((item: PipelineComercialItem) => {
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
    setAsignarVisible(true);
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: PipelineComercialItem }) => (
      <InboxRow item={item} onPress={handlePress} onAsignar={handleAsignar} />
    ),
    [handlePress, handleAsignar],
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
        <View style={styles.alertBanner}>
          <InstitutionalText role="caption">
            Cotizaciones sin respuesta hace más de 24 horas
          </InstitutionalText>
          <TouchableOpacity onPress={() => router.replace('/(tabs)/bandeja')}>
            <InstitutionalText role="small" color="primary">
              Ver abiertos
            </InstitutionalText>
          </TouchableOpacity>
        </View>
      ) : null}

      {!compact && !filtroEsperando24h && esperando24h > 0 ? (
        <TouchableOpacity
          style={styles.alertBanner}
          onPress={() => router.push('/(tabs)/bandeja?filtro=esperando_24h')}
          activeOpacity={0.85}
        >
          <InstitutionalText role="caption">
            {esperando24h} sin respuesta +24h
          </InstitutionalText>
          <ChevronRight size={16} color={I.ink} strokeWidth={ICON_STROKE_WIDTH} />
        </TouchableOpacity>
      ) : null}

      {!filtroEsperando24h ? (
        <View style={styles.toolbar}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.vistasRow}
          >
            {VISTAS_BANDEJA.map((v) => {
              const active = vista === v.key;
              const badge = vistaBadgeCounts[v.key] ?? 0;
              return (
                <TouchableOpacity
                  key={v.key}
                  style={[styles.vistaChip, active && styles.vistaChipActive]}
                  onPress={() => setVista(v.key)}
                  activeOpacity={0.85}
                >
                  <InstitutionalText
                    role="small"
                    color={active ? 'onPrimary' : 'muted'}
                    style={active ? styles.vistaChipLabelActive : undefined}
                  >
                    {v.label}
                    {badge > 0 ? ` · ${badge}` : ''}
                  </InstitutionalText>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {!compact ? (
            <TouchableOpacity
              style={[styles.filterBtn, origen !== 'todos' && styles.filterBtnActive]}
              onPress={() => setMostrarOrigenes((o) => !o)}
              activeOpacity={0.85}
              accessibilityLabel="Filtrar por origen"
            >
              <Filter
                size={16}
                color={origen !== 'todos' ? I.onPrimary : I.ink}
                strokeWidth={ICON_STROKE_WIDTH}
              />
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}

      {mostrarOrigenes && !compact ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.origenesRow}
        >
          {ORIGENES.map((o) => {
            const active = origen === o.key;
            return (
              <TouchableOpacity
                key={o.key}
                style={[styles.origenChip, active && styles.origenChipActive]}
                onPress={() => {
                  setOrigen(o.key);
                  if (o.key === 'todos') setMostrarOrigenes(false);
                }}
              >
                <InstitutionalText role="small" color={active ? 'onPrimary' : 'muted'}>
                  {o.label}
                </InstitutionalText>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      ) : null}

      {origenActivoLabel && !mostrarOrigenes ? (
        <TouchableOpacity
          style={styles.origenActivoHint}
          onPress={() => setMostrarOrigenes(true)}
        >
          <InstitutionalText role="small" color="muted">
            Origen: {origenActivoLabel}
          </InstitutionalText>
          <InstitutionalText role="small" color="primary">
            Cambiar
          </InstitutionalText>
        </TouchableOpacity>
      ) : null}
    </View>
  );

  return (
    <View style={[styles.section, !compact && styles.sectionFill]}>
      {listHeader}
      <View style={[styles.listSurface, !compact && styles.listSurfaceFill]}>
        <FlatList
          data={items}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          scrollEnabled={!compact}
          nestedScrollEnabled={compact}
          style={!compact ? styles.listFill : undefined}
          refreshControl={refreshControl}
          ItemSeparatorComponent={ListSeparator}
          contentContainerStyle={!compact ? styles.listContentPad : undefined}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <InstitutionalText role="bodyBold">Nada aquí</InstitutionalText>
              <InstitutionalText role="caption" color="muted" style={styles.emptySub}>
                No hay elementos en esta vista.
              </InstitutionalText>
            </View>
          }
        />
      </View>

      <AsignarTecnicoBottomSheet
        visible={asignarVisible}
        onClose={() => {
          setAsignarVisible(false);
          setAsignarTarget(null);
        }}
        target={asignarTarget}
        onAsignado={() => {
          void refetch();
        }}
      />
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
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.fixed.sm,
    backgroundColor: COLORS.background.warning,
    borderRadius: BORDERS.radius.md,
    paddingHorizontal: SPACING.fixed.md,
    paddingVertical: SPACING.fixed.sm,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.xs,
  },
  vistasRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.xs,
    paddingRight: SPACING.fixed.xs,
  },
  vistaChip: {
    paddingHorizontal: SPACING.fixed.md,
    paddingVertical: SPACING.fixed.xs,
    borderRadius: BORDERS.radius.full,
    backgroundColor: COLORS.tab.unselectedBg,
  },
  vistaChipActive: {
    backgroundColor: I.primary,
  },
  vistaChipLabelActive: {
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
  },
  filterBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.tab.unselectedBg,
  },
  filterBtnActive: {
    backgroundColor: I.primary,
  },
  origenesRow: {
    flexDirection: 'row',
    gap: SPACING.fixed.xs,
    paddingVertical: SPACING.fixed.xxs,
  },
  origenChip: {
    paddingHorizontal: SPACING.fixed.sm,
    paddingVertical: SPACING.fixed.xxs,
    borderRadius: BORDERS.radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: I.hairline,
    backgroundColor: COLORS.background.paper,
  },
  origenChipActive: {
    backgroundColor: I.primary,
    borderColor: I.primary,
  },
  origenActivoHint: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  listSurface: {
    backgroundColor: COLORS.background.paper,
    borderRadius: BORDERS.radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: I.hairline,
    overflow: 'hidden',
  },
  listSurfaceFill: { flex: 1 },
  listFill: { flex: 1 },
  listContentPad: { paddingBottom: SPACING.fixed['2xl'] },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.sm,
    paddingHorizontal: SPACING.fixed.md,
    paddingVertical: SPACING.fixed.md,
    backgroundColor: COLORS.background.paper,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: I.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBody: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.fixed.sm,
  },
  cliente: { flex: 1 },
  snippet: {
    fontSize: T.caption.fontSize,
  },
  rowMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: SPACING.fixed.sm,
    marginTop: 2,
  },
  origenPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  warnText: {
    color: COLORS.warning.dark,
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
  },
  monto: {
    marginLeft: 'auto',
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    color: I.ink,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: I.hairline,
    marginLeft: SPACING.fixed.md + 40 + SPACING.fixed.sm,
  },
  emptyWrap: {
    paddingVertical: SPACING.fixed['2xl'],
    paddingHorizontal: SPACING.fixed.lg,
    alignItems: 'center',
    gap: SPACING.fixed.xxs,
  },
  emptySub: { textAlign: 'center' },
  loadingWrap: { paddingVertical: SPACING.fixed.lg, alignItems: 'center' },
  rowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.xxs,
    flexShrink: 0,
  },
  asignarBtn: {
    paddingHorizontal: SPACING.fixed.xs,
    paddingVertical: SPACING.fixed.xxs,
    borderRadius: BORDERS.radius.sm,
    backgroundColor: I.surfaceStrong,
  },
});

export default PipelineSeguimientoSection;
