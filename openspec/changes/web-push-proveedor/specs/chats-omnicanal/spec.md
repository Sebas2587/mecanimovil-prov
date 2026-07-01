# chats-omnicanal — delta web-push-proveedor

## ADDED Requirements

### Requirement: Web Push deep link omnicanal
Tap en notificación web de mensaje SHALL abrir conversación con contexto de canal.

#### Scenario: Web push WhatsApp
- GIVEN push web `chat_message` con `conversation_id`, `channel=whatsapp`, sin `oferta_id`
- WHEN usuario toca notificación en navegador
- THEN navega a `/chat-omnicanal/{conversation_id}?channel=whatsapp`
