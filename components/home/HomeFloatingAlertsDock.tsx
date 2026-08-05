import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Bot, CheckCircle2, X, type LucideIcon } from 'lucide-react-native';
import websocketService, { type AgenteIaEvent } from '@/app/services/websocketService';
import { COLORS, SPACING, TYPOGRAPHY, BORDERS, SHADOWS } from '@/app/design-system/tokens';
import { withOpacity } from '@/app/design-system/tokens/colors';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import { omnichannelChatHref } from '@/utils/chatRoutes';

const I = COLORS.institutional;

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

type LeadFloatingAlert = {
  id: string;
  title: string;
  message: string;
  href?: string;
  kind: 'lead';
};

type DockItem =
  | (OpsFloatingAlert & { kind: 'ops' })
  | LeadFloatingAlert;

const OPS_TONES = {
  warning: {
    border: withOpacity(I.accentYellow, 0.45),
    icon: COLORS.warning.text,
    title: COLORS.warning.text,
  },
  danger: {
    border: withOpacity(I.semanticDown, 0.3),
    icon: I.semanticDown,
    title: I.semanticDown,
  },
  info: {
    border: withOpacity(I.primary, 0.25),
    icon: I.primary,
    title: I.ink,
  },
};

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
        message: 'La IA dejó un borrador. Ábrelo en pendientes o Cotizar con IA.',
        href: '/cotizar-ia',
      };
    case 'agente_ia_cotizacion_enviada':
      return {
        kind: 'lead',
        id: `enviada-${event.cotizacion_id || Date.now()}`,
        title: 'Cotización enviada',
        message: 'Ya está en Bandeja para seguimiento.',
        href: '/(tabs)/bandeja?filtro=cotizacion_enviada',
      };
    case 'agente_ia_cotizacion_aceptada':
      return {
        kind: 'lead',
        id: `aceptada-${event.cotizacion_id || Date.now()}`,
        title: 'Cliente aceptó cotización',
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
        message: 'Revisa el chat para ajustar o recuperar el lead.',
        href: hrefChat || '/(tabs)/chats',
      };
    case 'agente_ia_escalamiento':
      return {
        kind: 'lead',
        id: `escala-${conv || Date.now()}`,
        title: 'Lead necesita atención',
        message: event.mensaje_preview || 'Un cliente requiere respuesta del taller.',
        href: hrefChat || '/(tabs)/chats',
      };
    case 'agente_ia_cita_confirmada':
      return {
        kind: 'lead',
        id: `cita-${event.cita_id || Date.now()}`,
        title: 'Cita confirmada por IA',
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
            const Icon = alert.Icon;
            return (
              <View
                key={alert.id}
                style={[styles.card, { borderColor: tone.border }]}
              >
                <TouchableOpacity
                  style={styles.body}
                  onPress={alert.onPress}
                  disabled={!alert.onPress}
                  activeOpacity={alert.onPress ? 0.85 : 1}
                >
                  <Icon size={16} color={tone.icon} strokeWidth={ICON_STROKE_WIDTH} />
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
              </View>
            );
          }

          return (
            <View key={alert.id} style={[styles.card, { borderColor: I.hairline }]}>
              <TouchableOpacity
                style={styles.body}
                onPress={() => openLead(alert)}
                activeOpacity={0.85}
              >
                <View style={styles.iconPlate}>
                  {alert.title.includes('aceptó') || alert.title.includes('enviada') ? (
                    <CheckCircle2 size={18} color={I.semanticUp} strokeWidth={ICON_STROKE_WIDTH} />
                  ) : (
                    <Bot size={18} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
                  )}
                </View>
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
            </View>
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
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: I.paper,
    borderRadius: BORDERS.radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: SPACING.sm,
    paddingLeft: SPACING.sm,
    paddingRight: SPACING.xs,
    ...SHADOWS.editorial,
  },
  body: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    minWidth: 0,
  },
  iconPlate: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: I.surfaceSoft,
    alignItems: 'center',
    justifyContent: 'center',
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
  },
});

export default HomeFloatingAlertsDock;
