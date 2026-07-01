# web-push-proveedor (app proveedores)

## Why

Talleres que usan la versión web sin instalar la app nativa no reciben alertas
cuando llega una solicitud, un mensaje omnicanal o deben completar un checklist.
Web Push (VAPID) permite notificaciones del navegador sin afectar Expo en iOS/Android.

## What Changes

- `public/sw.js` + `services/push/webPushService.ts` (suscripción VAPID).
- `PushNotificationSetup.web.tsx` (setup web separado de nativo).
- Integración en AuthContext y deep links en `navigateByPushNotification.ts`.
- Banner de permisos en Perfil (web).
- `vercel.json`: servir `sw.js` antes del rewrite SPA.

## Requirements

- REQ-WEB-PUSH-SEPARATE: web SHALL registrar solo Web Push; nativo SHALL registrar solo Expo.
- REQ-WEB-PUSH-LOGIN: tras login web con sesión activa, SHALL suscribir si permiso concedido.
- REQ-WEB-PUSH-LOGOUT: logout web SHALL desactivar suscripción en backend.
- REQ-WEB-PUSH-MSG: push `chat_message` con `channel` SHALL abrir chat correcto.
- REQ-WEB-PUSH-SOLICITUD: push `nueva_solicitud` y `solicitud_por_vencer` SHALL abrir detalle.
- REQ-WEB-PUSH-CHECKLIST: push `checklist_pendiente` SHALL abrir orden/checklist.
