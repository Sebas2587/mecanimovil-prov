## ADDED Requirements

### Requirement: Total nulo no es cero
Lista, detalle, burbuja y editor MUST mostrar «Incompleto» cuando `total_clp` es null o cuando `totales_completos` es false. Un `total_clp` 0 MUST seguir viéndose como $0. El total guardado MUST NOT reemplazar un total canónico null. Enviar MUST NOT salir si falta el precio de una línea. Guardar un borrador MUST seguir permitido.

#### Scenario: Precio ausente
- GIVEN una línea sin `precio_unitario_clp` y otra de 1000
- WHEN se muestra el total
- THEN dice «Incompleto»
- AND el envío no sale

#### Scenario: Cero explícito
- GIVEN `total_clp` 0 y `totales_completos` true
- WHEN se muestra el total
- THEN se ve $0
- AND el envío no queda bloqueado por ese cero

#### Scenario: Backend sin el campo nuevo
- GIVEN una cotización vieja con `total_clp` 2500 y sin `totales_completos`
- WHEN se muestra el total
- THEN se ve 2500

#### Scenario: Guardado distinto de las líneas
- GIVEN líneas que suman 2500 y `total_persistido_clp` 1000
- WHEN el editor arma la vista
- THEN el total mostrado es 2500
- AND 1000 no se presenta como el total ni como cero
