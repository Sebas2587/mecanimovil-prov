import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { useAuth } from '@/context/AuthContext';
import {
  navigateByPushNotification,
  type PushNotificationData,
} from '@/utils/push/navigateByPushNotification';
import {
  subscribeWebPush,
  setupWebPushMessageListeners,
} from '@/services/push/webPushService';
import { post } from '@/services/api';
import { useAlerts } from '@/context/AlertsContext';

export function PushNotificationSetup() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();
  const { registrarAlertaPushMecanico } = useAlerts();

  const handlePushData = (data: PushNotificationData | undefined, navigate = true) => {
    if (!data) return;
    registrarAlertaPushMecanico(data);
    if (navigate) {
      navigateByPushNotification(router, data, queryClient);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return;

    void subscribeWebPush().catch(() => {
      /* no crítico */
    });
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;

    return setupWebPushMessageListeners(
      (data) => {
        handlePushData(data as PushNotificationData, true);
      },
      async (subscription) => {
        const { endpoint, keys } = subscription;
        if (!endpoint || !keys?.p256dh || !keys?.auth) return;
        try {
          await post('/usuarios/registrar-web-push/', {
            endpoint,
            p256dh: keys.p256dh,
            auth: keys.auth,
            app_origen: 'proveedor',
          });
        } catch {
          /* no crítico */
        }
      },
      (data) => {
        handlePushData(data as PushNotificationData, false);
      },
    );
  }, [isAuthenticated, router, queryClient, registrarAlertaPushMecanico]);

  return null;
}
