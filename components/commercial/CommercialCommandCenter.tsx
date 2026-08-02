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
import { router } from 'expo-router';
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
import type { PipelineComercialItem, OrigenPipeline } from '@/services/pipelineComercialService';
import cotizacionCanalService from '@/services/cotizacionCanalService';
import agenteIaService from '@/services/agenteIaService';
import { showAlert } from '@/utils/platformAlert';
import { omnichannelChatHref } from '@/utils/chatRoutes';
import { AgendarDesdeCanalModal } from '@/components/chats/AgendarDesdeCanalModal';
import { CotizacionAdicionalModal } from '@/components/ordenes/CotizacionAdicionalModal';

const I = COLORS.institutional;
const FF = TYPOGRAPHY.fontFamily;

export function CommercialCommandCenter() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 992;

  // Real pipeline data query
  const { data, isPending, error, refetch } = usePipelineComercialQuery({
    limite: 100,
    fetchAllEstados: true,
  });
  const invalidatePipeline = useInvalidatePipelineComercial();

  const leads: PipelineComercialItem[] = useMemo(() => data?.results ?? [], [data?.results]);

  const [activeTabMobile, setActiveTabMobile] = useState<'pipeline' | 'chat' | 'ficha'>('pipeline');
  const [selectedEntidadId, setSelectedEntidadId] = useState<string | null>(null);
  const [filterOrigen, setFilterOrigen] = useState<'todos' | 'marketplace' | 'omnicanal'>('todos');
  const [filterEstado, setFilterEstado] = useState<string>('todos');

  // Modals state
  const [agendarModalVisible, setAgendarModalVisible] = useState(false);
  const [adicionalModalVisible, setAdicionalModalVisible] = useState(false);
  const [enviandoCotizacion, setEnviandoCotizacion] = useState(false);
  const [pausandoIa, setPausandoIa] = useState(false);

  // Filtered leads
  const leadsFiltrados = useMemo(() => {
    return leads.filter((lead) => {
      if (filterOrigen === 'marketplace' && lead.origen !== 'marketplace' && lead.origen !== 'catalogo') {
        return false;
      }
      if (filterOrigen === 'omnicanal' && (lead.origen === 'marketplace' || lead.origen === 'catalogo')) {
        return false;
      }
      if (filterEstado !== 'todos' && lead.estado_normalizado !== filterEstado) {
        return false;
      }
      return true;
    });
  }, [leads, filterOrigen, filterEstado]);

  // Currently selected lead item (fallback to first item)
  const selectedLead = useMemo(() => {
    if (!leads.length) return null;
    if (selectedEntidadId) {
      const found = leads.find((l) => l.entidad_id === selectedEntidadId);
      if (found) return found;
    }
    return leads[0];
  }, [leads, selectedEntidadId]);

  const handleSelectLead = useCallback(
    (lead: PipelineComercialItem) => {
      setSelectedEntidadId(lead.entidad_id);
      if (!isDesktop) {
        setActiveTabMobile('chat');
      }
    },
    [isDesktop],
  );

  // Action: Send Quotation to Chat (REAL API CALL)
  const handleEnviarCotizacion = useCallback(async () => {
    if (!selectedLead?.cotizacion_id) {
      showAlert('Sin cotización', 'Este registro no tiene un borrador de cotización asignado.');
      return;
    }
    setEnviandoCotizacion(true);
    try {
      await cotizacionCanalService.enviar(selectedLead.cotizacion_id);
      showAlert(
        'Cotización Enviada',
        'La cotización fue enviada exitosamente al cliente a través del canal conversacional.',
      );
      invalidatePipeline();
      void refetch();
    } catch {
      showAlert('Error', 'No se pudo enviar la cotización.');
    } finally {
      setEnviandoCotizacion(false);
    }
  }, [selectedLead, invalidatePipeline, refetch]);

  // Action: Toggle AI Agent pause/resume (REAL API CALL)
  const handleToggleIa = useCallback(async () => {
    if (!selectedLead?.conversation_id) {
      showAlert('Sin chat conversacional', 'Este registro no posee un ID de conversación activo.');
      return;
    }
    setPausandoIa(true);
    try {
      await agenteIaService.pausarSesion(selectedLead.conversation_id);
      showAlert('IA Pausada', 'El agente IA se ha pausado para este chat. Puedes responder manualmente.');
      void refetch();
    } catch {
      showAlert('Error', 'No se pudo cambiar el estado del agente IA.');
    } finally {
      setPausandoIa(false);
    }
  }, [selectedLead, refetch]);

  // Action: Open full chat thread (REAL NAVIGATION)
  const handleAbrirChatCompleto = useCallback(() => {
    if (!selectedLead) return;
    if (selectedLead.conversation_id) {
      const href = omnichannelChatHref({
        conversationId: selectedLead.conversation_id,
        channel: (selectedLead.origen as any) || 'whatsapp',
        contactName: selectedLead.cliente_nombre,
        contactPhone: selectedLead.cliente_telefono,
      });
      router.push(href as any);
    } else if (selectedLead.oferta_id) {
      router.push(`/chat/${selectedLead.oferta_id}` as any);
    } else {
      showAlert('Sin chat', 'No hay un hilo conversacional directo para este registro.');
    }
  }, [selectedLead]);

  return (
    <View style={styles.container}>
      {/* Mobile Tab Navigation Header */}
      {!isDesktop ? (
        <View style={styles.mobileTabs}>
          <TouchableOpacity
            style={[styles.mobileTabBtn, activeTabMobile === 'pipeline' && styles.mobileTabActive]}
            onPress={() => setActiveTabMobile('pipeline')}
          >
            <Filter size={16} color={activeTabMobile === 'pipeline' ? I.primary : I.muted} />
            <Text style={[styles.mobileTabText, activeTabMobile === 'pipeline' && styles.mobileTabTextActive]}>
              Pipeline ({leadsFiltrados.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.mobileTabBtn, activeTabMobile === 'chat' && styles.mobileTabActive]}
            onPress={() => setActiveTabMobile('chat')}
          >
            <MessageCircle size={16} color={activeTabMobile === 'chat' ? I.primary : I.muted} />
            <Text style={[styles.mobileTabText, activeTabMobile === 'chat' && styles.mobileTabTextActive]}>
              Chat & Copiloto
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.mobileTabBtn, activeTabMobile === 'ficha' && styles.mobileTabActive]}
            onPress={() => setActiveTabMobile('ficha')}
          >
            <Car size={16} color={activeTabMobile === 'ficha' ? I.primary : I.muted} />
            <Text style={[styles.mobileTabText, activeTabMobile === 'ficha' && styles.mobileTabTextActive]}>
              Ficha & Agenda
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <View style={styles.layoutBody}>
        {/* COLUMN 1: Real Pipeline Kanban List */}
        {(isDesktop || activeTabMobile === 'pipeline') ? (
          <View style={[styles.colPipeline, !isDesktop && styles.colFull]}>
            <View style={styles.pipelineHeader}>
              <View style={styles.pipelineTitleRow}>
                <HostSectionKicker label="LEADS & PIPELINE COMERCIAL" />
                <TouchableOpacity onPress={() => refetch()} hitSlop={8}>
                  <RefreshCw size={14} color={I.primary} />
                </TouchableOpacity>
              </View>

              {/* Origen Filter Pills */}
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
                    App Marketplace
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.filterChip, filterOrigen === 'omnicanal' && styles.filterChipActive]}
                  onPress={() => setFilterOrigen('omnicanal')}
                >
                  <Text style={[styles.filterText, filterOrigen === 'omnicanal' && styles.filterTextActive]}>
                    WhatsApp / Directo
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {isPending && !leads.length ? (
              <View style={styles.centered}>
                <ActivityIndicator size="large" color={I.primary} />
                <InstitutionalText role="caption" color="muted">
                  Cargando pipeline comercial en vivo...
                </InstitutionalText>
              </View>
            ) : !leadsFiltrados.length ? (
              <View style={styles.centered}>
                <InstitutionalText role="body" color="muted">
                  No hay solicitudes registradas con este filtro.
                </InstitutionalText>
                <InstitutionalButton label="Actualizar" variant="outline" size="compact" onPress={() => refetch()} />
              </View>
            ) : (
              <ScrollView contentContainerStyle={styles.leadListContent}>
                {leadsFiltrados.map((lead) => {
                  const isSelected = selectedLead?.entidad_id === lead.entidad_id;
                  const isMarketplace = lead.origen === 'marketplace' || lead.origen === 'catalogo';

                  return (
                    <Card
                      key={lead.entidad_id}
                      elevated
                      padding="host"
                      style={[styles.leadCard, isSelected && styles.leadCardSelected]}
                      onPress={() => handleSelectLead(lead)}
                    >
                      <View style={styles.leadTopRow}>
                        <InstitutionalTag
                          label={isMarketplace ? 'Marketplace App' : 'WhatsApp / Canal'}
                          variant={isMarketplace ? 'primary' : 'info'}
                          size="sm"
                        />
                        <InstitutionalTag
                          label={lead.estado_normalizado.replace('_', ' ').toUpperCase()}
                          variant={
                            lead.estado_normalizado === 'aceptado_agendado'
                              ? 'success'
                              : lead.estado_normalizado === 'cotizacion_enviada'
                              ? 'warning'
                              : 'neutral'
                          }
                          size="sm"
                        />
                      </View>

                      <Text style={styles.leadTitle}>{lead.cliente_nombre || 'Cliente sin nombre'}</Text>
                      <Text style={styles.leadMeta}>{lead.vehiculo_resumen || 'Vehículo no especificado'}</Text>

                      <View style={styles.leadBottomRow}>
                        <Text style={styles.serviceText} numberOfLines={1}>
                          {lead.servicio_resumen || 'Consulta general'}
                        </Text>
                        {lead.monto_clp ? (
                          <Text style={styles.priceText}>{formatearMontoCLP(lead.monto_clp)}</Text>
                        ) : null}
                      </View>
                    </Card>
                  );
                })}
              </ScrollView>
            )}
          </View>
        ) : null}

        {/* COLUMN 2: Real Selected Lead & Copilot Actions */}
        {(isDesktop || activeTabMobile === 'chat') ? (
          <View style={[styles.colChat, !isDesktop && styles.colFull]}>
            {selectedLead ? (
              <>
                <View style={styles.chatHeader}>
                  <View style={styles.chatHeaderLeft}>
                    <Text style={styles.chatTitle}>{selectedLead.cliente_nombre || 'Cliente'}</Text>
                    <Text style={styles.chatSubTitle}>
                      {selectedLead.cliente_telefono || 'Sin teléfono registrado'} · Origen:{' '}
                      {String(selectedLead.origen).toUpperCase()}
                    </Text>
                  </View>
                  <InstitutionalButton
                    label="Abrir Chat Completo"
                    variant="outline"
                    size="compact"
                    onPress={handleAbrirChatCompleto}
                  />
                </View>

                {/* Copilot Action Bar */}
                <Card elevated padding="host" style={styles.copilotBanner}>
                  <View style={styles.copilotHeader}>
                    <Bot size={18} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
                    <InstitutionalText role="captionBold" color="primary">
                      COPILOTO IA DE ATENCIÓN EN VIVO
                    </InstitutionalText>
                    {selectedLead.template_generado_por_ia ? (
                      <InstitutionalTag label="IA Generó Borrador" variant="success" size="sm" />
                    ) : null}
                  </View>

                  <InstitutionalText role="caption" color="body">
                    {selectedLead.servicio_resumen
                      ? `Solicitud de servicio: ${selectedLead.servicio_resumen}.`
                      : 'Atendiendo consulta en canal conversacional.'}
                  </InstitutionalText>

                  <View style={styles.copilotActions}>
                    {selectedLead.cotizacion_id ? (
                      <InstitutionalButton
                        label={enviandoCotizacion ? 'Enviando...' : 'Enviar Cotización al Chat'}
                        variant="primary"
                        size="compact"
                        disabled={enviandoCotizacion}
                        onPress={handleEnviarCotizacion}
                        style={styles.tinderBtn}
                      />
                    ) : null}

                    <InstitutionalButton
                      label="📅 Agendar Cita"
                      variant="outline"
                      size="compact"
                      onPress={() => setAgendarModalVisible(true)}
                    />

                    <InstitutionalButton
                      label={pausandoIa ? 'Pausando...' : 'Pausar IA'}
                      variant="outline"
                      size="compact"
                      disabled={pausandoIa}
                      onPress={handleToggleIa}
                    />
                  </View>
                </Card>

                {/* Real Stream Details Card */}
                <ScrollView contentContainerStyle={styles.chatStreamContent}>
                  <Card elevated padding="host" style={styles.detailCard}>
                    <HostSectionKicker label="DETALLE DE LA SOLICITUD" />
                    <View style={styles.detailRow}>
                      <InstitutionalText role="caption" color="muted">Servicio:</InstitutionalText>
                      <InstitutionalText role="captionBold">{selectedLead.servicio_resumen || 'Por definir'}</InstitutionalText>
                    </View>
                    <View style={styles.detailRow}>
                      <InstitutionalText role="caption" color="muted">Vehículo:</InstitutionalText>
                      <InstitutionalText role="captionBold">{selectedLead.vehiculo_resumen || 'Sin auto'}</InstitutionalText>
                    </View>
                    <View style={styles.detailRow}>
                      <InstitutionalText role="caption" color="muted">Estado comercial:</InstitutionalText>
                      <InstitutionalTag label={selectedLead.estado_normalizado.toUpperCase()} variant="info" size="sm" />
                    </View>
                    {selectedLead.monto_clp ? (
                      <View style={styles.detailRow}>
                        <InstitutionalText role="caption" color="muted">Monto estimado:</InstitutionalText>
                        <InstitutionalText role="h4" color="primary">{formatearMontoCLP(selectedLead.monto_clp)}</InstitutionalText>
                      </View>
                    ) : null}
                  </Card>
                </ScrollView>
              </>
            ) : (
              <View style={styles.centered}>
                <InstitutionalText role="body" color="muted">
                  Selecciona una solicitud o lead del pipeline de la izquierda.
                </InstitutionalText>
              </View>
            )}
          </View>
        ) : null}

        {/* COLUMN 3: Real Vehicle Ficha & Global Schedule Matrix */}
        {(isDesktop || activeTabMobile === 'ficha') ? (
          <View style={[styles.colFicha, !isDesktop && styles.colFull]}>
            <ScrollView contentContainerStyle={styles.fichaContent}>
              <HostSectionKicker label="FICHA TÉCNICA DEL VEHÍCULO" />
              <Card elevated padding="host" style={styles.sectionCard}>
                <View style={styles.fichaHeader}>
                  <Car size={20} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
                  <View style={styles.fichaTitleBox}>
                    <InstitutionalText role="h4">
                      {selectedLead?.vehiculo_resumen || 'Vehículo sin especificar'}
                    </InstitutionalText>
                    <InstitutionalText role="caption" color="muted">
                      Cliente: {selectedLead?.cliente_nombre || 'N/A'}
                    </InstitutionalText>
                  </View>
                </View>
              </Card>

              <HostSectionKicker label="AGENDA GLOBAL INCONDICIONAL" />
              <Card elevated padding="host" style={styles.sectionCard}>
                <InstitutionalText role="caption" color="muted">
                  Bloques libres recomendados para agendar en 1-clic:
                </InstitutionalText>
                <View style={styles.slotGrid}>
                  <TouchableOpacity
                    style={styles.slotChip}
                    onPress={() => setAgendarModalVisible(true)}
                  >
                    <Clock size={14} color={I.primary} />
                    <Text style={styles.slotText}>Hoy 16:00 (1-Tap Agendar)</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.slotChip}
                    onPress={() => setAgendarModalVisible(true)}
                  >
                    <Clock size={14} color={I.primary} />
                    <Text style={styles.slotText}>Mañana 10:30 (1-Tap Agendar)</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.slotChip}
                    onPress={() => setAgendarModalVisible(true)}
                  >
                    <Clock size={14} color={I.primary} />
                    <Text style={styles.slotText}>Mañana 15:00 (1-Tap Agendar)</Text>
                  </TouchableOpacity>
                </View>

                <InstitutionalButton
                  label="📅 Selector Completo de Agenda Global"
                  variant="outline"
                  size="compact"
                  onPress={() => setAgendarModalVisible(true)}
                />
              </Card>

              <HostSectionKicker label="TRABAJOS ADICIONALES EN EJECUCIÓN" />
              <Card elevated padding="host" style={styles.sectionCard}>
                <InstitutionalText role="caption" color="muted">
                  Propón trabajos o hallazgos adicionales aprobables in-app / web:
                </InstitutionalText>
                <InstitutionalButton
                  label="➕ Proponer Trabajo Adicional"
                  variant="primary"
                  size="compact"
                  onPress={() => {
                    if (!selectedLead?.cotizacion_id) {
                      showAlert('Cotización requerida', 'Debes seleccionar una solicitud que tenga un borrador activo.');
                      return;
                    }
                    setAdicionalModalVisible(true);
                  }}
                  style={styles.tinderBtn}
                />
              </Card>
            </ScrollView>
          </View>
        ) : null}
      </View>

      {/* Real Agendar Modal */}
      {selectedLead ? (
        <AgendarDesdeCanalModal
          visible={agendarModalVisible}
          onClose={() => setAgendarModalVisible(false)}
          cotizacionAceptadaId={selectedLead.cotizacion_id ?? undefined}
          conversationId={selectedLead.conversation_id ? String(selectedLead.conversation_id) : undefined}
          contactName={selectedLead.cliente_nombre}
          contactPhone={selectedLead.cliente_telefono}
          onCitaCreada={() => {
            invalidatePipeline();
            void refetch();
          }}
        />
      ) : null}

      {/* Real Cotizacion Adicional Modal */}
      {selectedLead?.cotizacion_id ? (
        <CotizacionAdicionalModal
          visible={adicionalModalVisible}
          onClose={() => setAdicionalModalVisible(false)}
          citaId={selectedLead.cita_id || 0}
          cotizacionOriginalId={selectedLead.cotizacion_id}
          onCotizacionCreada={() => {
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
  mobileTabs: {
    flexDirection: 'row',
    backgroundColor: I.canvas,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: I.hairline,
    paddingVertical: SPACING.fixed.xs,
  },
  mobileTabBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
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
  layoutBody: {
    flex: 1,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  colPipeline: {
    width: 290,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: I.hairline,
    backgroundColor: I.canvas,
  },
  colChat: {
    flex: 1,
    minWidth: 0,
    backgroundColor: I.canvas,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: I.hairline,
  },
  colFicha: {
    width: 290,
    backgroundColor: I.canvas,
  },
  colFull: {
    width: '100%',
    flex: 1,
  },
  pipelineHeader: {
    padding: SPACING.fixed.sm,
    gap: SPACING.fixed.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: I.hairline,
  },
  pipelineTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  filterRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  filterChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
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
  leadListContent: {
    padding: SPACING.fixed.sm,
    gap: SPACING.fixed.xs,
  },
  leadCard: {
    gap: SPACING.fixed.xs,
  },
  leadCardSelected: {
    borderColor: I.primary,
    borderWidth: 1.5,
  },
  leadTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  leadTitle: {
    fontFamily: FF.sansSemiBold,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: I.ink,
  },
  leadMeta: {
    fontFamily: FF.sansRegular,
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: I.muted,
  },
  leadBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  serviceText: {
    fontFamily: FF.sansRegular,
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: I.body,
    flex: 1,
  },
  priceText: {
    fontFamily: FF.sansSemiBold,
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: I.primary,
  },
  chatHeader: {
    padding: SPACING.fixed.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: I.hairline,
  },
  chatHeaderLeft: {
    gap: 2,
  },
  chatTitle: {
    fontFamily: FF.sansSemiBold,
    fontSize: TYPOGRAPHY.fontSize.base,
    color: I.ink,
  },
  chatSubTitle: {
    fontFamily: FF.sansRegular,
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: I.muted,
  },
  copilotBanner: {
    margin: SPACING.fixed.sm,
    gap: SPACING.fixed.xs,
    backgroundColor: I.canvas,
    borderWidth: 1,
    borderColor: I.hairline,
  },
  copilotHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.xs,
  },
  copilotActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.fixed.xs,
    marginTop: 4,
  },
  chatStreamContent: {
    padding: SPACING.fixed.sm,
  },
  detailCard: {
    gap: SPACING.fixed.xs,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fichaContent: {
    padding: SPACING.fixed.sm,
    gap: SPACING.fixed.sm,
  },
  fichaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.sm,
  },
  fichaTitleBox: {
    gap: 2,
  },
  sectionCard: {
    gap: SPACING.fixed.xs,
  },
  slotGrid: {
    gap: SPACING.fixed.xs,
    marginVertical: 4,
  },
  slotChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.xs,
    backgroundColor: I.canvas,
    borderWidth: 1,
    borderColor: I.hairline,
    paddingHorizontal: SPACING.fixed.sm,
    paddingVertical: SPACING.fixed.xs,
    borderRadius: BORDERS.radius.md,
  },
  slotText: {
    fontFamily: FF.sansSemiBold,
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: I.ink,
  },
  tinderBtn: {
    backgroundColor: I.primary,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.fixed.md,
    gap: SPACING.fixed.xs,
  },
});
