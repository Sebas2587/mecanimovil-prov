# Push notifications — App Proveedores

## Canales

| Plataforma | Mecanismo | Registro |
|------------|-----------|----------|
| iOS / Android (dev/EAS build) | Expo Push | `POST /usuarios/registrar-push-token/` |
| Web (navegador) | Web Push VAPID | `POST /usuarios/registrar-web-push/` con `app_origen: proveedor` |

Los canales son **mutuamente excluyentes** en el cliente: web no usa `expo-notifications`; nativo no registra Service Worker.

En backend, si el usuario tiene **PushToken nativo activo** (últimos 30 días), no se envía Web Push duplicado al mismo usuario.

## Flujo web

1. Login / restaurar sesión → `NotificationService.syncNotificationsForUser` → suscripción VAPID vía `webPushService.ts`
2. Service Worker `public/sw.js` muestra notificación y deep link al tocar
3. `PushNotificationSetup.web.tsx` escucha clicks y llama `navigateByPushNotification`
4. Logout → `desactivar-web-push` + `pushManager.unsubscribe()`

## Eventos push (proveedor)

| Tipo | Cuándo |
|------|--------|
| `nueva_solicitud` | Cliente publica solicitud compatible |
| `solicitud_por_vencer` | Celery cada 30 min (~30–60 min antes de expirar) |
| `chat_message` + `channel` | Mensaje app / WhatsApp / Messenger / Instagram |
| `checklist_pendiente` | Orden confirmada con checklist PENDIENTE creado |

## Requisitos de build nativo

- **No funciona en Expo Go** para push nativo; usar dev build o EAS.
- Plugin `expo-notifications` en `app.json`.
- iOS: `UIBackgroundModes: remote-notification`.
- Android: canales `servicios`, `chat`, `default`.

## Requisitos web (Vercel)

- `public/sw.js` debe servirse como archivo estático (ver `vercel.json`).
- VAPID keys en backend (`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_EMAIL`).
- Tras deploy, el técnico abre la web, acepta permisos (Perfil → «Activar alertas» o prompt al login).

## Probar web

1. Login en Chrome (sin app nativa instalada) → aceptar notificaciones.
2. Django admin: `WebPushSubscription` con `app_origen=proveedor`.
3. Publicar solicitud compatible → notificación «Nueva solicitud disponible».
4. Tocar notificación → abre `solicitud-detalle/{id}`.

## Probar nativo

1. Login en app proveedores (build nativo) y aceptar permisos.
2. Verificar token en backend (`PushToken`).
3. Publicar solicitud → push Expo; al tocar, abre detalle.

## Archivos

- `services/push/notificationService.ts` — orquestación nativo/web
- `services/push/webPushService.ts` — VAPID (solo web)
- `public/sw.js` — Service Worker
- `components/push/PushNotificationSetup.web.tsx` / `.native.tsx`
- `components/push/WebPushPermissionBanner.tsx`
- `utils/push/navigateByPushNotification.ts`
- Backend: `usuarios/tasks.py`, `ordenes/services/notificaciones_proveedor.py`
