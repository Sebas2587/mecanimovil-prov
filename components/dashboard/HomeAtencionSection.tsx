import React, { memo, useCallback, useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { ChevronRight, Inbox } from 'lucide-react-native';
import pipelineComercialService, {
  type PipelineComercialItem,
  type EstadoPipelineNormalizado,
  ESTADO_PIPELINE_LABELS,
  ORIGEN_PIPELINE_LABELS,
} from '@/services/pipelineComercialService';
import { Card, HostSectionKicker } from '@/app/design-system/components';
import { InstitutionalText } from '@/app/design-system/components/InstitutionalText';
import { InstitutionalTag } from '@/app/design-system/components/InstitutionalTag';
import { COLORS, SPACING, BORDERS } from '@/app/design-system/tokens';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import { formatearMontoCLP } from '@/utils/formatearMontoCLP';
import { OrigenConversacionChip } from '@/components/pipeline/OrigenConversacionChip';

const I = COLORS.institutional;
const PREVIEW_LIMIT = 4;

/**
 * Estados comerciales que requieren acción del taller (no operación ni cerrado).
 *
 * Nota: 'cotizacion_enviada' de origen puramente conversacional (tipo_entidad
 * 'cotizacion_canal', ej. WhatsApp/Messenger) NO entra aquí — esa es una
 * conversación esperando respuesta y vive en el tab Chats, no en agendamientos.
 * Aquí solo entran entidades con una acción de negocio real (aceptar/ofertar/agendar).
 */
const ESTADOS_ATENCION: EstadoPipelineNormalizado[] = [
  'nuevo',
  'cotizacion_enviada',
  'en_negociacion',
];

/** Tipos de entidad que representan trabajo agendable, no simple mensajería. */
const TIPOS_AGENDABLES: PipelineComercialItem['tipo_entidad'][] = [
  'oferta',
  'cita_personal',
  'orden_directa',
  'solicitud_publica',
];

function prioridadAtencion(item: PipelineComercialItem): number {
  if (item.esperando_respuesta_24h) return 0;
  if (item.estado_normalizado === 'nuevo') return 1;
  if (item.estado_normalizado === 'en_negociacion') return 2;
  if (item.estado_normalizado === 'cotizacion_enviada') return 3;
  return 9;
}

/** La card siempre navega a la entidad de negocio; la conversación es un chip aparte. */
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
  }
}

function tagVariant(estado: EstadoPipelineNormalizado) {
  switch (estado) {
    case 'cotizacion_enviada':
      return 'warning' as const;
    case 'en_negociacion':
      return 'primary' as const;
    case 'nuevo':
      return 'neutral' as const;
    default:
      return 'neutral' as const;
  }
}

const AtencionItemCard = memo(function AtencionItemCard({
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
        <InstitutionalText role="caption" color="muted" numberOfLines={1}>
          {item.servicio_resumen}
        </InstitutionalText>
      ) : null}

      {item.conversation_id ? (
        <View style={styles.origenChipRow}>
          <OrigenConversacionChip conversationId={item.conversation_id} />
        </View>
      ) : null}

      {(item.vehiculo_resumen || monto) ? (
        <View style={styles.footerRow}>
          {item.vehiculo_resumen ? (
            <InstitutionalText role="small" color="muted" numberOfLines={1} style={styles.flex1}>
              {item.vehiculo_resumen}
            </InstitutionalText>
          ) : (
            <View style={styles.flex1} />
          )}
          {monto ? (
            <InstitutionalText role="small">{monto}</InstitutionalText>
          ) : null}
        </View>
      ) : null}
    </Card>
  );
});

export type HomeAtencionSectionProps = {
  enabled?: boolean;
  refreshKey?: number;
};

