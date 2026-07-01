import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
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

export function PushNotificationSetup() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();

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
        navigateByPushNotification(router, data as PushNotificationData, queryClient);
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
    );
  }, [isAuthenticated, router, queryClient]);

  return null;
}
