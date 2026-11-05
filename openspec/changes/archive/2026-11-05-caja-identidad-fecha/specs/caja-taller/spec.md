## ADDED Requirements

### Requirement: Identidad del mismo libro
Cada fila de casos y de movimientos MUST leer `cliente_nombre`, `vehiculo_patente` y `folio` de esa respuesta. Null o blanco MUST dejar el ancla. La app MUST NOT inventar el nombre Cliente ni un folio, y MUST NOT pedir el caso otra vez.

#### Scenario: Caso y movimiento con nombre
- GIVEN el libro trae Ana, ABCD12 y MM-1 en el caso y en el movimiento
- WHEN se muestra el libro
- THEN ambas filas usan esos textos
- AND no hay un GET por caso

#### Scenario: Sin dato
- GIVEN los tres campos son null
- WHEN se muestra la fila
- THEN el título es el ancla
- AND no se inventa el nombre Cliente

### Requirement: Fecha inválida no se envía
Un día que no existe, incluso `2026-02-30T15:04:00`, MUST NOT enviarse. Un 400 `fecha_invalida` MUST decir que el servidor no guardó el cobro y MUST NOT tratarse como un envío sin respuesta.

#### Scenario: 30 de febrero con hora
- GIVEN la fecha `2026-02-30T15:04:00`
- WHEN se revisa el cobro
- THEN no hay POST

#### Scenario: El servidor rechaza la fecha
- GIVEN un 400 con code `fecha_invalida`
- WHEN se lee el fallo
- THEN el mensaje dice que no se guardó
- AND no dice que no se sabe

### Requirement: Contracargo del servidor
Un movimiento `tipo` `contracargo` MUST mostrarse como Contracargo. MUST NOT ofrecer devolución manual ni sumar otro monto.

#### Scenario: Fila de contracargo
- GIVEN un movimiento tipo contracargo
- WHEN se lista
- THEN se lee Contracargo
- AND no hay botón de devolver
