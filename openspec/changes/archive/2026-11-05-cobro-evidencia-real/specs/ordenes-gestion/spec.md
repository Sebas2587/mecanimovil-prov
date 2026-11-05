## MODIFIED Requirements

### Requirement: Avance y cobro en la ficha del trabajo
En orden, servicio, cita y solicitud con oferta, la app MUST mostrar el avance y el cobro por separado. El cobro MUST ser «Pagado», «Por cobrar» o «Pago sin información». Pagado y Por cobrar MUST salir de un campo de pago o de un estado de pago (`pagada`, `pendiente_pago`, `pagada_parcialmente`). Cita y cotización MUST quedar en «Pago sin información». Las rutas de orden, servicio y cita MUST seguir abriendo su propio recurso.

#### Scenario: Pago y pendiente no se ven igual
- GIVEN una orden `pagada` y otra `pendiente_pago`
- WHEN el taller abre cualquiera de los dos detalles
- THEN el avance puede decir «Agendado» en ambas
- AND el cobro dice «Pagado» en la primera y «Por cobrar» en la segunda

#### Scenario: La cita no se da por cobrada
- GIVEN una cita cerrada con precio de referencia y sin campo de pago
- WHEN el taller abre la cita
- THEN el cobro dice «Pago sin información»
- AND el precio no se presenta como dinero ya cobrado

#### Scenario: Las rutas no se cruzan
- GIVEN un id de cita y un id de orden distintos
- WHEN el taller entra desde Agenda o desde Servicios
- THEN la cita abre `/cita-agenda-personal/:id`
- AND la orden sin oferta abre `/servicio-detalle/:id`
- AND un enlace a `/orden-detalle/:id` sigue cargando esa orden

### Requirement: Sin ganancia inventada en la orden
Si una línea no trae desglose, o el desglose omite un importe que se muestra, el resumen MUST mostrar solo el total conocido y MUST NOT calcular IVA, comisión ni ganancia. Un campo ausente MUST NOT convertirse en cero. El cero MUST contarse solo cuando el backend lo envía.

#### Scenario: Falta el desglose
- GIVEN una línea con precio final y sin `desglose_precios`
- WHEN se arma el resumen
- THEN no hay comisión ni cifra después de comisión
- AND el total usa el precio final explícito de la línea

#### Scenario: Desglose parcial en todas las líneas
- GIVEN cada línea trae `desglose_precios` sin el importe de comisión
- WHEN se arma el resumen
- THEN la comisión y la ganancia quedan vacías
- AND no se muestra un cero inventado

## ADDED Requirements

### Requirement: El cobro no sigue al avance
La ficha de orden, de servicio y de la lista MUST leer `estado_pago_repuestos` y `estado_pago_servicio` si el registro los trae. `en_ejecucion`, `completado` y `aceptada` MUST NOT marcar Pagado ni Por cobrar. Un campo `reembolsado`, `fallido`, `cancelado` o un pago parcial MUST NOT terminar en Pagado aunque el estado siga en `pagada`. Sin evidencia, la etiqueta MUST ser «Pago sin información».

#### Scenario: Campos de pago sin estado
- GIVEN repuestos y servicio en `pagado` y sin estado
- WHEN se resuelve el cobro
- THEN la etiqueta es «Pagado»

#### Scenario: Pago confirmado y orden completada
- GIVEN los dos campos en `pagado` y estado `completado`
- WHEN se resuelve el cobro
- THEN la etiqueta es «Pagado»

#### Scenario: Reembolso junto a orden pagada
- GIVEN estado `pagada` y un campo `reembolsado` o `fallido`
- WHEN se resuelve el cobro
- THEN la etiqueta no es «Pagado»

#### Scenario: Orden completada sin campos
- GIVEN estado `completado` y sin campos de pago
- WHEN se resuelve el cobro
- THEN la etiqueta es «Pago sin información»

### Requirement: Total nulo y color del avance
En el detalle de orden, el color del estado MUST seguir el avance normalizado. Un total `null` o vacío MUST NOT renderizarse como $0. El monto MUST aparecer una sola vez.

#### Scenario: Total nulo
- GIVEN una orden sin total
- WHEN se abre el detalle
- THEN no aparece un monto $0
