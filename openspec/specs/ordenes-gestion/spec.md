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

#### Scenario: Cita aceptada sin horario no es servicio activo
- GIVEN una cita personal activa con `horario_por_confirmar=true`
- WHEN el taller abre Servicios → Activas
- THEN esa cita no aparece en la lista
- AND aparece cuando el horario está confirmado

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

### Requirement: Subida de fotos de checklist compatible con web
La app proveedor SHALL enviar las fotos de evidencia del checklist como archivo binario real tanto en nativo como en web, de modo que el backend reciba el archivo y el cliente pueda visualizar las imágenes.

#### Scenario: Subir foto desde la web
- GIVEN un proveedor usando la app en navegador web
- AND captura o selecciona una foto para un ítem PHOTO del checklist
- WHEN la app envía la foto al backend
- THEN el backend recibe el archivo en `FILES` (no vacío)
- AND la foto queda persistida con `imagen_url` accesible para el cliente

#### Scenario: Eliminar foto que falló en el servidor
- GIVEN una foto mostrada que no tiene registro válido en el backend
- WHEN el proveedor pulsa eliminar
- THEN la foto se quita de la lista local aunque el backend responda error

### Requirement: Comunicación durante la orden
El proveedor MUST poder enviar mensajes al usuario vía WebSocket.

#### Scenario: Enviar mensaje al usuario
- GIVEN una orden en_progreso con WebSocket activo
- CUANDO el proveedor escribe y envía un mensaje
- THEN el usuario recibe el mensaje en tiempo real

### Requirement: Avance y cobro en la ficha del trabajo
En orden, servicio, cita y solicitud con oferta, la app MUST mostrar el avance y el cobro por separado. El cobro MUST ser «Pagado», «Por cobrar» o «Sin registro», y los dos primeros MUST salir de un estado o un campo de pago. Cita y cotización MUST quedar en «Sin registro». Las rutas de orden, servicio y cita MUST seguir abriendo su propio recurso.

#### Scenario: Pago y pendiente no se ven igual
- GIVEN una orden `pagada` y otra `pendiente_pago`
- WHEN el taller abre cualquiera de los dos detalles
- THEN el avance puede decir «Agendado» en ambas
- AND el cobro dice «Pagado» en la primera y «Por cobrar» en la segunda

#### Scenario: La cita no se da por cobrada
- GIVEN una cita cerrada con precio de referencia y sin campo de pago
- WHEN el taller abre la cita
- THEN el cobro dice «Sin registro»
- AND el precio no se presenta como dinero ya cobrado

#### Scenario: Las rutas no se cruzan
- GIVEN un id de cita y un id de orden distintos
- WHEN el taller entra desde Agenda o desde Servicios
- THEN la cita abre `/cita-agenda-personal/:id`
- AND la orden sin oferta abre `/servicio-detalle/:id`
- AND un enlace a `/orden-detalle/:id` sigue cargando esa orden

### Requirement: Sin ganancia inventada en la orden
Si una línea de la orden no trae desglose de precios del backend, el resumen MUST mostrar solo el total conocido y MUST NOT calcular IVA, comisión ni ganancia aproximados.

#### Scenario: Falta el desglose
- GIVEN una línea con precio final y sin `desglose_precios`
- WHEN se arma el resumen
- THEN no hay comisión ni cifra después de comisión
- AND el total usa el precio final de la línea
