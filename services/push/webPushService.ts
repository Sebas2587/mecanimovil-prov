/**
 * Web Push (VAPID) — solo Platform.OS === 'web'.
 */
import { Platform } from 'react-native';
import { setItem, deleteItem } from '@/utils/authStorage';
import { get, post } from '@/services/api';

const WEB_PUSH_ENDPOINT_KEY = 'web_push_endpoint';

export type WebPushStatus = {
  supported: boolean;
  permission?: NotificationPermission | 'unsupported';
  subscribed?: boolean;
  endpoint?: string | null;
  reason?: string;
  error?: string;
};

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }
  try {
    const registration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    await navigator.serviceWorker.ready;
    return registration;
  } catch (err) {
    if (__DEV__) console.error('[webPush] Error registrando Service Worker:', err);
    return null;
  }
}

async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  const permission = await Notification.requestPermission();
  return permission === 'granted';
}

async function getVapidPublicKey(): Promise<string | null> {
  try {
    const response = (await get('/usuarios/vapid-public-key/')) as { vapid_public_key?: string };
    return response?.vapid_public_key || null;
  } catch (err) {
    if (__DEV__) console.error('[webPush] No se pudo obtener VAPID public key:', err);
    return null;
  }
}

async function registerSubscriptionInBackend(subscription: PushSubscription): Promise<void> {
  const json = subscription.toJSON();
  const endpoint = json.endpoint;
  const keys = json.keys;
  if (!endpoint || !keys?.p256dh || !keys?.auth) return;

  await post('/usuarios/registrar-web-push/', {
    endpoint,
    p256dh: keys.p256dh,
    auth: keys.auth,
    app_origen: 'proveedor',
  });
  await setItem(WEB_PUSH_ENDPOINT_KEY, endpoint);
}

export async function subscribeWebPush(): Promise<boolean> {
  if (Platform.OS !== 'web') return false;
  if (typeof window === 'undefined' || !('PushManager' in window)) {
    return false;
  }

  try {
    const registration = await registerServiceWorker();
    if (!registration) return false;

    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) return false;

    const existingSub = await registration.pushManager.getSubscription();
    if (existingSub) {
      await registerSubscriptionInBackend(existingSub);
      return true;
    }

    const vapidPublicKey = await getVapidPublicKey();
    if (!vapidPublicKey) return false;

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    });

    await registerSubscriptionInBackend(subscription);
    return true;
  } catch (err) {
    if (__DEV__) console.error('[webPush] subscribeWebPush:', err);
    return false;
  }
}

export async function unsubscribeWebPush(): Promise<void> {
  if (Platform.OS !== 'web') return;
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;

  try {
    const registration = await navigator.serviceWorker.getRegistration('/sw.js');
    if (!registration) return;

    const subscription = await registration.pushManager.getSubscription();
    if (!subscription) return;

    const endpoint = subscription.endpoint;
    await subscription.unsubscribe();

    try {
      await post('/usuarios/desactivar-web-push/', { endpoint });
    } catch {
      /* usuario ya sin auth */
    }

    await deleteItem(WEB_PUSH_ENDPOINT_KEY);
  } catch (err) {
    if (__DEV__) console.error('[webPush] unsubscribeWebPush:', err);
  }
}

export async function getWebPushStatus(): Promise<WebPushStatus> {
  if (Platform.OS !== 'web') return { supported: false };
  if (typeof window === 'undefined' || !('PushManager' in window)) {
    return { supported: false, reason: 'PushManager not supported' };
  }
  if (!('Notification' in window)) {
    return { supported: false, reason: 'Notification API not supported' };
  }
  if (!('serviceWorker' in navigator)) {
    return { supported: false, reason: 'ServiceWorker not supported' };
  }

  const permission = Notification.permission;
  try {
    const registration = await navigator.serviceWorker.getRegistration('/sw.js');
    const subscription = registration
      ? await registration.pushManager.getSubscription()
      : null;

    return {
      supported: true,
      permission,
      subscribed: !!subscription,
      endpoint: subscription?.endpoint?.slice(0, 60) || null,
    };
  } catch (err) {
    return {
      supported: true,
      permission,
      subscribed: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export function setupWebPushMessageListeners(
  onNotificationClick: (data: Record<string, unknown>) => void,
  onSubscriptionRotated: (subscription: PushSubscriptionJSON) => void,
): () => void {
  if (Platform.OS !== 'web' || typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return () => {};
  }

  const handler = (event: MessageEvent) => {
    const payload = event.data;
    if (!payload || typeof payload !== 'object') return;
    if (payload.type === 'NOTIFICATION_CLICK' && payload.data) {
      onNotificationClick(payload.data as Record<string, unknown>);
    }
    if (payload.type === 'PUSH_SUBSCRIPTION_ROTATED' && payload.subscription) {
      void onSubscriptionRotated(payload.subscription as PushSubscriptionJSON);
    }
  };

  navigator.serviceWorker.addEventListener('message', handler);
  return () => navigator.serviceWorker.removeEventListener('message', handler);
}
