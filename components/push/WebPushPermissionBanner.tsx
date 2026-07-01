import React, { useCallback, useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Bell, BellOff } from 'lucide-react-native';
import NotificationService from '@/services/push/notificationService';
import { subscribeWebPush, type WebPushStatus } from '@/services/push/webPushService';
import { COLORS, SPACING, TYPOGRAPHY, BORDERS } from '@/app/design-system/tokens';
import { institutionalStatusColors } from '@/app/design-system/styles/institutionalSemantic';

const I = COLORS.institutional;
const warningInk = institutionalStatusColors('warning').ink;

export function WebPushPermissionBanner() {
  const [status, setStatus] = useState<WebPushStatus | null>(null);
  const [activating, setActivating] = useState(false);

  const refresh = useCallback(async () => {
    if (Platform.OS !== 'web') return;
    const next = await NotificationService.getWebPushStatus();
    setStatus(next);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (Platform.OS !== 'web' || !status?.supported) return null;
  if (status.subscribed) return null;

  const denied = status.permission === 'denied';

  const handleActivate = async () => {
    setActivating(true);
    try {
      await subscribeWebPush();
      await refresh();
    } finally {
      setActivating(false);
    }
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.iconWrap}>
        {denied ? (
          <BellOff size={20} color={warningInk} strokeWidth={2} />
        ) : (
          <Bell size={20} color={I.primary} strokeWidth={2} />
        )}
      </View>
      <View style={styles.body}>
        <Text style={styles.title}>Alertas en este navegador</Text>
        <Text style={styles.subtitle}>
          {denied
            ? 'Las notificaciones están bloqueadas. Habilítalas en la configuración del navegador para no perder solicitudes ni mensajes.'
            : 'Recibe avisos de nuevas solicitudes, mensajes y checklists aunque no tengas la app instalada.'}
        </Text>
        {!denied ? (
          <TouchableOpacity
            style={[styles.cta, activating && styles.ctaDisabled]}
            onPress={() => void handleActivate()}
            disabled={activating}
          >
            <Text style={styles.ctaText}>
              {activating ? 'Activando…' : 'Activar alertas'}
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.lg,
    padding: SPACING.md,
    borderRadius: BORDERS.radius.lg,
    backgroundColor: I.surfaceStrong,
    borderWidth: 1,
    borderColor: I.hairline,
  },
  iconWrap: {
    paddingTop: 2,
  },
  body: {
    flex: 1,
    gap: SPACING.xs,
  },
  title: {
    fontSize: TYPOGRAPHY.styles.bodyBold.fontSize,
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    fontWeight: TYPOGRAPHY.fontWeight.semibold as '600',
    color: I.ink,
  },
  subtitle: {
    fontSize: TYPOGRAPHY.styles.caption.fontSize,
    fontFamily: TYPOGRAPHY.fontFamily.sansRegular,
    color: I.muted,
    lineHeight: 18,
  },
  cta: {
    alignSelf: 'flex-start',
    marginTop: SPACING.xs,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDERS.radius.md,
    backgroundColor: I.primary,
  },
  ctaDisabled: {
    opacity: 0.6,
  },
  ctaText: {
    fontSize: TYPOGRAPHY.styles.captionBold.fontSize,
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    fontWeight: TYPOGRAPHY.fontWeight.semibold as '600',
    color: '#fff',
  },
});