function HomeAtencionSectionInner({
  enabled = true,
  refreshKey = 0,
}: HomeAtencionSectionProps) {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<PipelineComercialItem[]>([]);
  const [totalAtencion, setTotalAtencion] = useState(0);
  const [nuevosCount, setNuevosCount] = useState(0);
  const [esperando24h, setEsperando24h] = useState(0);
  const [negociandoCount, setNegociandoCount] = useState(0);

  const cargar = useCallback(async () => {
    if (!enabled) {
      setItems([]);
      setTotalAtencion(0);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await pipelineComercialService.listar({ limite: 40 });
      const atencion = data.results
        .filter(
          (row) =>
            ESTADOS_ATENCION.includes(row.estado_normalizado)
            && TIPOS_AGENDABLES.includes(row.tipo_entidad),
        )
        .sort((a, b) => prioridadAtencion(a) - prioridadAtencion(b));

      setItems(atencion.slice(0, PREVIEW_LIMIT));
      setTotalAtencion(atencion.length);
      setNuevosCount(atencion.filter((r) => r.estado_normalizado === 'nuevo').length);
      setNegociandoCount(atencion.filter((r) => r.estado_normalizado === 'en_negociacion').length);
      // +24h solo cuenta cotizaciones de solicitudes/ofertas (agendables), no chats de canal
      // sin respuesta: esas viven en el tab Chats.
      setEsperando24h(
        atencion.filter((r) => r.esperando_respuesta_24h && r.estado_normalizado === 'cotizacion_enviada').length,
      );
    } catch {
      setItems([]);
      setTotalAtencion(0);
      setNuevosCount(0);
      setNegociandoCount(0);
      setEsperando24h(0);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    cargar();
  }, [cargar, refreshKey]);

  const handlePress = useCallback((item: PipelineComercialItem) => {
    navegarItem(item);
  }, []);

  const totalPendientes = totalAtencion;

  const abrirSeguimiento = useCallback(() => {
    router.push('/(tabs)/bandeja');
  }, []);

  const abrirEsperando24h = useCallback(() => {
    router.push('/(tabs)/bandeja?filtro=esperando_24h');
  }, []);

  if (!enabled) return null;

  if (loading && items.length === 0) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator color={I.primary} />
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <View style={styles.titleBlock}>
          <HostSectionKicker
            label={
              totalPendientes > 0
                ? `Requieren tu atención · ${totalPendientes > 99 ? '99+' : totalPendientes}`
                : 'Requieren tu atención'
            }
          />
          <InstitutionalText role="caption" color="muted">
            Solicitudes y cotizaciones que esperan tu respuesta
          </InstitutionalText>
        </View>
        <TouchableOpacity
          style={styles.headerLink}
          onPress={abrirSeguimiento}
          activeOpacity={0.75}
          accessibilityRole="button"
          accessibilityLabel="Abrir bandeja del taller"
        >
          <InstitutionalText role="small" color="primary">
            Bandeja
          </InstitutionalText>
          <ChevronRight size={16} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
        </TouchableOpacity>
      </View>

      {(nuevosCount > 0 || esperando24h > 0 || negociandoCount > 0) ? (
        <View style={styles.summaryRow}>
          {nuevosCount > 0 ? (
            <TouchableOpacity
              style={styles.summaryChip}
              onPress={abrirSeguimiento}
              activeOpacity={0.85}
            >
              <InstitutionalText role="small">
                {nuevosCount} nuevo{nuevosCount === 1 ? '' : 's'}
              </InstitutionalText>
            </TouchableOpacity>
          ) : null}
          {esperando24h > 0 ? (
            <TouchableOpacity
              style={[styles.summaryChip, styles.summaryChipWarn]}
              onPress={abrirEsperando24h}
              activeOpacity={0.85}
            >
              <InstitutionalText role="small">
                {esperando24h} sin respuesta +24h
              </InstitutionalText>
            </TouchableOpacity>
          ) : null}
          {negociandoCount > 0 ? (
            <TouchableOpacity
              style={styles.summaryChip}
              onPress={abrirSeguimiento}
              activeOpacity={0.85}
            >
              <InstitutionalText role="small">
                {negociandoCount} negociando
              </InstitutionalText>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}

      {items.length === 0 ? (
        <Card elevated padding="host" style={styles.emptyCard}>
          <View style={styles.emptyRow}>
            <Inbox size={20} color={I.mutedSoft} strokeWidth={ICON_STROKE_WIDTH} />
            <View style={styles.emptyTextCol}>
              <InstitutionalText role="bodyBold">Todo al día</InstitutionalText>
              <InstitutionalText role="caption" color="muted">
                No hay solicitudes ni cotizaciones pendientes. Abre Bandeja para el historial completo.
              </InstitutionalText>
            </View>
          </View>
        </Card>
      ) : (
        <View style={styles.list}>
          {items.map((item) => (
            <AtencionItemCard
              key={`${item.tipo_entidad}-${item.entidad_id}`}
              item={item}
              onPress={handlePress}
            />
          ))}
        </View>
      )}
    </View>
  );
}

export const HomeAtencionSection = memo(HomeAtencionSectionInner);

const styles = StyleSheet.create({
  section: { gap: SPACING.fixed.sm },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: SPACING.fixed.sm,
  },
  titleBlock: { flex: 1, gap: SPACING.fixed.xxs },
  headerLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingTop: SPACING.fixed.md,
  },
  summaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.fixed.xs,
  },
  summaryChip: {
    paddingHorizontal: SPACING.fixed.sm,
    paddingVertical: SPACING.fixed.xxs,
    borderRadius: BORDERS.radius.full,
    borderWidth: BORDERS.width.thin,
    borderColor: COLORS.border.light,
    backgroundColor: COLORS.background.paper,
  },
  summaryChipWarn: {
    borderColor: COLORS.institutional.accentYellow,
    backgroundColor: COLORS.background.warning,
  },
  list: { gap: SPACING.fixed.sm },
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
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.fixed.sm,
    marginTop: SPACING.fixed.xs,
  },
  origenChipRow: {
    marginTop: SPACING.fixed.xs,
  },
  flex1: { flex: 1 },
  emptyCard: {},
  emptyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.fixed.sm,
  },
  emptyTextCol: { flex: 1, gap: SPACING.fixed.xxs },
  loadingWrap: { paddingVertical: SPACING.fixed.lg, alignItems: 'center' },
});

export default HomeAtencionSection;
