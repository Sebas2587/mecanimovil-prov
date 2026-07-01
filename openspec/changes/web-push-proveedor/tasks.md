# Tasks: web-push-proveedor (app proveedores)

## OpenSpec
- [x] proposal.md + specs/notificaciones-web/spec.md
- [x] Deltas solicitudes-gestion, chats-omnicanal, ordenes-gestion

## Service Worker y deploy
- [x] `public/sw.js` con deep links Expo Router
- [x] `vercel.json` excluir sw.js del rewrite SPA

## Servicios y setup
- [x] `services/push/webPushService.ts`
- [x] Extender `notificationService.ts` (sync web/native)
- [x] `PushNotificationSetup.web.tsx`
- [x] AuthContext: syncNotificationsForUser + logout web

## Navegación y UX
- [x] `navigateByPushNotification.ts` — solicitud_por_vencer, checklist_pendiente
- [x] Banner permisos en Perfil (web)
- [x] `docs/PUSH_NOTIFICATIONS.md`

## Verificación
- [ ] Login web → suscripción en Django admin (`app_origen=proveedor`)
- [ ] Regresión: build nativo no registra web push
