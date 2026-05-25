# solicitudes-gestion Specification

## Purpose
Flujo para que el proveedor vea, filtre y responda a solicitudes de servicio
compatibles con sus especialidades. Una solicitud aceptada genera una orden.

## Requirements

### Requirement: Lista de solicitudes disponibles
El proveedor ve las solicitudes que puede aceptar según sus especialidades.

#### Scenario: Lista con solicitudes disponibles
- GIVEN un proveedor verificado y activo con especialidades configuradas
- CUANDO abre la sección de solicitudes
- THEN ve lista de solicitudes compatibles en estado=pendiente
- AND cada item muestra: tipo de servicio, vehículo, distancia y tiempo de publicación

#### Scenario: Sin solicitudes disponibles
- GIVEN no hay solicitudes compatibles con las especialidades del proveedor
- CUANDO abre la sección
- THEN ve estado vacío con mensaje "No hay solicitudes disponibles en este momento"

#### Scenario: Push al publicarse solicitud compatible
- GIVEN un proveedor verificado con token Expo registrado (`registrar-push-token`)
- WHEN un cliente publica una solicitud compatible con sus especialidades
- THEN el proveedor recibe push "Nueva solicitud disponible" (tipo `nueva_solicitud`, `solicitud_id`)
- AND al tocar la notificación la app abre `solicitud-detalle/{id}`

### Requirement: Aceptar solicitud
El proveedor acepta una solicitud consumiendo créditos.

#### Scenario: Aceptar solicitud con saldo suficiente
- GIVEN una solicitud disponible y el proveedor con créditos >= costo
- CUANDO el proveedor toca "Aceptar"
- THEN se descuentan los créditos
- AND se crea una orden asociada
- AND se notifica al usuario

#### Scenario: Aceptar sin créditos suficientes
- GIVEN el proveedor sin créditos
- CUANDO intenta aceptar una solicitud
- THEN ve modal "Saldo insuficiente" con CTA "Recargar créditos"

### Requirement: Rechazar solicitud
El proveedor puede rechazar solicitudes que no puede atender.

#### Scenario: Rechazar solicitud
- GIVEN una solicitud visible para el proveedor
- CUANDO el proveedor toca "Rechazar" y selecciona motivo
- THEN la solicitud desaparece de su lista
- AND se notifica al usuario con el motivo

### Requirement: Confirmación de asignación desde catálogo
Cuando el cliente elige un servicio publicado del proveedor, el detalle (`solicitud-detalle/[id]`) separa conversación, negociación de fecha y decisión.

#### Scenario: Layout de acciones catálogo
- GIVEN solicitud `pendiente_confirmacion` con oferta `origen=catalogo` del proveedor
- WHEN abre el detalle
- THEN chat y contexto están en la tarjeta de asignación (scroll)
- AND «Proponer otra fecha» está junto a la fecha preferida
- AND el pie fijo solo muestra Rechazar y Aceptar asignación

#### Scenario: Sin pie mientras espera fecha del cliente
- GIVEN oferta catálogo en `en_chat` tras proponer fecha
- WHEN abre el detalle
- THEN no hay pie de Rechazar/Aceptar
- AND el chat sigue disponible solo en la tarjeta de asignación
