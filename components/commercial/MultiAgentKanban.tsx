import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import {
  Bot,
  Calendar,
  Car,
  CheckCircle2,
  ChevronRight,
  Clock,
  Filter,
  MessageCircle,
  Plus,
  RefreshCw,
  Sparkles,
  User,
  Wrench,
  XCircle,
} from 'lucide-react-native';
import { COLORS, SPACING, BORDERS, TYPOGRAPHY } from '@/app/design-system/tokens';
import {
  Card,
  HostSectionKicker,
  InstitutionalButton,
  InstitutionalTag,
  InstitutionalText,
} from '@/app/design-system/components';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import { formatearMontoCLP } from '@/utils/formatearMontoCLP';
import {
  usePipelineComercialQuery,
  useInvalidatePipelineComercial,
} from '@/hooks/usePipelineComercialQuery';
import { useChatInboxQuery } from '@/hooks/useChatInboxQuery';
import type { PipelineComercialItem } from '@/services/pipelineComercialService';
import { KanbanDetailModal } from '@/components/commercial/KanbanDetailModal';
import { MotivoRechazoModal } from '@/components/commercial/MotivoRechazoModal';
import cotizacionCanalService from '@/services/cotizacionCanalService';
import { showAlert } from '@/utils/platformAlert';

const I = COLORS.institutional;
const FF = TYPOGRAPHY.fontFamily;

export type ColumnaKanban = 'captura_ia' | 'revision_hitl' | 'agendamiento_ia' | 'rechazados';

