import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { router } from 'expo-router';
import pipelineComercialService, {
  type PipelineComercialItem,
  type EstadoPipelineNormalizado,
  type OrigenPipeline,
  ESTADO_PIPELINE_LABELS,
  ORIGEN_PIPELINE_LABELS,
} from '@/services/pipelineComercialService';
import { Card } from '@/design-system/components/Card';
import { InstitutionalText } from '@/app/design-system/components/InstitutionalText';
import { InstitutionalTag } from '@/app/design-system/components/InstitutionalTag';
import { InstitutionalButton } from '@/app/design-system/components/InstitutionalButton';
import { COLORS, SPACING, BORDERS } from '@/app/design-system/tokens';
import { formatearMontoCLP } from '@/utils/formatearMontoCLP';
import { InstitutionalIcon } from '@/components/ui/InstitutionalIcon';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';

const I = COLORS.institutional;

const FILTROS_ESTADO: Array<{ key: EstadoPipelineNormalizado | 'todos'; label: string }> = [
  { key: 'todos', label: 'Todos' },
  { key: 'nuevo', label: 'Nuevos' },
  { key: 'cotizacion_enviada', label: 'Esperando' },
  { key: 'en_negociacion', label: 'Negociando' },
  { key: 'aceptado_agendado', label: 'Agendados' },
  { key: 'rechazado_perdido', label: 'Perdidos' },
];

const FILTROS_ORIGEN: Array<{ key: OrigenPipeline | 'todos'; label: string }> = [
  { key: 'todos', label: 'Todos los orígenes' },
  { key: 'marketplace', label: 'Mecanimovil' },
  { key: 'catalogo', label: 'Catálogo' },
  { key: 'whatsapp', label: 'WhatsApp' },
  { key: 'instagram', label: 'Instagram' },
  { key: 'manual', label: 'Personal' },
];

function tagVariant(estado: EstadoPipelineNormalizado) {
  switch (estado) {
    case 'cotizacion_enviada':
      return 'warning' as const;
    case 'en_negociacion':
      return 'primary' as const;
    case 'aceptado_agendado':
      return 'success' as const;
    case 'rechazado_perdido':
      return 'error' as const;
    case 'en_ejecucion':
      return 'primary' as const;
    case 'completado':
      return 'neutral' as const;
    default:
      return 'neutral' as const;
  }
}

function navegarItem(item: PipelineComercialItem) {
  if (item.conversation_id) {
    router.push(`/chat-omnicanal?conversationId=${item.conversation_id}`);
    return;
  }
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
  }
}

const PipelineItemCard = React.memo(function PipelineItemCard({
  item,
  onPress,
}: {
  item: PipelineComercialItem;
  onPress: (item: PipelineComercialItem) => void;
}) {
  const handlePress = useCallback(() => onPress(item), [onPress, item]);
  const monto = item.monto_clp != null ? formatearMontoCLP(item.monto_clp) : null;

  return (
    <Card onPress={handlePress} style={styles.itemCard} elevated>
      <View style={styles.itemHeader}>
        <InstitutionalText role="body" numberOfLines={1} style={styles.clienteNombre}>
          {item.cliente_nombre}
        </InstitutionalText>
        <InstitutionalTag
          variant={tagVariant(item.estado_normalizado)}
          label={ESTADO_PIPELINE_LABELS[item.estado_normalizado]}
        />
      </View>

      <View style={styles.metaRow}>
        <InstitutionalTag
          variant="neutral"
          label={ORIGEN_PIPELINE_LABELS[item.origen] || item.origen}
        />
        {item.esperando_respuesta_24h ? (
          <InstitutionalTag variant="warning" label="+24h sin respuesta" />
        ) : null}
      </View>

      {item.servicio_resumen ? (
        <InstitutionalText role="caption" color="muted" numberOfLines={2} style={styles.resumen}>
          {item.servicio_resumen}
        </InstitutionalText>
      ) : null}

      <View style={styles.footerRow}>
        {item.vehiculo_resumen ? (
          <InstitutionalText role="small" color="muted" numberOfLines={1}>
            {item.vehiculo_resumen}
          </InstitutionalText>
        ) : null}
        {monto ? (
          <InstitutionalText role="small" style={styles.monto}>
            {monto}
          </InstitutionalText>
        ) : null}
      </View>
    </Card>
  );
});

interface Props {
  compact?: boolean;
  limite?: number;
  filtroEsperando24h?: boolean;
  filtroOrigen?: OrigenPipeline;
  refreshKey?: number;
}

