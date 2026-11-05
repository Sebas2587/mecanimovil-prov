## ADDED Requirements

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
