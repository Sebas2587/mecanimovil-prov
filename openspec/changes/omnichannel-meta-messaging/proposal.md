# omnichannel-meta-messaging (app proveedores)

## Why

Proveedores necesitan configurar WhatsApp/Facebook/Instagram desde Perfil y ver/responder
mensajes externos en el tab Chats con badge de canal y navegación push.

## What Changes

- Pantalla `configuracion-canales.tsx` (patrón `configuracion-mercadopago.tsx`).
- Servicio `omnichannelService.ts`.
- Inbox unificado en `chats.tsx`, ruta `chat-omnicanal/[conversationId].tsx`.
- Extensión WS/push/deep link con `channel` y `conversation_id`.

## Requirements

- REQ-UI-CANALES: tres cards con toggle, estado y OAuth por canal.
- REQ-UI-BADGE: lista chats muestra badge WhatsApp/Messenger/Instagram/App.
- REQ-UI-BANNER: conversación omnicanal muestra canal y contacto externo.
- REQ-UI-PUSH-NAV: tap push sin oferta_id abre `/chat-omnicanal/{id}`.
