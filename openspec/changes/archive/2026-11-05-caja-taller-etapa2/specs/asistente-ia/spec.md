## ADDED Requirements

### Requirement: Total canónico de la cotización
Lista, detalle y editor MUST usar el total de las líneas: precio por cantidad, más mano de obra, menos descuento, IVA incluido. Si falta un precio, el total MUST verse «Incompleto» y MUST NOT ser $0. Si `obligacion_conocida` es false, la obligación MUST NOT verse como $0. El editor calcula esa vista sin guardar.

#### Scenario: Falta un precio
- GIVEN una línea sin `precio_unitario_clp` y otra de 1000
- WHEN se muestra el total
- THEN dice «Incompleto»
- AND la suma parcial no se presenta como el total

#### Scenario: Líneas completas
- GIVEN dos unidades a 1000 y mano de obra 500, sin descuento
- WHEN se muestra el total
- THEN el total es 2500
- AND no se suma otro IVA encima

#### Scenario: Total guardado distinto
- GIVEN una cotización aceptada cuyo total guardado no coincide con las líneas
- WHEN se lee la obligación
- THEN `obligacion_clp` es null
- AND no se muestra como deuda $0
