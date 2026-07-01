# notificaciones-web Specification

## Purpose
Notificaciones push en navegador (Web Push / VAPID) para proveedores que usan
mecanimovil-prov web sin instalar la app nativa.

## Requirements

### Requirement: Canal web separado de Expo
La app web MUST NOT registrar tokens Expo; la app nativa MUST NOT registrar Web Push.

#### Scenario: Suscripción en navegador
- GIVEN proveedor autenticado en Platform.OS === 'web'
- WHEN acepta permiso de notificaciones
- THEN se registra `POST /usuarios/registrar-web-push/` con `app_origen: proveedor`
- AND no se llama `registrar-push-token`

#### Scenario: Suscripción nativa sin cambios
- GIVEN proveedor en iOS/Android con dev build
- WHEN inicia sesión
- THEN se registra Expo push token
- AND no se registra Web Push

### Requirement: Alertas de mensajes por canal
Push de chat SHALL respetar canal omnicanal configurado.

#### Scenario: Mensaje WhatsApp en web
- GIVEN push `chat_message` con `channel=whatsapp` y `conversation_id`
- WHEN el proveedor toca la notificación
- THEN navega a `/chat-omnicanal/{conversation_id}` con query `channel=whatsapp`

### Requirement: Alertas de solicitudes
El proveedor SHALL recibir push web para nuevas solicitudes y vencimientos próximos.

#### Scenario: Nueva solicitud compatible
- GIVEN push `nueva_solicitud` con `solicitud_id`
- WHEN toca la notificación
- THEN abre `/solicitud-detalle/{solicitud_id}`

#### Scenario: Solicitud por vencer
- GIVEN push `solicitud_por_vencer` con `solicitud_id`
- WHEN toca la notificación
- THEN abre `/solicitud-detalle/{solicitud_id}`

### Requirement: Alerta checklist pendiente
Tras aceptar/pagar servicio con template checklist, el proveedor SHALL ser alertado.

#### Scenario: Checklist pendiente
- GIVEN push `checklist_pendiente` con `orden_id`
- WHEN toca la notificación
- THEN abre `/orden-detalle/{orden_id}`