export function MultiAgentKanban() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 992;

  // Real pipeline data query & Chat inbox query
  const { data, isPending, refetch } = usePipelineComercialQuery({
    limite: 100,
    fetchAllEstados: true,
  });
  const { data: inboxChats = [], refetch: refetchInbox } = useChatInboxQuery();
  const invalidatePipeline = useInvalidatePipelineComercial();

  const leads: PipelineComercialItem[] = useMemo(() => data?.results ?? [], [data?.results]);

  // Mobile column tab state
  const [activeColMobile, setActiveColMobile] = useState<ColumnaKanban>('revision_hitl');
  const [filterOrigen, setFilterOrigen] = useState<'todos' | 'marketplace' | 'omnicanal'>('todos');

  // Modals state
  const [selectedLeadModal, setSelectedLeadModal] = useState<PipelineComercialItem | null>(null);
  const [modalDetailVisible, setModalDetailVisible] = useState(false);
  const [modalRechazoVisible, setModalRechazoVisible] = useState(false);
  const [cotizacionIdRechazar, setCotizacionIdRechazar] = useState<number | null>(null);
  const [aprobandoId, setAprobandoId] = useState<number | null>(null);

  // Group leads into the 4 columns based on their state
  // 1. Column 1: Captura IA (Agente 1 SDR) - Leads/chats sin borrador aún
  const columnaCapturaIa = useMemo(() => {
    const pipelineItems = leads.filter(
      (l) => !l.cotizacion_id && (l.estado_normalizado === 'nuevo' || l.estado_normalizado === 'en_negociacion'),
    );
    const existingConvIds = new Set(
      leads.map((l) => String(l.conversation_id)).filter((id) => id && id !== 'null'),
    );

    const unhandledInboxItems: PipelineComercialItem[] = inboxChats
      .filter((chat) => chat.conversation_id && !existingConvIds.has(String(chat.conversation_id)) && !chat.cotizacion_id)
      .map((chat) => ({
        tipo_entidad: 'cotizacion_canal',
        entidad_id: `inbox-${chat.conversation_id}`,
        origen: chat.channel || 'whatsapp',
        estado_normalizado: 'nuevo',
        estado_raw: 'nuevo',
        cliente_nombre: chat.otra_persona?.nombre || 'Nuevo Cliente WhatsApp',
        cliente_telefono: chat.otra_persona?.telefono || '',
        vehiculo_resumen: chat.vehiculo
          ? `${chat.vehiculo.marca || ''} ${chat.vehiculo.modelo || ''}`.trim()
          : 'Por detectar por IA',
        servicio_resumen:
          chat.ultimo_mensaje?.mensaje || chat.cotizacion_servicio || 'Mensaje entrante',
        monto_clp: null,
        fecha_referencia: chat.ultimo_mensaje?.fecha_envio || null,
        fecha_limite_respuesta: null,
        tiempo_en_estado_horas: null,
        esperando_respuesta_24h: Boolean(chat.cliente_sin_responder),
        conversation_id: Number(chat.conversation_id) || null,
        solicitud_id: chat.solicitud_id,
        oferta_id: chat.oferta_id,
        orden_id: null,
        cita_id: null,
        cotizacion_id: chat.cotizacion_id || null,
        miembro_taller_id: null,
        miembro_taller_nombre: null,
      }));

    return [...unhandledInboxItems, ...pipelineItems];
  }, [leads, inboxChats]);

  // 2. Column 2: Revisión de Cotización (Human-in-the-Loop) - Borradores generados por la IA esperando aprobación
  const columnaRevisionHitl = useMemo(() => {
    const fromPipeline = leads.filter(
      (l) =>
        Boolean(l.cotizacion_id || l.listo_para_enviar) &&
        l.estado_normalizado !== 'aceptado_agendado' &&
        l.estado_normalizado !== 'rechazado_perdido' &&
        l.estado_normalizado !== 'completado' &&
        l.estado_raw !== 'enviada',
    );
    const existingIds = new Set(fromPipeline.map((l) => l.entidad_id));

    const fromInbox: PipelineComercialItem[] = inboxChats
      .filter((chat) => chat.cotizacion_id && (chat.cotizacion_estado === 'borrador' || !chat.cotizacion_estado))
      .map((chat) => ({
        tipo_entidad: 'cotizacion_canal',
        entidad_id: `inbox-borrador-${chat.cotizacion_id}`,
        origen: chat.channel || 'whatsapp',
        estado_normalizado: 'en_negociacion',
        estado_raw: 'borrador',
        cliente_nombre: chat.otra_persona?.nombre || 'Cliente WhatsApp',
        cliente_telefono: chat.otra_persona?.telefono || '',
        vehiculo_resumen: chat.vehiculo
          ? `${chat.vehiculo.marca || ''} ${chat.vehiculo.modelo || ''}`.trim()
          : 'Vehículo en borrador',
        servicio_resumen: chat.cotizacion_servicio || 'Cotización borrador IA',
        monto_clp: null,
        fecha_referencia: chat.ultimo_mensaje?.fecha_envio || null,
        fecha_limite_respuesta: null,
        tiempo_en_estado_horas: null,
        esperando_respuesta_24h: false,
        conversation_id: Number(chat.conversation_id) || null,
        solicitud_id: chat.solicitud_id,
        oferta_id: chat.oferta_id,
        orden_id: null,
        cita_id: null,
        cotizacion_id: chat.cotizacion_id || null,
        miembro_taller_id: null,
        miembro_taller_nombre: null,
        listo_para_enviar: true,
      }))
      .filter((item) => !existingIds.has(item.entidad_id));

    return [...fromPipeline, ...fromInbox];
  }, [leads, inboxChats]);

  // 3. Column 3: Agendamiento IA (Agente 2 Cierre) - Cotizaciones enviadas negociando fecha
  const columnaAgendamientoIa = useMemo(
    () =>
      leads.filter(
        (l) =>
          l.estado_raw === 'enviada' ||
          l.estado_normalizado === 'cotizacion_enviada' ||
          l.estado_normalizado === 'aceptado_agendado' ||
          l.estado_normalizado === 'en_ejecucion',
      ),
    [leads],
  );

  // 4. Column 4: Rechazados & Perdidos
  const columnaRechazados = useMemo(
    () =>
      leads.filter(
        (l) =>
          l.estado_normalizado === 'rechazado_perdido' ||
          l.estado_normalizado === 'completado' ||
          l.estado_raw === 'rechazada' ||
          l.estado_raw === 'cancelada',
      ),
    [leads],
  );

  const filterItemOrigen = (item: PipelineComercialItem) => {
    if (filterOrigen === 'marketplace') {
      return item.origen === 'marketplace' || item.origen === 'catalogo';
    }
    if (filterOrigen === 'omnicanal') {
      return item.origen !== 'marketplace' && item.origen !== 'catalogo';
    }
    return true;
  };

  const handleOpenLead = (lead: PipelineComercialItem) => {
    setSelectedLeadModal(lead);
    setModalDetailVisible(true);
  };

  // Direct 1-Click Approve in Column 2
  const handleAprobarRapido = useCallback(
    async (lead: PipelineComercialItem) => {
      if (!lead.cotizacion_id) return;
      setAprobandoId(lead.cotizacion_id);
      try {
        await cotizacionCanalService.enviar(lead.cotizacion_id);
        showAlert(
          'Cotización Aprobada',
          'La cotización fue enviada y el Agente 2 (Agenda) ha tomado el control conversacional.',
        );
        invalidatePipeline();
        void refetch();
      } catch {
        showAlert('Error', 'No se pudo enviar la cotización.');
      } finally {
        setAprobandoId(null);
      }
    },
    [invalidatePipeline, refetch],
  );

  const handleOpenRechazoModal = (cotizacionId: number) => {
    setCotizacionIdRechazar(cotizacionId);
    setModalRechazoVisible(true);
  };

  return (
    <View style={styles.container}>
      {/* Header Bar */}
      <View style={styles.kanbanHeader}>
        <View style={styles.titleRow}>
          <HostSectionKicker label="KANBAN COMERCIAL MULTI-AGENTE" />
          <TouchableOpacity onPress={() => refetch()} hitSlop={8}>
            <RefreshCw size={14} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
          </TouchableOpacity>
        </View>

        {/* Clean Minimalist Filters */}
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[styles.filterChip, filterOrigen === 'todos' && styles.filterChipActive]}
            onPress={() => setFilterOrigen('todos')}
          >
            <Text style={[styles.filterText, filterOrigen === 'todos' && styles.filterTextActive]}>
              Todos ({leads.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, filterOrigen === 'marketplace' && styles.filterChipActive]}
            onPress={() => setFilterOrigen('marketplace')}
          >
            <Text style={[styles.filterText, filterOrigen === 'marketplace' && styles.filterTextActive]}>
              Marketplace App
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterChip, filterOrigen === 'omnicanal' && styles.filterChipActive]}
            onPress={() => setFilterOrigen('omnicanal')}
          >
            <Text style={[styles.filterText, filterOrigen === 'omnicanal' && styles.filterTextActive]}>
              WhatsApp / Omnicanal
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Mobile Column Navigation Tabs */}
      {!isDesktop ? (
        <View style={styles.mobileTabs}>
          <TouchableOpacity
            style={[styles.mobileTab, activeColMobile === 'captura_ia' && styles.mobileTabActive]}
            onPress={() => setActiveColMobile('captura_ia')}
          >
            <Bot size={14} color={activeColMobile === 'captura_ia' ? I.primary : I.muted} strokeWidth={ICON_STROKE_WIDTH} />
            <Text style={[styles.mobileTabText, activeColMobile === 'captura_ia' && styles.mobileTabTextActive]}>
              Captura IA ({columnaCapturaIa.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.mobileTab, activeColMobile === 'revision_hitl' && styles.mobileTabActive]}
            onPress={() => setActiveColMobile('revision_hitl')}
          >
            <Clock size={14} color={activeColMobile === 'revision_hitl' ? I.primary : I.muted} strokeWidth={ICON_STROKE_WIDTH} />
            <Text style={[styles.mobileTabText, activeColMobile === 'revision_hitl' && styles.mobileTabTextActive]}>
              Revisión ({columnaRevisionHitl.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.mobileTab, activeColMobile === 'agendamiento_ia' && styles.mobileTabActive]}
            onPress={() => setActiveColMobile('agendamiento_ia')}
          >
            <Calendar size={14} color={activeColMobile === 'agendamiento_ia' ? I.primary : I.muted} strokeWidth={ICON_STROKE_WIDTH} />
            <Text style={[styles.mobileTabText, activeColMobile === 'agendamiento_ia' && styles.mobileTabTextActive]}>
              Agenda ({columnaAgendamientoIa.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.mobileTab, activeColMobile === 'rechazados' && styles.mobileTabActive]}
            onPress={() => setActiveColMobile('rechazados')}
          >
            <XCircle size={14} color={activeColMobile === 'rechazados' ? I.primary : I.muted} strokeWidth={ICON_STROKE_WIDTH} />
            <Text style={[styles.mobileTabText, activeColMobile === 'rechazados' && styles.mobileTabTextActive]}>
              Rechazados ({columnaRechazados.length})
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* Responsive Kanban Columns Body */}
      <View style={styles.gridBody}>
        {/* COLUMN 1: Captura IA (Agente 1 SDR) */}
        {(isDesktop || activeColMobile === 'captura_ia') ? (
          <View style={[styles.colContainer, !isDesktop && styles.colFull]}>
            <View style={styles.colHeader}>
              <Bot size={16} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
              <Text style={styles.colTitle}>1. Captura IA (Agente 1)</Text>
              <View style={styles.badgeCount}>
                <Text style={styles.badgeText}>{columnaCapturaIa.length}</Text>
              </View>
            </View>

            <ScrollView contentContainerStyle={styles.colScrollContent}>
              {columnaCapturaIa.filter(filterItemOrigen).map((lead) => {
                const isMarketplace = lead.origen === 'marketplace' || lead.origen === 'catalogo';
                return (
                  <Card
                    key={lead.entidad_id}
                    elevated
                    padding="host"
                    style={[styles.kanbanCard, isMarketplace && styles.goldCard]}
                    onPress={() => handleOpenLead(lead)}
                  >
                    <View style={styles.cardHeaderRow}>
                      <InstitutionalTag
                        label={isMarketplace ? 'Marketplace' : 'Omnicanal'}
                        variant={isMarketplace ? 'primary' : 'info'}
                        size="sm"
                      />
                      <InstitutionalTag label="Capturando" variant="warning" size="sm" />
                    </View>

                    <Text style={styles.clientName} numberOfLines={1}>{lead.cliente_nombre || 'Lead en captura'}</Text>
                    <Text style={styles.vehicleText} numberOfLines={1}>{lead.vehiculo_resumen || 'Vehículo por detectar'}</Text>
                    <Text style={styles.serviceText} numberOfLines={2}>{lead.servicio_resumen || 'Consulta general'}</Text>

                    <TouchableOpacity style={styles.cardFooterBtn} onPress={() => handleOpenLead(lead)}>
                      <Text style={styles.cardFooterBtnText}>Ver Chat & Datos</Text>
                    </TouchableOpacity>
                  </Card>
                );
              })}
            </ScrollView>
          </View>
        ) : null}

        {/* COLUMN 2: Revisión HITL (Human-in-the-Loop) */}
        {(isDesktop || activeColMobile === 'revision_hitl') ? (
          <View style={[styles.colContainer, !isDesktop && styles.colFull]}>
            <View style={styles.colHeader}>
              <Clock size={16} color={I.accentYellow} strokeWidth={ICON_STROKE_WIDTH} />
              <Text style={styles.colTitle}>2. Revisión Cotización (HITL)</Text>
              <View style={[styles.badgeCount, styles.badgeHitl]}>
                <Text style={styles.badgeText}>{columnaRevisionHitl.length}</Text>
              </View>
            </View>

            <ScrollView contentContainerStyle={styles.colScrollContent}>
              {columnaRevisionHitl.filter(filterItemOrigen).map((lead) => {
                const isMarketplace = lead.origen === 'marketplace' || lead.origen === 'catalogo';
                const isAprobando = aprobandoId === lead.cotizacion_id;

                return (
                  <Card
                    key={lead.entidad_id}
                    elevated
                    padding="host"
                    style={[styles.kanbanCard, styles.hitlCard, isMarketplace && styles.goldCard]}
                    onPress={() => handleOpenLead(lead)}
                  >
                    <View style={styles.cardHeaderRow}>
                      <InstitutionalTag
                        label={isMarketplace ? 'Marketplace App' : 'WhatsApp'}
                        variant={isMarketplace ? 'primary' : 'info'}
                        size="sm"
                      />
                      <InstitutionalTag label="Borrador Listo" variant="success" size="sm" />
                    </View>

                    <Text style={styles.clientName} numberOfLines={1}>{lead.cliente_nombre || 'Cliente'}</Text>
                    <Text style={styles.vehicleText} numberOfLines={1}>{lead.vehiculo_resumen || 'Vehículo sin especificar'}</Text>

                    {lead.monto_clp ? (
                      <Text style={styles.priceHighlight}>{formatearMontoCLP(lead.monto_clp)}</Text>
                    ) : null}

                    <View style={styles.hitlActionsRow}>
                      <InstitutionalButton
                        label={isAprobando ? 'Aprobando...' : 'Aprobar y activar agenda'}
                        variant="primary"
                        size="compact"
                        disabled={isAprobando}
                        onPress={() => handleAprobarRapido(lead)}
                        style={styles.tinderBtn}
                      />
                    </View>
                  </Card>
                );
              })}
            </ScrollView>
          </View>
        ) : null}

        {/* COLUMN 3: Agendamiento IA (Agente 2 Cierre) */}
        {(isDesktop || activeColMobile === 'agendamiento_ia') ? (
          <View style={[styles.colContainer, !isDesktop && styles.colFull]}>
            <View style={styles.colHeader}>
              <Calendar size={16} color={I.semanticUp} strokeWidth={ICON_STROKE_WIDTH} />
              <Text style={styles.colTitle}>3. Agendamiento IA (Agente 2)</Text>
              <View style={[styles.badgeCount, styles.badgeAgendamiento]}>
                <Text style={styles.badgeText}>{columnaAgendamientoIa.length}</Text>
              </View>
            </View>

            <ScrollView contentContainerStyle={styles.colScrollContent}>
              {columnaAgendamientoIa.filter(filterItemOrigen).map((lead) => {
                return (
                  <Card
                    key={lead.entidad_id}
                    elevated
                    padding="host"
                    style={styles.kanbanCard}
                    onPress={() => handleOpenLead(lead)}
                  >
                    <View style={styles.cardHeaderRow}>
                      <InstitutionalTag label="Enviada" variant="success" size="sm" />
                      <InstitutionalTag label="Agendando" variant="info" size="sm" />
                    </View>

                    <Text style={styles.clientName} numberOfLines={1}>{lead.cliente_nombre || 'Cliente'}</Text>
                    <Text style={styles.vehicleText} numberOfLines={1}>{lead.vehiculo_resumen || 'Vehículo'}</Text>

                    <View style={styles.slotsSuggestBox}>
                      <Text style={styles.slotsSuggestTitle}>Bloques sugeridos:</Text>
                      <Text style={styles.slotItem} numberOfLines={1}>Hoy 16:00 · Mañana 10:30 · Mañana 15:00</Text>
                    </View>
                  </Card>
                );
              })}
            </ScrollView>
          </View>
        ) : null}

        {/* COLUMN 4: Rechazados & Perdidos */}
        {(isDesktop || activeColMobile === 'rechazados') ? (
          <View style={[styles.colContainer, !isDesktop && styles.colFull]}>
            <View style={styles.colHeader}>
              <XCircle size={16} color={I.semanticDown} strokeWidth={ICON_STROKE_WIDTH} />
              <Text style={styles.colTitle}>4. Rechazados & Perdidos</Text>
              <View style={[styles.badgeCount, styles.badgeRechazados]}>
                <Text style={styles.badgeText}>{columnaRechazados.length}</Text>
              </View>
            </View>

            <ScrollView contentContainerStyle={styles.colScrollContent}>
              {columnaRechazados.filter(filterItemOrigen).map((lead) => {
                return (
                  <Card
                    key={lead.entidad_id}
                    elevated
                    padding="host"
                    style={styles.kanbanCard}
                    onPress={() => handleOpenLead(lead)}
                  >
                    <View style={styles.cardHeaderRow}>
                      <InstitutionalTag label="Archivado" variant="neutral" size="sm" />
                      {lead.cotizacion_id ? (
                        <TouchableOpacity
                          onPress={() => handleOpenRechazoModal(lead.cotizacion_id!)}
                          hitSlop={6}
                        >
                          <Text style={styles.motivoLink}>Ver Motivo</Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>

                    <Text style={styles.clientName} numberOfLines={1}>{lead.cliente_nombre || 'Cliente'}</Text>
                    <Text style={styles.vehicleText} numberOfLines={1}>{lead.vehiculo_resumen || 'Vehículo'}</Text>
                  </Card>
                );
              })}
            </ScrollView>
          </View>
        ) : null}
      </View>

      {/* Detail Modal */}
      <KanbanDetailModal
        visible={modalDetailVisible}
        onClose={() => setModalDetailVisible(false)}
        leadItem={selectedLeadModal}
        onAprobadoExitoso={() => {
          invalidatePipeline();
          void refetch();
        }}
        onAbrirModalRechazo={(cotId) => handleOpenRechazoModal(cotId)}
      />

      {/* Motivo Rechazo Modal */}
      {cotizacionIdRechazar ? (
        <MotivoRechazoModal
          visible={modalRechazoVisible}
          onClose={() => setModalRechazoVisible(false)}
          cotizacionId={cotizacionIdRechazar}
          onRechazadoExitoso={() => {
            invalidatePipeline();
            void refetch();
          }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: I.canvas,
  },
  kanbanHeader: {
    padding: SPACING.fixed.sm,
    gap: SPACING.fixed.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: I.hairline,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: BORDERS.radius.sm,
    backgroundColor: I.canvas,
    borderWidth: 1,
    borderColor: I.hairline,
  },
  filterChipActive: {
    backgroundColor: I.primary,
    borderColor: I.primary,
  },
  filterText: {
    fontFamily: FF.sansRegular,
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: I.ink,
  },
  filterTextActive: {
    color: '#FFFFFF',
    fontFamily: FF.sansSemiBold,
  },
  mobileTabs: {
    flexDirection: 'row',
    backgroundColor: I.canvas,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: I.hairline,
  },
  mobileTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: SPACING.fixed.xs,
  },
  mobileTabActive: {
    borderBottomWidth: 2,
    borderBottomColor: I.primary,
  },
  mobileTabText: {
    fontFamily: FF.sansRegular,
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: I.muted,
  },
  mobileTabTextActive: {
    fontFamily: FF.sansSemiBold,
    color: I.primary,
  },
  gridBody: {
    flex: 1,
    flexDirection: 'row',
    padding: SPACING.fixed.xs,
    gap: SPACING.fixed.xs,
    overflow: 'hidden',
  },
  colContainer: {
    flex: 1,
    minWidth: 260,
    maxWidth: 380,
    backgroundColor: I.canvas,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: I.hairline,
    borderRadius: BORDERS.radius.md,
  },
  colFull: {
    width: '100%',
    maxWidth: '100%',
    flex: 1,
  },
  colHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.xs,
    padding: SPACING.fixed.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: I.hairline,
  },
  colTitle: {
    fontFamily: FF.sansSemiBold,
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: I.ink,
    flex: 1,
  },
  badgeCount: {
    backgroundColor: I.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeHitl: {
    backgroundColor: I.accentYellow,
  },
  badgeAgendamiento: {
    backgroundColor: I.semanticUp,
  },
  badgeRechazados: {
    backgroundColor: I.semanticDown,
  },
  badgeText: {
    color: '#FFFFFF',
    fontFamily: FF.sansBold,
    fontSize: 10,
  },
  colScrollContent: {
    padding: SPACING.fixed.xs,
    gap: SPACING.fixed.xs,
  },
  kanbanCard: {
    gap: SPACING.fixed.xs,
  },
  hitlCard: {
    borderColor: I.accentYellow,
    borderWidth: 1.5,
  },
  goldCard: {
    borderColor: I.primary,
    borderWidth: 1.5,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 4,
  },
  clientName: {
    fontFamily: FF.sansSemiBold,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: I.ink,
  },
  vehicleText: {
    fontFamily: FF.sansRegular,
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: I.muted,
  },
  serviceText: {
    fontFamily: FF.sansRegular,
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: I.body,
  },
  priceHighlight: {
    fontFamily: FF.sansBold,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: I.primary,
  },
  cardFooterBtn: {
    marginTop: 2,
    paddingVertical: 2,
  },
  cardFooterBtnText: {
    fontFamily: FF.sansSemiBold,
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: I.primary,
  },
  hitlActionsRow: {
    marginTop: 4,
  },
  tinderBtn: {
    backgroundColor: I.primary,
  },
  slotsSuggestBox: {
    marginTop: 4,
    gap: 2,
    backgroundColor: I.canvas,
    padding: 6,
    borderRadius: BORDERS.radius.sm,
    borderWidth: 1,
    borderColor: I.hairline,
  },
  slotsSuggestTitle: {
    fontFamily: FF.sansSemiBold,
    fontSize: 10,
    color: I.ink,
  },
  slotItem: {
    fontFamily: FF.sansRegular,
    fontSize: 10,
    color: I.muted,
  },
  motivoLink: {
    fontFamily: FF.sansSemiBold,
    fontSize: 10,
    color: I.semanticDown,
    textDecorationLine: 'underline',
  },
});
