import React, { memo, useCallback, useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Bot, CheckCircle2, X } from 'lucide-react-native';
import websocketService, { type AgenteIaEvent } from '@/app/services/websocketService';
import { COLORS, SPACING, TYPOGRAPHY, BORDERS, SHADOWS } from '@/app/design-system/tokens';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import { omnichannelChatHref } from '@/utils/chatRoutes';

const I = COLORS.institutional;

type FloatingLeadAlert = {
  id: string;
  title: string;
  message: string;
  href?: string;
};

function mapEvent(event: AgenteIaEvent): FloatingLeadAlert | null {
  const conv =
    event.conversation_id != null ? String(event.conversation_id).trim() : '';
  const hrefChat = conv ? omnichannelChatHref(conv) : undefined;

  switch (event.type) {
    case 'agente_ia_cotizacion_borrador':
      return {
        id: `borrador-${event.cotizacion_id || conv || Date.now()}`,
        title: 'Cotización lista para revisar',
        message: 'La IA dejó un borrador. Ábrelo en pendientes o Cotizar con IA.',
        href: '/cotizar-ia',
      };
    case 'agente_ia_cotizacion_enviada':
      return {
        id: `enviada-${event.cotizacion_id || Date.now()}`,
        title: 'Cotización enviada',
        message: 'Ya está en Bandeja para seguimiento.',
        href: '/(tabs)/bandeja?filtro=cotizacion_enviada',
      };
    case 'agente_ia_cotizacion_aceptada':
      return {
        id: `aceptada-${event.cotizacion_id || Date.now()}`,
        title: 'Cliente aceptó cotización',
        message: 'Aparece en Bandeja para agendar.',
        href: event.cita_id
          ? `/cita-agenda-personal/${event.cita_id}`
          : '/(tabs)/bandeja?filtro=aceptado_agendado',
      };
    case 'agente_ia_cotizacion_rechazada':
      return {
        id: `rechazada-${event.cotizacion_id || Date.now()}`,
        title: 'Cliente rechazó cotización',
        message: 'Revisa el chat para ajustar o recuperar el lead.',
        href: hrefChat || '/(tabs)/chats',
      };
    case 'agente_ia_escalamiento':
      return {
        id: `escala-${conv || Date.now()}`,
        title: 'Lead necesita atención',
        message: event.mensaje_preview || 'Un cliente requiere respuesta del taller.',
        href: hrefChat || '/(tabs)/chats',
      };
    case 'agente_ia_cita_confirmada':
      return {
        id: `cita-${event.cita_id || Date.now()}`,
        title: 'Cita confirmada por IA',
        message: 'Quedó agendada en tu bandeja / agenda.',
        href: event.cita_id
          ? `/cita-agenda-personal/${event.cita_id}`
          : '/(tabs)/calendario',
      };
    case 'agente_ia_procesando':
      // No spam: solo toast corto si hay preview
      if (!event.mensaje_preview) return null;
      return {
        id: `proc-${conv}-${Date.now()}`,
        title: 'IA respondiendo',
        message: String(event.mensaje_preview).slice(0, 90),
        href: hrefChat,
      };
    default:
      return null;
  }
}

function HomeLeadFloatingAlertsInner({ enabled = true }: { enabled?: boolean }) {
  const insets = useSafeAreaInsets();
  const [alerts, setAlerts] = useState<FloatingLeadAlert[]>([]);

  useEffect(() => {
    if (!enabled) return;

    const unsub = websocketService.onAgenteIaEvent((event) => {
      const next = mapEvent(event);
      if (!next) return;
      setAlerts((prev) => {
        if (prev.some((a) => a.id === next.id)) return prev;
        return [next, ...prev].slice(0, 3);
      });
    });

    return unsub;
  }, [enabled]);

  const dismiss = useCallback((id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const open = useCallback((alert: FloatingLeadAlert) => {
    dismiss(alert.id);
    if (alert.href) {
      router.push(alert.href as any);
    }
  }, [dismiss]);

  if (!enabled || alerts.length === 0) return null;

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.stack,
        {
          top: insets.top + (Platform.OS === 'web' ? 72 : 64),
        },
      ]}
    >
      {alerts.map((alert) => (
        <View key={alert.id} style={styles.card}>
          <TouchableOpacity
            style={styles.cardBody}
            onPress={() => open(alert)}
            activeOpacity={0.85}
          >
            <View style={styles.iconWrap}>
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
            style={styles.closeBtn}
            onPress={() => dismiss(alert.id)}
            hitSlop={10}
            accessibilityLabel="Cerrar alerta"
          >
            <X size={16} color={I.muted} strokeWidth={ICON_STROKE_WIDTH} />
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );
}

export const HomeLeadFloatingAlerts = memo(HomeLeadFloatingAlertsInner);

const styles = StyleSheet.create({
  stack: {
    position: 'absolute',
    left: SPACING.md,
    right: SPACING.md,
    zIndex: 50,
    gap: SPACING.xs,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: I.paper || COLORS.background.paper,
    borderRadius: BORDERS.radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: I.hairline,
    paddingVertical: SPACING.sm,
    paddingLeft: SPACING.sm,
    paddingRight: SPACING.xs,
    overflow: 'hidden',
    opacity: 1,
    ...SHADOWS.md,
  },
  cardBody: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
    minWidth: 0,
  },
  iconWrap: {
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
  closeBtn: {
    padding: SPACING.xs,
  },
});

export default HomeLeadFloatingAlerts;
