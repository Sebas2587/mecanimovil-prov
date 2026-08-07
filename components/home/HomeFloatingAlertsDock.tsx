import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Platform,
  Animated,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { X, type LucideIcon, MessageCircle, Sparkles, Send, CircleX, BellRing, CalendarCheck, CheckCircle2 } from 'lucide-react-native';
import websocketService, { type AgenteIaEvent, type NuevoMensajeChatEvent } from '@/app/services/websocketService';
import { COLORS, SPACING, TYPOGRAPHY, BORDERS, SHADOWS } from '@/app/design-system/tokens';
import {
  institutionalStatusColors,
  type InstitutionalStatusTone,
} from '@/app/design-system/styles/institutionalSemantic';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import { omnichannelChatHref } from '@/utils/chatRoutes';

const I = COLORS.institutional;
const PAPER = I.paper || COLORS.background.paper;

const ALERT_ICON_SIZE = 22;
const ALERT_ICON_STROKE = 2.25;

/** Tiempo visible antes de auto-cierre (ms). */
const OPS_ALERT_AUTO_DISMISS_MS = 10_000;
const LEAD_ALERT_AUTO_DISMISS_MS = 8_000;

/** Altura aprox. de tab bar (sin safe area). */
const TAB_BAR_CONTENT_H = Platform.OS === 'ios' ? 84 : 64;

export type OpsFloatingAlert = {
  id: string;
  variant?: 'warning' | 'danger' | 'info';
  Icon: LucideIcon;
  title: string;
  message?: string;
  onPress?: () => void;
  onDismiss: () => void;
};

type LeadAlertTone =
  | 'message'
  | 'draft'
  | 'sent'
  | 'accepted'
  | 'rejected'
  | 'escalation'
  | 'calendar';

type LeadFloatingAlert = {
  id: string;
  title: string;
  message: string;
  href?: string;
  kind: 'lead';
  leadTone: LeadAlertTone;
};

type DockItem =
  | (OpsFloatingAlert & { kind: 'ops' })
  | LeadFloatingAlert;

type AlertVisualTone = {
  background: string;
  border: string;
  plate: string;
  icon: string;
  progress: string;
  Icon: LucideIcon;
};

/** Superficies sólidas opacas — toasts sobre scroll (no rgba semitransparente). */
const TOAST_SURFACES: Record<
  InstitutionalStatusTone,
  { background: string; border: string }
> = {
  primary: {
    background: COLORS.background.info,
    border: COLORS.selection.border,
  },
  info: {
    background: COLORS.selection.backgroundStrong,
    border: COLORS.selection.border,
  },
  success: {
    background: COLORS.background.success,
    border: COLORS.success[200],
  },
  warning: {
    background: COLORS.background.warning,
    border: COLORS.warning[200],
  },
  error: {
    background: COLORS.background.error,
    border: COLORS.error[200],
  },
  neutral: {
    background: PAPER,
    border: I.hairline,
  },
};

function alertToneFromStatus(status: InstitutionalStatusTone, Icon: LucideIcon): AlertVisualTone {
  const s = institutionalStatusColors(status);
  const surface = TOAST_SURFACES[status];
  return {
    background: surface.background,
    border: surface.border,
    plate: s.icon,
    icon: I.onPrimary,
    progress: s.icon,
    Icon,
  };
}

function alertToneFromAccent(accent: string, Icon: LucideIcon): AlertVisualTone {
  return {
    background: COLORS.accent[50],
    border: COLORS.accent[200],
    plate: accent,
    icon: I.onPrimary,
    progress: accent,
    Icon,
  };
}

/** Cada tipo de lead = token semántico Tinder distinto (toast Host, no fila de lista). */
const LEAD_TONES: Record<LeadAlertTone, AlertVisualTone> = {
  message: alertToneFromStatus('primary', MessageCircle),
  draft: alertToneFromStatus('info', Sparkles),
  sent: alertToneFromAccent(COLORS.brand.orange, Send),
  accepted: alertToneFromStatus('success', CheckCircle2),
  rejected: alertToneFromStatus('error', CircleX),
  escalation: alertToneFromStatus('warning', BellRing),
  calendar: alertToneFromAccent(COLORS.brand.orange, CalendarCheck),
};

