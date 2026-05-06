# ordenes-gestion Specification

## Purpose
Flujo del proveedor para gestionar sus órdenes activas e históricas: confirmar,
iniciar, completar y comunicarse con el usuario durante el servicio.

## Requirements

### Requirement: Lista de órdenes del proveedor
El proveedor ve sus órdenes activas e históricas.

#### Scenario: Órdenes activas visibles
- GIVEN un proveedor con órdenes en estado=confirmada o en_progreso
- CUANDO abre la sección de órdenes
- THEN ve las órdenes activas con estado, nombre del usuario y vehículo

#### Scenario: Historial de órdenes completadas
- GIVEN un proveedor con órdenes completadas
- CUANDO cambia al filtro "Historial"
- THEN ve lista paginada de órdenes pasadas con fecha y monto cobrado

### Requirement: Avanzar estado de la orden
El proveedor controla el avance del estado de cada orden.

#### Scenario: Confirmar orden pendiente
- GIVEN una orden en estado=pendiente
- CUANDO el proveedor toca "Confirmar"
- THEN la orden pasa a estado=confirmada
- AND el usuario recibe notificación push

#### Scenario: Iniciar servicio
- GIVEN una orden en estado=confirmada
- CUANDO el proveedor toca "Iniciar servicio"
- THEN la orden pasa a estado=en_progreso
- AND el canal WebSocket queda activo para comunicación

#### Scenario: Completar servicio
- GIVEN una orden en estado=en_progreso
- CUANDO el proveedor toca "Completar servicio" y confirma
- THEN la orden pasa a estado=completada
- AND se dispara el proceso de cobro al usuario

### Requirement: Comunicación durante la orden
El proveedor puede enviar mensajes al usuario vía WebSocket.

#### Scenario: Enviar mensaje al usuario
- GIVEN una orden en_progreso con WebSocket activo
- CUANDO el proveedor escribe y envía un mensaje
- THEN el usuario recibe el mensaje en tiempo real
