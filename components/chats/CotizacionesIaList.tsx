import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Share,
} from 'react-native';
import { router } from 'expo-router';
import {
  ChevronRight,
  Link2,
  MessageCircle,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react-native';
import { CotizacionLibreModal } from '@/components/chats/CotizacionLibreModal';
import { CotizacionIaEditor } from '@/components/chats/CotizacionIaEditor';
import {
  useCotizacionesCanalTallerQuery,
  useInvalidateCotizacionesCanalTaller,
} from '@/hooks/useCotizacionesCanalTallerQuery';
import cotizacionCanalService, { type CotizacionCanal } from '@/services/cotizacionCanalService';
import { InstitutionalTag } from '@/app/design-system/components/InstitutionalTag';
import { InstitutionalText } from '@/app/design-system/components/InstitutionalText';
import { BottomSheet } from '@/app/design-system/components/BottomSheet';
import { InstitutionalButton } from '@/app/design-system/components/InstitutionalButton';
import {
  Card,
  HostSectionKicker,
  hostScreenStyles,
} from '@/app/design-system/components';
import { COLORS, SPACING, BORDERS, TYPOGRAPHY } from '@/app/design-system/tokens';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import { formatearMontoCLP } from '@/utils/formatearMontoCLP';
import { showAlert, showConfirm } from '@/utils/platformAlert';

const I = COLORS.institutional;
const FF = TYPOGRAPHY.fontFamily;

const CANAL_LABELS: Record<string, string> = {
  whatsapp: 'WhatsApp',
  instagram: 'Instagram',
  messenger: 'Messenger',
  directo: 'Link libre',
  canal: 'Canal',
};

const ESTADO_VARIANT: Record<
  CotizacionCanal['estado'],
  'neutral' | 'primary' | 'success' | 'warning' | 'error' | 'info'
> = {
  borrador: 'neutral',
  enviada: 'info',
  aceptada: 'success',
  rechazada: 'error',
  expirada: 'warning',
  cancelada: 'error',
};

function canalLabel(cot: CotizacionCanal): string {
  return CANAL_LABELS[cot.canal || ''] || (cot.es_libre ? 'Link libre' : 'Canal');
}

function clienteLabel(cot: CotizacionCanal): string {
  return (
    cot.cliente_display
    || cot.cliente_nombre
    || [cot.vehiculo_marca, cot.vehiculo_modelo].filter(Boolean).join(' ')
    || 'Cliente'
  );
}

function fechaLabel(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('es-CL', { day: '2-digit', month: 'short' });
}

const CotizacionCard = React.memo(function CotizacionCard({
  item,
  onPress,
}: {
  item: CotizacionCanal;
  onPress: (item: CotizacionCanal) => void;
}) {
  const handlePress = useCallback(() => onPress(item), [onPress, item]);
  const vehiculo = [item.vehiculo_marca, item.vehiculo_modelo].filter(Boolean).join(' ');

  return (
    <Card
      elevated
      padding="host"
      style={styles.card}
      onPress={handlePress}
    >
      <View style={styles.cardTop}>
        <InstitutionalTag
          label={item.estado === 'aceptada' ? 'Aceptada · por agendar' : item.estado}
          variant={item.estado === 'aceptada' ? 'warning' : (ESTADO_VARIANT[item.estado] || 'neutral')}
          size="sm"
        />
        <InstitutionalTag label={canalLabel(item)} variant="neutral" size="sm" />
        <View style={styles.spacer} />
        <Text style={styles.price}>{formatearMontoCLP(item.total_clp)}</Text>
      </View>

      <Text style={styles.title} numberOfLines={2}>
        {item.servicio_nombre || 'Cotización'}
      </Text>

      <View style={styles.footer}>
        <View style={styles.footerText}>
          <Text style={styles.client} numberOfLines={1}>
            {clienteLabel(item)}
          </Text>
          {vehiculo ? (
            <Text style={styles.meta} numberOfLines={1}>
              {vehiculo}
              {item.vehiculo_patente ? ` · ${item.vehiculo_patente}` : ''}
            </Text>
          ) : null}
        </View>
        <Text style={styles.date}>{fechaLabel(item.enviada_en || item.creado_en)}</Text>
        <ChevronRight size={18} color={I.mutedSoft} strokeWidth={ICON_STROKE_WIDTH} />
      </View>
    </Card>
  );
});

type Props = {
  enabled?: boolean;
};

/**
 * Contenido de Cotizar con IA (`/cotizar-ia`): historial + nueva cotización.
 * Independiente de Mensajes; el chat del cliente es opcional en el detalle.
 */
export function CotizacionesIaList({ enabled = true }: Props) {
  const { data = [], isPending, isFetching, refetch } = useCotizacionesCanalTallerQuery(enabled);
  const invalidate = useInvalidateCotizacionesCanalTaller();
  const [libreVisible, setLibreVisible] = useState(false);
  const [activa, setActiva] = useState<CotizacionCanal | null>(null);
  const [eliminando, setEliminando] = useState(false);

  /** Listado ya trae serializer completo; no hace falta otro GET al abrir. */
  const abrirDetalle = useCallback((item: CotizacionCanal) => {
    setActiva(item);
  }, []);

  const cerrarDetalle = useCallback(() => {
    setActiva(null);
  }, []);

  const items = useMemo(
    () =>
      [...data]
        .filter((c) => c.estado !== 'borrador' && c.estado !== 'cancelada')
        .sort((a, b) => {
          const ta = new Date(a.enviada_en || a.creado_en || 0).getTime();
          const tb = new Date(b.enviada_en || b.creado_en || 0).getTime();
          return tb - ta;
        }),
    [data],
  );

  const compartirLink = useCallback(async (url: string) => {
    try {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        showAlert('Link copiado', 'Pégalo en WhatsApp u otro canal.');
        return;
      }
      await Share.share({ message: url, url });
    } catch {
      showAlert('Link de cotización', url);
    }
  }, []);

  const eliminarCotizacion = useCallback(() => {
    if (!activa?.id) return;
    if (activa.estado === 'aceptada') {
      showAlert('No se puede eliminar', 'Esta cotización ya fue aceptada por el cliente.');
      return;
    }
    const id = activa.id;
    showConfirm(
      'Eliminar cotización',
      'Se cancelará y dejará de aparecer en esta lista. El cliente no podrá aceptarla.',
      {
        confirmText: 'Eliminar',
        onConfirm: async () => {
          setEliminando(true);
          try {
            await cotizacionCanalService.cancelar(id);
            cerrarDetalle();
            await invalidate();
            await refetch();
            showAlert('Cotización eliminada', 'Quedó cancelada y fuera del listado.');
          } catch {
            showAlert('Error', 'No se pudo eliminar la cotización.');
          } finally {
            setEliminando(false);
          }
        },
      },
    );
  }, [activa, invalidate, refetch, cerrarDetalle]);

  const header = useMemo(
    () => (
      <View style={styles.headerBlock}>
        <Card
          elevated
          padding="host"
          style={styles.crearCard}
          onPress={() => setLibreVisible(true)}
        >
          <View style={styles.crearIcon}>
            <Sparkles size={20} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
          </View>
          <View style={styles.crearText}>
            <Text style={styles.crearTitle}>Nueva cotización</Text>
            <Text style={styles.crearSub}>
              Elige un cliente de Mensajes o crea una cotización con link público
            </Text>
          </View>
          <ChevronRight size={20} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
        </Card>

        <HostSectionKicker label="Cotizaciones enviadas" />
      </View>
    ),
    [],
  );

  const renderItem = useCallback(
    ({ item }: { item: CotizacionCanal }) => (
      <CotizacionCard item={item} onPress={abrirDetalle} />
    ),
    [abrirDetalle],
  );

  const vehiculoActiva = activa
    ? [activa.vehiculo_marca, activa.vehiculo_modelo].filter(Boolean).join(' ')
    : '';

  if (isPending && items.length === 0) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={I.primary} />
        <Text style={styles.loadingText}>Cargando cotizaciones…</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        ListHeaderComponent={header}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={isFetching && !isPending}
            onRefresh={() => void refetch()}
            tintColor={I.primary}
            colors={[I.primary]}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <InstitutionalText role="bodyBold">Sin cotizaciones aún</InstitutionalText>
            <InstitutionalText role="caption" color="muted" style={styles.emptySub}>
              Crea una cotización libre o genera una desde un chat de canal.
            </InstitutionalText>
          </View>
        }
      />

      <CotizacionLibreModal
        visible={libreVisible}
        onClose={() => setLibreVisible(false)}
        onEnviada={() => {
          void invalidate();
          void refetch();
        }}
      />

      <BottomSheet visible={Boolean(activa)} onClose={cerrarDetalle} style={styles.detalleSheet}>
        {activa ? (
          <ScrollView
            style={styles.detalleScroll}
            contentContainerStyle={styles.detalleScrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.detalleHeader}>
              <View style={styles.detalleHeaderText}>
                <InstitutionalText role="h4">{clienteLabel(activa)}</InstitutionalText>
                <InstitutionalText role="caption" color="muted">
                  {canalLabel(activa)}
                  {vehiculoActiva ? ` · ${vehiculoActiva}` : ''}
                  {activa.vehiculo_patente ? ` · ${activa.vehiculo_patente}` : ''}
                </InstitutionalText>
              </View>
              <TouchableOpacity
                onPress={cerrarDetalle}
                accessibilityRole="button"
                accessibilityLabel="Cerrar"
                hitSlop={8}
              >
                <X size={22} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
              </TouchableOpacity>
            </View>

            <CotizacionIaEditor
              cotizacion={activa}
              readonly
              onChange={() => undefined}
            />

            <View style={styles.sheetActions}>
              {activa.estado === 'aceptada' && activa.cita_personal_id ? (
                <InstitutionalButton
                  label="Confirmar horario"
                  variant="primary"
                  onPress={() => {
                    const citaId = activa.cita_personal_id;
                    cerrarDetalle();
                    if (citaId) router.push(`/cita-agenda-personal/${citaId}?agendar=1`);
                  }}
                />
              ) : null}
              {activa.conversation ? (
                <InstitutionalButton
                  label="Abrir chat del cliente"
                  variant="outline"
                  leading={
                    <MessageCircle size={18} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
                  }
                  onPress={() => {
                    const id = activa.conversation;
                    cerrarDetalle();
                    if (id) router.push(`/chat-omnicanal?conversationId=${id}`);
                  }}
                />
              ) : null}
              {(activa.share_url || activa.url_publica) ? (
                <InstitutionalButton
                  label="Compartir link"
                  variant="outline"
                  leading={
                    <Link2 size={18} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
                  }
                  onPress={() => {
                    const url = activa.share_url || activa.url_publica;
                    if (url) void compartirLink(url);
                  }}
                />
              ) : null}
              {activa.estado !== 'aceptada' ? (
                <InstitutionalButton
                  label="Eliminar cotización"
                  variant="destructiveOutline"
                  loading={eliminando}
                  leading={
                    <Trash2 size={18} color={I.semanticDown} strokeWidth={ICON_STROKE_WIDTH} />
                  }
                  onPress={eliminarCotizacion}
                />
              ) : null}
            </View>
          </ScrollView>
        ) : null}
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  list: {
    ...hostScreenStyles.scrollInner,
    paddingBottom: SPACING.xl,
    gap: SPACING.sm,
  },
  headerBlock: { gap: SPACING.md, marginBottom: SPACING.xs },
  crearCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  crearIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.selection.background,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.selection.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  crearText: { flex: 1, minWidth: 0, gap: 2 },
  crearTitle: {
    fontFamily: FF.sansSemiBold,
    fontSize: TYPOGRAPHY.fontSize.md,
    color: I.ink,
  },
  crearSub: {
    fontFamily: FF.sansRegular,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: I.muted,
  },
  card: {
    gap: SPACING.sm,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: SPACING.xs,
  },
  spacer: { flex: 1, minWidth: 8 },
  price: {
    fontFamily: FF.sansSemiBold,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: I.ink,
  },
  title: {
    fontFamily: FF.sansSemiBold,
    fontSize: TYPOGRAPHY.fontSize.md,
    color: I.ink,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingTop: SPACING.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: I.hairline,
  },
  footerText: { flex: 1, minWidth: 0, gap: 2 },
  client: {
    fontFamily: FF.sansSemiBold,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: I.ink,
  },
  meta: {
    fontFamily: FF.sansRegular,
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: I.muted,
  },
  date: {
    fontFamily: FF.sansRegular,
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: I.muted,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
  },
  loadingText: {
    fontFamily: FF.sansRegular,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: I.muted,
  },
  empty: {
    paddingVertical: SPACING.xl,
    alignItems: 'center',
    gap: SPACING.xs,
  },
  emptySub: { textAlign: 'center', paddingHorizontal: SPACING.lg },
  detalleSheet: {
    maxHeight: '94%',
  },
  detalleScroll: {
    maxHeight: '100%',
  },
  detalleScrollContent: {
    gap: SPACING.md,
    paddingBottom: SPACING.md,
  },
  detalleHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  detalleHeaderText: { flex: 1, minWidth: 0, gap: 2 },
  sheetActions: { gap: SPACING.sm, paddingBottom: SPACING.sm },
});

export default CotizacionesIaList;
