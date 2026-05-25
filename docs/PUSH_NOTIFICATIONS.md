# Push notifications — App Proveedores

## Flujo implementado

1. Tras login / restaurar sesión → `NotificationService.syncPushTokenForUser` → `POST /usuarios/registrar-push-token/`
2. Cliente publica solicitud → backend `_publicar_solicitud` → WebSocket + `send_expo_push_notification` (`type: nueva_solicitud`)
3. Proveedor toca push → `PushNotificationSetup` → `/solicitud-detalle/{solicitud_id}`

## Requisitos de build

- **No funciona en Expo Go** para push nativo; usar dev build o EAS.
- Plugin `expo-notifications` en `app.json`.
- iOS: `UIBackgroundModes: remote-notification`.
- Android: canales `servicios`, `chat`, `default` (creados al iniciar la app).

## Probar

1. Login en app proveedores (build nativo) y aceptar permisos de notificaciones.
2. Verificar en logs backend: token registrado para el usuario proveedor.
3. Desde app usuarios, crear/publicar solicitud compatible.
4. Con app proveedores en background, debe llegar push; al tocar, abre el detalle.

## Archivos

- `services/push/notificationService.ts`
- `components/push/PushNotificationSetup.tsx`
- `utils/push/navigateByPushNotification.ts`
- Backend: `ordenes/views.py` → `_publicar_solicitud`
