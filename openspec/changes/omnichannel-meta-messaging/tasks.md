# Tasks: omnichannel-meta-messaging (app proveedores)

## UI Configuración
- [x] `services/omnichannelService.ts`
- [x] `app/configuracion-canales.tsx` (tokens institucionales, Lucide)
- [x] Entrada en `app/(tabs)/perfil.tsx`

## Inbox y conversación
- [x] Consumir inbox unificado en `chats.tsx`
- [x] Componente `ChannelBadge`
- [x] `app/chat-omnicanal/[conversationId].tsx`
- [x] Acción vincular solicitud (modal en `chat-omnicanal`)

## Realtime y push
- [x] Extender `NuevoMensajeChatEvent` en `websocketService.ts`
- [x] Handler WS en `chats.tsx` para conversation_id sin oferta_id
- [x] `navigateByPushNotification.ts` → chat-omnicanal

## Verificación E2E (dispositivo)
- [ ] V2-V11 escenarios UI (requiere Meta App configurada)
- [ ] V13 Regresión chat-oferta in-app
