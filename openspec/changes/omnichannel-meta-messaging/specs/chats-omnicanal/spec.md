# chats-omnicanal Specification

## Purpose
Inbox y conversación unificada con identificador de canal en mecanimovil-prov.

## Requirements

### Requirement: Badge de canal en lista
Cada fila SHALL mostrar origen del mensaje.

#### Scenario: Chat WhatsApp en lista
- GIVEN conversación omnicanal WhatsApp
- WHEN tab Chats carga
- THEN fila muestra badge "WhatsApp" y nombre contacto externo

### Requirement: Banner en conversación
Pantalla conversación SHALL indicar canal de respuesta.

#### Scenario: Banner WhatsApp
- GIVEN chat-omnicanal abierto
- THEN banner "Respondiendo por WhatsApp · Juan (+569…)"

### Requirement: Tiempo real
Mensaje inbound SHALL actualizar lista sin refresh manual.

#### Scenario: WS nuevo mensaje omnicanal
- GIVEN app en tab Chats
- WHEN WS `nuevo_mensaje_chat` con channel y conversation_id
- THEN fila sube al tope con preview

### Requirement: Push deep link
Tap push SHALL abrir conversación correcta.

#### Scenario: Push omnicanal
- GIVEN push con conversation_id sin oferta_id
- WHEN usuario toca notificación
- THEN navega a `/chat-omnicanal/{conversation_id}`

### Requirement: Vincular solicitud
Proveedor MAY vincular conversación a solicitud activa.

#### Scenario: Vincular
- GIVEN conversación sin solicitud
- WHEN selecciona solicitud en acción Vincular
- THEN conversación queda ligada a esa solicitud