export function PipelineSeguimientoSection({
  compact = false,
  limite = compact ? 5 : 50,
  filtroEsperando24h = false,
  filtroOrigen,
  refreshKey = 0,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<PipelineComercialItem[]>([]);
  const [esperando24h, setEsperando24h] = useState(0);
  const [filtro, setFiltro] = useState<EstadoPipelineNormalizado | 'todos'>('todos');
  const [origen, setOrigen] = useState<OrigenPipeline | 'todos'>(filtroOrigen ?? 'todos');

  useEffect(() => {
    if (filtroOrigen) {
      setOrigen(filtroOrigen);
    }
  }, [filtroOrigen]);

  useEffect(() => {
    if (filtroEsperando24h) {
      setFiltro('cotizacion_enviada');
    }
  }, [filtroEsperando24h]);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const data = await pipelineComercialService.listar({
        estado_normalizado:
          filtroEsperando24h
            ? 'cotizacion_enviada'
            : filtro === 'todos'
              ? undefined
              : filtro,
        origen: origen === 'todos' ? undefined : origen,
        esperando_24h: filtroEsperando24h || undefined,
        limite,
      });
      setItems(data.results);
      setEsperando24h(data.esperando_respuesta_24h_count);
    } catch {
      setItems([]);
      setEsperando24h(0);
    } finally {
      setLoading(false);
    }
  }, [filtro, origen, limite, filtroEsperando24h]);

  useEffect(() => {
    cargar();
  }, [cargar, refreshKey]);

  const handlePress = useCallback((item: PipelineComercialItem) => {
    navegarItem(item);
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: PipelineComercialItem }) => (
      <PipelineItemCard item={item} onPress={handlePress} />
    ),
    [handlePress],
  );

  const keyExtractor = useCallback(
    (item: PipelineComercialItem) => `${item.tipo_entidad}-${item.entidad_id}`,
    [],
  );

  const headerRight = useMemo(
    () => (
      <InstitutionalButton
        label="Ver todo"
        variant="tertiary"
        size="compact"
        onPress={() => router.push('/pipeline-seguimiento')}
      />
    ),
    [],
  );

  if (loading && items.length === 0) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator color={I.primary} />
      </View>
    );
  }

  if (!loading && items.length === 0 && filtro === 'todos' && origen === 'todos' && !filtroEsperando24h) {
    return null;
  }

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.titleRow}>
          <InstitutionalIcon name="analytics" size={20} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
          <InstitutionalText role="h5" style={styles.sectionTitle}>
            Seguimiento comercial
          </InstitutionalText>
        </View>
        {compact ? headerRight : null}
      </View>

      {filtroEsperando24h ? (
        <View style={styles.alertBannerInfo}>
          <InstitutionalText role="caption" color="onPrimary">
            Mostrando cotizaciones sin respuesta hace más de 24 horas
          </InstitutionalText>
        </View>
      ) : null}

      {!compact && esperando24h > 0 ? (
        <TouchableOpacity
          style={styles.alertBanner}
          onPress={() => router.push('/pipeline-seguimiento?filtro=esperando_24h')}
          activeOpacity={0.85}
        >
          <InstitutionalText role="caption" color="onPrimary">
            {esperando24h} cotización{esperando24h === 1 ? '' : 'es'} sin respuesta hace más de 24h
          </InstitutionalText>
        </TouchableOpacity>
      ) : null}

      {!compact ? (
        <View style={styles.filtersRow}>
          {FILTROS_ORIGEN.map((f) => {
            const active = origen === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                style={[styles.filterChip, active && styles.filterChipActive]}
                onPress={() => setOrigen(f.key)}
              >
                <InstitutionalText role="small" color={active ? 'onPrimary' : 'muted'}>
                  {f.label}
                </InstitutionalText>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : null}

      <View style={styles.filtersRow}>
        {FILTROS_ESTADO.map((f) => {
          const active = !filtroEsperando24h && filtro === f.key;
          return (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterChip, active && styles.filterChipActive]}
              onPress={() => {
                if (filtroEsperando24h) {
                  router.replace('/pipeline-seguimiento');
                  return;
                }
                setFiltro(f.key);
              }}
              disabled={filtroEsperando24h && f.key !== 'cotizacion_enviada'}
            >
              <InstitutionalText role="small" color={active ? 'onPrimary' : 'muted'}>
                {f.label}
              </InstitutionalText>
            </TouchableOpacity>
          );
        })}
      </View>

      <FlatList
        data={items}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        scrollEnabled={!compact}
        nestedScrollEnabled
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <InstitutionalText role="body" color="muted" style={styles.empty}>
            No hay registros con este filtro.
          </InstitutionalText>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: SPACING.fixed.sm },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.fixed.xs },
  sectionTitle: { marginLeft: SPACING.fixed.xxs },
  alertBanner: {
    backgroundColor: COLORS.institutional.accentYellow,
    borderRadius: BORDERS.radius.md,
    paddingHorizontal: SPACING.fixed.md,
    paddingVertical: SPACING.fixed.sm,
  },
  alertBannerInfo: {
    backgroundColor: I.primary,
    borderRadius: BORDERS.radius.md,
    paddingHorizontal: SPACING.fixed.md,
    paddingVertical: SPACING.fixed.sm,
  },
  filtersRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.fixed.xs,
  },
  filterChip: {
    paddingHorizontal: SPACING.fixed.sm,
    paddingVertical: SPACING.fixed.xxs,
    borderRadius: BORDERS.radius.full,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
    backgroundColor: COLORS.background.paper,
  },
  filterChipActive: {
    backgroundColor: I.primary,
    borderColor: I.primary,
  },
  listContent: { gap: SPACING.fixed.sm, paddingBottom: SPACING.fixed.sm },
  itemCard: { marginBottom: 0 },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: SPACING.fixed.sm,
    marginBottom: SPACING.fixed.xs,
  },
  clienteNombre: { flex: 1 },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.fixed.xs,
    marginBottom: SPACING.fixed.xs,
  },
  resumen: { marginBottom: SPACING.fixed.xs },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.fixed.sm,
  },
  monto: { fontFamily: undefined },
  loadingWrap: { paddingVertical: SPACING.fixed.lg, alignItems: 'center' },
  empty: { textAlign: 'center', paddingVertical: SPACING.fixed.lg },
});

export default PipelineSeguimientoSection;