/** Alertas operativas — warning / error / neutral del design system. */
const OPS_TONES: Record<'warning' | 'danger' | 'info', AlertVisualTone & { title: string }> = {
  warning: {
    ...alertToneFromStatus('warning', BellRing),
    title: I.ink,
  },
  danger: {
    ...alertToneFromStatus('error', CircleX),
    title: I.ink,
  },
  info: {
    ...alertToneFromStatus('neutral', MessageCircle),
    title: I.ink,
  },
};

function AlertIconBadge({
  Icon,
  plateColor,
  iconColor,
}: {
  Icon: LucideIcon;
  plateColor: string;
  iconColor: string;
}) {
  return (
    <View style={[styles.alertIconBadge, { backgroundColor: plateColor }]}>
      <Icon size={ALERT_ICON_SIZE} color={iconColor} strokeWidth={ALERT_ICON_STROKE} />
    </View>
  );
}

type FloatingAlertCardProps = {
  alertId: string;
  durationMs: number;
  onDismiss: () => void;
  barColor: string;
  cardStyle?: ViewStyle;
  children: React.ReactNode;
};

/** Toast con barra de progreso inferior — al agotarse se cierra solo. */
function FloatingAlertCard({
  alertId,
  durationMs,
  onDismiss,
  barColor,
  cardStyle,
  children,
}: FloatingAlertCardProps) {
  const progress = useRef(new Animated.Value(1)).current;
  const dismissedRef = useRef(false);

  const dismissOnce = useCallback(() => {
    if (dismissedRef.current) return;
    dismissedRef.current = true;
    onDismiss();
  }, [onDismiss]);

  useEffect(() => {
    dismissedRef.current = false;
    progress.setValue(1);

    const anim = Animated.timing(progress, {
      toValue: 0,
      duration: durationMs,
      useNativeDriver: false,
    });

    anim.start(({ finished }) => {
      if (finished) dismissOnce();
    });

    return () => anim.stop();
  }, [alertId, durationMs, dismissOnce, progress]);

  const fillWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={[styles.card, cardStyle]}>
      <View style={styles.cardContent}>{children}</View>
      <View style={styles.progressTrack} accessibilityElementsHidden importantForAccessibility="no">
        <Animated.View
          style={[styles.progressFill, { width: fillWidth, backgroundColor: barColor }]}
        />
      </View>
    </View>
  );
}

function mapNuevoMensajeChatEvent(event: NuevoMensajeChatEvent): LeadFloatingAlert | null {
  if (event.es_proveedor) return null;

  const conv =
    event.conversation_id != null ? String(event.conversation_id).trim() : '';
  const preview = (event.mensaje || event.message || event.content || '').trim();
  const contact =
    event.external_contact_name?.trim()
    || event.enviado_por?.trim()
    || 'Cliente';
  const id = `msg-${event.mensaje_id || conv || Date.now()}`;

  return {
    kind: 'lead',
    id,
    title: 'Nuevo mensaje',
    leadTone: 'message',
    message: preview
      ? `${contact}: ${preview.length > 72 ? `${preview.slice(0, 72)}…` : preview}`
      : `Mensaje de ${contact}`,
    href: conv ? omnichannelChatHref(conv) : '/(tabs)/chats',
  };
}

