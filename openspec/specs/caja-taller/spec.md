# caja-taller Specification

## Purpose
TBD - created by archiving change caja-taller-etapa2. Update Purpose after archive.

## Requirements

### Requirement: Libro de caja en su ruta
La tarjeta Finanzas del mes MUST abrir `/caja-taller`. Recargar créditos y el plan MUST seguir en `/creditos`. La pantalla MUST pedir el período en America/Santiago, inclusive y de hasta 366 días, y MUST mostrar resumen, serie, movimientos y casos. El mecánico MUST NOT ver registrar cobro ni costo.

#### Scenario: La tarjeta abre la caja
- GIVEN un mandante con permiso de finanzas
- WHEN pulsa la tarjeta Finanzas del mes
- THEN entra a `/caja-taller`
- AND Recargar créditos sigue yendo a `/creditos`

#### Scenario: El servidor no publica la caja
- GIVEN `GET /ordenes/caja/` responde 404
- WHEN se abre el período
- THEN el mensaje dice que la caja no está publicada
- AND no se muestra un libro vacío

#### Scenario: El período no tiene movimientos
- GIVEN el API responde 200 con `results` vacío
- WHEN se muestra el libro
- THEN dice que no hay movimientos en el período

### Requirement: Neto sin ganancia y margen sin calcular
El neto MUST etiquetarse «Cobros menos devoluciones» y MUST NOT llamarse ganancia. `margen_real_clp` y `resultado_caja_clp` null MUST decir incompleto. `margen_contratado_clp` MUST NOT rotularse como caja. Si la clave no viene, la fila MUST NOT mostrarse. La app MUST NOT calcular esos números. Saldo null MUST NOT verse como cero.

#### Scenario: Abono y devolución
- GIVEN exigible 100, abono 30 y devolución 10 al día siguiente
- WHEN el API entrega neto 20 y saldo 80
- THEN el período muestra 20 como cobros menos devoluciones
- AND el caso muestra saldo 80
- AND el 100 no entra al libro

#### Scenario: Margen sin evidencia
- GIVEN `margen_real_clp` null y `margen_contratado_clp` 60
- WHEN se dibuja el caso
- THEN el margen real dice incompleto
- AND 60 se lee como margen contratado, no como caja

### Requirement: Alta manual con la misma clave
Registrar cobro o costo MUST pedir revisión antes del POST. Abrir el formulario MUST NOT enviar. El cobro MUST mandar `Idempotency-Key` y MUST usar el ancla de la respuesta. Un 409, incluido `reverso_ancla_distinta`, MUST mostrarse y MUST NOT lanzar otro POST. Mercado Pago MUST NOT anotarse ni recalcularse en este formulario.

#### Scenario: Doble toque
- GIVEN el taller ya confirmó un cobro
- WHEN el envío sigue en curso
- THEN no sale un segundo POST

#### Scenario: Reintento de red
- GIVEN el POST no tuvo respuesta
- WHEN el taller reintenta ese mismo cuerpo
- THEN la clave de idempotencia es la misma

#### Scenario: La solicitud se guarda en la oferta
- GIVEN un POST con ancla solicitud
- WHEN la respuesta trae ancla oferta
- THEN la pantalla nombra esa oferta
- AND no deja el cobro en la solicitud escrita

### Requirement: Caso sin nombre inventado
Sin `cliente_nombre`, `vehiculo_patente` o `folio`, la fila MUST mostrar ancla y ancla id. MUST NOT pedir cada caso por separado para ponerle nombre.

#### Scenario: Solo ancla
- GIVEN un caso cita 15 sin esos tres campos
- WHEN se lista el caso
- THEN se lee «Cita 15»
- AND no hay otra petición por ese id

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

### Requirement: Resultado ambiguo del cobro
Un POST sin estado, con 408 o con estado 5xx MUST conservar la clave y el cuerpo. MUST NOT habilitar otra clave. El mensaje MUST NOT decir que el servidor rechazó el cobro ni que el libro no cambió. Un 400 o un 409 MUST poder editarse.

#### Scenario: 502 después del envío
- GIVEN un cobro cuyo POST responde 502
- WHEN se intenta editar el motivo
- THEN el reintento usa la misma clave y el mismo cuerpo
- AND el mensaje dice que no se sabe si quedó guardado

#### Scenario: 504 igual que 502
- GIVEN un POST que responde 504
- WHEN se clasifica el fallo
- THEN el resultado es ambiguo

### Requirement: Período del dinero
El input de fechas MUST ser un borrador hasta Consultar. Mientras carga, el rótulo MUST ser el período pedido. El dinero MUST mostrar el período del libro, no el del input.

#### Scenario: Borrador sin consultar
- GIVEN una carga del período A
- WHEN el usuario escribe el período B y no consulta
- THEN el rótulo sigue en A
- AND al llegar la respuesta el dinero se lee como A

### Requirement: Día del reembolso
La devolución MUST precargar un día YYYY-MM-DD de America/Santiago, el de hoy. MUST NOT copiar el timestamp de la entrada.

#### Scenario: Timestamp de la entrada
- GIVEN una entrada con `fecha_efectiva` ISO distinta de hoy
- WHEN se abre la devolución
- THEN la fecha del formulario es el día de Santiago de hoy
- AND se puede revisar sin error de fecha

### Requirement: Intento por cuenta y taller
El intento incierto MUST guardarse y leerse con el id de usuario y el id del taller. Cambiar de cuenta MUST NOT mostrarlo ni borrarlo. Un intento sin dueño MUST NOT asignarse a la cuenta actual.

#### Scenario: Otra cuenta en la misma pestaña
- GIVEN un intento incierto de la cuenta A
- WHEN se abre la caja con la cuenta B
- THEN B no ve ese reintento ni el libro ni el formulario de A
- AND al volver a A el mismo intento sigue disponible

### Requirement: Costo sin respuesta clara
Un POST de costo sin estado, con 408 o con 5xx MUST decir que no se sabe si el costo quedó guardado. MUST NOT atribuirlo al cobro ni decir que el servidor lo rechazó. El mismo cuerpo MUST NOT reenviarse.

#### Scenario: 502 al registrar un costo
- GIVEN un costo cuyo POST responde 502
- WHEN se muestra el fallo
- THEN el mensaje habla del costo
- AND no dice que el cobro quedó guardado
- AND confirmar otra vez no hace un segundo POST
