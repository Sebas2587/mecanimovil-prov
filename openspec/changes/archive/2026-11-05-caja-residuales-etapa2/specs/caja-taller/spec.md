## ADDED Requirements

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