function mapLeadEvent(event: AgenteIaEvent): LeadFloatingAlert | null {
  const conv =
    event.conversation_id != null ? String(event.conversation_id).trim() : '';
  const hrefChat = conv ? omnichannelChatHref(conv) : undefined;

  switch (event.type) {
    case 'agente_ia_cotizacion_borrador':
      return {
        kind: 'lead',
        id: `borrador-${event.cotizacion_id || conv || Date.now()}`,
        title: 'Cotización lista para revisar',
        leadTone: 'draft',
        message: 'La IA dejó un borrador. Ábrelo en pendientes o Cotizar con IA.',
        href: '/cotizar-ia',
      };
    case 'agente_ia_cotizacion_enviada':
      return {
        kind: 'lead',
        id: `enviada-${event.cotizacion_id || Date.now()}`,
        title: 'Cotización enviada',
        leadTone: 'sent',
        message: 'Ya está en Bandeja para seguimiento.',
        href: '/(tabs)/bandeja?filtro=cotizacion_enviada',
      };
    case 'agente_ia_cotizacion_aceptada':
      return {
        kind: 'lead',
        id: `aceptada-${event.cotizacion_id || Date.now()}`,
        title: 'Cliente aceptó cotización',
        leadTone: 'accepted',
        message: 'Aparece en Bandeja para agendar.',
        href: event.cita_id
          ? `/cita-agenda-personal/${event.cita_id}`
          : '/(tabs)/bandeja?filtro=aceptado_agendado',
      };
    case 'agente_ia_cotizacion_rechazada':
      return {
        kind: 'lead',
        id: `rechazada-${event.cotizacion_id || Date.now()}`,
        title: 'Cliente rechazó cotización',
        leadTone: 'rejected',
        message: 'Revisa el chat para ajustar o recuperar el lead.',
        href: hrefChat || '/(tabs)/chats',
      };
    case 'agente_ia_escalamiento':
      return {
        kind: 'lead',
        id: `escala-${conv || Date.now()}`,
        title: 'Lead necesita atención',
        leadTone: 'escalation',
        message: event.mensaje_preview || 'Un cliente requiere respuesta del taller.',
        href: hrefChat || '/(tabs)/chats',
      };
    case 'agente_ia_cita_confirmada':
      return {
        kind: 'lead',
        id: `cita-${event.cita_id || Date.now()}`,
        title: 'Cita confirmada por IA',
        leadTone: 'calendar',
        message: 'Quedó agendada en tu bandeja / agenda.',
        href: event.cita_id
          ? `/cita-agenda-personal/${event.cita_id}`
          : '/(tabs)/calendario',
      };
    default:
      return null;
  }
}

export type HomeFloatingAlertsDockProps = {
  enabled?: boolean;
  opsAlerts?: OpsFloatingAlert[];
};

