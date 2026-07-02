/**
 * Service Worker — Web Push (proveedores)
 * Deep links alineados con Expo Router (mecanimovil-prov).
 */

const APP_ORIGIN = self.location.origin;

function buildTargetUrl(data) {
  const type = data.type || '';
  const solicitudId = data.solicitud_id || data.solicitudId || '';
  const ofertaId = data.oferta_id || data.ofertaId || '';
  const conversationId = data.conversation_id || '';
  const ordenId = data.orden_id || data.order_id || '';
  const channel = data.channel || '';

  if (type === 'chat_message' || type === 'nuevo_mensaje_chat') {
    if (conversationId && !ofertaId) {
      const params = new URLSearchParams();
      params.set('conversationId', String(conversationId));
      if (channel && channel !== 'app') params.set('channel', String(channel));
      if (solicitudId) params.set('solicitudId', String(solicitudId));
      return `${APP_ORIGIN}/chat-omnicanal?${params.toString()}`;
    }
    if (ofertaId) {
      return `${APP_ORIGIN}/chat-oferta?ofertaId=${encodeURIComponent(String(ofertaId))}`;
    }
    return `${APP_ORIGIN}/(tabs)/chats`;
  }

  if (
    type === 'nueva_solicitud' ||
    type === 'catalog_assignment' ||
    type === 'solicitud_por_vencer'
  ) {
    if (solicitudId) {
      return `${APP_ORIGIN}/solicitud-detalle/${encodeURIComponent(String(solicitudId))}`;
    }
    return `${APP_ORIGIN}/solicitudes-disponibles`;
  }

  if (type === 'checklist_pendiente' || type === 'orden_asignada_mecanico') {
    if (ordenId) {
      return `${APP_ORIGIN}/orden-detalle/${encodeURIComponent(String(ordenId))}`;
    }
    if (solicitudId) {
      return `${APP_ORIGIN}/solicitud-detalle/${encodeURIComponent(String(solicitudId))}`;
    }
  }

  if (
    type === 'new_offer' ||
    type === 'nueva_oferta' ||
    type === 'solicitud_adjudicada' ||
    type === 'offer_accepted' ||
    type === 'recordatorio_pago' ||
    type === 'cambio_estado' ||
    type === 'pago_expirado' ||
    type === 'solicitud_cancelada_cliente'
  ) {
    if (solicitudId) {
      return `${APP_ORIGIN}/solicitud-detalle/${encodeURIComponent(String(solicitudId))}`;
    }
    if (ofertaId) {
      return `${APP_ORIGIN}/oferta-detalle/${encodeURIComponent(String(ofertaId))}`;
    }
  }

  if (
    type === 'suscripcion_por_vencer' ||
    type === 'suscripcion_vencida' ||
    type === 'suscripcion_pago_fallido' ||
    type === 'creditos_agotados'
  ) {
    return `${APP_ORIGIN}/creditos`;
  }

  return `${APP_ORIGIN}/notificaciones`;
}

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = {
      title: 'MecaniMóvil Proveedores',
      body: event.data ? event.data.text() : 'Tienes una nueva notificación.',
    };
  }

  const title = payload.title || 'MecaniMóvil Proveedores';
  const body = payload.body || '';
  const data = payload.data || {};
  const type = data.type || 'default';

  const requireInteraction = [
    'nueva_solicitud',
    'solicitud_por_vencer',
    'checklist_pendiente',
    'orden_asignada_mecanico',
    'chat_message',
  ].includes(type);

  const tagSuffix =
    data.solicitud_id || data.orden_id || data.conversation_id || data.oferta_id || '';

  event.waitUntil(
    Promise.all([
      self.registration.showNotification(title, {
        body,
        icon: '/assets/images/app-icon.png',
        badge: '/assets/images/app-icon.png',
        data: { ...data, url: buildTargetUrl(data) },
        requireInteraction,
        tag: `${type}-${tagSuffix}`,
        renotify: true,
      }),
      clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        for (const client of clientList) {
          if (client.url.startsWith(APP_ORIGIN)) {
            client.postMessage({ type: 'PUSH_RECEIVED', data });
          }
        }
      }),
    ]),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const data = event.notification.data || {};
  const targetUrl = data.url || buildTargetUrl(data);

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.startsWith(APP_ORIGIN) && 'focus' in client) {
          client.postMessage({ type: 'NOTIFICATION_CLICK', data });
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    }),
  );
});

self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    self.registration.pushManager
      .subscribe({
        userVisibleOnly: true,
        applicationServerKey: event.oldSubscription
          ? event.oldSubscription.options.applicationServerKey
          : null,
      })
      .then((newSubscription) =>
        clients.matchAll({ type: 'window' }).then((clientList) => {
          for (const client of clientList) {
            client.postMessage({
              type: 'PUSH_SUBSCRIPTION_ROTATED',
              subscription: JSON.parse(JSON.stringify(newSubscription)),
            });
          }
        }),
      )
      .catch((err) => {
        console.error('[sw-prov] Error re-suscribiendo push:', err);
      }),
  );
});
