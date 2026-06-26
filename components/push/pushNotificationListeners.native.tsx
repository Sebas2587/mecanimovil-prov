import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import {
  navigateByPushNotification,
  type PushNotificationData,
} from '@/utils/push/navigateByPushNotification';

const SOLICITUD_PUSH_TYPES = new Set([
  'nueva_solicitud',
  'catalog_assignment',
]);

export function PushNotificationListeners() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();
  const lastHandledId = useRef<string | null>(null);
  const lastResponse = Notifications.useLastNotificationResponse();

  const handleData = (data: PushNotificationData | undefined) => {
    if (!isAuthenticated || !data) return;
    navigateByPushNotification(router, data, queryClient);
  };

  useEffect(() => {
    if (!isAuthenticated || !lastResponse) return;
    if (lastResponse.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) {
      return;
    }
    const id = lastResponse.notification.request.identifier;
    if (lastHandledId.current === id) return;
    lastHandledId.current = id;
    handleData(lastResponse.notification.request.content.data as PushNotificationData);
  }, [isAuthenticated, lastResponse]);

  useEffect(() => {
    if (!isAuthenticated) return;

    const receivedSub = Notifications.addNotificationReceivedListener((notification) => {
      const data = notification.request.content.data as PushNotificationData;
      const type = typeof data?.type === 'string' ? data.type : '';
      if (SOLICITUD_PUSH_TYPES.has(type) && __DEV__) {
        console.log('[Push] Nueva solicitud recibida en foreground:', data);
      }
    });

    const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
      handleData(response.notification.request.content.data as PushNotificationData);
    });

    return () => {
      receivedSub.remove();
      responseSub.remove();
    };
  }, [isAuthenticated, router]);

  return null;
}
