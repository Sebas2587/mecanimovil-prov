import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Bell, BellOff } from 'lucide-react-native';
import NotificationService from '@/services/push/notificationService';
import { subscribeWebPush, type WebPushStatus } from '@/services/push/webPushService';
import { COLORS, SPACING, TYPOGRAPHY, BORDERS } from '@/app/design-system/tokens';
import { institutionalStatusColors } from '@/app/design-system/styles/institutionalSemantic';
import { ICON_STROKE_WIDTH } from '@/app/design-system/iconography';
import { showAlert } from '@/utils/platformAlert';

const I = COLORS.institutional;
const warningInk = institutionalStatusColors('warning').ink;

type Props = {
  /** Separador superior cuando hay filas de gestión encima (solo web). */
  showTopBorder?: boolean;
};

/**
 * Fila de configuración para activar Web Push. Solo web, solo si aún no está suscrito.
 * En iOS/Android no renderiza nada (Expo push usa otro flujo).
 */
export function WebPushSettingsRow({ showTopBorder = false }: Props) {
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
          'Este navegador recibirá notificaciones de solicitudes, mensajes y checklists.',
        );
        return;
      }
      const permission =
        typeof Notification !== 'undefined' ? Notification.permission : 'default';
      if (permission === 'denied') {
        showAlert(
          'Permiso bloqueado',
          'El navegador bloqueó las notificaciones. Ábrelas en el candado / Ajustes del sitio y vuelve a intentar.',
        );
        return;
      }
      showAlert(
        'No se pudo activar',
        'Revisa que el sitio use HTTPS, que el Service Worker esté disponible y que VAPID esté configurado en el backend. Si el problema continúa, prueba en Chrome o recarga la página.',
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error inesperado al activar alertas.';
      showAlert('Error', message);
    } finally {
      setActivating(false);
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.row,
        showTopBorder && styles.rowBorderTop,
        denied && styles.rowDisabled,
      ]}
      onPress={() => void handlePress()}
      disabled={denied || activating}
      activeOpacity={denied ? 1 : 0.88}
      accessibilityRole="button"
      accessibilityLabel={
        denied
          ? 'Notificaciones del navegador bloqueadas'
          : 'Activar alertas en este navegador'
      }
    >
      <View style={[styles.iconPlate, { backgroundColor: I.surfaceStrong }]}>
        {denied ? (
          <BellOff size={18} color={warningInk} strokeWidth={ICON_STROKE_WIDTH} />
        ) : (
          <Bell size={18} color={I.ink} strokeWidth={ICON_STROKE_WIDTH} />
        )}
      </View>
      <View style={styles.textWrap}>
        <Text style={[styles.title, { color: I.ink }]}>Alertas del navegador</Text>
        <Text style={[styles.subtitle, { color: I.body }]} numberOfLines={2}>
          {denied
            ? 'Bloqueadas en el navegador. Habilítalas en ajustes del sitio.'
            : activating
              ? 'Activando…'
              : 'Solicitudes, mensajes y checklists sin instalar la app.'}
        </Text>
      </View>
      {activating ? (
        <ActivityIndicator size="small" color={I.primary} />
      ) : denied ? null : (
        <Text style={[styles.actionLabel, { color: I.primary }]}>Activar</Text>
      )}
    </TouchableOpacity>
  );
}

/** @deprecated Usar WebPushSettingsRow integrado en la lista de Gestión. */
export function WebPushPermissionBanner() {
  return null;
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
  },
  rowBorderTop: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: I.hairline,
  },
  rowDisabled: {
    opacity: 0.85,
  },
  iconPlate: {
    width: 40,
    height: 40,
    borderRadius: BORDERS.radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    fontWeight: TYPOGRAPHY.fontWeight.semibold as '600',
  },
  subtitle: {
    marginTop: 2,
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: TYPOGRAPHY.fontFamily.sansRegular,
    lineHeight: 18,
  },
  actionLabel: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontFamily: TYPOGRAPHY.fontFamily.sansSemiBold,
    fontWeight: TYPOGRAPHY.fontWeight.semibold as '600',
  },
});
