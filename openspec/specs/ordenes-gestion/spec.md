# ordenes-gestion Specification

## Purpose
Flujo del proveedor para gestionar sus órdenes activas e históricas: confirmar,
iniciar, completar y comunicarse con el usuario durante el servicio.

## Requirements

### Requirement: Lista de órdenes del proveedor
El proveedor MUST ver sus órdenes activas e históricas.

#### Scenario: Órdenes activas visibles
- GIVEN un proveedor con órdenes en estado=confirmada o en_progreso
- CUANDO abre la sección de órdenes
- THEN ve las órdenes activas con estado, nombre del usuario y vehículo

#### Scenario: Historial de órdenes completadas
- GIVEN un proveedor con órdenes completadas
- CUANDO cambia al filtro "Historial"
- THEN ve lista paginada de órdenes pasadas con fecha y monto cobrado

### Requirement: Avanzar estado de la orden
El proveedor MUST controlar el avance del estado de cada orden sin cerrar la oferta marketplace antes de la firma del cliente.

#### Scenario: Confirmar orden pendiente
- GIVEN una orden en estado=pendiente
- CUANDO el proveedor toca "Confirmar"
- THEN la orden pasa a estado=confirmada
- AND el usuario recibe notificación push

#### Scenario: Iniciar servicio desde oferta pagada (web)
- GIVEN una oferta en estado `pagada` o `pagada_parcialmente` con repuestos pagados
- WHEN el proveedor confirma «Iniciar servicio» en web
- THEN la app MUST ejecutar `POST /ordenes/ofertas/{id}/iniciar-servicio/` (confirmación compatible con web)
- AND la oferta pasa a `en_ejecucion`

#### Scenario: Checklist completado por técnico sin cerrar oferta
- GIVEN una oferta en `en_ejecucion` con checklist en `PENDIENTE_FIRMA_CLIENTE`
- WHEN el proveedor ve el detalle de oferta
- THEN MUST NOT mostrar «Terminar servicio» como acción principal
- AND MUST mostrar aviso de espera de firma del cliente

#### Scenario: Pago parcial mano de obra pendiente
- GIVEN oferta con `estado_pago_repuestos=pagado` y `estado_pago_servicio=pendiente`
- WHEN el servicio está en ejecución o esperando firma
- THEN MUST informar que el cliente debe pagar la mano de obra restante desde su app

#### Scenario: Completar servicio sin checklist
- GIVEN una orden en estado=en_progreso sin plantilla de checklist
- CUANDO el proveedor toca "Completar servicio" y confirma
- THEN la orden pasa a estado=completada

### Requirement: Finalización de checklist según progreso real de respuestas
La app proveedor SHALL habilitar el botón de finalizar cuando todos los ítems obligatorios estén completados y el progreso calculado desde las respuestas locales sea al menos 80%, sin depender únicamente de `progreso_porcentaje` desactualizado del servidor.

#### Scenario: Checklist reabierto con respuestas ya completas
- GIVEN un checklist en estado `EN_PROGRESO` reabierto desde operaciones
- AND el API devuelve `progreso_porcentaje` bajo pero las respuestas locales están completas
- WHEN el proveedor abre el checklist con todos los obligatorios marcados
- THEN ve el botón "Finalizar checklist" habilitado

### Requirement: Comunicación durante la orden
El proveedor MUST poder enviar mensajes al usuario vía WebSocket.

#### Scenario: Enviar mensaje al usuario
- GIVEN una orden en_progreso con WebSocket activo
- CUANDO el proveedor escribe y envía un mensaje
- THEN el usuario recibe el mensaje en tiempo real
