import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  TextInput,
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
  Link2,
  MessageCircle,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react-native';
import { CotizacionLibreModal } from '@/components/chats/CotizacionLibreModal';
import { CotizacionIaEditor } from '@/components/chats/CotizacionIaEditor';
import { CotizacionPendienteRow } from '@/components/home/CotizacionPendienteRow';
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
  HostSectionKicker,
  hostScreenStyles,
} from '@/app/design-system/components';
import { BORDERS, COLORS, SPACING, TYPOGRAPHY, SHADOWS } from '@/app/design-system/tokens';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import { institutionalInputStyles, institutionalInputPlaceholder } from '@/app/design-system/styles/institutionalInputs';
import { showAlert, showConfirm } from '@/utils/platformAlert';
import { useQueryClient } from '@tanstack/react-query';

const I = COLORS.institutional;
const FF = TYPOGRAPHY.fontFamily;

function esBorradorPorRevisar(cot: CotizacionCanal): boolean {
  return cot.estado === 'borrador';
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

function clienteLabel(cot: CotizacionCanal): string {
  return (
    cot.cliente_display
    || cot.cliente_nombre
    || [cot.vehiculo_marca, cot.vehiculo_modelo].filter(Boolean).join(' ')
    || 'Cliente'
  );
}

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
  const [searchQuery, setSearchQuery] = useState('');

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

  const borradoresFiltrados = useMemo(() => {
    if (!searchQuery.trim()) return borradoresPorRevisar;
    const q = searchQuery.trim().toLowerCase();
    return borradoresPorRevisar.filter((item) => {
      const cliente = clienteLabel(item).toLowerCase();
      const servicio = (item.servicio_nombre || '').toLowerCase();
      const patente = (item.vehiculo_patente || '').toLowerCase();
      const marca = (item.vehiculo_marca || '').toLowerCase();
      const modelo = (item.vehiculo_modelo || '').toLowerCase();
      return (
        cliente.includes(q) ||
        servicio.includes(q) ||
        patente.includes(q) ||
        marca.includes(q) ||
        modelo.includes(q)
      );
    });
  }, [borradoresPorRevisar, searchQuery]);

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
        <View style={styles.searchWrap}>
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar por cliente, servicio, patente o vehículo…"
            placeholderTextColor={institutionalInputPlaceholder}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        {borradoresFiltrados.length > 0 ? (
          <HostSectionKicker
            label={`Por revisar${borradoresCount > 0 ? ` (${borradoresFiltrados.length})` : ''}`}
          />
        ) : null}
      </View>
    ),
    [borradoresCount, borradoresFiltrados.length, searchQuery],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: CotizacionCanal; index: number }) => {
      const last = index === borradoresFiltrados.length - 1;
      return (
        <View
          style={[
            styles.paperListItem,
            index === 0 && styles.paperListFirst,
            last && styles.paperListLast,
          ]}
        >
          <CotizacionPendienteRow item={item} onPress={abrirDetalle} last={last} />
        </View>
      );
    },
    [abrirDetalle, borradoresFiltrados.length],
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
        data={borradoresFiltrados}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderItem}
        ListHeaderComponent={header}
        contentContainerStyle={styles.list}
        style={styles.listFlex}
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

      {/* Sticky inferior Host: crear cotización */}
      <View style={styles.stickyCrear}>
        <InstitutionalButton
          label="Nueva cotización"
          variant="primary"
          leading={<Sparkles size={18} color={I.onPrimary} strokeWidth={ICON_STROKE_WIDTH} />}
          onPress={() => setLibreVisible(true)}
        />
        <InstitutionalText role="caption" color="body" style={styles.stickyHint}>
          Cliente de Mensajes o link público
        </InstitutionalText>
      </View>

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
          <View style={styles.detalleRoot}>
            <View style={styles.detalleHeader}>
              <View style={styles.detalleHeaderText}>
                <InstitutionalText role="h4">{clienteLabel(cotizacionDetalle)}</InstitutionalText>
                <InstitutionalText role="caption" color="muted">
                  {vehiculoActiva || 'Vehículo'}
                  {cotizacionDetalle.vehiculo_patente ? ` · ${cotizacionDetalle.vehiculo_patente}` : ''}
                </InstitutionalText>
              </View>
              {cotizacionDetalle.conversation ? (
                <TouchableOpacity
                  style={styles.headerIconBtn}
                  onPress={() => {
                    const id = cotizacionDetalle.conversation;
                    cerrarDetalle();
                    if (id) router.push(`/chat-omnicanal?conversationId=${id}`);
                  }}
                  accessibilityLabel="Abrir chat"
                >
                  <MessageCircle size={20} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
                </TouchableOpacity>
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

            <ScrollView
              style={styles.detalleScroll}
              contentContainerStyle={styles.detalleScrollContent}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <CotizacionIaEditor
                cotizacion={cotizacionDetalle}
                readonly={!esBorradorEditable}
                onChange={esBorradorEditable ? setEditDraft : () => undefined}
              />
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
            </ScrollView>

            <View style={styles.detalleFooter}>
              {cotizacionDetalle.estado !== 'aceptada' ? (
                <TouchableOpacity
                  style={styles.footerGhost}
                  onPress={eliminarCotizacion}
                  disabled={eliminando}
                >
                  <Trash2 size={18} color={I.semanticDown} strokeWidth={ICON_STROKE_WIDTH} />
                  <Text style={styles.footerGhostLabel}>Eliminar</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.footerGhost} />
              )}
              {esBorradorEditable ? (
                <InstitutionalButton
                  label="Guardar"
                  variant="outline"
                  size="compact"
                  loading={guardando}
                  disabled={!hayCambiosSinGuardar || guardando}
                  style={styles.footerMid}
                  onPress={() => void guardarBorrador()}
                />
              ) : null}
              {esBorradorEditable ? (
                <InstitutionalButton
                  label="Aprobar y enviar"
                  variant="primary"
                  size="compact"
                  loading={enviando}
                  style={styles.footerPrimary}
                  onPress={() => void enviarCotizacion()}
                />
              ) : cotizacionDetalle.estado === 'aceptada' && cotizacionDetalle.cita_personal_id ? (
                <InstitutionalButton
                  label="Confirmar horario"
                  variant="primary"
                  size="compact"
                  style={styles.footerPrimary}
                  onPress={() => {
                    const citaId = cotizacionDetalle.cita_personal_id;
                    cerrarDetalle();
                    if (citaId) router.push(`/cita-agenda-personal/${citaId}?agendar=1`);
                  }}
                />
              ) : null}
            </View>
          </View>
        ) : null}
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: I.canvas },
  listFlex: { flex: 1 },
  list: {
    ...hostScreenStyles.scrollInner,
    paddingBottom: SPACING.sm,
    gap: 0,
  },
  headerBlock: {
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  searchWrap: {
    marginTop: SPACING.xs,
  },
  searchInput: {
    ...institutionalInputStyles.input,
    backgroundColor: COLORS.background.paper,
    minHeight: 48,
  },
  /** Un solo paper Host para toda la lista (no una card por fila). */
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
    marginBottom: SPACING.sm,
    ...SHADOWS.editorial,
  },
  stickyCrear: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: I.hairline,
    backgroundColor: COLORS.background.paper,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.md,
    gap: 4,
    ...SHADOWS.editorial,
  },
  stickyHint: {
    textAlign: 'center',
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
  detalleRoot: {
    flexGrow: 1,
    maxHeight: '100%',
  },
  detalleScroll: {
    flexGrow: 1,
    maxHeight: '70%',
  },
  detalleScrollContent: {
    gap: SPACING.md,
    paddingBottom: SPACING.md,
  },
  detalleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  detalleHeaderText: { flex: 1, minWidth: 0, gap: 2 },
  headerIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: I.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detalleFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingTop: SPACING.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: I.hairline,
  },
  footerGhost: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    minWidth: 56,
  },
  footerGhostLabel: {
    fontFamily: FF.sansRegular,
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: I.semanticDown,
  },
  footerMid: { flex: 1 },
  footerPrimary: { flex: 1.35 },
});

export default CotizacionesIaList;
