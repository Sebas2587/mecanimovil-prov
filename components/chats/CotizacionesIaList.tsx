import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
  Eye,
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
import {
  AGENTE_IA_BORRADORES_KEY,
  useAgenteBorradoresPendientesQuery,
} from '@/hooks/useAgenteIaQueries';
import cotizacionCanalService, { type CotizacionCanal } from '@/services/cotizacionCanalService';
import { invalidateProveedorComercialQueries } from '@/utils/invalidateProveedorComercial';
import { InstitutionalTag } from '@/app/design-system/components/InstitutionalTag';
import { InstitutionalText } from '@/app/design-system/components/InstitutionalText';
import { BottomSheet } from '@/app/design-system/components/BottomSheet';
import { InstitutionalButton } from '@/app/design-system/components/InstitutionalButton';
import {
  Card,
  HostSectionKicker,
  hostScreenStyles,
} from '@/app/design-system/components';
import { COLORS, SPACING, TYPOGRAPHY } from '@/app/design-system/tokens';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import { formatearMontoCLP } from '@/utils/formatearMontoCLP';
import { showAlert, showConfirm } from '@/utils/platformAlert';
import { useQueryClient } from '@tanstack/react-query';

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

function esBorradorPorRevisar(cot: CotizacionCanal): boolean {
  return cot.estado === 'borrador';
}

function esBorradorAgente(cot: CotizacionCanal): boolean {
  if (cot.metadata?.origen === 'agente_ia') return true;
  if (cot.es_cotizacion_adicional) return true;
  return cot.metadata?.origen === 'cotizacion_adicional';
}

function cotizacionEditableSnapshot(c: CotizacionCanal): string {
  return JSON.stringify({
    servicio_nombre: c.servicio_nombre,
    descripcion_problema: c.descripcion_problema,
    modalidad: c.modalidad,
    direccion_servicio: c.direccion_servicio,
    cliente_nombre: c.cliente_nombre,
    cliente_telefono: c.cliente_telefono,
    repuestos: c.repuestos,
    mano_obra_clp: c.mano_obra_clp,
    notas_internas: c.notas_internas,
    duracion_minutos_estimada: c.duracion_minutos_estimada,
  });
}

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
  tagLabel,
  tagVariant,
  showVista,
}: {
  item: CotizacionCanal;
  onPress: (item: CotizacionCanal) => void;
  tagLabel?: string;
  tagVariant?: 'neutral' | 'primary' | 'success' | 'warning' | 'error' | 'info';
  showVista?: boolean;
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
          label={tagLabel || (item.estado === 'aceptada' ? 'Aceptada · por agendar' : item.estado)}
          variant={
            tagVariant
            || (item.estado === 'aceptada' ? 'warning' : (ESTADO_VARIANT[item.estado] || 'neutral'))
          }
          size="sm"
        />
        {showVista ? (
          <InstitutionalTag
            label={`Vista · ${fechaLabel(item.visto_en)}`}
            variant="primary"
            size="sm"
            leading={<Eye size={12} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />}
          />
        ) : null}
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
        <Text style={styles.date}>
          {fechaLabel(item.enviada_en || item.creado_en)}
        </Text>
        <ChevronRight size={18} color={I.mutedSoft} strokeWidth={ICON_STROKE_WIDTH} />
      </View>
    </Card>
  );
});

type Props = {
  enabled?: boolean;
};

/**
 * Cotizar con IA (`/cotizar-ia`): solo borradores por revisar/enviar + crear.
 * Enviadas, vistas y aceptadas viven en Bandeja; agendadas en Agenda.
 */
