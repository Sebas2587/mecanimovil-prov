## ADDED Requirements

### Requirement: Intento sin respuesta
Si el POST de un cobro no tiene respuesta, la app MUST conservar la clave y el cuerpo originales. MUST NOT crear otra clave al editar motivo o fecha. MUST NOT decir que el libro no cambió. Salir de la pantalla o refrescar la pestaña MUST seguir ofreciendo ese mismo reintento antes de un cobro nuevo.

#### Scenario: Timeout y edición
- GIVEN un cobro de 30 cuyo POST no respondió
- WHEN se intenta cambiar el motivo
- THEN no sale un segundo cobro con otra clave
- AND el reintento usa la clave y el cuerpo del primer envío

#### Scenario: Doble toque
- GIVEN el envío todavía no terminó
- WHEN se confirma otra vez
- THEN hay un solo POST

### Requirement: Proyección antes que el flag viejo
Si la orden trae `estado_cobro_ui`, la lista MUST usar esa proyección aunque la oferta tenga flags de pagado. Esos flags MUST usarse solo cuando ni la orden ni la oferta traen proyección.

#### Scenario: Oferta pagada y orden reembolsada
- GIVEN una oferta con flags pagado y una orden con `estado_cobro_ui` reembolsado
- WHEN se lee la fila de Servicios
- THEN la etiqueta es Reembolsado

### Requirement: Período que se pidió
Una respuesta de un GET anterior MUST NOT reemplazar el libro del período que ahora está pedido. Mientras carga otro período, la pantalla MUST NOT mostrar las cifras anteriores sin decir a qué período pertenecen.

#### Scenario: Respuesta tardía
- GIVEN una consulta A y luego una consulta B
- WHEN A responde después de B
- THEN el libro mostrado es el de B

### Requirement: Faltantes y devolución manual
`resumen.faltantes` MUST leerse como lista de códigos. MUST NOT mostrarse un contador 0 de moneda. Una entrada con origen manual MUST poder devolverse desde esa fila, sin pedir el UUID a mano. Una entrada de Mercado Pago MUST NOT ofrecer devolución manual. Una fecha que no existe MUST rechazarse aunque tenga forma YYYY-MM-DD.

#### Scenario: Lista de faltantes
- GIVEN `faltantes` es `["legacy_sin_movimiento"]`
- WHEN se muestra el resumen
- THEN no aparece un cero de otra moneda

#### Scenario: Fecha imposible
- GIVEN la fecha 2026-02-31
- WHEN se valida el período o el cobro
- THEN no se consulta ni se envía

### Requirement: Nombre en la misma fila
`cliente_nombre`, `vehiculo_patente` y `folio` MUST leerse del mismo GET del libro. La app MUST NOT pedir cada caso para completarlos. Si no vienen, la fila MUST seguir mostrando el ancla.

#### Scenario: La fila ya trae el nombre
- GIVEN un caso con esos tres campos en la respuesta del libro
- WHEN se lista
- THEN se leen esos textos
- AND no hay un GET adicional por el caso
