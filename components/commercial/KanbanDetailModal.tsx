import React, { useCallback, useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  useWindowDimensions,
  ActivityIndicator,
  SafeAreaView,
  Alert,
} from 'react-native';
import {
  Bot,
  Calendar,
  Car,
  CheckCircle2,
  ChevronRight,
  Clock,
  Edit3,
  MessageCircle,
  Paperclip,
  Phone,
  Power,
  Send,
  User,
  Wrench,
  X,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { router } from 'expo-router';
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
import type { PipelineComercialItem } from '@/services/pipelineComercialService';
import cotizacionCanalService, { type CotizacionCanal } from '@/services/cotizacionCanalService';
import agenteIaService from '@/services/agenteIaService';
import { ChatMessageComposer } from '@/components/chats/ChatMessageComposer';
import { CotizacionCanalBubble } from '@/components/chats/CotizacionCanalBubble';
import { AttachmentStagingTray, type StagedAttachment } from '@/components/chats/AttachmentStagingTray';
import { showAlert } from '@/utils/platformAlert';

const I = COLORS.institutional;
const K = COLORS.kanban;
const FF = TYPOGRAPHY.fontFamily;

export interface KanbanDetailModalProps {
  visible: boolean;
  onClose: () => void;
  leadItem: PipelineComercialItem | null;
  onAprobadoExitoso?: () => void;
  onAbrirModalRechazo?: (cotizacionId: number) => void;
}

export function KanbanDetailModal({
  visible,
  onClose,
  leadItem,
  onAprobadoExitoso,
  onAbrirModalRechazo,
}: KanbanDetailModalProps) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 992;

  const [activeTabMobile, setActiveTabMobile] = useState<'chat' | 'datos'>('chat');
  const [cotizacionDetalle, setCotizacionDetalle] = useState<CotizacionCanal | null>(null);
  const [cargando, setCargando] = useState(false);
  const [aprobando, setAprobando] = useState(false);
  const [enviandoCliente, setEnviandoCliente] = useState(false);
  const [iaActiva, setIaActiva] = useState(true);
  const [togglingIa, setTogglingIa] = useState(false);

  // Chat composer states
  const [nuevoMensaje, setNuevoMensaje] = useState('');
  const [enviandoMensaje, setEnviandoMensaje] = useState(false);
  const [stagedAttachment, setStagedAttachment] = useState<StagedAttachment | null>(null);

  const abrirCotizacionFullScreen = useCallback(() => {
    const id = leadItem?.cotizacion_id || cotizacionDetalle?.id;
    if (!id) return;
    onClose();
    router.push(`/cotizacion-canal/${id}`);
  }, [cotizacionDetalle?.id, leadItem?.cotizacion_id, onClose]);

  // Load detailed quotation data when leadItem changes
  useEffect(() => {
    if (!visible || !leadItem?.cotizacion_id) {
      setCotizacionDetalle(null);
      return;
    }
    let isMounted = true;
    setCargando(true);

    cotizacionCanalService
      .obtener(leadItem.cotizacion_id)
      .then((data) => {
        if (isMounted) {
          setCotizacionDetalle(data);
        }
      })
      .catch(() => {
        if (isMounted) setCotizacionDetalle(null);
      })
      .finally(() => {
        if (isMounted) setCargando(false);
      });

    return () => {
      isMounted = false;
    };
  }, [visible, leadItem]);

  // Action: Toggle AI Agent
  const handleToggleIa = useCallback(async () => {
    if (!leadItem?.conversation_id) return;
    setTogglingIa(true);
    try {
      if (iaActiva) {
        await agenteIaService.pausarSesion(leadItem.conversation_id);
        setIaActiva(false);
        showAlert('IA Pausada', 'El agente IA se detuvo para este chat.');
      } else {
        await agenteIaService.reanudarSesion(leadItem.conversation_id);
        setIaActiva(true);
        showAlert('IA Reanudada', 'El agente IA tomó nuevamente el control.');
      }
    } catch {
      showAlert('Error', 'No se pudo cambiar el estado del agente IA.');
    } finally {
      setTogglingIa(false);
    }
  }, [leadItem, iaActiva]);

  // Action 1: Send Quotation to Customer (for customer price approval)
  const handleEnviarSoloCliente = useCallback(async () => {
    if (!leadItem?.cotizacion_id) return;
    setEnviandoCliente(true);
    try {
      await cotizacionCanalService.enviar(leadItem.cotizacion_id);
      showAlert(
        'Cotización Enviada al Cliente',
        'La cotización ha sido enviada al cliente por WhatsApp para su revisión y aprobación de precio.',
      );
      onAprobadoExitoso?.();
      onClose();
    } catch {
      showAlert('Error', 'No se pudo enviar la cotización.');
    } finally {
      setEnviandoCliente(false);
    }
  }, [leadItem, onAprobadoExitoso, onClose]);

  // Action 2: Approve & Trigger Agent 2 (Agenda)
  const handleAprobarYEnviar = useCallback(async () => {
    if (!leadItem?.cotizacion_id) return;
    setAprobando(true);
    try {
      await cotizacionCanalService.enviar(leadItem.cotizacion_id);
      showAlert(
        'Cotización Aprobada',
        'La cotización fue aprobada y enviada. El Agente 2 (Agenda) tomará el control conversacional para coordinar la cita.',
      );
      onAprobadoExitoso?.();
      onClose();
    } catch {
      showAlert('Error', 'No se pudo enviar la cotización.');
    } finally {
      setAprobando(false);
    }
  }, [leadItem, onAprobadoExitoso, onClose]);

  // Attachment Handler: Image & Document Pickers
  const handleAttachPress = useCallback(async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });
      if (!res.canceled && res.assets[0]) {
        const asset = res.assets[0];
        setStagedAttachment({
          uri: asset.uri,
          name: asset.fileName || 'imagen.jpg',
          type: asset.mimeType || 'image/jpeg',
          kind: 'image',
        });
      }
    } catch {
      showAlert('Error', 'No se pudo seleccionar el archivo.');
    }
  }, []);

  // Action: Send message (Text / Image / Voice)
  const handleEnviarMensajeDirecto = useCallback(async () => {
    if (!nuevoMensaje.trim() && !stagedAttachment) return;
    if (!leadItem?.conversation_id) return;

    setEnviandoMensaje(true);
    try {
      const { default: api } = await import('@/services/api');
      await api.post(`/chat/conversations/${leadItem.conversation_id}/mensajes/`, {
        mensaje: nuevoMensaje.trim(),
        archivo: stagedAttachment?.uri,
      });
      setNuevoMensaje('');
      setStagedAttachment(null);
      showAlert('Mensaje Enviado', 'Mensaje transmitido al cliente por WhatsApp / Canal.');
    } catch {
      showAlert('Error', 'No se pudo enviar el mensaje.');
    } finally {
      setEnviandoMensaje(false);
    }
  }, [nuevoMensaje, stagedAttachment, leadItem]);

  if (!leadItem) return null;
  const isMarketplace = leadItem.origen === 'marketplace' || leadItem.origen === 'catalogo';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.fullScreenContainer}>
        {/* Full Screen Header */}
        <View style={styles.headerBar}>
          <View style={styles.headerLeft}>
            <TouchableOpacity onPress={onClose} hitSlop={8} style={styles.closeBtn}>
              <X size={20} color={I.ink} strokeWidth={ICON_STROKE_WIDTH} />
            </TouchableOpacity>
            <View style={styles.headerTitleBox}>
              <Text style={styles.headerTitle}>{leadItem.cliente_nombre || 'Cliente'}</Text>
              <Text style={styles.headerSubtitle}>
                {leadItem.cliente_telefono || 'Sin teléfono'} · Origen: {String(leadItem.origen).toUpperCase()}
              </Text>
            </View>
          </View>

          {/* Action CTAs: Enviar Cliente, Aprobar + Agenda, Rechazar */}
          <View style={styles.headerRight}>
            {leadItem.cotizacion_id ? (
              <>
                <InstitutionalButton
                  label={enviandoCliente ? 'Enviando...' : '📤 Enviar a Cliente'}
                  variant="outline"
                  size="compact"
                  onPress={handleEnviarSoloCliente}
                  disabled={enviandoCliente || aprobando}
                />
                <InstitutionalButton
                  label={aprobando ? 'Aprobando...' : '🚀 Aprobar & Activar Agenda'}
                  variant="primary"
                  size="compact"
                  onPress={handleAprobarYEnviar}
                  disabled={enviandoCliente || aprobando}
                />
              </>
            ) : null}

            {leadItem.cotizacion_id && onAbrirModalRechazo ? (
              <InstitutionalButton
                label="Rechazar"
                variant="destructiveOutline"
                size="compact"
                onPress={() => {
                  onClose();
                  onAbrirModalRechazo(leadItem.cotizacion_id!);
                }}
                disabled={enviandoCliente || aprobando}
              />
            ) : null}
          </View>
        </View>

        {/* Mobile View Tab Selector */}
        {!isDesktop ? (
          <View style={styles.mobileTabs}>
            <TouchableOpacity
              style={[styles.mobileTab, activeTabMobile === 'chat' && styles.mobileTabActive]}
              onPress={() => setActiveTabMobile('chat')}
            >
              <MessageCircle size={14} color={activeTabMobile === 'chat' ? I.primary : I.muted} />
              <Text style={[styles.mobileTabText, activeTabMobile === 'chat' && styles.mobileTabTextActive]}>
                Chat Airbnb
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.mobileTab, activeTabMobile === 'datos' && styles.mobileTabActive]}
              onPress={() => setActiveTabMobile('datos')}
            >
              <Car size={14} color={activeTabMobile === 'datos' ? I.primary : I.muted} />
              <Text style={[styles.mobileTabText, activeTabMobile === 'datos' && styles.mobileTabTextActive]}>
                Ficha & Editar Cotización
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Full Screen Body Grid */}
        <View style={styles.fullScreenBody}>
          {/* LEFT PANEL: Official Airbnb Chat Screen Stream */}
          {(isDesktop || activeTabMobile === 'chat') ? (
            <View style={[styles.colChat, !isDesktop && styles.colFull]}>
              {/* AI Agent Status Switch */}
              <View style={styles.iaToggleRow}>
                <View style={styles.iaStatusTag}>
                  <Bot size={16} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
                  <InstitutionalText role="captionBold">
                    {iaActiva ? 'Agente IA Activo' : 'IA Pausada (Modo Manual)'}
                  </InstitutionalText>
                </View>

                <TouchableOpacity
                  style={[styles.toggleBtn, !iaActiva && styles.toggleBtnOff]}
                  onPress={handleToggleIa}
                  disabled={togglingIa}
                >
                  <Power size={14} color={I.onPrimary} strokeWidth={ICON_STROKE_WIDTH} />
                  <Text style={styles.toggleText}>
                    {iaActiva ? 'Pausar IA' : 'Reanudar IA'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Chat Messages Stream */}
              <ScrollView contentContainerStyle={styles.chatScroll}>
                <View style={styles.msgInbound}>
                  <Text style={styles.msgText}>
                    {leadItem.servicio_resumen || 'Hola, solicito información y presupuesto para mi vehículo.'}
                  </Text>
                </View>
                <View style={styles.msgOutbound}>
                  <Text style={styles.msgText}>
                    ¡Hola! Soy el Agente virtual del taller. Ya tomé los datos de tu {leadItem.vehiculo_resumen || 'vehículo'}.
                  </Text>
                </View>

                {/* Render CotizacionCanalBubble if detailed quote exists */}
                {cotizacionDetalle ? (
                  <CotizacionCanalBubble
                    cotizacion={cotizacionDetalle}
                    esTaller={true}
                    onVerDetalle={abrirCotizacionFullScreen}
                  />
                ) : null}
              </ScrollView>

              {/* Staged Attachment Tray */}
              {stagedAttachment ? (
                <AttachmentStagingTray
                  attachment={stagedAttachment}
                  onClear={() => setStagedAttachment(null)}
                />
              ) : null}

              {/* Official Airbnb ChatMessageComposer with attach & audio support */}
              <ChatMessageComposer
                value={nuevoMensaje}
                onChangeText={setNuevoMensaje}
                onSend={handleEnviarMensajeDirecto}
                onAttachPress={handleAttachPress}
                sending={enviandoMensaje}
                placeholder="Escribe un mensaje al cliente por WhatsApp..."
              />
            </View>
          ) : null}

          {/* RIGHT PANEL: Vehicle ficha y resumen de cotización */}
          {(isDesktop || activeTabMobile === 'datos') ? (
            <View style={[styles.colDatos, !isDesktop && styles.colFull]}>
              <ScrollView contentContainerStyle={styles.datosScroll}>
                  <>
                    <HostSectionKicker label="FICHA DEL VEHÍCULO Y CLIENTE" />

                    <Card elevated padding="host" style={styles.infoCard}>
                      <View style={styles.infoRow}>
                        <User size={16} color={I.primary} />
                        <View style={styles.infoCol}>
                          <InstitutionalText role="captionBold">{leadItem.cliente_nombre || 'Cliente'}</InstitutionalText>
                          <InstitutionalText role="small" color="muted">{leadItem.cliente_telefono || 'Sin teléfono'}</InstitutionalText>
                        </View>
                      </View>

                      <View style={styles.infoRow}>
                        <Car size={16} color={I.primary} />
                        <View style={styles.infoCol}>
                          <InstitutionalText role="captionBold">{leadItem.vehiculo_resumen || 'Vehículo no especificado'}</InstitutionalText>
                          <InstitutionalTag
                            label={isMarketplace ? 'Marketplace App' : 'WhatsApp Directo'}
                            variant={isMarketplace ? 'primary' : 'info'}
                            size="sm"
                          />
                        </View>
                      </View>
                    </Card>

                    <View style={styles.quoteHeaderRow}>
                      <HostSectionKicker label="DESGLOSE DE COTIZACIÓN BORRADOR" />
                      {cotizacionDetalle ? (
                        <TouchableOpacity
                          style={styles.editQuoteBtn}
                          onPress={abrirCotizacionFullScreen}
                        >
                          <Edit3 size={14} color={I.primary} />
                          <Text style={styles.editQuoteBtnText}>Abrir cotización</Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>

                    {cargando ? (
                      <ActivityIndicator size="small" color={I.primary} style={{ marginVertical: 12 }} />
                    ) : cotizacionDetalle ? (
                      <Card elevated padding="host" style={styles.breakdownCard}>
                        <InstitutionalText role="captionBold">{cotizacionDetalle.servicio_nombre}</InstitutionalText>
                        {cotizacionDetalle.descripcion_problema ? (
                          <InstitutionalText role="caption" color="muted">
                            {cotizacionDetalle.descripcion_problema}
                          </InstitutionalText>
                        ) : null}

                        {cotizacionDetalle.repuestos.map((rep, idx) => (
                          <View key={`rep-${idx}`} style={styles.repLine}>
                            <InstitutionalText role="small">
                              {rep.nombre} ×{rep.cantidad || 1}
                            </InstitutionalText>
                            <InstitutionalText role="captionBold">
                              {formatearMontoCLP((rep.cantidad || 1) * (rep.precio_unitario_clp || 0))}
                            </InstitutionalText>
                          </View>
                        ))}

                        <View style={styles.divider} />
                        <View style={styles.priceRow}>
                          <InstitutionalText role="caption" color="muted">Mano de Obra:</InstitutionalText>
                          <InstitutionalText role="captionBold">{formatearMontoCLP(cotizacionDetalle.mano_obra_clp)}</InstitutionalText>
                        </View>
                        <View style={styles.priceRow}>
                          <InstitutionalText role="h4" color="primary">Total Final:</InstitutionalText>
                          <InstitutionalText role="h4" color="primary">{formatearMontoCLP(cotizacionDetalle.total_clp)}</InstitutionalText>
                        </View>

                        <InstitutionalButton
                          label="Abrir cotización"
                          variant="outline"
                          size="compact"
                          onPress={abrirCotizacionFullScreen}
                          style={{ marginTop: 8 }}
                        />
                      </Card>
                    ) : (
                      <InstitutionalText role="caption" color="muted">
                        No hay desglose de cotización disponible aún.
                      </InstitutionalText>
                    )}
                  </>
              </ScrollView>
            </View>
          ) : null}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fullScreenContainer: {
    flex: 1,
    backgroundColor: I.canvas,
  },
  headerBar: {
    paddingHorizontal: SPACING.fixed.sm,
    paddingVertical: SPACING.fixed.xs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: I.hairline,
    backgroundColor: I.canvas,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.xs,
  },
  closeBtn: {
    padding: 6,
    borderRadius: BORDERS.radius.sm,
    backgroundColor: I.canvas,
    borderWidth: 1,
    borderColor: I.hairline,
  },
  headerTitleBox: {
    gap: 2,
  },
  headerTitle: {
    fontFamily: FF.sansSemiBold,
    fontSize: TYPOGRAPHY.fontSize.base,
    color: I.ink,
  },
  headerSubtitle: {
    fontFamily: FF.sansRegular,
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: I.muted,
  },
  headerRight: {
    flexDirection: 'row',
    gap: SPACING.fixed.xs,
  },
  mobileTabs: {
    flexDirection: 'row',
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
  fullScreenBody: {
    flex: 1,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  colChat: {
    flex: 1,
    minWidth: 0,
    padding: SPACING.fixed.sm,
    gap: SPACING.fixed.xs,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: I.hairline,
  },
  colDatos: {
    width: 360,
    minWidth: 0,
    padding: SPACING.fixed.sm,
    gap: SPACING.fixed.xs,
  },
  colFull: {
    width: '100%',
  },
  iaToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.fixed.xs,
    backgroundColor: I.canvas,
    borderWidth: 1,
    borderColor: I.hairline,
    borderRadius: BORDERS.radius.md,
  },
  iaStatusTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.xs,
  },
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: I.semanticUp,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BORDERS.radius.sm,
  },
  toggleBtnOff: {
    backgroundColor: I.muted,
  },
  toggleText: {
    color: I.onPrimary,
    fontFamily: FF.sansSemiBold,
    fontSize: TYPOGRAPHY.fontSize.xs,
  },
  chatScroll: {
    flexGrow: 1,
    gap: SPACING.fixed.xs,
    paddingVertical: SPACING.fixed.xs,
  },
  msgInbound: {
    alignSelf: 'flex-start',
    backgroundColor: I.canvas,
    borderWidth: 1,
    borderColor: I.hairline,
    borderRadius: BORDERS.radius.md,
    padding: SPACING.fixed.xs,
    maxWidth: '85%',
  },
  msgOutbound: {
    alignSelf: 'flex-end',
    backgroundColor: I.primary,
    borderRadius: BORDERS.radius.md,
    padding: SPACING.fixed.xs,
    maxWidth: '85%',
  },
  msgText: {
    fontFamily: FF.sansRegular,
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: I.ink,
  },
  datosScroll: {
    gap: SPACING.fixed.xs,
  },
  infoCard: {
    gap: SPACING.fixed.xs,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.xs,
  },
  infoCol: {
    gap: 2,
    flex: 1,
  },
  quoteHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  editQuoteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  editQuoteBtnText: {
    fontFamily: FF.sansSemiBold,
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: I.primary,
  },
  breakdownCard: {
    gap: SPACING.fixed.xs,
  },
  repLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: I.hairline,
    marginVertical: 4,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  editorContainer: {
    gap: SPACING.fixed.xs,
  },
  editorHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});
