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
import { useAlerts } from '@/context/AlertsContext';
import { maybeInvalidateFromPushData } from '@/utils/invalidateProveedorComercial';

export function PushNotificationSetup() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();
  const { registrarAlertaPushMecanico, agregarAlerta } = useAlerts();

  const handlePushData = (data: PushNotificationData | undefined, navigate = true) => {
    if (!data) return;
    maybeInvalidateFromPushData(queryClient, data);
    registrarAlertaPushMecanico(data);
    const type = typeof data.type === 'string' ? data.type : '';
    if (type === 'chat_message' || type === 'nuevo_mensaje_chat' || type === 'nuevo_contacto_canal') {
      const conv = data.conversation_id != null ? String(data.conversation_id).trim() : '';
      const preview = typeof data.preview === 'string'
        ? data.preview
        : typeof data.body === 'string'
          ? data.body
          : '';
      const messageId = data.message_id != null ? String(data.message_id) : conv;
      agregarAlerta({
        tipo: 'mensaje_entrante',
        titulo: type === 'nuevo_contacto_canal' ? 'Nuevo contacto' : 'Nuevo mensaje',
        mensaje: preview || 'Tienes un mensaje nuevo',
        accion: {
          texto: 'Abrir chat',
          ruta: conv
            ? `/chat-omnicanal?conversationId=${encodeURIComponent(conv)}`
            : '/(tabs)/chats',
        },
        prioridad: 'media',
      }, `msg-${messageId}`);
    }
    if (navigate) {
      navigateByPushNotification(router, data, queryClient);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) return;

    void subscribeWebPush().catch((err) => {
      if (__DEV__) {
        console.warn('[web-push] Suscripción automática falló:', err);
      }
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
  }, [agregarAlerta, isAuthenticated, router, queryClient, registrarAlertaPushMecanico]);

  return null;
}
