import React, { useCallback, useEffect, useState } from 'react';
import { Platform, StyleSheet, TouchableOpacity, ActivityIndicator, View } from 'react-native';
import { Bell } from 'lucide-react-native';
import NotificationService from '@/services/push/notificationService';
import { subscribeWebPush, type WebPushStatus } from '@/services/push/webPushService';
import { COLORS, SPACING, BORDERS } from '@/app/design-system/tokens';
import {
  HostPaperSection,
  InstitutionalButton,
  InstitutionalText,
  hostIconPlateStyle,
} from '@/app/design-system/components';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import { showAlert } from '@/utils/platformAlert';

const I = COLORS.institutional;

/** Banner compacto en Hoy para activar Web Push (solo navegador). */
export function WebPushHomeBanner() {
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

  if (Platform.OS !== 'web' || !status?.supported || status.subscribed) {
    return null;
  }

  const denied = status.permission === 'denied';

  const handlePress = async () => {
    if (denied || activating) return;
    setActivating(true);
    try {
      const ok = await subscribeWebPush();
      await refresh();
      if (ok) {
        showAlert(
          'Alertas activadas',
          'Recibirás avisos de cotizaciones IA, mensajes y cambios de estado en este navegador.',
        );
      } else if (typeof Notification !== 'undefined' && Notification.permission === 'denied') {
        showAlert(
          'Permiso bloqueado',
          'Habilita las notificaciones en ajustes del sitio y vuelve a intentar.',
        );
      }
    } finally {
      setActivating(false);
    }
  };

  return (
    <HostPaperSection style={styles.banner}>
      <View style={styles.row}>
        <View style={hostIconPlateStyle}>
          <Bell size={18} color={I.primary} strokeWidth={ICON_STROKE_WIDTH} />
        </View>
        <View style={styles.copy}>
          <InstitutionalText role="bodyBold">Activa alertas del navegador</InstitutionalText>
          <InstitutionalText role="caption" color="body">
            {denied
              ? 'Bloqueadas en el navegador. Habilítalas en ajustes del sitio.'
              : 'Avisos cuando la IA genera cotizaciones o cambia el estado comercial.'}
          </InstitutionalText>
        </View>
      </View>
      {!denied ? (
        <InstitutionalButton
          label={activating ? 'Activando…' : 'Activar alertas'}
          onPress={() => void handlePress()}
          variant="outline"
          size="compact"
          disabled={activating}
          loading={activating}
        />
      ) : null}
      {activating ? <ActivityIndicator size="small" color={I.primary} style={styles.spinner} /> : null}
    </HostPaperSection>
  );
}

const styles = StyleSheet.create({
  banner: {
    marginBottom: SPACING.fixed.lg,
    gap: SPACING.fixed.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.fixed.sm,
  },
  copy: {
    flex: 1,
    gap: 2,
  },
  spinner: {
    alignSelf: 'center',
  },
});