function HomeFloatingAlertsDockInner({
  enabled = true,
  opsAlerts = [],
}: HomeFloatingAlertsDockProps) {
  const insets = useSafeAreaInsets();
  const [leadAlerts, setLeadAlerts] = useState<LeadFloatingAlert[]>([]);

  useEffect(() => {
    if (!enabled) return;
    const unsub = websocketService.onAgenteIaEvent((event) => {
      const next = mapLeadEvent(event);
      if (!next) return;
      setLeadAlerts((prev) => {
        if (prev.some((a) => a.id === next.id)) return prev;
        return [...prev, next].slice(-3);
      });
    });
    return unsub;
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    const unsub = websocketService.onNuevoMensajeChat((event) => {
      const next = mapNuevoMensajeChatEvent(event);
      if (!next) return;
      setLeadAlerts((prev) => {
        if (prev.some((a) => a.id === next.id)) return prev;
        return [...prev, next].slice(-3);
      });
    });
    return unsub;
  }, [enabled]);

  const dismissLead = useCallback((id: string) => {
    setLeadAlerts((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const items: DockItem[] = useMemo(() => {
    const ops: DockItem[] = opsAlerts.map((a) => ({ ...a, kind: 'ops' as const }));
    return [...ops, ...leadAlerts];
  }, [opsAlerts, leadAlerts]);

  const openLead = useCallback((alert: LeadFloatingAlert) => {
    dismissLead(alert.id);
    if (alert.href) router.push(alert.href as any);
  }, [dismissLead]);

  if (!enabled || items.length === 0) return null;

  const bottom = TAB_BAR_CONTENT_H + insets.bottom + SPACING.sm;

  return (
    <View pointerEvents="box-none" style={[styles.dock, { bottom }]}>
      {/* column-reverse: la más reciente queda pegada al menú; el resto sube */}
      <View style={styles.stack}>
        {[...items].reverse().map((alert) => {
          if (alert.kind === 'ops') {
            const tone = OPS_TONES[alert.variant || 'warning'];
            const OpsIcon = alert.Icon;
            return (
              <FloatingAlertCard
                key={alert.id}
                alertId={alert.id}
                durationMs={OPS_ALERT_AUTO_DISMISS_MS}
                onDismiss={alert.onDismiss}
                barColor={tone.progress}
                cardStyle={{
                  backgroundColor: tone.background,
                  borderColor: tone.border,
                }}
              >
                <TouchableOpacity
                  style={styles.body}
                  onPress={alert.onPress}
                  disabled={!alert.onPress}
                  activeOpacity={alert.onPress ? 0.85 : 1}
                >
                  <AlertIconBadge
                    Icon={OpsIcon}
                    plateColor={tone.plate}
                    iconColor={tone.icon}
                  />
                  <View style={styles.copy}>
                    <Text style={[styles.title, { color: tone.title }]} numberOfLines={1}>
                      {alert.title}
                    </Text>
                    {alert.message ? (
                      <Text style={styles.message} numberOfLines={2}>
                        {alert.message}
                      </Text>
                    ) : null}
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={alert.onDismiss}
                  hitSlop={10}
                  style={styles.close}
                  accessibilityLabel="Cerrar alerta"
                >
                  <X size={16} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
                </TouchableOpacity>
              </FloatingAlertCard>
            );
          }

          const leadTone = LEAD_TONES[alert.leadTone];
          const LeadIcon = leadTone.Icon;

          return (
            <FloatingAlertCard
              key={alert.id}
              alertId={alert.id}
              durationMs={LEAD_ALERT_AUTO_DISMISS_MS}
              onDismiss={() => dismissLead(alert.id)}
              barColor={leadTone.progress}
              cardStyle={{
                backgroundColor: leadTone.background,
                borderColor: leadTone.border,
              }}
            >
              <TouchableOpacity
                style={styles.body}
                onPress={() => openLead(alert)}
                activeOpacity={0.85}
              >
                <AlertIconBadge
                  Icon={LeadIcon}
                  plateColor={leadTone.plate}
                  iconColor={leadTone.icon}
                />
                <View style={styles.copy}>
                  <Text style={styles.title} numberOfLines={1}>
                    {alert.title}
                  </Text>
                  <Text style={styles.message} numberOfLines={2}>
                    {alert.message}
                  </Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.close}
                onPress={() => dismissLead(alert.id)}
                hitSlop={10}
                accessibilityLabel="Cerrar alerta"
              >
                <X size={16} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
              </TouchableOpacity>
            </FloatingAlertCard>
          );
        })}
      </View>
    </View>
  );
}

export const HomeFloatingAlertsDock = memo(HomeFloatingAlertsDockInner);

const styles = StyleSheet.create({
  dock: {
    position: 'absolute',
    left: SPACING.md,
    right: SPACING.md,
    zIndex: 80,
  },
  stack: {
    flexDirection: 'column-reverse',
    gap: SPACING.xs,
  },
  card: {
    backgroundColor: PAPER,
    borderRadius: BORDERS.radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: I.hairline,
    overflow: 'hidden',
    opacity: 1,
    ...(Platform.OS === 'web' ? { isolation: 'isolate' as const } : null),
    ...SHADOWS.lg,
  },
  cardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.sm,
    paddingLeft: SPACING.sm,
    paddingRight: SPACING.xs,
  },
  body: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    minWidth: 0,
  },
  alertIconBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  copy: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  title: {
    fontSize: TYPOGRAPHY.styles.captionBold.fontSize,
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    fontWeight: '600',
    color: I.ink,
  },
  message: {
    fontSize: TYPOGRAPHY.styles.caption.fontSize,
    fontFamily: TYPOGRAPHY.fontFamily.sansRegular,
    color: I.muted,
    lineHeight: 18,
  },
  close: {
    padding: SPACING.xs,
    alignSelf: 'center',
  },
  progressTrack: {
    height: 3,
    width: '100%',
    backgroundColor: I.hairline,
  },
  progressFill: {
    height: '100%',
    borderBottomLeftRadius: BORDERS.radius.lg,
  },
});

export default HomeFloatingAlertsDock;
