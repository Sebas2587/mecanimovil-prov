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
  TextInput,
  SafeAreaView,
} from 'react-native';
import {
  Bot,
  Calendar,
  Car,
  CheckCircle2,
  ChevronRight,
  Clock,
  MessageCircle,
  Phone,
  Power,
  Send,
  User,
  Wrench,
  X,
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
import type { PipelineComercialItem } from '@/services/pipelineComercialService';
import cotizacionCanalService, { type CotizacionCanal } from '@/services/cotizacionCanalService';
import agenteIaService from '@/services/agenteIaService';
import { showAlert } from '@/utils/platformAlert';

const I = COLORS.institutional;
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
  const [iaActiva, setIaActiva] = useState(true);
  const [togglingIa, setTogglingIa] = useState(false);
  const [nuevoMensaje, setNuevoMensaje] = useState('');
  const [enviandoMensaje, setEnviandoMensaje] = useState(false);

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

  // Action: Approve & Trigger Agent 2
  const handleAprobarYEnviar = useCallback(async () => {
    if (!leadItem?.cotizacion_id) return;
    setAprobando(true);
    try {
      await cotizacionCanalService.enviar(leadItem.cotizacion_id);
      showAlert(
        'Cotización Aprobada y Enviada',
        'El Agente 2 (Agenda) tomará el control conversacional para proponer los mejores bloques de horario al cliente.',
      );
      onAprobadoExitoso?.();
      onClose();
    } catch {
      showAlert('Error', 'No se pudo enviar la cotización.');
    } finally {
      setAprobando(false);
    }
  }, [leadItem, onAprobadoExitoso, onClose]);

  // Action: Send manual chat message directly
  const handleEnviarMensajeDirecto = useCallback(async () => {
    if (!nuevoMensaje.trim() || !leadItem?.conversation_id) return;
    setEnviandoMensaje(true);
    try {
      const { default: api } = await import('@/services/api');
      await api.post(`/chat/conversations/${leadItem.conversation_id}/mensajes/`, {
        mensaje: nuevoMensaje.trim(),
      });
      setNuevoMensaje('');
      showAlert('Mensaje enviado', 'Tu mensaje fue enviado al cliente por el canal conversacional.');
    } catch {
      showAlert('Error', 'No se pudo enviar el mensaje.');
    } finally {
      setEnviandoMensaje(false);
    }
  }, [nuevoMensaje, leadItem]);

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

          <View style={styles.headerRight}>
            {leadItem.cotizacion_id ? (
              <InstitutionalButton
                label={aprobando ? 'Aprobando...' : 'Aprobar y activar agenda'}
                variant="primary"
                size="compact"
                onPress={handleAprobarYEnviar}
                disabled={aprobando}
                style={styles.tinderBtn}
              />
            ) : null}

            {leadItem.cotizacion_id && onAbrirModalRechazo ? (
              <InstitutionalButton
                label="Rechazar con motivo"
                variant="destructiveOutline"
                size="compact"
                onPress={() => {
                  onClose();
                  onAbrirModalRechazo(leadItem.cotizacion_id!);
                }}
                disabled={aprobando}
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
                Chat Conversacional
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.mobileTab, activeTabMobile === 'datos' && styles.mobileTabActive]}
              onPress={() => setActiveTabMobile('datos')}
            >
              <Car size={14} color={activeTabMobile === 'datos' ? I.primary : I.muted} />
              <Text style={[styles.mobileTabText, activeTabMobile === 'datos' && styles.mobileTabTextActive]}>
                Ficha del Vehículo & Cotización
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Full Screen Body Grid */}
        <View style={styles.fullScreenBody}>
          {/* LEFT PANEL: Official Chat Screen Stream */}
          {(isDesktop || activeTabMobile === 'chat') ? (
            <View style={[styles.colChat, !isDesktop && styles.colFull]}>
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
                  <Power size={14} color="#FFFFFF" />
                  <Text style={styles.toggleText}>
                    {iaActiva ? 'Pausar IA' : 'Reanudar IA'}
                  </Text>
                </TouchableOpacity>
              </View>

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

                {cotizacionDetalle ? (
                  <Card elevated padding="host" style={styles.quoteCardBubble}>
                    <HostSectionKicker label="BORRADOR ESTIMATIVO IA" />
                    <Text style={styles.quoteTitle}>{cotizacionDetalle.servicio_nombre}</Text>
                    <Text style={styles.quoteTotal}>{formatearMontoCLP(cotizacionDetalle.total_clp)}</Text>
                  </Card>
                ) : null}
              </ScrollView>

              {/* Official Chat Composer */}
              <View style={styles.composerRow}>
                <TextInput
                  style={styles.composerInput}
                  value={nuevoMensaje}
                  onChangeText={setNuevoMensaje}
                  placeholder="Escribir mensaje al cliente por WhatsApp / Canal..."
                  placeholderTextColor={I.mutedSoft}
                />
                <TouchableOpacity
                  style={styles.sendBtn}
                  onPress={handleEnviarMensajeDirecto}
                  disabled={enviandoMensaje}
                >
                  <Send size={16} color="#FFFFFF" strokeWidth={ICON_STROKE_WIDTH} />
                </TouchableOpacity>
              </View>
            </View>
          ) : null}

          {/* RIGHT PANEL: Smart Vehicle Ficha & Quote Breakdown */}
          {(isDesktop || activeTabMobile === 'datos') ? (
            <View style={[styles.colDatos, !isDesktop && styles.colFull]}>
              <ScrollView contentContainerStyle={styles.datosScroll}>
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

                <HostSectionKicker label="DESGLOSE DE COTIZACIÓN" />
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
                  </Card>
                ) : (
                  <InstitutionalText role="caption" color="muted">
                    No hay desglose de cotización disponible aún.
                  </InstitutionalText>
                )}
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
    width: 320,
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
    color: '#FFFFFF',
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
  quoteCardBubble: {
    gap: 2,
  },
  quoteTitle: {
    fontFamily: FF.sansSemiBold,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: I.ink,
  },
  quoteTotal: {
    fontFamily: FF.sansSemiBold,
    fontSize: TYPOGRAPHY.fontSize.base,
    color: I.primary,
  },
  composerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.fixed.xs,
    paddingTop: SPACING.fixed.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: I.hairline,
  },
  composerInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: I.hairline,
    borderRadius: BORDERS.radius.md,
    paddingHorizontal: SPACING.fixed.sm,
    paddingVertical: 8,
    fontFamily: FF.sansRegular,
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: I.ink,
    backgroundColor: I.canvas,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: I.primary,
    alignItems: 'center',
    justifyContent: 'center',
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
  tinderBtn: {
    backgroundColor: I.primary,
  },
});