export function CotizacionesIaList({ enabled = true }: Props) {
  const qc = useQueryClient();
  const { data = [], isPending, isFetching, refetch } = useCotizacionesCanalTallerQuery(enabled);
  const { data: borradoresAgente } = useAgenteBorradoresPendientesQuery(enabled);
  const invalidate = useInvalidateCotizacionesCanalTaller();
  const [libreVisible, setLibreVisible] = useState(false);
  const [activa, setActiva] = useState<CotizacionCanal | null>(null);
  const [editDraft, setEditDraft] = useState<CotizacionCanal | null>(null);
  const [eliminando, setEliminando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const borradoresPorRevisar = useMemo(
    () =>
      [...data]
        .filter(esBorradorPorRevisar)
        .sort((a, b) => {
          const ta = new Date(a.creado_en || 0).getTime();
          const tb = new Date(b.creado_en || 0).getTime();
          return tb - ta;
        }),
    [data],
  );

  const abrirDetalle = useCallback((item: CotizacionCanal) => {
    setActiva(item);
    setEditDraft(esBorradorPorRevisar(item) ? { ...item } : null);
  }, []);

  const irABandeja = useCallback(() => {
    router.push('/(tabs)/bandeja');
  }, []);

  const cerrarDetalle = useCallback(() => {
    setActiva(null);
    setEditDraft(null);
  }, []);

  // Rehidrata al abrir/cambiar cotización. No depende de `data`: un refetch
  // no debe pisar lo que el taller está tipando (mano de obra, etc.).
  useEffect(() => {
    if (!activa || !esBorradorPorRevisar(activa)) return;
    setEditDraft({ ...activa });
  }, [activa?.id]);

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

  const guardarBorrador = useCallback(async () => {
    if (!editDraft?.id) return;
    setGuardando(true);
    try {
      const actualizada = await cotizacionCanalService.actualizar(editDraft.id, {
        servicio_nombre: editDraft.servicio_nombre,
        descripcion_problema: editDraft.descripcion_problema,
        modalidad: editDraft.modalidad,
        direccion_servicio: editDraft.direccion_servicio,
        cliente_nombre: editDraft.cliente_nombre,
        cliente_telefono: editDraft.cliente_telefono,
        repuestos: editDraft.repuestos,
        mano_obra_clp: editDraft.mano_obra_clp,
        notas_internas: editDraft.notas_internas,
        duracion_minutos_estimada: editDraft.duracion_minutos_estimada,
      });
      setActiva(actualizada);
      setEditDraft({ ...actualizada });
      await invalidate();
      await refetch();
    } catch {
      showAlert('Error', 'No se pudo guardar los cambios.');
    } finally {
      setGuardando(false);
    }
  }, [editDraft, invalidate, refetch]);

  const enviarCotizacion = useCallback(async () => {
    if (!editDraft?.id) return;
    setEnviando(true);
    try {
      if (editDraft !== activa) {
        await cotizacionCanalService.actualizar(editDraft.id, {
          servicio_nombre: editDraft.servicio_nombre,
          descripcion_problema: editDraft.descripcion_problema,
          modalidad: editDraft.modalidad,
          direccion_servicio: editDraft.direccion_servicio,
          cliente_nombre: editDraft.cliente_nombre,
          cliente_telefono: editDraft.cliente_telefono,
          repuestos: editDraft.repuestos,
          mano_obra_clp: editDraft.mano_obra_clp,
          notas_internas: editDraft.notas_internas,
          duracion_minutos_estimada: editDraft.duracion_minutos_estimada,
        });
      }
      await cotizacionCanalService.enviar(editDraft.id);
      cerrarDetalle();
      await invalidate();
      await refetch();
      qc.invalidateQueries({ queryKey: AGENTE_IA_BORRADORES_KEY });
      invalidateProveedorComercialQueries(qc);
      showAlert(
        'Cotización enviada',
        'Ya está en tu Bandeja para seguimiento. El cliente recibirá el enlace para aceptar o rechazar.',
      );
    } catch {
      showAlert('Error', 'No se pudo enviar la cotización.');
    } finally {
      setEnviando(false);
    }
  }, [activa, cerrarDetalle, editDraft, invalidate, qc, refetch]);

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
            qc.invalidateQueries({ queryKey: AGENTE_IA_BORRADORES_KEY });
            showAlert('Cotización eliminada', 'Quedó cancelada y fuera del listado.');
          } catch {
            showAlert('Error', 'No se pudo eliminar la cotización.');
          } finally {
            setEliminando(false);
          }
        },
      },
    );
  }, [activa, cerrarDetalle, invalidate, qc, refetch]);

  const borradoresCount = borradoresAgente?.count ?? borradoresPorRevisar.length;

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

        <Card
          elevated
          padding="host"
          style={styles.crearCard}
          onPress={irABandeja}
        >
          <View style={styles.crearText}>
            <Text style={styles.crearTitle}>Seguimiento en Bandeja</Text>
            <Text style={styles.crearSub}>
              Enviadas, vistas y aceptadas por agendar viven ahí — no en esta pantalla
            </Text>
          </View>
          <ChevronRight size={20} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
        </Card>

        {borradoresPorRevisar.length > 0 ? (
          <HostSectionKicker
            label={`Por revisar${borradoresCount > 0 ? ` (${borradoresCount})` : ''}`}
          />
        ) : null}
      </View>
    ),
    [borradoresCount, borradoresPorRevisar.length, irABandeja],
  );

  const renderItem = useCallback(
    ({ item }: { item: CotizacionCanal }) => (
      <CotizacionCard
        item={item}
        onPress={abrirDetalle}
        tagLabel={esBorradorAgente(item) ? 'Borrador IA · revisar' : 'Borrador'}
        tagVariant="warning"
      />
    ),
    [abrirDetalle],
  );

  const cotizacionDetalle = editDraft && esBorradorPorRevisar(editDraft) ? editDraft : activa;
  const esBorradorEditable = Boolean(cotizacionDetalle && esBorradorPorRevisar(cotizacionDetalle));
  const hayCambiosSinGuardar = useMemo(() => {
    if (!editDraft || !activa || !esBorradorEditable) return false;
    return cotizacionEditableSnapshot(editDraft) !== cotizacionEditableSnapshot(activa);
  }, [editDraft, activa, esBorradorEditable]);

  const vehiculoActiva = cotizacionDetalle
    ? [cotizacionDetalle.vehiculo_marca, cotizacionDetalle.vehiculo_modelo].filter(Boolean).join(' ')
    : '';

  if (isPending && borradoresPorRevisar.length === 0) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={I.primary} />
        <Text style={styles.loadingText}>Cargando borradores…</Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <FlatList
        data={borradoresPorRevisar}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        ListHeaderComponent={header}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={isFetching && !isPending}
            onRefresh={() => {
              void refetch();
              qc.invalidateQueries({ queryKey: AGENTE_IA_BORRADORES_KEY });
            }}
            tintColor={I.primary}
            colors={[I.primary]}
          />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <InstitutionalText role="bodyBold">Sin borradores por revisar</InstitutionalText>
            <InstitutionalText role="caption" color="muted" style={styles.emptySub}>
              Crea una cotización o espera un borrador de la IA. Lo ya enviado o aceptado está en Bandeja.
            </InstitutionalText>
            <InstitutionalButton
              label="Ir a Bandeja"
              variant="outline"
              onPress={irABandeja}
            />
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
        {cotizacionDetalle ? (
          <ScrollView
            style={styles.detalleScroll}
            contentContainerStyle={styles.detalleScrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.detalleHeader}>
              <View style={styles.detalleHeaderText}>
                <InstitutionalText role="h4">{clienteLabel(cotizacionDetalle)}</InstitutionalText>
                <InstitutionalText role="caption" color="muted">
                  {canalLabel(cotizacionDetalle)}
                  {vehiculoActiva ? ` · ${vehiculoActiva}` : ''}
                  {cotizacionDetalle.vehiculo_patente ? ` · ${cotizacionDetalle.vehiculo_patente}` : ''}
                </InstitutionalText>
                {cotizacionDetalle.estado === 'enviada' && cotizacionDetalle.visto_en ? (
                  <View style={styles.vistaRow}>
                    <Eye size={14} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
                    <InstitutionalText role="caption" color="muted">
                      Vista por el cliente · {fechaLabel(cotizacionDetalle.visto_en)}
                    </InstitutionalText>
                  </View>
                ) : null}
              </View>
              <View style={styles.detalleHeaderActions}>
                {esBorradorEditable ? (
                  <InstitutionalButton
                    label="Guardar cambios"
                    variant="outline"
                    size="compact"
                    loading={guardando}
                    disabled={!hayCambiosSinGuardar || guardando}
                    onPress={() => void guardarBorrador()}
                  />
                ) : null}
                <TouchableOpacity
                  onPress={cerrarDetalle}
                  accessibilityRole="button"
                  accessibilityLabel="Cerrar"
                  hitSlop={8}
                >
                  <X size={22} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
                </TouchableOpacity>
              </View>
            </View>

            {cotizacionDetalle.conversation ? (
              <InstitutionalButton
                label="Abrir chat del cliente"
                variant="outline"
                size="compact"
                leading={
                  <MessageCircle size={16} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
                }
                onPress={() => {
                  const id = cotizacionDetalle.conversation;
                  cerrarDetalle();
                  if (id) router.push(`/chat-omnicanal?conversationId=${id}`);
                }}
              />
            ) : null}

            <CotizacionIaEditor
              cotizacion={cotizacionDetalle}
              readonly={!esBorradorEditable}
              onChange={esBorradorEditable ? setEditDraft : () => undefined}
            />

            <View style={styles.sheetActions}>
              {cotizacionDetalle.estado === 'aceptada' && cotizacionDetalle.cita_personal_id ? (
                <InstitutionalButton
                  label="Confirmar horario"
                  variant="primary"
                  onPress={() => {
                    const citaId = cotizacionDetalle.cita_personal_id;
                    cerrarDetalle();
                    if (citaId) router.push(`/cita-agenda-personal/${citaId}?agendar=1`);
                  }}
                />
              ) : null}
              {(cotizacionDetalle.share_url || cotizacionDetalle.url_publica) ? (
                <InstitutionalButton
                  label="Compartir link"
                  variant="outline"
                  leading={
                    <Link2 size={18} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
                  }
                  onPress={() => {
                    const url = cotizacionDetalle.share_url || cotizacionDetalle.url_publica;
                    if (url) void compartirLink(url);
                  }}
                />
              ) : null}
              {cotizacionDetalle.estado !== 'aceptada' ? (
                <View style={styles.primaryActionsRow}>
                  <InstitutionalButton
                    label="Eliminar"
                    variant="destructiveOutline"
                    loading={eliminando}
                    style={styles.actionColSmall}
                    leading={
                      <Trash2 size={18} color={I.semanticDown} strokeWidth={ICON_STROKE_WIDTH} />
                    }
                    onPress={eliminarCotizacion}
                  />
                  {esBorradorEditable ? (
                    <InstitutionalButton
                      label="Enviar cotización"
                      variant="primary"
                      loading={enviando}
                      style={styles.actionColLarge}
                      onPress={() => void enviarCotizacion()}
                    />
                  ) : null}
                </View>
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
    gap: SPACING.sm,
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
  detalleHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    flexShrink: 0,
  },
  detalleHeaderText: { flex: 1, minWidth: 0, gap: 2 },
  vistaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginTop: SPACING.xs,
  },
  sheetActions: { gap: SPACING.sm, paddingBottom: SPACING.sm },
  primaryActionsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: SPACING.sm,
  },
  actionColSmall: {
    flex: 1,
  },
  actionColLarge: {
    flex: 1.4,
  },
});

export default CotizacionesIaList;
